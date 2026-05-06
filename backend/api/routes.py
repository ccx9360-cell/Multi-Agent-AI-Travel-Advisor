"""
REST API routes for the travel planner.
"""

import os
import uuid
import asyncio
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException

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
