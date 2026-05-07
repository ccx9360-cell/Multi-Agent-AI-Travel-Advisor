"""
Centralized configuration — China-focused.
Only keeps services relevant for domestic Chinese travel.
"""
import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    # --- LLM ---
    gemini_api_key: str = field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))

    # --- 高德地图 (POI, Routing, Weather) ---
    amap_api_key: str = field(default_factory=lambda: os.getenv("AMAP_API_KEY", ""))

    # --- 美团酒旅 ---
    meituan_config_path: str = field(
        default_factory=lambda: os.getenv("MEITUAN_CONFIG", "~/.config/meituan-travel/config.json")
    )

    # --- 12306 火车票微服务 ---
    train_api_url: str = field(
        default_factory=lambda: os.getenv("TRAIN_API_URL", "http://localhost:8001")
    )

    # --- RAG 知识库 ---
    knowledge_embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"
    knowledge_chroma_path: str = field(
        default_factory=lambda: os.getenv("KNOWLEDGE_CHROMA_PATH", os.path.expanduser("~/.hermes/chroma_db"))
    )

    # --- Service URLs ---
    amap_base_url: str = "https://restapi.amap.com/v3"

    # --- App ---
    cors_origins: list = field(default_factory=lambda: [
        "http://localhost:5173",
        "http://localhost:3000",
    ])


settings = Settings()
