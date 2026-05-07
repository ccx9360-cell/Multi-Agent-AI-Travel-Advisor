"""
Crew Orchestrator — the main pipeline that:
1. Uses AI to parse the user request (Travel Manager)
2. Fetches 美团 + 12306 + 天气 data in parallel
3. Queries RAG knowledge base
4. Uses AI to compile the final itinerary
"""
import asyncio
import json
import logging
import re
from datetime import date, timedelta
from typing import Optional, Callable, Awaitable

from crewai import Crew, Process

from backend.agents.definitions import (
    create_travel_manager,
    create_travel_knowledge_agent,
    create_itinerary_compiler,
)
from backend.agents.tasks import (
    create_planning_task,
    create_knowledge_task,
    create_compilation_task,
)
from backend.services.meituan.mttravel_client import (
    MeituanTravelClient,
    is_chinese_destination,
    to_chinese_name,
)
from backend.services.registry import ServiceRegistry
from backend.services.trains import query_trains
from backend.services.amap_weather import amap_weather

logger = logging.getLogger(__name__)

# Type for progress callback
ProgressCallback = Optional[Callable[[str, str, str], Awaitable[None]]]


# ── Chinese city mapping ──────────────────────────────────────

CHINESE_CITIES = {
    "北京": "北京", "上海": "上海", "广州": "广州", "深圳": "深圳",
    "杭州": "杭州", "成都": "成都", "武汉": "武汉", "西安": "西安",
    "南京": "南京", "重庆": "重庆", "苏州": "苏州", "昆明": "昆明",
    "厦门": "厦门", "青岛": "青岛", "大连": "大连", "三亚": "三亚",
    "桂林": "桂林", "丽江": "丽江", "大理": "大理", "长沙": "长沙",
    "哈尔滨": "哈尔滨", "珠海": "珠海", "兰州": "兰州", "西宁": "西宁",
    "拉萨": "拉萨", "敦煌": "敦煌", "黄山": "黄山", "张家界": "张家界",
    "凤凰": "凤凰", "九寨沟": "九寨沟", "香格里拉": "香格里拉",
    "beijing": "北京", "shanghai": "上海", "guangzhou": "广州",
    "shenzhen": "深圳", "hangzhou": "杭州", "chengdu": "成都",
    "wuhan": "武汉", "xian": "西安", "nanjing": "南京",
    "chongqing": "重庆", "suzhou": "苏州", "kunming": "昆明",
    "xiamen": "厦门", "qingdao": "青岛", "dalian": "大连",
    "sanya": "三亚", "guilin": "桂林", "lijiang": "丽江",
    "dali": "大理", "changsha": "长沙", "harbin": "哈尔滨",
}

TRAIN_KEYWORDS = ["火车", "高铁", "动车", "列车", "交通", "怎么去", "到达", "出发",
                  "train", "high-speed", "high speed", "bullet"]


# ── Main pipeline ───────────────────────────────────────────────

async def run_travel_pipeline(
    user_request: str,
    progress_callback: ProgressCallback = None,
) -> str:
    """
    Main pipeline:
    1. AI parses user request → structured params
    2. 美团 + 12306 + 天气 (parallel)
    3. RAG 知识库
    4. AI compiles final itinerary
    """
    async def notify(key: str, label: str, status: str):
        if progress_callback:
            await progress_callback(key, label, status)

    loop = asyncio.get_event_loop()

    # ── Step 1: AI parses user request ────────────────────────
    await notify("planning", "行程规划解析", "running")
    logger.info("Step 1: Parsing user request with AI...")

    manager = create_travel_manager()
    planning_task = create_planning_task(manager, user_request)

    planning_crew = Crew(
        agents=[manager],
        tasks=[planning_task],
        process=Process.sequential,
        verbose=False,
    )

    planning_result = str(await loop.run_in_executor(None, planning_crew.kickoff))
    await notify("planning", "行程规划解析", "completed")
    logger.info(f"Planning result: {planning_result[:300]}...")

    # ── Parse structured params ───────────────────────────────
    params = _extract_params(planning_result, user_request)
    destination = params.get("destination", "")

    # ── Step 2: Parallel data fetch ───────────────────────────
    tasks_to_run = []

    # 2a: 美团查询
    meituan_task = _fetch_meituan(destination, user_request, notify)
    tasks_to_run.append(meituan_task)

    # 2b: 火车票查询（如果需要交通）
    if params.get("origin") and destination and params.get("needs_train"):
        train_task = _fetch_trains(params["origin"], destination, params, notify)
        tasks_to_run.append(train_task)

    # 2c: 天气查询
    if destination:
        weather_task = _fetch_weather(destination, params, notify)
        tasks_to_run.append(weather_task)

    # 并行执行所有数据查询
    results = []
    if tasks_to_run:
        results = await asyncio.gather(*tasks_to_run, return_exceptions=True)

    # 解析结果
    meituan_result = ""
    train_result = ""
    weather_result = ""
    for r in results:
        if isinstance(r, Exception):
            logger.error(f"Data fetch error: {r}")
            continue
        if isinstance(r, dict):
            if "meituan" in r:
                meituan_result = r["meituan"]
            elif "trains" in r:
                train_result = _fmt_trains(r)
            elif "weather" in r:
                weather_result = _fmt_weather(r)

    # ── Step 3: RAG Knowledge ─────────────────────────────────
    await notify("knowledge", "攻略知识查询", "running")
    logger.info("Step 3: Getting travel knowledge from RAG...")
    try:
        # Use RAG via knowledge_agent
        knowledge_agent = create_travel_knowledge_agent()
        dest_str = ", ".join(params.get("destinations", [destination]))
        knowledge_task_obj = create_knowledge_task(knowledge_agent, dest_str)
        knowledge_crew = Crew(
            agents=[knowledge_agent],
            tasks=[knowledge_task_obj],
            process=Process.sequential,
            verbose=False,
        )
        knowledge_result = str(await loop.run_in_executor(None, knowledge_crew.kickoff))
        await notify("knowledge", "攻略知识查询", "completed")
    except Exception as e:
        logger.error(f"RAG查询失败: {e}")
        knowledge_result = ""
        await notify("knowledge", "攻略知识查询", "error")

    # ── Step 4: AI compiles final itinerary ───────────────────
    await notify("compilation", "行程编排与优化", "running")
    logger.info("Step 4: Compiling itinerary with AI...")

    compiler = create_itinerary_compiler()
    compilation_task_obj = create_compilation_task(
        agent=compiler,
        user_request=user_request,
        planning_output=planning_result,
        meituan_data=meituan_result or "暂无美团酒旅数据。",
        train_data=train_result or "",
        weather_data=weather_result or "",
        knowledge_output=_fmt_knowledge(knowledge_result),
    )
    compilation_crew = Crew(
        agents=[compiler],
        tasks=[compilation_task_obj],
        process=Process.sequential,
        verbose=False,
    )
    final_result = str(await loop.run_in_executor(None, compilation_crew.kickoff))
    await notify("compilation", "行程编排与优化", "completed")

    logger.info(f"Itinerary compiled. Length: {len(final_result)} chars")
    return final_result


# ── Data fetch helpers ───────────────────────────────────────────

async def _fetch_meituan(destination: str, user_request: str, notify) -> dict:
    if not is_chinese_destination(destination):
        return {}
    logger.info(f"美团查询: {destination}")
    await notify("meituan", "美团酒旅数据查询", "running")
    try:
        client = ServiceRegistry.get_meituan()
        result = await client.search(to_chinese_name(destination), user_request)
        await notify("meituan", "美团酒旅数据查询", "completed")
        return {"meituan": result}
    except Exception as e:
        logger.error(f"美团查询失败: {e}")
        await notify("meituan", "美团酒旅数据查询", "error")
        return {"meituan": f"美团查询失败: {e}"}


async def _fetch_trains(origin: str, destination: str, params: dict, notify) -> dict:
    logger.info(f"火车票查询: {origin} → {destination}")
    await notify("trains", "火车票查询", "running")
    try:
        date_str = params.get("departure_date", date.today().isoformat())
        result = query_trains(origin, destination, date_str)
        await notify("trains", "火车票查询", "completed")
        return {"trains": result}
    except Exception as e:
        logger.error(f"火车票查询失败: {e}")
        await notify("trains", "火车票查询", "error")
        return {"trains": {"error": str(e), "trains": []}}


async def _fetch_weather(destination: str, params: dict, notify) -> dict:
    logger.info(f"天气查询: {destination}")
    await notify("weather", "天气查询", "running")
    try:
        result = amap_weather(to_chinese_name(destination) if is_chinese_destination(destination) else destination)
        await notify("weather", "天气查询", "completed")
        return {"weather": result}
    except Exception as e:
        logger.error(f"天气查询失败: {e}")
        await notify("weather", "天气查询", "error")
        return {"weather": {}}


# ── Format helpers ──────────────────────────────────────────────

def _fmt_trains(data: dict) -> str:
    trains = data.get("trains", [])
    if not trains:
        if data.get("error"):
            return f"火车票查询失败: {data['error']}"
        return "暂无可用火车班次。"

    lines = [
        f"🚄 **{data.get('from', '')} → {data.get('to', '')}**",
        f"📅 日期: {data.get('date', '')} | 共 {data.get('total', len(trains))} 趟列车\n",
    ]

    for t in trains[:10]:
        line = (
            f"**{t['train_number']}** ({t.get('train_type', '')})\n"
            f"🕐 {t.get('departure_time', '')} → {t.get('arrival_time', '')} ({t.get('duration', '')})\n"
            f"🚉 {t.get('from_station', '')} → {t.get('to_station', '')}\n"
        )
        seats = []
        for s in t.get("seat_types", [])[:4]:
            if s.get("has_tickets"):
                remaining = f"{s['remaining']}张" if s['remaining'] > 0 else "有票"
                seats.append(f"{s['name']}: {remaining}")
        if seats:
            line += f"💺 {' | '.join(seats)}"
        lines.append(line + "\n")

    return "\n".join(lines)


def _fmt_weather(data: dict) -> str:
    live = data.get("live")
    if not live:
        return "暂无天气数据。"

    lines = [f"🌤 **{live.get('city', '')} 实时天气**"]
    lines.append(f"🌡 {live.get('temperature', '')}°C | {live.get('weather', '')}")
    lines.append(f"💨 {live.get('wind_direction', '')} {live.get('wind_power', '')}")
    lines.append(f"💧 湿度: {live.get('humidity', '')}%")

    forecasts = data.get("forecast", [])
    if forecasts:
        lines.append(f"\n📅 **未来{len(forecasts)}天预报:**")
        for f in forecasts[:5]:
            lines.append(
                f"  {f.get('date', '')}: {f.get('day_weather', '')}/"
                f"{f.get('night_weather', '')} "
                f"{f.get('day_temp', '')}~{f.get('night_temp', '')}°C"
            )
    return "\n".join(lines)


def _fmt_knowledge(knowledge: str) -> str:
    return knowledge if knowledge else "暂无攻略知识。"


# ── Param extraction ────────────────────────────────────────────

def _extract_params(planning_output: str, original_request: str) -> dict:
    """Extract structured parameters from the planning AI output."""
    output_lower = planning_output.lower()
    request_lower = original_request.lower()
    today = date.today().isoformat()

    params = {
        "origin": "",
        "destination": "",
        "destinations": [],
        "departure_date": today,
        "return_date": "",
        "travelers": 2,
        "interests": ["美食", "文化", "自然风光"],
        "needs_train": False,
    }

    # Detect Chinese cities
    destinations = []
    for key, city_name in CHINESE_CITIES.items():
        if key in output_lower or key in request_lower:
            if city_name not in destinations:
                destinations.append(city_name)

    if destinations:
        params["destination"] = destinations[0]
        params["destinations"] = destinations

    # Try to detect origin
    for kw in ["从", "来自", "出发", "origin", "from"]:
        if kw in original_request or kw in planning_output:
            for city in CHINESE_CITIES.values():
                if city in original_request:
                    if city not in destinations and not params["origin"]:
                        params["origin"] = city
                        break

    # Detect train/transportation need
    for kw in TRAIN_KEYWORDS:
        if kw in original_request or kw in planning_output:
            params["needs_train"] = True
            break

    # Traveler count
    m = re.search(r"(\d+)\s*(人|位|traveler|adult|person|people)", output_lower)
    if m:
        params["travelers"] = int(m.group(1))

    # Dates
    dates = re.findall(r"\d{4}-\d{2}-\d{2}", planning_output)
    if len(dates) >= 1:
        params["departure_date"] = dates[0]
    if len(dates) >= 2:
        params["return_date"] = dates[1]

    return params
