"""
RAG 知识库服务 — 基于 ChromaDB 的本地向量检索。

提供中国旅行攻略的语义搜索，支持缓存和自动更新。
"""
import hashlib
import logging
import os
import json
from typing import Optional, List
from datetime import datetime

import chromadb
from chromadb.config import Settings as ChromaSettings

from ..cache import cached

logger = logging.getLogger(__name__)

CHROMA_PATH = os.path.expanduser("~/.hermes/chroma_db")
COLLECTION_NAME = "china_travel_knowledge"

# ── 数据目录 ───────────────────────────────────────────────────
KNOWLEDGE_DATA_DIR = os.path.join(
    os.path.dirname(__file__), "data"
)


class RAGService:
    """RAG 知识库服务。线程安全，支持缓存。"""

    _instance = None
    _collection = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._init_chroma()

    def _init_chroma(self):
        """初始化 ChromaDB 客户端和集合。"""
        try:
            os.makedirs(CHROMA_PATH, exist_ok=True)
            self._client = chromadb.PersistentClient(
                path=CHROMA_PATH,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            # 获取或创建集合
            existing = self._client.list_collections()
            names = [c.name for c in existing]
            if COLLECTION_NAME in names:
                self._collection = self._client.get_collection(COLLECTION_NAME)
                count = self._collection.count()
                logger.info(f"RAG: 加载已有知识库 ({count} 条记录)")
            else:
                self._collection = self._client.create_collection(COLLECTION_NAME)
                logger.info("RAG: 创建新知识库集合")
                # 初次创建时加载数据
                self._load_all_data()
        except Exception as e:
            logger.warning(f"RAG 初始化失败 (降级为无知识库): {e}")
            self._collection = None

    def _load_all_data(self):
        """加载所有知识数据到 ChromaDB。"""
        count = 0
        # 加载城市知识
        try:
            from .data.city_knowledge import CITY_KNOWLEDGE
            for city, data in CITY_KNOWLEDGE.items():
                count += self._index_city(city, data)
        except ImportError as e:
            logger.error(f"加载城市知识失败: {e}")

        logger.info(f"RAG: 已加载 {count} 条知识记录")

    def _index_city(self, city: str, data: dict) -> int:
        """将城市知识向量化并存入 ChromaDB。"""
        if self._collection is None:
            return 0

        documents = []
        metadatas = []
        ids = []

        # 城市简介
        info_text = f"【{city}简介】{data.get('info', '')}"
        documents.append(info_text)
        metadatas.append({"city": city, "category": "info", "source": "city_knowledge"})
        ids.append(f"{city}_info")

        # 景点
        for i, (name, desc) in enumerate(data.get("attractions", [])):
            text = f"【{city}景点】{name}：{desc}"
            documents.append(text)
            metadatas.append({"city": city, "category": "attraction", "name": name, "source": "city_knowledge"})
            ids.append(f"{city}_attr_{i}")

        # 美食
        for i, (name, desc) in enumerate(data.get("food", [])):
            text = f"【{city}美食】{name}：{desc}"
            documents.append(text)
            metadatas.append({"city": city, "category": "food", "name": name, "source": "city_knowledge"})
            ids.append(f"{city}_food_{i}")

        # 交通
        transport_text = f"【{city}交通】{data.get('transport', '')}"
        documents.append(transport_text)
        metadatas.append({"city": city, "category": "transport", "source": "city_knowledge"})
        ids.append(f"{city}_transport")

        # 住宿
        accom_text = f"【{city}住宿】{data.get('accommodation', '')}"
        documents.append(accom_text)
        metadatas.append({"city": city, "category": "accommodation", "source": "city_knowledge"})
        ids.append(f"{city}_accommodation")

        # 最佳季节
        season_text = f"【{city}最佳季节】{data.get('best_season', '')}"
        documents.append(season_text)
        metadatas.append({"city": city, "category": "season", "source": "city_knowledge"})
        ids.append(f"{city}_season")

        # 预算
        budget_text = f"【{city}预算】{data.get('budget', '')}"
        documents.append(budget_text)
        metadatas.append({"city": city, "category": "budget", "source": "city_knowledge"})
        ids.append(f"{city}_budget")

        # 小贴士
        tips_text = f"【{city}小贴士】{data.get('tips', '')}"
        documents.append(tips_text)
        metadatas.append({"city": city, "category": "tip", "source": "city_knowledge"})
        ids.append(f"{city}_tips")

        # 批量添加
        batch_size = 50
        for start in range(0, len(documents), batch_size):
            end = min(start + batch_size, len(documents))
            try:
                self._collection.add(
                    documents=documents[start:end],
                    metadatas=metadatas[start:end],
                    ids=ids[start:end],
                )
            except Exception as e:
                logger.warning(f"添加 {city} 知识到 ChromaDB 失败: {e}")
                return 0

        logger.info(f"  已索引 {city}: {len(documents)} 条")
        return len(documents)

    @cached(ttl_seconds=30)  # 相同查询30秒内直接返回
    def query(self, query: str, destination: Optional[str] = None, top_k: int = 5) -> str:
        """
        查询知识库。

        Args:
            query: 用户问题
            destination: 目的地城市（可选）
            top_k: 返回结果数量

        Returns:
            格式化的知识文本
        """
        if self._collection is None:
            return ""

        try:
            # 构建查询条件
            where_filter = None
            if destination:
                where_filter = {"city": destination}

            results = self._collection.query(
                query_texts=[query],
                n_results=top_k * 2,  # 多取一些过滤后更准
                where=where_filter,
            )

            if not results or not results["documents"] or not results["documents"][0]:
                # 如果指定城市没找到，尝试全局搜索
                if destination:
                    results = self._collection.query(
                        query_texts=[query],
                        n_results=top_k,
                    )

            if not results or not results["documents"] or not results["documents"][0]:
                return ""

            docs = results["documents"][0]
            metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
            distances = results["distances"][0] if results.get("distances") else [0] * len(docs)

            # 格式化输出
            lines = []
            seen = set()
            for doc, meta, dist in zip(docs, metas, distances):
                # 去重
                key = doc[:50]
                if key in seen:
                    continue
                seen.add(key)

                city = meta.get("city", "")
                category = meta.get("category", "")
                category_icon = {
                    "attraction": "🏛️", "food": "🍜", "transport": "🚇",
                    "accommodation": "🏨", "season": "📅", "budget": "💰",
                    "tip": "💡", "info": "📖",
                }.get(category, "📌")

                lines.append(f"{category_icon} **{city}** | {doc}")

            return "\n\n".join(lines[:top_k])

        except Exception as e:
            logger.error(f"RAG 查询失败: {e}")
            return ""

    def get_destination_info(self, city: str) -> str:
        """获取目的地概览信息。"""
        return self.query(f"介绍{city}的景点美食和旅行攻略", destination=city, top_k=10)

    def get_food_recommendations(self, city: str) -> str:
        """获取美食推荐。"""
        return self.query(f"{city}有什么好吃的", destination=city, top_k=5)

    def get_attractions(self, city: str) -> str:
        """获取景点推荐。"""
        return self.query(f"{city}必去景点", destination=city, top_k=8)

    def get_budget_estimate(self, city: str) -> str:
        """获取预算参考。"""
        return self.query(f"{city}旅行预算", destination=city, top_k=3)

    def reload(self) -> int:
        """重新加载所有知识数据（用于定时更新）。"""
        if self._collection is not None:
            try:
                self._client.delete_collection(COLLECTION_NAME)
            except Exception:
                pass
        self._collection = self._client.create_collection(COLLECTION_NAME)
        self._load_all_data()
        count = self._collection.count() if self._collection else 0
        logger.info(f"RAG: 知识库已重新加载 ({count} 条)")
        return count

    @property
    def count(self) -> int:
        """知识库中的文档数量。"""
        if self._collection is None:
            return 0
        try:
            return self._collection.count()
        except Exception:
            return 0
