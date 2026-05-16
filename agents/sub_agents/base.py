"""
Sub-agent stub with an x402-compatible HTTP endpoint and ECDSA payment verification.
"""

from __future__ import annotations

import json
import secrets
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, ClassVar
from urllib.parse import parse_qs, urlparse

from shared.x402_mock import (
    PAYMENT_SENDER_HEADER,
    PAYMENT_SIGNATURE_HEADER,
    verify_payment_authorization,
)

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8402


class SubAgent:
    """Specialized worker agent that returns deterministic mock outputs."""

    def handle_task(self, payload: dict[str, Any]) -> dict[str, Any]:
        task_id = payload.get("task_id", "unknown")
        description = payload.get("description", "")
        return {
            "task_id": task_id,
            "status": "completed",
            "output": f"Mock result for: {description}",
        }


class SubAgentRequestHandler(BaseHTTPRequestHandler):
    sub_agent = SubAgent()
    pending_payments: ClassVar[dict[str, dict[str, str]]] = {}

    def log_message(self, format: str, *args: Any) -> None:
        return

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/task":
            self.send_error(404, "Not Found")
            return

        query = {key: values[0] for key, values in parse_qs(parsed.query).items()}
        task_id = query.get("task_id", "task-0")
        payload = {
            "task_id": task_id,
            "description": query.get("description", "unspecified task"),
        }

        sender = self.headers.get(PAYMENT_SENDER_HEADER)
        signature = self.headers.get(PAYMENT_SIGNATURE_HEADER)

        if not sender or not signature:
            self._send_payment_required(task_id)
            return

        pending = self.pending_payments.get(task_id)
        if pending is None:
            self._send_payment_required(task_id)
            return

        if not verify_payment_authorization(
            sender, signature, pending["nonce"], pending["amount"]
        ):
            self._send_error_response(402, {"error": "invalid_payment_signature"})
            return

        del self.pending_payments[task_id]

        result = self.sub_agent.handle_task(payload)
        body = json.dumps(result).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_payment_required(self, task_id: str) -> None:
        nonce = secrets.token_hex(16)
        amount = "0.001"
        self.pending_payments[task_id] = {"nonce": nonce, "amount": amount}

        payment_instructions = {
            "amount": amount,
            "nonce": nonce,
            "recipient": "0xSubAgentWallet000000000000000000000000",
            "token": "KITE",
            "network": "kite-testnet",
        }
        body = json.dumps(payment_instructions).encode("utf-8")
        self.send_response(402)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_error_response(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run_mock_server(host: str = DEFAULT_HOST, port: int = DEFAULT_PORT) -> None:
    server = HTTPServer((host, port), SubAgentRequestHandler)
    print(f"Sub-agent mock server listening on http://{host}:{port}/task")
    server.serve_forever()


def main() -> None:
    run_mock_server()


if __name__ == "__main__":
    main()
