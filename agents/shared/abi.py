import json
from pathlib import Path

ARTIFACT_PATH = (
    Path(__file__).resolve().parents[2]
    / "artifacts"
    / "contracts"
    / "ArxiomEscrow.sol"
    / "ArxiomEscrow.json"
)


def load_arxiom_escrow_abi() -> list:
    """Load the Hardhat artifact ABI for ArxiomEscrow."""
    if not ARTIFACT_PATH.exists():
        raise FileNotFoundError(
            f"Contract artifact not found at {ARTIFACT_PATH}. "
            "Run `npx hardhat compile` from the repository root first."
        )

    with ARTIFACT_PATH.open(encoding="utf-8") as artifact_file:
        artifact = json.load(artifact_file)
    return artifact["abi"]
