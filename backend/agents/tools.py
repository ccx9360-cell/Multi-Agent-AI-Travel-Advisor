"""
CrewAI tool wrappers — the knowledge/RAG tool for AI agents.
"""
from crewai.tools import BaseTool
from typing import Type, Optional
from pydantic import BaseModel, Field


class TravelKnowledgeInput(BaseModel):
    """Input for TravelKnowledgeTool"""
    query: str = Field(..., description="关于中国旅行的问题")
    destination: Optional[str] = Field(default=None, description="目的地城市（可选）")


class TravelKnowledgeTool(BaseTool):
    name: str = "获取中国旅行知识"
    description: str = (
        "获取中国城市旅行攻略、景点推荐、美食推荐、交通建议、预算参考等。"
        "用于回答关于目的地景点、美食、交通的问题。"
    )
    args_schema: Type[BaseModel] = TravelKnowledgeInput

    def _run(self, query: str, destination: Optional[str] = None) -> str:
        """Retrieve travel knowledge from RAG system."""
        try:
            from backend.services.knowledge.rag_service import RAGService
            rag = RAGService()
            return rag.query(query=query, destination=destination)
        except Exception as e:
            return f"知识库暂不可用: {e}"
