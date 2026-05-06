"""
AI Agent definitions — only 3 agents that still require LLM reasoning.
Data-fetching agents (flights, accommodation, activities, logistics)
are now pure API services and no longer need AI.
"""

from crewai import Agent
from typing import List
from backend.agents.llm import create_gemini_llm


def create_travel_manager(tools: List = None) -> Agent:
    """Parses user requests into structured travel parameters."""
    return Agent(
        role="Travel Planning Manager",
        goal=(
            "Parse user travel requests into structured parameters: "
            "destinations, dates, travelers, interests, budget. "
            "Output a precise structured breakdown."
        ),
        backstory=(
            "You are a travel planning expert. You extract precise details "
            "from vague requests and fill reasonable defaults for missing info."
        ),
        tools=tools or [],
        llm=create_gemini_llm(),
        verbose=False,  # ← REDUCED: was True
        allow_delegation=False,
        max_iter=5,     # ← REDUCED: was 10
    )


def create_travel_knowledge_agent(tools: List = None) -> Agent:
    """Provides cultural insights, visa info, and practical advice via RAG."""
    return Agent(
        role="Travel Knowledge Expert",
        goal=(
            "Provide expert travel advice, cultural insights, visa requirements, "
            "and destination-specific knowledge from the travel knowledge base."
        ),
        backstory=(
            "You are a travel encyclopedia with knowledge of destinations worldwide."
        ),
        tools=tools or [],
        llm=create_gemini_llm(),
        verbose=False,  # ← REDUCED: was True
        allow_delegation=False,
    )


def create_itinerary_compiler(tools: List = None) -> Agent:
    """Synthesizes all data into the final itinerary."""
    return Agent(
        role="Itinerary Compiler & Optimizer",
        goal=(
            "Synthesize real API data (flights, hotels, activities, logistics) "
            "into a practical day-by-day itinerary with logical flow and optimal pacing."
        ),
        backstory=(
            "You are a master travel planner. You group activities by neighborhood "
            "to minimize transit, balance busy days with downtime, and include all "
            "practical details: addresses, prices, and booking links."
        ),
        tools=tools or [],
        llm=create_gemini_llm(),
        verbose=False,  # ← REDUCED: was True
        allow_delegation=False,
    )
