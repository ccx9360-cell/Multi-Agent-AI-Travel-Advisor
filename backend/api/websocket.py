"""
WebSocket connection manager and handler for real-time progress updates.
Timeout aligned: frontend 120s -> backend 180s (frontend has a 150s timeout).
"""

import asyncio
import uuid
import logging
import json
from datetime import datetime
from typing import Dict, Optional
from fastapi import WebSocket, WebSocketDisconnect

from backend.crew.orchestrator import run_travel_pipeline
from backend.config.settings import settings
from backend.agents.llm import _get_api_key
from backend.services.amap_weather import amap_weather
from backend.services.trains.train_service import query_trains

logger = logging.getLogger(__name__)

# In-memory store (would be a DB in production)
itinerary_store: dict = {}

# Pipeline timeout in seconds (must be > frontend's 150s)
PIPELINE_TIMEOUT = 300  # 5 min — generous since CrewAI calls LLM

# Step definitions for progress display
AGENT_STEPS = [
    {"key": "planning", "label": "行程规划解析", "description": "AI正在分析你的旅行需求..."},
    {"key": "data_fetch", "label": "实时数据查询", "description": "搜索酒店、景点、交通信息..."},
    {"key": "knowledge", "label": "旅行知识查询", "description": "收集当地旅行贴士..."},
    {"key": "compilation", "label": "行程编排与优化", "description": "AI正在生成你的专属行程..."},
]


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.active_tasks: Dict[str, asyncio.Task] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        self.active_connections.pop(session_id, None)
        task = self.active_tasks.pop(session_id, None)
        if task and not task.done():
            task.cancel()

    async def send_message(self, session_id: str, message: dict):
        ws = self.active_connections.get(session_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                pass

    def track_task(self, session_id: str, task: asyncio.Task):
        self.active_tasks[session_id] = task


manager = ConnectionManager()


# ── 快捷查询（跳过 LLM，直接调 API） ───────────────────────────


async def handle_quick_query(session_id: str, request: str, scenario: str) -> Optional[str]:
    """Handle quick queries that bypass the LLM (weather/train/knowledge)."""
    prefix = "快速查询:"
    if not request.startswith(prefix):
        return None

    parts = request[len(prefix):].split(":", 1)
    if len(parts) != 2:
        return None

    query_type = parts[0]
    query_value = parts[1].strip()

    await manager.send_message(session_id, {
        "type": "started",
        "itinerary_id": f"quick_{query_type}",
        "agents": [{"key": query_type, "label": {"weather": "天气查询", "trains": "火车票查询", "knowledge": "攻略查询"}.get(query_type, query_type), "description": f"快速{query_type}查询..."}],
    })

    try:
        if query_type == "weather":
            await manager.send_message(session_id, {
                "type": "agent_progress",
                "agent_key": "weather", "agent_label": "天气查询", "description": "查询实时天气...",
                "step": 1, "total_steps": 1, "status": "running",
            })
            result = await asyncio.get_event_loop().run_in_executor(None, amap_weather, query_value)
            if isinstance(result, dict) and result.get("live"):
                live = result["live"]
                forecasts = result.get("forecast", [])
                lines = [
                    f"🌤 **{live.get('city', query_value)} 实时天气**",
                    f"🌡 {live.get('temperature', '')}°C | {live.get('weather', '')}",
                    f"💨 {live.get('wind_direction', '')} {live.get('wind_power', '')}",
                    f"💧 湿度: {live.get('humidity', '')}%",
                ]
                if forecasts:
                    lines.append("")
                    lines.append("📅 **未来天气预报:**")
                    for f in forecasts[:4]:
                        lines.append(f"  {f.get('date', '')}: {f.get('day_weather', '')}/{f.get('night_weather', '')} {f.get('day_temp', '')}~{f.get('night_temp', '')}°C")
                output = "\n".join(lines)
            else:
                output = result.get("error", "天气查询暂不可用")

        elif query_type == "trains":
            await manager.send_message(session_id, {
                "type": "agent_progress",
                "agent_key": "trains", "agent_label": "火车票查询", "description": "查询12306实时车次...",
                "step": 1, "total_steps": 1, "status": "running",
            })
            # Parse "北京 上海" or "北京到上海"
            import re
            match = re.match(r"([\u4e00-\u9fff]+)\s*(?:到|->|→)?\s*([\u4e00-\u9fff]+)", query_value)
            if match:
                from_st = match.group(1)
                to_st = match.group(2)
                from datetime import date
                date_str = date.today().isoformat()
                result = await asyncio.get_event_loop().run_in_executor(None, query_trains, from_st, to_st, date_str)
                if result.get("trains"):
                    lines = [f"🚄 **{from_st} → {to_st}** ({date_str}) | 共 {result['total']} 趟列车"]
                    for t in result["trains"][:8]:
                        seats = []
                        for s in t.get("seat_types", [])[:4]:
                            if s.get("has_tickets"):
                                rem = f"{s['remaining']}张" if s['remaining'] > 0 else "有票"
                                seats.append(f"{s['name']}: {rem}")
                        line = f"\n🚆 **{t['train_number']}** ({t.get('train_type', '')})"
                        line += f"\n🕐 {t.get('departure_time', '')} → {t.get('arrival_time', '')} ({t.get('duration', '')})"
                        line += f"\n🚉 {t.get('from_station', '')} → {t.get('to_station', '')}"
                        if seats:
                            line += f"\n💺 {' | '.join(seats)}"
                        lines.append(line)
                    output = "\n".join(lines)
                else:
                    output = result.get("error", "暂无可用车次")
            else:
                output = "格式示例：北京到上海 或 广州 深圳"

        elif query_type == "knowledge":
            await manager.send_message(session_id, {
                "type": "agent_progress",
                "agent_key": "knowledge", "agent_label": "攻略查询", "description": "检索旅行知识库...",
                "step": 1, "total_steps": 1, "status": "running",
            })
            from backend.services.knowledge import query_knowledge_base
            result = query_knowledge_base(query_value)
            output = result if result else f"未找到关于「{query_value}」的攻略信息。"

        else:
            output = f"未知的快捷查询类型: {query_type}"

        await manager.send_message(session_id, {
            "type": "completed",
            "itinerary_id": f"quick_{query_type}_{uuid.uuid4().hex[:6]}",
            "itinerary": output,
            "scenario": query_type,
        })
        return output

    except Exception as e:
        logger.error(f"Quick query failed: {e}")
        await manager.send_message(session_id, {
            "type": "error",
            "message": f"查询失败: {e}",
        })
        return None


async def run_with_progress(session_id: str, user_request: str, scenario: str = "free"):
    """Run the travel pipeline while sending progress updates via WebSocket."""
    itinerary_id = str(uuid.uuid4())

    itinerary_store[itinerary_id] = {
        "id": itinerary_id,
        "request": user_request,
        "scenario": scenario,
        "itinerary": "",
        "created_at": datetime.now().isoformat(),
        "status": "processing",
    }

    await manager.send_message(session_id, {
        "type": "started",
        "itinerary_id": itinerary_id,
        "agents": AGENT_STEPS,
    })

    try:
        async def progress_callback(step_key: str, label: str, status: str):
            step_index = next(
                (i for i, s in enumerate(AGENT_STEPS) if s["key"] == step_key),
                0,
            )
            step_info = AGENT_STEPS[step_index] if step_index < len(AGENT_STEPS) else {}
            await manager.send_message(session_id, {
                "type": "agent_progress",
                "agent_key": step_key,
                "agent_label": label,
                "description": step_info.get("description", ""),
                "step": step_index + 1,
                "total_steps": len(AGENT_STEPS),
                "status": status,
            })
            logger.info(f"[{session_id}] {label}: {status}")

        # Run pipeline with timeout
        result = await asyncio.wait_for(
            run_travel_pipeline(
                user_request=user_request,
                progress_callback=progress_callback,
            ),
            timeout=PIPELINE_TIMEOUT,
        )

        itinerary_store[itinerary_id]["itinerary"] = result
        itinerary_store[itinerary_id]["status"] = "completed"

        await manager.send_message(session_id, {
            "type": "completed",
            "itinerary_id": itinerary_id,
            "itinerary": result,
            "scenario": scenario,
        })
        logger.info(f"[{session_id}] Pipeline completed ({len(result)} chars)")

    except asyncio.TimeoutError:
        logger.error(f"[{session_id}] Pipeline timed out after {PIPELINE_TIMEOUT}s")
        itinerary_store[itinerary_id]["status"] = "failed"
        await manager.send_message(session_id, {
            "type": "error",
            "message": f"处理超时（超过 {PIPELINE_TIMEOUT//60} 分钟），请简化查询后重试",
        })

    except Exception as e:
        logger.error(f"[{session_id}] Pipeline failed: {e}", exc_info=True)
        itinerary_store[itinerary_id]["status"] = "failed"
        await manager.send_message(session_id, {
            "type": "error",
            "message": str(e),
        })


async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint handler for real-time travel planning."""
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "plan_request":
                user_message = data.get("message", "")
                scenario = data.get("scenario", "free")
                if not user_message.strip():
                    await manager.send_message(session_id, {
                        "type": "error",
                        "message": "请输入旅行需求（如：'北京三日游'）",
                    })
                    continue

                if not _get_api_key():
                    await manager.send_message(session_id, {
                        "type": "error",
                        "message": "LLM API Key 未配置，请检查 .env 文件",
                    })
                    continue

                # 先尝试快速查询（跳过 LLM）
                quick_result = await handle_quick_query(session_id, user_message, scenario)
                if quick_result is not None:
                    continue

                task = asyncio.create_task(run_with_progress(session_id, user_message, scenario))
                manager.track_task(session_id, task)

    except WebSocketDisconnect:
        manager.disconnect(session_id)
