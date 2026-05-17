"""
LLM-powered problem decomposition for the Master Agent.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

import requests
from openai import APIError, APITimeoutError, OpenAI
from pydantic import BaseModel, Field

from master_agent.config import AgentConfig

logger = logging.getLogger(__name__)

MAX_PROBLEM_TEXT_CHARS = 12_000
FETCH_TIMEOUT_SECONDS = 15

SYSTEM_PROMPT = """You are a Master AI Agent Manager for a decentralized scientific problem-solving network.

Your job is to decompose a scientific or computational problem into discrete, actionable sub-tasks
that specialized sub-agents can execute independently.

Guidelines:
- Produce 2-6 focused tasks with clear deliverables.
- Each task must be self-contained and verifiable.
- Prefer concrete data gathering, computation, analysis, and verification steps.
- Use short snake_case task_id values without spaces (e.g. gather_data, run_simulation).
- Assign each task a distinct specialist role title (e.g. "Computational Biologist", "Numerical Analyst", "Literature Review Agent") that a sub-agent marketplace would list.
"""


class SubTaskSpec(BaseModel):
    task_id: str
    description: str
    role: str = Field(default="General AI Worker")


class ProblemDecomposition(BaseModel):
    tasks: list[SubTaskSpec] = Field(min_length=1)


def fetch_problem_description(uri: str) -> str:
    """Load problem text from a URI or use the URI string as inline text."""
    uri = uri.strip()
    if not uri:
        raise ValueError("description URI is empty")

    parsed = urlparse(uri)

    if parsed.scheme in ("http", "https"):
        response = requests.get(uri, timeout=FETCH_TIMEOUT_SECONDS)
        response.raise_for_status()
        text = response.text.strip()
    elif parsed.scheme == "file":
        file_path = Path(unquote(parsed.path))
        text = file_path.read_text(encoding="utf-8").strip()
    else:
        text = uri.strip()

    if not text:
        raise ValueError("problem description text is empty after fetch")

    return text[:MAX_PROBLEM_TEXT_CHARS]


def _normalize_task_id(problem_id: int, task_id: str) -> str:
    cleaned = task_id.strip().replace(" ", "_")
    prefix = f"{problem_id}-"
    if cleaned.startswith(prefix):
        return cleaned
    return f"{prefix}{cleaned}"


def _validate_tasks(tasks: list[SubTaskSpec], problem_id: int) -> list[SubTaskSpec]:
    valid: list[SubTaskSpec] = []
    for task in tasks:
        task_id = task.task_id.strip()
        description = task.description.strip()
        if not task_id or not description:
            logger.warning("Skipping malformed sub-task: %s", task)
            continue
        role = (task.role or "General AI Worker").strip() or "General AI Worker"
        valid.append(
            SubTaskSpec(
                task_id=_normalize_task_id(problem_id, task_id),
                description=description,
                role=role,
            )
        )

    if not valid:
        raise ValueError("no valid sub-tasks after validation")

    return valid


def decompose_with_llm(
    problem_text: str,
    problem_id: int,
    *,
    api_key: str,
    model: str,
) -> list[SubTaskSpec]:
    client = OpenAI(api_key=api_key)
    user_prompt = (
        f"Problem ID: {problem_id}\n\n"
        f"Problem statement:\n{problem_text}\n\n"
        "Decompose this into sub-agent tasks."
    )

    completion = client.beta.chat.completions.parse(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        response_format=ProblemDecomposition,
    )

    parsed = completion.choices[0].message.parsed
    if parsed is None:
        raise ValueError("LLM returned no parsed decomposition")

    return _validate_tasks(parsed.tasks, problem_id)


def stub_fallback_tasks(
    problem_id: int, description_uri: str, sub_agent_url: str
) -> list[dict[str, Any]]:
    """Deterministic fallback when LLM or fetch fails."""
    return [
        {
            "task_id": f"{problem_id}-gather",
            "description": f"Gather data for {description_uri}",
            "role": "Data Archivist",
            "sub_agent_url": sub_agent_url,
        },
        {
            "task_id": f"{problem_id}-verify",
            "description": f"Verify solution candidate for {description_uri}",
            "role": "Verification Scientist",
            "sub_agent_url": sub_agent_url,
        },
    ]


def _to_dispatch_tasks(
    specs: list[SubTaskSpec], sub_agent_url: str
) -> list[dict[str, Any]]:
    return [
        {
            "task_id": spec.task_id,
            "description": spec.description,
            "role": spec.role,
            "sub_agent_url": sub_agent_url,
        }
        for spec in specs
    ]


def decompose_problem(problem: dict[str, Any], config: AgentConfig) -> list[dict[str, Any]]:
    """
    Decompose a problem into sub-agent tasks using an LLM, with safe fallbacks.
    Never raises — always returns a task list.
    """
    problem_id = int(problem["problem_id"])
    description_uri = str(problem["description_uri"])

    problem_text: str | None = None

    try:
        problem_text = fetch_problem_description(description_uri)
    except Exception as exc:
        logger.warning(
            "Failed to fetch problem description from %s: %s; using URI as text",
            description_uri,
            exc,
        )
        problem_text = description_uri.strip() or None

    if not problem_text:
        logger.warning("No problem text available for problem %s; using stub tasks", problem_id)
        return stub_fallback_tasks(problem_id, description_uri, config.sub_agent_url)

    try:
        specs = decompose_with_llm(
            problem_text,
            problem_id,
            api_key=config.openai_api_key,
            model=config.openai_model,
        )
        tasks = _to_dispatch_tasks(specs, config.sub_agent_url)
        logger.info(
            "LLM decomposed problem %s into %d tasks: %s",
            problem_id,
            len(tasks),
            [t["task_id"] for t in tasks],
        )
        return tasks
    except (APIError, APITimeoutError) as exc:
        logger.error("OpenAI API error decomposing problem %s: %s", problem_id, exc)
    except Exception as exc:
        logger.warning("LLM decomposition failed for problem %s: %s", problem_id, exc)

    return stub_fallback_tasks(problem_id, description_uri, config.sub_agent_url)
