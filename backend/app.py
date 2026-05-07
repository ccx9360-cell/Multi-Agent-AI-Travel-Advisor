"""
FastAPI application entry point — China-focused.
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
        logger.warning("LLM API Key 未配置。AI agents 将无法工作。")
    if not settings.amap_api_key:
        logger.warning("AMAP_API_KEY 未配置。高德地图/天气服务将不可用。")
    if settings.amap_api_key:
        logger.info("高德地图已配置 ✓")

    # 预热 RAG 知识库
    logger.info("正在初始化 RAG 知识库...")
    try:
        from backend.services.knowledge.rag_service import RAGService
        rag = RAGService()
        count = rag.count
        if count > 0:
            logger.info(f"RAG 知识库已就绪 ({count} 条记录)")
        else:
            logger.warning("RAG 知识库为空，将自动加载数据。")
    except Exception as e:
        logger.warning(f"RAG 初始化跳过: {e}")

    # 初始化 SQLite 数据库 + 示例数据
    try:
        from backend.services.database import init_db, generate_sample_data
        init_db()
        generate_sample_data()
    except Exception as e:
        logger.warning(f"数据库初始化跳过: {e}")

    # 合并 CORS origins
    settings.cors_origins = list(set(settings.cors_origins + settings.cors_extra_origins))

    yield


app = FastAPI(
    title="AI 中国旅行规划助手",
    version="2.1.0",
    description="基于美团酒旅 + 高德地图 + 12306 的多智能体中国旅行规划助手",
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
