"""
WebSocket connection manager and handler for real-time progress updates.
Timeout aligned: frontend 120s -> backend 180s (frontend has a 150s timeout).
"""

import asyncio
import uuid
import logging
from datetime import datetime
from typing import Dict, Optional
from fastapi import WebSocket, WebSocketDisconnect

from backend.crew.orchestrator import run_travel_pipeline
from backend.config.settings import settings
from backend.agents.llm import _get_api_key

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


async def run_with_progress(session_id: str, user_request: str):
    """Run the travel pipeline while sending progress updates via WebSocket."""
    itinerary_id = str(uuid.uuid4())

    itinerary_store[itinerary_id] = {
        "id": itinerary_id,
        "request": user_request,
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

                task = asyncio.create_task(run_with_progress(session_id, user_message))
                manager.track_task(session_id, task)

    except WebSocketDisconnect:
        manager.disconnect(session_id)
