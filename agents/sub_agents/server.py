"""
FastAPI sub-agent server — x402 seller and task worker.

Enforces the HTTP 402 Payment Required flow: issues a nonce challenge, verifies
EIP-191 ECDSA payment authorization from the Master Agent, then executes paid work
via an OpenAI-powered Sub-Agent Worker.
"""

from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.responses import JSONResponse
from openai import APIError, APITimeoutError, OpenAI

from shared.x402_mock import (
    PAYMENT_SENDER_HEADER,
    PAYMENT_SIGNATURE_HEADER,
    verify_payment_authorization,
)

AGENTS_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(AGENTS_ROOT / ".env")
load_dotenv(AGENTS_ROOT.parent / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MAX_DESCRIPTION_CHARS = 8_000
DEFAULT_ROLE = "General AI Worker"

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8402
PAYMENT_AMOUNT = "1000"

app = FastAPI(title="arXiom Sub-Agent")
pending_payments: dict[str, dict[str, str]] = {}

_openai_client: OpenAI | None = None


def build_system_prompt(role: str) -> str:
    """Build a role-specific system prompt for the sub-agent marketplace."""
    return f"""You are a specialized {role} in the arXiom decentralized problem-solving network.

You receive a single sub-task description from a Master Agent. As a {role}, produce a detailed, synthesized response as if you performed the work: data analysis, algorithm design, simulation outline, verification steps, or computational methodology.

Stay in character for your specialty. Be concrete and technical. Structure the answer with clear sections. Do not refuse; simulate expert output for the hackathon demo."""


def format_result_with_role(role: str, content: str) -> str:
    """Prefix worker output with a markdown role badge for the bounty board UI."""
    return f"**[Executed by {role}]**\n\n{content}"


def get_openai_client() -> OpenAI:
    global _openai_client
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="openai_not_configured")
    if _openai_client is None:
        _openai_client = OpenAI(api_key=OPENAI_API_KEY)
    return _openai_client


def _fallback_result(task_id: str, description: str, reason: str, role: str) -> str:
    snippet = description.strip()[:500]
    body = (
        f"[Sub-agent fallback] Task '{task_id}' could not be completed by the AI worker.\n"
        f"Reason: {reason}\n\n"
        f"Task description: {snippet}"
    )
    return format_result_with_role(role, body)


def execute_task(task_id: str, description: str, role: str = DEFAULT_ROLE) -> str:
    """
    Run specialized sub-agent work via OpenAI after x402 payment verification.

    Returns LLM output on success, or a graceful fallback string if the API fails
    (keeps HTTP 200 so the Master Agent pipeline can continue).
    """
    text = description.strip()
    if not text:
        return _fallback_result(task_id, description, "empty task description", role)

    text = text[:MAX_DESCRIPTION_CHARS]
    client = get_openai_client()
    system_prompt = build_system_prompt(role)

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        f"Task ID: {task_id}\n"
                        f"Specialist role: {role}\n\n"
                        f"Sub-task description:\n{text}\n\n"
                        "Provide your detailed worker output."
                    ),
                },
            ],
        )
        content = (response.choices[0].message.content or "").strip()
        if not content:
            logger.warning("OpenAI returned empty content for task %s (%s)", task_id, role)
            return _fallback_result(task_id, description, "empty LLM response", role)
        logger.info(
            "Sub-agent completed task %s as '%s' (%d chars)",
            task_id,
            role,
            len(content),
        )
        return format_result_with_role(role, content)
    except HTTPException:
        raise
    except (APIError, APITimeoutError) as exc:
        logger.error("OpenAI API error for task %s (%s): %s", task_id, role, exc)
        return _fallback_result(task_id, description, str(exc), role)
    except Exception as exc:
        logger.exception("Unexpected error for task %s (%s)", task_id, role)
        return _fallback_result(task_id, description, str(exc), role)


def _payment_required(task_id: str, role: str) -> JSONResponse:
    nonce = str(uuid.uuid4())
    pending_payments[task_id] = {
        "nonce": nonce,
        "amount": PAYMENT_AMOUNT,
        "role": role,
    }
    return JSONResponse(
        status_code=402,
        content={"amount": PAYMENT_AMOUNT, "nonce": nonce},
    )


@app.get("/task", response_model=None)
def get_task(
    task_id: str = Query(default="task-0"),
    description: str = Query(default="unspecified task"),
    role: str = Query(default=DEFAULT_ROLE),
    x_payment_sender: str | None = Header(default=None, alias=PAYMENT_SENDER_HEADER),
    x_payment_signature: str | None = Header(default=None, alias=PAYMENT_SIGNATURE_HEADER),
):
    specialist_role = role.strip() or DEFAULT_ROLE

    if not x_payment_sender or not x_payment_signature:
        return _payment_required(task_id, specialist_role)

    pending = pending_payments.get(task_id)
    if pending is None:
        return _payment_required(task_id, specialist_role)

    if not verify_payment_authorization(
        x_payment_sender,
        x_payment_signature,
        pending["nonce"],
        pending["amount"],
    ):
        raise HTTPException(status_code=401, detail="invalid_payment_signature")

    effective_role = pending.get("role", specialist_role)
    del pending_payments[task_id]

    try:
        result = execute_task(task_id, description, effective_role)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Sub-agent worker failed for task %s (%s)", task_id, effective_role)
        raise HTTPException(status_code=500, detail="sub_agent_worker_failed") from exc

    return {"status": "success", "result": result, "role": effective_role}


def main() -> None:
    uvicorn.run(app, host=DEFAULT_HOST, port=DEFAULT_PORT)


if __name__ == "__main__":
    main()
