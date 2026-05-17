"""
Master Agent: monitors ArxiomEscrow, decomposes problems, pays sub-agents via mock x402, and submits solutions.
"""

from __future__ import annotations

import json
import logging
import sys
import time
from pathlib import Path
from typing import Any

from eth_account import Account
from web3 import Web3
from web3.contract import Contract

AGENTS_ROOT = Path(__file__).resolve().parents[1]
if str(AGENTS_ROOT) not in sys.path:
    sys.path.insert(0, str(AGENTS_ROOT))

from master_agent.config import AgentConfig, load_config
from master_agent.problem_decomposer import decompose_problem as llm_decompose_problem
from shared.abi import load_arxiom_escrow_abi
from shared.x402_mock import pay_and_fetch

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Wider window than a single poll tick so restarts still see recent ProblemCreated events.
LISTEN_BLOCK_RANGE = 500
MAX_SUBTASK_DESCRIPTION_CHARS = 2_000


class MasterAgent:
    def __init__(self, config: AgentConfig) -> None:
        self.config = config
        self.web3 = Web3(Web3.HTTPProvider(config.rpc_url))
        if not self.web3.is_connected():
            raise ConnectionError(f"Unable to connect to RPC at {config.rpc_url}")

        self.account = Account.from_key(config.master_private_key)
        abi = load_arxiom_escrow_abi()
        self.contract: Contract = self.web3.eth.contract(
            address=Web3.to_checksum_address(config.escrow_address),
            abi=abi,
        )
        self._seen_problem_ids: set[int] = set()

    def _is_problem_unsolved(self, problem_id: int) -> bool:
        """Return False if the bounty was already claimed on-chain."""
        try:
            _id, creator, _uri, _bounty, is_resolved, _solver, _solution = (
                self.contract.functions.getProblem(problem_id).call()
            )
            if creator == "0x0000000000000000000000000000000000000000":
                return False
            return not is_resolved
        except Exception as exc:
            logger.warning("Could not read problem %s: %s", problem_id, exc)
            return False

    def listen_for_problems(self) -> list[dict[str, Any]]:
        """Poll for new ProblemCreated events (does not mark problems as seen)."""
        latest_block = self.web3.eth.block_number
        from_block = max(0, latest_block - LISTEN_BLOCK_RANGE)
        event = self.contract.events.ProblemCreated
        logs = event.get_logs(from_block=from_block, to_block="latest")

        new_problems: list[dict[str, Any]] = []
        for entry in logs:
            args = entry["args"]
            problem_id = int(args["problemId"])
            if problem_id in self._seen_problem_ids:
                continue

            problem = {
                "problem_id": problem_id,
                "creator": args["creator"],
                "description_uri": args["descriptionURI"],
                "bounty_amount": int(args["bountyAmount"]),
            }
            logger.info("Detected problem candidate: %s", problem)
            new_problems.append(problem)

        return new_problems

    def decompose_problem(self, problem: dict[str, Any]) -> list[dict[str, Any]]:
        """Decompose a problem into sub-tasks via LLM (with stub fallback on failure)."""
        return llm_decompose_problem(problem, self.config)

    def dispatch_sub_agents(self, tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Trigger mock x402 micro-payments and collect sub-agent outputs."""
        results: list[dict[str, Any]] = []
        for task in tasks:
            task_id = str(task["task_id"])
            description = str(task["description"])[:MAX_SUBTASK_DESCRIPTION_CHARS]
            role = str(task.get("role") or "General AI Worker").strip() or "General AI Worker"
            sub_agent_url = str(task["sub_agent_url"])

            query_payload = {
                "task_id": task_id,
                "description": description,
                "role": role,
            }

            logger.info(
                "Dispatching marketplace specialist '%s' for task %s → %s",
                role,
                task_id,
                sub_agent_url,
            )

            try:
                result = pay_and_fetch(
                    sub_agent_url,
                    payload=query_payload,
                    private_key=self.config.master_private_key,
                )
            except Exception as exc:
                logger.error(
                    "Sub-agent dispatch failed for task %s (%s): %s",
                    task_id,
                    role,
                    exc,
                )
                fallback_body = (
                    f"**[Executed by {role}]**\n\n"
                    f"[Sub-agent dispatch error] {exc}\n\n"
                    f"Task: {description[:400]}"
                )
                result = {
                    "status": "error",
                    "result": fallback_body,
                    "role": role,
                }

            result["task_id"] = task_id
            result["role"] = role
            results.append(result)
        return results

    def aggregate_and_submit(
        self, problem_id: int, sub_results: list[dict[str, Any]]
    ) -> str:
        """Aggregate sub-agent outputs and submit the final solution on-chain."""
        sections: list[str] = [
            "## Aggregated Multi-Agent Solution\n",
            f"**Problem #{problem_id}** · {len(sub_results)} specialist sub-agents via x402\n",
        ]
        for entry in sub_results:
            result_text = str(entry.get("result", "")).strip()
            if result_text:
                sections.append(result_text)

        inline_markdown = "\n\n---\n\n".join(sections)
        max_inline_chars = 6_000
        if len(inline_markdown) <= max_inline_chars:
            solution_uri = inline_markdown
        else:
            solution_uri = f"ipfs://solution-{problem_id}-{int(time.time())}"

        solution_payload = {
            "problem_id": problem_id,
            "solution_uri": solution_uri[:200] + ("..." if len(solution_uri) > 200 else ""),
            "sub_results": sub_results,
        }
        logger.info("Submitting solution: %s", json.dumps(solution_payload, default=str))

        nonce = self.web3.eth.get_transaction_count(self.account.address)
        tx = self.contract.functions.solveProblem(
            problem_id, solution_uri
        ).build_transaction(
            {
                "from": self.account.address,
                "nonce": nonce,
                "chainId": self.config.chain_id,
            }
        )
        gas_estimate = self.web3.eth.estimate_gas(tx)
        tx["gas"] = int(gas_estimate * 1.2)

        signed = self.account.sign_transaction(tx)
        raw_tx = getattr(signed, "raw_transaction", None) or getattr(
            signed, "rawTransaction", None
        )
        if raw_tx is None:
            raise AttributeError("Signed transaction missing raw bytes")

        tx_hash = self.web3.eth.send_raw_transaction(raw_tx)
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
        logger.info("Solution submitted in tx %s (status=%s)", tx_hash.hex(), receipt.status)
        return tx_hash.hex()

    def process_problem(self, problem: dict[str, Any]) -> None:
        problem_id = int(problem["problem_id"])
        if not self._is_problem_unsolved(problem_id):
            logger.info("Skipping problem %s — already solved or missing", problem_id)
            return

        tasks = self.decompose_problem(problem)
        sub_results = self.dispatch_sub_agents(tasks)
        self.aggregate_and_submit(problem_id, sub_results)

    def run(self) -> None:
        """Main loop: poll for problems and orchestrate solving."""
        logger.info("Master agent started at %s", self.account.address)
        while True:
            try:
                for problem in self.listen_for_problems():
                    problem_id = int(problem["problem_id"])
                    try:
                        if not self._is_problem_unsolved(problem_id):
                            logger.info(
                                "Marking problem %s seen (already resolved)",
                                problem_id,
                            )
                            self._seen_problem_ids.add(problem_id)
                            continue

                        self.process_problem(problem)
                        self._seen_problem_ids.add(problem_id)
                    except Exception:
                        logger.exception(
                            "Failed to process problem %s — will retry on next poll",
                            problem_id,
                        )
            except Exception:
                logger.exception("Error in master agent loop")
            time.sleep(self.config.poll_interval_seconds)


def main() -> None:
    config = load_config()
    agent = MasterAgent(config)
    agent.run()


if __name__ == "__main__":
    main()
