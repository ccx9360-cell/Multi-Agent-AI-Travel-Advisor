"""
FastAPI Backend for Multi-Agent AI Travel Planner
Wraps the existing CrewAI pipeline with REST + WebSocket endpoints
"""

import os
import sys
import uuid
import json
import asyncio
import logging
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Add project root to path so we can import existing modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# --- Storage ---
# In-memory store for itineraries (would be a DB in production)
itinerary_store: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    if not os.getenv("GEMINI_API_KEY"):
        print("WARNING: GEMINI_API_KEY not set. Crew execution will fail.")
    yield


app = FastAPI(title="AI Travel Planner API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Models ---
class TravelRequest(BaseModel):
    message: str


class ItineraryResponse(BaseModel):
    id: str
    request: str
    itinerary: str
    created_at: str
    status: str


# --- WebSocket Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        self.active_connections.pop(session_id, None)

    async def send_message(self, session_id: str, message: dict):
        ws = self.active_connections.get(session_id)
        if ws:
            await ws.send_json(message)


manager = ConnectionManager()


# --- Agent Progress Tracking ---
AGENT_STEPS = [
    {"key": "planning", "label": "Travel Planning Manager", "description": "Analyzing your request..."},
    {"key": "flights", "label": "Flight Research Specialist", "description": "Searching for flights..."},
    {"key": "accommodation", "label": "Accommodation Specialist", "description": "Finding hotels..."},
    {"key": "activities", "label": "Activities & Experiences Curator", "description": "Curating activities..."},
    {"key": "logistics", "label": "Travel Logistics Coordinator", "description": "Planning transportation..."},
    {"key": "knowledge", "label": "Travel Knowledge Expert", "description": "Gathering travel tips..."},
    {"key": "compilation", "label": "Itinerary Compiler & Optimizer", "description": "Building your itinerary..."},
]


def run_crew_sync(user_request: str) -> str:
    """Run the CrewAI crew synchronously with retry logic for rate limits"""
    import time
    import re

    max_attempts = 3

    for attempt in range(1, max_attempts + 1):
        try:
            return _execute_crew(user_request)
        except Exception as e:
            error_msg = str(e)
            is_rate_limit = "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg or "rate" in error_msg.lower()

            if is_rate_limit and attempt < max_attempts:
                # Extract retry delay from error if available
                wait_time = 60  # default wait
                match = re.search(r"retry in ([\d.]+)s", error_msg, re.IGNORECASE)
                if match:
                    wait_time = int(float(match.group(1))) + 5  # add buffer

                logger.warning(
                    f"Rate limited (attempt {attempt}/{max_attempts}). "
                    f"Waiting {wait_time}s before retry..."
                )
                time.sleep(wait_time)
            else:
                raise


def _execute_crew(user_request: str) -> str:
    """Execute the CrewAI crew pipeline"""
    from tools.crewai_tools import FlightSearchTool, HotelSearchTool, ActivitySearchTool, TravelKnowledgeTool
    from agents.agents import (
        create_travel_manager, create_flight_agent, create_accommodation_agent,
        create_activity_agent, create_logistics_agent, create_itinerary_compiler_agent,
        create_travel_knowledge_agent,
    )
    from agents.tasks import (
        create_planning_task, create_flight_research_task, create_accommodation_research_task,
        create_activity_research_task, create_logistics_task, create_knowledge_consultation_task,
        create_itinerary_compilation_task,
    )
    from crewai import Crew, Process

    # Initialize tools
    tools = {
        "flight": FlightSearchTool(),
        "hotel": HotelSearchTool(),
        "activity": ActivitySearchTool(),
        "knowledge": TravelKnowledgeTool(),
    }

    # Create agents
    travel_manager = create_travel_manager(tools=[tools["knowledge"]])
    flight_agent = create_flight_agent(tools=[tools["flight"]])
    accommodation_agent = create_accommodation_agent(tools=[tools["hotel"]])
    activity_agent = create_activity_agent(tools=[tools["activity"], tools["knowledge"]])
    logistics_agent = create_logistics_agent(tools=[tools["knowledge"]])
    knowledge_agent = create_travel_knowledge_agent(tools=[tools["knowledge"]])
    itinerary_compiler = create_itinerary_compiler_agent(tools=[])

    # Create tasks
    planning_task = create_planning_task(travel_manager, user_request)
    flight_task = create_flight_research_task(flight_agent, planning_task)
    accommodation_task = create_accommodation_research_task(accommodation_agent, planning_task)
    activity_task = create_activity_research_task(activity_agent, planning_task)
    logistics_task = create_logistics_task(logistics_agent, planning_task)
    knowledge_task = create_knowledge_consultation_task(knowledge_agent, "the destinations mentioned in the travel plan")
    compilation_task = create_itinerary_compilation_task(
        agent=itinerary_compiler,
        planning_task=planning_task,
        flight_task=flight_task,
        accommodation_task=accommodation_task,
        activity_task=activity_task,
        logistics_task=logistics_task,
        knowledge_task=knowledge_task,
        user_request=user_request,
    )

    crew = Crew(
        agents=[travel_manager, flight_agent, accommodation_agent, activity_agent, logistics_agent, knowledge_agent, itinerary_compiler],
        tasks=[planning_task, flight_task, accommodation_task, activity_task, logistics_task, knowledge_task, compilation_task],
        process=Process.sequential,
        verbose=True,
    )

    result = crew.kickoff()
    return str(result)


async def run_crew_with_progress(session_id: str, user_request: str):
    """Run crew in background thread while sending progress updates via WebSocket"""
    itinerary_id = str(uuid.uuid4())

    # Store initial state
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
        # Run crew in a background thread
        loop = asyncio.get_event_loop()
        crew_future = loop.run_in_executor(None, run_crew_sync, user_request)
        logger.info(f"[{session_id}] Crew started for request: {user_request[:80]}...")

        # Send progress updates while the crew is still running
        for i, step in enumerate(AGENT_STEPS):
            if crew_future.done():
                # Crew already finished — mark all remaining agents as completed
                for j in range(i, len(AGENT_STEPS)):
                    s = AGENT_STEPS[j]
                    await manager.send_message(session_id, {
                        "type": "agent_progress",
                        "agent_key": s["key"],
                        "agent_label": s["label"],
                        "step": j + 1,
                        "total_steps": len(AGENT_STEPS),
                        "status": "completed",
                    })
                break

            # Mark current agent as running
            await manager.send_message(session_id, {
                "type": "agent_progress",
                "agent_key": step["key"],
                "agent_label": step["label"],
                "description": step["description"],
                "step": i + 1,
                "total_steps": len(AGENT_STEPS),
                "status": "running",
            })
            logger.info(f"[{session_id}] Agent running: {step['label']}")

            # Wait while polling the crew future
            # Non-last agents wait ~15s, last agent polls indefinitely until crew finishes
            max_polls = 15 if i < len(AGENT_STEPS) - 1 else 600
            for _ in range(max_polls):
                await asyncio.sleep(1)
                if crew_future.done():
                    break

            # Mark this agent as completed
            await manager.send_message(session_id, {
                "type": "agent_progress",
                "agent_key": step["key"],
                "agent_label": step["label"],
                "step": i + 1,
                "total_steps": len(AGENT_STEPS),
                "status": "completed",
            })
            logger.info(f"[{session_id}] Agent completed: {step['label']}")

        # Get the result (should be done by now)
        result = await crew_future
        logger.info(f"[{session_id}] Crew finished. Result length: {len(str(result))}")

        # Store result
        itinerary_store[itinerary_id]["itinerary"] = result
        itinerary_store[itinerary_id]["status"] = "completed"

        await manager.send_message(session_id, {
            "type": "completed",
            "itinerary_id": itinerary_id,
            "itinerary": result,
        })
        logger.info(f"[{session_id}] Sent completed message to frontend")

    except Exception as e:
        logger.error(f"[{session_id}] Crew failed: {e}", exc_info=True)
        itinerary_store[itinerary_id]["status"] = "failed"
        await manager.send_message(session_id, {
            "type": "error",
            "message": str(e),
        })


# --- REST Endpoints ---
@app.get("/api/health")
async def health_check():
    has_key = bool(os.getenv("GEMINI_API_KEY"))
    return {"status": "ok", "openai_key_configured": has_key}


@app.get("/api/itineraries")
async def list_itineraries():
    """List all saved itineraries"""
    items = sorted(itinerary_store.values(), key=lambda x: x["created_at"], reverse=True)
    return {"itineraries": items}


@app.get("/api/itineraries/{itinerary_id}")
async def get_itinerary(itinerary_id: str):
    """Get a specific itinerary by ID"""
    item = itinerary_store.get(itinerary_id)
    if not item:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    return item


@app.delete("/api/itineraries/{itinerary_id}")
async def delete_itinerary(itinerary_id: str):
    """Delete a specific itinerary"""
    if itinerary_id not in itinerary_store:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    del itinerary_store[itinerary_id]
    return {"status": "deleted"}


@app.post("/api/plan")
async def create_plan_rest(request: TravelRequest):
    """REST endpoint for creating a plan (non-streaming, for simple clients)"""
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, run_crew_sync, request.message)

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
        raise HTTPException(status_code=500, detail=str(e))


# --- WebSocket Endpoint ---
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time travel planning with progress updates"""
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "plan_request":
                user_message = data.get("message", "")
                if not user_message.strip():
                    await manager.send_message(session_id, {
                        "type": "error",
                        "message": "Please provide a travel request.",
                    })
                    continue

                if not os.getenv("GEMINI_API_KEY"):
                    await manager.send_message(session_id, {
                        "type": "error",
                        "message": "GEMINI_API_KEY not configured on the server.",
                    })
                    continue

                # Run crew with progress in background
                asyncio.create_task(run_crew_with_progress(session_id, user_message))

    except WebSocketDisconnect:
        manager.disconnect(session_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
