import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

AGENTS_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(AGENTS_ROOT / ".env")
load_dotenv(AGENTS_ROOT.parent / ".env")


@dataclass(frozen=True)
class AgentConfig:
    rpc_url: str
    chain_id: int
    escrow_address: str
    master_private_key: str
    sub_agent_url: str
    poll_interval_seconds: int


def load_config() -> AgentConfig:
    escrow_address = os.getenv("ARXIOM_ESCROW_ADDRESS", "")
    master_private_key = os.getenv("MASTER_AGENT_PRIVATE_KEY", "")

    if not escrow_address:
        raise ValueError("ARXIOM_ESCROW_ADDRESS is required")
    if not master_private_key:
        raise ValueError("MASTER_AGENT_PRIVATE_KEY is required")

    return AgentConfig(
        rpc_url=os.getenv("KITE_RPC_URL", "https://rpc-testnet.gokite.ai/"),
        chain_id=int(os.getenv("KITE_CHAIN_ID", "2368")),
        escrow_address=escrow_address,
        master_private_key=master_private_key,
        sub_agent_url=os.getenv("SUB_AGENT_URL", "http://127.0.0.1:8402/task"),
        poll_interval_seconds=int(os.getenv("POLL_INTERVAL_SECONDS", "5")),
    )
