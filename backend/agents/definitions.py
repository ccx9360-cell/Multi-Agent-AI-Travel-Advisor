"""
AI Agent definitions — China-focused travel planning.
"""
from crewai import Agent
from typing import List
from backend.agents.llm import create_gemini_llm


def create_travel_manager(tools: List = None) -> Agent:
    """Parses user requests into structured travel parameters."""
    return Agent(
        role="旅行规划经理",
        goal=(
            "将用户的旅行需求解析为结构化参数：目的地、日期、人数、预算、兴趣。"
            "输出精确的结构化信息。"
        ),
        backstory=(
            "你是一名中国旅行规划专家。能从模糊的需求中提取精确信息，"
            "对缺失信息填充合理默认值。熟悉中国所有热门旅游城市。"
        ),
        tools=tools or [],
        llm=create_gemini_llm(),
        verbose=False,
        allow_delegation=False,
        max_iter=5,
    )


def create_travel_knowledge_agent(tools: List = None) -> Agent:
    """Provides China travel knowledge via RAG."""
    return Agent(
        role="中国旅行知识专家",
        goal=(
            "提供专业的中国旅行建议：目的地攻略、美食推荐、"
            "交通建议、最佳旅行季节、预算参考等。"
        ),
        backstory=(
            "你是一部中国旅行百科全书，熟悉全国所有热门旅游目的地的"
            "景点、美食、交通和住宿信息。能给出实用、接地气的建议。"
        ),
        tools=tools or [],
        llm=create_gemini_llm(),
        verbose=False,
        allow_delegation=False,
    )


def create_itinerary_compiler(tools: List = None) -> Agent:
    """Synthesizes all data into the final itinerary."""
    return Agent(
        role="行程编排与优化师",
        goal=(
            "将美团酒旅数据、天气信息、交通信息和攻略知识"
            "整合成一份实用的每日行程，逻辑合理、节奏适中。"
        ),
        backstory=(
            "你是一名资深的中国旅行规划师。你会按区域分组活动以减少交通时间，"
            "平衡充实日与休闲日，包含所有实用细节：地址、价格、电话、营业时间。"
            "特别擅长规划城市游、美食游和自然风光游。"
        ),
        tools=tools or [],
        llm=create_gemini_llm(),
        verbose=False,
        allow_delegation=False,
    )
