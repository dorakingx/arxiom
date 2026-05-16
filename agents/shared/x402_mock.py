"""
x402-style M2M micropayment buyer flow with verifiable off-chain authorization.

This module simulates the HTTP 402 Payment Required handshake from the x402 protocol
(https://docs.x402.org/introduction). Instead of settling on-chain immediately, the
buyer (Master Agent) signs a deterministic payment intent message using EIP-191
personal_sign. The seller (sub-agent) recovers the payer address via ECDSA and grants
access—matching state-channel or off-chain micropayment verification patterns.

Production deployments should replace this mock with a real x402 facilitator /verify
and /settle endpoints on Kite AI.
"""

from __future__ import annotations

from typing import Any

import requests
from eth_account import Account
from eth_account.messages import encode_defunct

PAYMENT_SENDER_HEADER = "X-PAYMENT-SENDER"
PAYMENT_SIGNATURE_HEADER = "X-PAYMENT-SIGNATURE"

REQUEST_TIMEOUT_SECONDS = 10


def build_payment_message(nonce: str, amount: str) -> str:
    """Build the canonical x402 off-chain payment authorization message."""
    return f"x402-payment:{nonce}:{amount}"


def sign_payment_authorization(
    private_key: str, nonce: str, amount: str
) -> tuple[str, str]:
    """
    Sign a payment authorization with the buyer's Ethereum private key.

    Returns (checksum_sender_address, signature_hex_with_0x_prefix).
    """
    account = Account.from_key(private_key)
    message = encode_defunct(text=build_payment_message(nonce, amount))
    signed = account.sign_message(message)
    signature_hex = signed.signature.hex()
    if not signature_hex.startswith("0x"):
        signature_hex = f"0x{signature_hex}"
    return account.address, signature_hex


def verify_payment_authorization(
    sender: str, signature_hex: str, nonce: str, amount: str
) -> bool:
    """
    Verify that signature_hex authorizes payment for nonce and amount from sender.

    Uses ecrecover via eth_account to validate the EIP-191 personal_sign payload.
    """
    if not signature_hex.startswith("0x"):
        signature_hex = f"0x{signature_hex}"

    message = encode_defunct(text=build_payment_message(nonce, amount))
    recovered = Account.recover_message(message, signature=signature_hex)
    return recovered.lower() == sender.lower()


def pay_and_fetch(
    url: str,
    payload: dict[str, Any] | None,
    private_key: str,
) -> dict[str, Any]:
    """
    Execute an x402 buyer flow with a cryptographically verifiable payment proof.

    1. GET the resource -> 402 Payment Required (amount + nonce challenge)
    2. Sign ``x402-payment:<nonce>:<amount>`` with the Master Agent private key
    3. Retry GET with X-PAYMENT-SENDER and X-PAYMENT-SIGNATURE headers
    4. Return JSON body on 200 OK

    Raises RuntimeError on unexpected HTTP status; ValueError if 402 body is malformed.
    """
    initial_response = requests.get(url, params=payload, timeout=REQUEST_TIMEOUT_SECONDS)
    if initial_response.status_code != 402:
        raise RuntimeError(
            f"Expected HTTP 402 from {url}, got {initial_response.status_code}"
        )

    payment_instructions = initial_response.json()
    amount = payment_instructions.get("amount")
    nonce = payment_instructions.get("nonce")
    if not amount or not nonce:
        raise ValueError(
            f"402 response from {url} must include 'amount' and 'nonce': {payment_instructions}"
        )

    sender, signature = sign_payment_authorization(private_key, str(nonce), str(amount))

    paid_response = requests.get(
        url,
        params=payload,
        headers={
            PAYMENT_SENDER_HEADER: sender,
            PAYMENT_SIGNATURE_HEADER: signature,
        },
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    if paid_response.status_code != 200:
        raise RuntimeError(
            f"Paid request to {url} failed with status {paid_response.status_code}: "
            f"{paid_response.text}"
        )

    return paid_response.json()
