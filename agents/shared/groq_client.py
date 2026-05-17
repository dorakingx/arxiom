"""Groq LLM client (OpenAI-compatible API, free tier for hackathon demos)."""

from __future__ import annotations

from openai import OpenAI

GROQ_BASE_URL = "https://api.groq.com/openai/v1"


def create_groq_client(api_key: str) -> OpenAI:
    return OpenAI(api_key=api_key, base_url=GROQ_BASE_URL)
