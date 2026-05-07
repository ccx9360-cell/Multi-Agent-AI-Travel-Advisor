"""
REST API routes for the travel planner.
"""

import os
import uuid
import asyncio
import logging
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.models.schemas import TravelRequest
from backend.crew.orchestrator import run_travel_pipeline
from backend.api.websocket import itinerary_store
from backend.agents.llm import _get_api_key

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "llm_configured": bool(_get_api_key()),
    }


@router.get("/itineraries")
async def list_itineraries():
    """List all saved itineraries."""
    items = sorted(itinerary_store.values(), key=lambda x: x["created_at"], reverse=True)
    return {"itineraries": items}


@router.get("/itineraries/{itinerary_id}")
async def get_itinerary(itinerary_id: str):
    """Get a specific itinerary by ID."""
    item = itinerary_store.get(itinerary_id)
    if not item:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    return item


@router.delete("/itineraries/{itinerary_id}")
async def delete_itinerary(itinerary_id: str):
    """Delete a specific itinerary."""
    if itinerary_id not in itinerary_store:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    del itinerary_store[itinerary_id]
    return {"status": "deleted"}


@router.post("/plan")
async def create_plan(request: TravelRequest):
    """REST endpoint for creating a travel plan (non-streaming)."""
    if not _get_api_key():
        raise HTTPException(status_code=500, detail="LLM API Key not configured")

    try:
        result = await run_travel_pipeline(request.message)

        itinerary_id = str(uuid.uuid4())
        itinerary_store[itinerary_id] = {
            "id": itinerary_id,
            "request": request.message,
            "itinerary": result,
            "created_at": datetime.now().isoformat(),
            "status": "completed",
        }
        return itinerary_store[itinerary_id]
    except Exception as e:
        logger.error(f"Plan creation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 火车票查询 API ──────────────────────────────────────────────


@router.get("/trains")
async def search_trains(
    from_station: str = Query(..., description="出发站（如：北京）"),
    to_station: str = Query(..., description="到达站（如：上海）"),
    date_str: str = Query(default="", description="日期（YYYY-MM-DD，默认今天）"),
):
    """查询中国火车票。直接调用 12306 公开接口，无需登录。"""
    from backend.services.trains.train_service import query_trains

    query_date = date_str or date.today().isoformat()
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, query_trains, from_station, to_station, query_date)
    return result


# ── 天气查询 API ────────────────────────────────────────────────


@router.get("/weather")
async def search_weather(city: str = Query(..., description="城市名（如：北京）")):
    """查询实时天气和天气预报。使用高德天气 API。"""
    from backend.services.amap_weather import amap_weather

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, amap_weather, city)
    return result


# ── RAG 知识库 API ────────────────────────────────────────────────


class KnowledgeQuery(BaseModel):
    query: str
    destination: Optional[str] = None
    top_k: int = 5


@router.post("/knowledge/query")
async def query_knowledge(req: KnowledgeQuery):
    """查询旅行知识库（RAG）。"""
    try:
        from backend.services.knowledge import query_knowledge_base

        result = query_knowledge_base(req.query, req.destination, req.top_k)
        return {"query": req.query, "result": result, "length": len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/knowledge/count")
async def knowledge_count():
    """知识库中的文档数量。"""
    try:
        from backend.services.knowledge import get_knowledge_count
        return {"count": get_knowledge_count()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
