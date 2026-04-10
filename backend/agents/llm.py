"""
LLM factory for creating Gemini instances.
"""

from crewai import LLM


def create_gemini_llm() -> LLM:
    """Create a rate-limit-aware Gemini LLM via LiteLLM.

    is_litellm=True forces CrewAI to use LiteLLM which has built-in
    429 retry with exponential backoff — critical for Gemini free tier (5 RPM).
    """
    return LLM(
        model="gemini/gemini-2.0-flash",
        is_litellm=True,
        max_retries=10,
        timeout=300,
    )
