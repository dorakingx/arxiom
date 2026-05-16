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

    def listen_for_problems(self) -> list[dict[str, Any]]:
        """Poll for new ProblemCreated events."""
        latest_block = self.web3.eth.block_number
        from_block = max(0, latest_block - 50)
        event = self.contract.events.ProblemCreated
        logs = event.get_logs(from_block=from_block, to_block="latest")

        new_problems: list[dict[str, Any]] = []
        for entry in logs:
            args = entry["args"]
            problem_id = int(args["problemId"])
            if problem_id in self._seen_problem_ids:
                continue

            self._seen_problem_ids.add(problem_id)
            problem = {
                "problem_id": problem_id,
                "creator": args["creator"],
                "description_uri": args["descriptionURI"],
                "bounty_amount": int(args["bountyAmount"]),
            }
            logger.info("Detected new problem: %s", problem)
            new_problems.append(problem)

        return new_problems

    def decompose_problem(self, problem: dict[str, Any]) -> list[dict[str, Any]]:
        """Decompose a problem into sub-tasks via LLM (with stub fallback on failure)."""
        return llm_decompose_problem(problem, self.config)

    def dispatch_sub_agents(self, tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Trigger mock x402 micro-payments and collect sub-agent outputs."""
        results: list[dict[str, Any]] = []
        for task in tasks:
            logger.info("Paying sub-agent for task %s via x402 mock", task["task_id"])
            result = pay_and_fetch(
                task["sub_agent_url"],
                payload={
                    "task_id": task["task_id"],
                    "description": task["description"],
                },
                private_key=self.config.master_private_key,
            )
            results.append(result)
        return results

    def aggregate_and_submit(
        self, problem_id: int, sub_results: list[dict[str, Any]]
    ) -> str:
        """Aggregate sub-agent outputs and submit the final solution on-chain."""
        solution_uri = f"ipfs://solution-{problem_id}-{int(time.time())}"
        solution_payload = {
            "problem_id": problem_id,
            "solution_uri": solution_uri,
            "sub_results": sub_results,
        }
        logger.info("Submitting solution: %s", json.dumps(solution_payload))

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
        tx["gas"] = gas_estimate

        signed = self.account.sign_transaction(tx)
        tx_hash = self.web3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
        logger.info("Solution submitted in tx %s (status=%s)", tx_hash.hex(), receipt.status)
        return tx_hash.hex()

    def process_problem(self, problem: dict[str, Any]) -> None:
        tasks = self.decompose_problem(problem)
        sub_results = self.dispatch_sub_agents(tasks)
        self.aggregate_and_submit(problem["problem_id"], sub_results)

    def run(self) -> None:
        """Main loop: poll for problems and orchestrate solving."""
        logger.info("Master agent started at %s", self.account.address)
        while True:
            try:
                for problem in self.listen_for_problems():
                    self.process_problem(problem)
            except Exception:
                logger.exception("Error in master agent loop")
            time.sleep(self.config.poll_interval_seconds)


def main() -> None:
    config = load_config()
    agent = MasterAgent(config)
    agent.run()


if __name__ == "__main__":
    main()
