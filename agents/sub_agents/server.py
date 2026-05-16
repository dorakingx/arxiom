"""
FastAPI sub-agent server — x402 seller and task worker.

Enforces the HTTP 402 Payment Required flow: issues a nonce challenge, verifies
EIP-191 ECDSA payment authorization from the Master Agent, then executes work.
"""

from __future__ import annotations

import uuid

import uvicorn
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.responses import JSONResponse

from shared.x402_mock import (
    PAYMENT_SENDER_HEADER,
    PAYMENT_SIGNATURE_HEADER,
    verify_payment_authorization,
)

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8402
PAYMENT_AMOUNT = "1000"

app = FastAPI(title="arXiom Sub-Agent")
pending_payments: dict[str, dict[str, str]] = {}


def execute_task(task_id: str, description: str) -> str:
    """Simple aggregation stub; replace with real sub-agent LLM later."""
    summary = description.strip()[:500]
    return f"Sub-agent completed task '{task_id}'. Summary: {summary}"


def _payment_required(task_id: str) -> JSONResponse:
    nonce = str(uuid.uuid4())
    pending_payments[task_id] = {"nonce": nonce, "amount": PAYMENT_AMOUNT}
    return JSONResponse(
        status_code=402,
        content={"amount": PAYMENT_AMOUNT, "nonce": nonce},
    )


@app.get("/task", response_model=None)
def get_task(
    task_id: str = Query(default="task-0"),
    description: str = Query(default="unspecified task"),
    x_payment_sender: str | None = Header(default=None, alias=PAYMENT_SENDER_HEADER),
    x_payment_signature: str | None = Header(default=None, alias=PAYMENT_SIGNATURE_HEADER),
):
    if not x_payment_sender or not x_payment_signature:
        return _payment_required(task_id)

    pending = pending_payments.get(task_id)
    if pending is None:
        return _payment_required(task_id)

    if not verify_payment_authorization(
        x_payment_sender,
        x_payment_signature,
        pending["nonce"],
        pending["amount"],
    ):
        raise HTTPException(status_code=401, detail="invalid_payment_signature")

    del pending_payments[task_id]
    result = execute_task(task_id, description)
    return {"status": "success", "result": result}


def main() -> None:
    uvicorn.run(app, host=DEFAULT_HOST, port=DEFAULT_PORT)


if __name__ == "__main__":
    main()
