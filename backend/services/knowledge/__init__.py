# Knowledge service package
"""
知识库服务 — ChromaDB 向量检索。

便捷函数:
    query_knowledge_base(query, destination=None, top_k=5) -> str
    get_destination_info(city) -> str
    get_knowledge_count() -> int
"""

from typing import Optional


def _get_rag():
    from backend.services.knowledge.rag_service import RAGService
    return RAGService()


def query_knowledge_base(query: str, destination: Optional[str] = None, top_k: int = 5) -> str:
    """查询 RAG 知识库。返回格式化的知识文本。"""
    rag = _get_rag()
    return rag.query(query=query, destination=destination, top_k=top_k)


def get_destination_info(city: str) -> str:
    """获取目的地概览信息。"""
    rag = _get_rag()
    return rag.get_destination_info(city)


def get_knowledge_count() -> int:
    """知识库中的文档数量。"""
    rag = _get_rag()
    return rag.count
