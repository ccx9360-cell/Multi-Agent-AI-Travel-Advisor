"""
LLM factory — auto-detects API key: .env → codex auth.json → Gemini fallback
Uses the same 银河录像局 relay that Codex CLI uses for gpt-5.4.
"""

import os
import json
from crewai import LLM

_RELAY_URL = "https://relay.nf.video/v1"


def _get_api_key() -> str:
    """Try .env first, then codex auth.json."""
    key = os.getenv("GEMINI_API_KEY", "")
    if key and key != "your_gemini_api_key_here":
        return key

    auth_path = os.path.expanduser("~/.codex/auth.json")
    try:
        with open(auth_path) as f:
            data = json.load(f)
            return data.get("OPENAI_API_KEY", "")
    except (FileNotFoundError, json.JSONDecodeError):
        pass

    return ""


def create_gemini_llm() -> LLM:
    """Create an LLM via 银河录像局 relay (preferred) or Gemini (fallback)."""
    api_key = _get_api_key()

    if api_key:
        return LLM(
            model="openai/gpt-5.4",
            base_url=_RELAY_URL,
            api_key=api_key,
            is_litellm=True,
            max_retries=5,
            timeout=300,
        )

    # Fallback to Gemini
    print("⚠️  未检测到 API Key，使用 Gemini 免费版（请设置 GEMINI_API_KEY）")
    return LLM(
        model="gemini/gemini-2.0-flash",
        is_litellm=True,
        max_retries=10,
        timeout=300,
    )
