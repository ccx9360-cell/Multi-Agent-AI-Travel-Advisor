"""
FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config.settings import settings
from backend.api.routes import router
from backend.api.websocket import websocket_endpoint
from backend.agents.llm import _get_api_key

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    if not _get_api_key():
        logger.warning("LLM API Key 未配置。请检查 .env 或 ~/.codex/auth.json。AI agents 将无法工作。")
    if not settings.amadeus_api_key:
        logger.warning("AMADEUS_API_KEY not set. Flight search will use SerpApi fallback.")
    if not settings.serpapi_key:
        logger.warning("SERPAPI_KEY not set. No flight search fallback available.")
    yield


app = FastAPI(
    title="AI Travel Planner API",
    version="2.0.0",
    description="Multi-Agent Travel Planner with real-time API data",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routes
app.include_router(router)

# WebSocket endpoint
app.websocket("/ws/{session_id}")(websocket_endpoint)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
