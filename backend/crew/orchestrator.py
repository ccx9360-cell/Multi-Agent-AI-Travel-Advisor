"""
Crew Orchestrator — the main pipeline that:
1. Uses AI to parse the user request (Travel Manager)
2. Fetches real data from APIs in parallel (no AI)
3. Uses AI to compile the final itinerary (Itinerary Compiler)

This reduces LLM calls from ~15-20 down to 2-3.
"""

import asyncio
import json
import logging
import re
from datetime import date
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
from backend.agents.tools import TravelKnowledgeTool
from backend.services.meituan.mttravel_client import (
    MeituanTravelClient,
    is_chinese_destination,
    to_chinese_name,
)
from backend.services.registry import ServiceRegistry
from backend.models.schemas import (
    FlightSearchResult,
    AccommodationSearchResult,
    ActivitySearchResult,
    LogisticsResult,
)

logger = logging.getLogger(__name__)

# Type for progress callback
ProgressCallback = Optional[Callable[[str, str, str], Awaitable[None]]]


# ── Format helpers (unchanged) ──────────────────────────────────────

def _fmt_flights(data: FlightSearchResult) -> str:
    if not data.options:
        return "No flight data available."
    lines = [f"**Route:** {data.origin} -> {data.destination}"]
    lines.append(f"**Date:** {data.departure_date}")
    if data.return_date:
        lines.append(f"**Return:** {data.return_date}")
    lines.append(f"**Travelers:** {data.travelers} | **Class:** {data.cabin_class}")
    lines.append(f"**Source:** {data.source}\n")
    for i, opt in enumerate(data.options[:5], 1):
        segs = " -> ".join(
            f"{s.departure_airport} to {s.arrival_airport} ({s.airline} {s.flight_number})"
            for s in opt.segments
        )
        lines.append(f"### Option {i}: ${opt.price_per_person}/person")
        lines.append(f"- Segments: {segs}")
        lines.append(f"- Total Duration: {opt.total_duration}")
        lines.append(f"- Layovers: {opt.layovers}")
        if opt.layover_cities:
            lines.append(f"- Layover Cities: {', '.join(opt.layover_cities)}")
        lines.append(f"- Total Price: ${opt.total_price} {opt.currency}")
        lines.append(f"- Baggage: {opt.baggage}")
        if opt.booking_url:
            lines.append(f"- Book: {opt.booking_url}")
        lines.append("")
    return "\n".join(lines)


def _fmt_accommodation(data: AccommodationSearchResult) -> str:
    if not data.options:
        return "No accommodation data available."
    lines = [f"**Location:** {data.destination}"]
    lines.append(f"**Dates:** {data.check_in} to {data.check_out} ({data.nights} nights)")
    lines.append(f"**Guests:** {data.guests} | **Source:** {data.source}\n")
    for i, opt in enumerate(data.options[:8], 1):
        lines.append(f"### Option {i}: {opt.name} ({opt.provider})")
        lines.append(f"- Type: {opt.property_type}")
        lines.append(f"- Rating: {opt.rating}/5 ({opt.review_count} reviews)")
        lines.append(f"- Price: ${opt.price_per_night}/night | Total: ${opt.total_price}")
        if opt.neighborhood:
            lines.append(f"- Neighborhood: {opt.neighborhood}")
        if opt.amenities:
            lines.append(f"- Amenities: {', '.join(opt.amenities[:8])}")
        lines.append(f"- Cancellation: {opt.cancellation_policy}")
        lines.append(f"- Breakfast: {'Included' if opt.breakfast_included else 'Not included'}")
        if opt.booking_url:
            lines.append(f"- Book: {opt.booking_url}")
        lines.append("")
    return "\n".join(lines)


def _fmt_activities(data: ActivitySearchResult) -> str:
    lines = [f"**Destination:** {data.destination}"]
    lines.append(f"**Interests:** {', '.join(data.interests)}\n")
    if data.attractions:
        lines.append("## Attractions & Places")
        for i, a in enumerate(data.attractions[:8], 1):
            lines.append(f"{i}. **{a.name}** — {a.category}")
            lines.append(f"   Rating: {a.rating}/5 ({a.review_count} reviews)")
            if a.address:
                lines.append(f"   Address: {a.address}")
            if a.price:
                lines.append(f"   Approx. cost: ${a.price}")
            if a.opening_hours:
                lines.append(f"   Hours: {a.opening_hours}")
        lines.append("")
    if data.tours:
        lines.append("## Tours & Experiences (Bookable)")
        for i, t in enumerate(data.tours[:8], 1):
            lines.append(f"{i}. **{t.name}**")
            lines.append(f"   {t.description}")
            lines.append(f"   Rating: {t.rating}/5 ({t.review_count} reviews)")
            if t.price:
                lines.append(f"   Price: ${t.price}/person")
            if t.duration:
                lines.append(f"   Duration: {t.duration}")
            if t.booking_url:
                lines.append(f"   Book: {t.booking_url}")
        lines.append("")
    if data.dining:
        lines.append("## Restaurants & Dining")
        for i, d in enumerate(data.dining[:8], 1):
            lines.append(f"{i}. **{d.name}** — {d.category}")
            lines.append(f"   Rating: {d.rating}/5 ({d.review_count} reviews)")
            if d.address:
                lines.append(f"   Address: {d.address}")
            if d.price:
                lines.append(f"   Approx. cost: ${d.price}/person")
            if d.booking_url:
                lines.append(f"   Link: {d.booking_url}")
        lines.append("")
    if not data.attractions and not data.tours and not data.dining:
        lines.append("No activity data available.")
    return "\n".join(lines)


def _fmt_logistics(data: LogisticsResult) -> str:
    lines = []
    if data.routes:
        lines.append("## Transport Routes")
        for r in data.routes:
            lines.append(f"- **{r.mode.title()}:** {r.origin} -> {r.destination}")
            lines.append(f"  Distance: {r.distance} | Duration: {r.duration}")
            if r.fare:
                lines.append(f"  Fare: {r.fare}")
        lines.append("")
    if data.weather:
        lines.append("## Weather Forecast")
        for w in data.weather:
            lines.append(
                f"- {w.date}: {w.description}, "
                f"High {w.temperature_high}°C / Low {w.temperature_low}°C, "
                f"Humidity {w.humidity}%"
            )
        lines.append("")
    if data.currency:
        lines.append("## Currency")
        lines.append(f"1 {data.currency.base_currency} = {data.currency.rate} {data.currency.target_currency}")
        lines.append("")
    if data.country:
        c = data.country
        lines.append("## Country Information")
        lines.append(f"- **Country:** {c.name}")
        lines.append(f"- **Capital:** {c.capital}")
        lines.append(f"- **Currency:** {c.currency_name} ({c.currency_code})")
        lines.append(f"- **Languages:** {', '.join(c.languages)}")
        lines.append(f"- **Timezone:** {c.timezone}")
        if c.visa_info:
            lines.append(f"- **Visa:** {c.visa_info}")
        if c.safety_info:
            lines.append(f"- **Safety:** {c.safety_info}")
        lines.append("")
    if not lines:
        return "No logistics data available."
    return "\n".join(lines)


# ── Main pipeline ───────────────────────────────────────────────────

async def run_travel_pipeline(
    user_request: str,
    progress_callback: ProgressCallback = None,
) -> str:
    """
    Main pipeline:
    1. AI parses user request -> structured params
    2. APIs fetch real data in parallel (no AI)
    3. AI compiles final itinerary from real data
    """

    async def notify(key: str, label: str, status: str):
        if progress_callback:
            await progress_callback(key, label, status)

    loop = asyncio.get_event_loop()

    # ── Step 1: AI parses user request ────────────────────────────
    await notify("planning", "行程规划解析", "running")
    logger.info("Step 1: Parsing user request with AI...")

    knowledge_tool = TravelKnowledgeTool()
    manager = create_travel_manager(tools=[knowledge_tool])
    planning_task = create_planning_task(manager, user_request)

    planning_crew = Crew(
        agents=[manager],
        tasks=[planning_task],
        process=Process.sequential,
        verbose=False,  # ← REDUCED: was True, saves tokens
    )

    planning_result = str(await loop.run_in_executor(None, planning_crew.kickoff))
    await notify("planning", "行程规划解析", "completed")
    logger.info(f"Planning result: {planning_result[:300]}...")

    # ── Parse structured params ───────────────────────────────────
    params = _extract_params(planning_result, user_request)

    # ── 中国目的地 → 走美团快速通道 ──────────────────────────────
    destination = params.get("destination", "")
    if is_chinese_destination(destination):
        logger.info(f"检测到中国目的地 {destination}，使用美团查询")
        await notify("data_fetch", "美团酒旅数据查询", "running")
        try:
            client = ServiceRegistry.get_meituan()
            meituan_result = await client.search(
                to_chinese_name(destination),
                user_request,
            )
            await notify("data_fetch", "美团酒旅数据查询", "completed")
            return meituan_result
        except RuntimeError as e:
            logger.error(f"美团查询失败: {e}")
            await notify("data_fetch", "美团酒旅数据查询", "error")
            logger.info("降级到原有国际API流程")

    # ── Step 2: Fetch real data from APIs in parallel ─────────────
    await notify("data_fetch", "实时数据查询", "running")
    logger.info("Step 2: Fetching real-time data from APIs...")

    # Use SINGLETON services from registry
    flight_service = ServiceRegistry.get_flights()
    accommodation_service = ServiceRegistry.get_accommodation()
    activity_service = ServiceRegistry.get_activities()
    logistics_service = ServiceRegistry.get_logistics()

    # All API calls in parallel
    flights_task = flight_service.search(
        origin=params["origin"],
        destination=params["destination"],
        departure_date=params["departure_date"],
        return_date=params.get("return_date") or "",
        travelers=params["travelers"],
        cabin_class=params["cabin_class"],
    )
    accommodation_task = accommodation_service.search(
        destination=params["destination"],
        check_in=params["departure_date"],
        check_out=params.get("return_date") or params["departure_date"],
        guests=params["travelers"],
    )
    activities_task = activity_service.search(
        destination=params["destination"],
        interests=params["interests"],
    )
    logistics_task = logistics_service.get_logistics(
        destination_city=params["destination"],
        destination_country=params["country"],
        origin=params["origin"],
    )

    flights_data, accommodation_data, activities_data, logistics_data = await asyncio.gather(
        flights_task, accommodation_task, activities_task, logistics_task,
    )

    await notify("data_fetch", "实时数据查询", "completed")
    logger.info("All API data fetched successfully")

    # ── Step 3: Knowledge Expert (RAG) ────────────────────────────
    await notify("knowledge", "旅行知识查询", "running")
    logger.info("Step 3: Getting travel knowledge from RAG...")

    knowledge_agent = create_travel_knowledge_agent(tools=[knowledge_tool])
    knowledge_task_obj = create_knowledge_task(
        knowledge_agent,
        destination=", ".join(params.get("destinations", [params["destination"]])),
    )
    knowledge_crew = Crew(
        agents=[knowledge_agent],
        tasks=[knowledge_task_obj],
        process=Process.sequential,
        verbose=False,
    )
    knowledge_result = str(await loop.run_in_executor(None, knowledge_crew.kickoff))
    await notify("knowledge", "旅行知识查询", "completed")

    # ── Step 4: AI compiles final itinerary ───────────────────────
    await notify("compilation", "行程编排与优化", "running")
    logger.info("Step 4: Compiling itinerary with AI...")

    flights_text = _fmt_flights(flights_data)
    accommodation_text = _fmt_accommodation(accommodation_data)
    activities_text = _fmt_activities(activities_data)
    logistics_text = _fmt_logistics(logistics_data)

    compiler = create_itinerary_compiler()
    compilation_task_obj = create_compilation_task(
        agent=compiler,
        user_request=user_request,
        planning_output=planning_result,
        flights_data=flights_text,
        accommodation_data=accommodation_text,
        activities_data=activities_text,
        logistics_data=logistics_text,
        knowledge_output=knowledge_result,
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


# ── Param extraction ────────────────────────────────────────────────

def _extract_params(planning_output: str, original_request: str) -> dict:
    """Extract structured parameters from the planning AI output."""
    output_lower = planning_output.lower()
    request_lower = original_request.lower()
    today = date.today().isoformat()

    params = {
        "origin": "北京",
        "destination": "",
        "destinations": [],
        "country": "",
        "departure_date": today,
        "return_date": "",
        "travelers": 2,
        "cabin_class": "economy",
        "interests": ["美食", "文化", "自然风光"],
    }

    known_cities = {
        "paris": ("Paris", "France"), "rome": ("Rome", "Italy"),
        "florence": ("Florence", "Italy"), "venice": ("Venice", "Italy"),
        "barcelona": ("Barcelona", "Spain"), "london": ("London", "UK"),
        "tokyo": ("Tokyo", "Japan"), "new york": ("New York", "USA"),
        "dubai": ("Dubai", "UAE"), "bali": ("Bali", "Indonesia"),
        "amsterdam": ("Amsterdam", "Netherlands"), "berlin": ("Berlin", "Germany"),
        "lisbon": ("Lisbon", "Portugal"), "bangkok": ("Bangkok", "Thailand"),
        "sydney": ("Sydney", "Australia"),
        # Chinese cities
        "北京": ("北京", "中国"), "上海": ("上海", "中国"),
        "广州": ("广州", "中国"), "深圳": ("深圳", "中国"),
        "杭州": ("杭州", "中国"), "成都": ("成都", "中国"),
        "beijing": ("北京", "中国"), "shanghai": ("上海", "中国"),
        "guangzhou": ("广州", "中国"), "shenzhen": ("深圳", "中国"),
        "hangzhou": ("杭州", "中国"), "chengdu": ("成都", "中国"),
        "wuhan": ("武汉", "中国"), "xian": ("西安", "中国"),
        "nanjing": ("南京", "中国"), "chongqing": ("重庆", "中国"),
        "suzhou": ("苏州", "中国"), "kunming": ("昆明", "中国"),
        "xiamen": ("厦门", "中国"), "qingdao": ("青岛", "中国"),
        "dalian": ("大连", "中国"), "sanya": ("三亚", "中国"),
        "guilin": ("桂林", "中国"), "lijiang": ("丽江", "中国"),
        "dali": ("大理", "中国"), "changsha": ("长沙", "中国"),
        "harbin": ("哈尔滨", "中国"),
    }

    destinations = []
    country = ""
    for key, (city_name, country_name) in known_cities.items():
        if key in output_lower or key in request_lower:
            destinations.append(city_name)
            if not country:
                country = country_name

    if destinations:
        params["destination"] = destinations[0]
        params["destinations"] = destinations
        params["country"] = country

    # Traveler count
    m = re.search(r"(\d+)\s*(traveler|adult|person|people)", output_lower)
    if m:
        params["travelers"] = int(m.group(1))

    # Dates
    dates = re.findall(r"\d{4}-\d{2}-\d{2}", planning_output)
    if len(dates) >= 1:
        params["departure_date"] = dates[0]
    if len(dates) >= 2:
        params["return_date"] = dates[1]

    # Cabin class
    for cls in ["first", "business", "premium_economy"]:
        if cls in output_lower:
            params["cabin_class"] = cls
            break

    # Interests
    keywords = ["food", "history", "art", "culture", "adventure", "nightlife",
                 "shopping", "nature", "beach", "nature", "sports", "photography",
                 "美食", "历史", "文化", "自然", "海滩", "购物", "冒险"]
    found = [k for k in keywords if k in output_lower or k in request_lower]
    if found:
        params["interests"] = found

    return params
