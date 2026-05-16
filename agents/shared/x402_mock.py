"""
Mock x402 buyer flow for local development.

Production integrations should follow https://docs.x402.org/introduction
and use a real facilitator for /verify and /settle.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

import requests

PAYMENT_HEADER = "X-PAYMENT"


def build_mock_payment_payload(payment_instructions: dict[str, Any]) -> str:
    """Create a placeholder signed payment authorization for local testing."""
    return json.dumps(
        {
            "scheme": "mock",
            "paymentId": str(uuid.uuid4()),
            "amount": payment_instructions.get("amount"),
            "recipient": payment_instructions.get("recipient"),
            "network": payment_instructions.get("network", "kite-testnet"),
        }
    )


def pay_and_fetch(url: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    """
    Execute a miniature x402 payment flow:
    1. Request resource -> 402 Payment Required
    2. Build payment proof
    3. Retry with X-PAYMENT header -> 200 OK + result
    """
    initial_response = requests.get(url, params=payload, timeout=10)
    if initial_response.status_code != 402:
        raise RuntimeError(
            f"Expected HTTP 402 from {url}, got {initial_response.status_code}"
        )

    payment_instructions = initial_response.json()
    payment_proof = build_mock_payment_payload(payment_instructions)

    paid_response = requests.get(
        url,
        params=payload,
        headers={PAYMENT_HEADER: payment_proof},
        timeout=10,
    )
    if paid_response.status_code != 200:
        raise RuntimeError(
            f"Paid request to {url} failed with status {paid_response.status_code}"
        )

    return paid_response.json()
