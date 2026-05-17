#!/usr/bin/env python3
"""Read-only pre-demo check: Master Agent has >= 0.1 KITE staked on ArxiomEscrow."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from eth_account import Account
from web3 import Web3

AGENTS_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = AGENTS_ROOT.parent
_env_file = AGENTS_ROOT / ".env"
if not _env_file.is_file():
    print(f"FAIL: Missing {_env_file}")
    sys.exit(1)
load_dotenv(_env_file, override=True)

STAKE_REQUIREMENT_WEI = 100_000_000_000_000_000  # 0.1 ether
RPC_URL = os.getenv("KITE_RPC_URL", "https://rpc-testnet.gokite.ai/")


def main() -> int:
    escrow = os.getenv("ARXIOM_ESCROW_ADDRESS", "").strip()
    private_key = os.getenv("MASTER_AGENT_PRIVATE_KEY", "").strip()

    if not escrow:
        print("FAIL: ARXIOM_ESCROW_ADDRESS is not set in agents/.env")
        return 1
    if not private_key:
        print("FAIL: MASTER_AGENT_PRIVATE_KEY is not set in agents/.env")
        return 1

    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not w3.is_connected():
        print(f"FAIL: Cannot connect to Kite RPC at {RPC_URL}")
        return 1

    master = Account.from_key(private_key)
    checksum_master = Web3.to_checksum_address(master.address)
    checksum_escrow = Web3.to_checksum_address(escrow)

    abi = [
        {
            "inputs": [{"internalType": "address", "name": "", "type": "address"}],
            "name": "solverStakes",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function",
        }
    ]
    contract = w3.eth.contract(address=checksum_escrow, abi=abi)
    stake_wei: int = contract.functions.solverStakes(checksum_master).call()

    print("=== ON-CHAIN STAKE VERIFICATION ===")
    print(f"RPC:              {RPC_URL}")
    print(f"Escrow:           {checksum_escrow}")
    print(f"Master address:   {checksum_master}")
    print(f"Staked (wei):     {stake_wei}")
    print(f"Required (wei):   {STAKE_REQUIREMENT_WEI} (0.1 KITE)")

    if stake_wei >= STAKE_REQUIREMENT_WEI:
        print("PASS: Master Agent is registered with sufficient stake.")
        return 0

    print("FAIL: Stake below 0.1 KITE — run registerAsSolver() with --value 0.1ether")
    return 1


if __name__ == "__main__":
    sys.exit(main())
