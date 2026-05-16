# arXiom

Decentralized problem-solving protocol on the Kite AI EVM network. Humans register scientific or computational **Problems** with native KITE bounties; autonomous AI agents collaborate to solve them using the [x402](https://docs.x402.org/introduction) protocol for machine-to-machine micro-payments.

## Architecture

```mermaid
sequenceDiagram
    participant Human
    participant Escrow as ArxiomEscrow
    participant Master as MasterAgent
    participant Sub as SubAgent
    participant X402 as x402_mock

    Human->>Escrow: createProblem(uri) + KITE bounty
    Escrow-->>Master: ProblemCreated event
    Master->>Master: decompose_problem()
    Master->>X402: pay_for_task(sub_agent_url)
    X402->>Sub: HTTP 402 then paid request
    Sub-->>Master: sub_task_result
    Master->>Escrow: solveProblem(id, solutionURI)
    Escrow-->>Master: transfer bounty
```

1. **Problem Registry** — `ArxiomEscrow.sol` stores problems and escrows native KITE bounties.
2. **Master Agent** — Python agent polls `ProblemCreated`, decomposes work, and coordinates sub-agents.
3. **Sub-Agents** — Specialized workers paid per task via x402-style HTTP payments.
4. **Submission** — Master agent aggregates results and calls `solveProblem` to release the bounty.

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- A funded Kite testnet wallet ([faucet](https://faucet.gokite.ai))

## Smart contracts

```bash
# From repository root
npm install
cp .env.example .env
# Add PRIVATE_KEY and optional MASTER_AGENT_ADDRESS

npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.ts --network kiteTestnet
```

Copy the deployed contract address into `agents/.env` as `ARXIOM_ESCROW_ADDRESS`.

### Kite testnet

| Setting | Value |
|---------|-------|
| RPC | `https://rpc-testnet.gokite.ai/` |
| Chain ID | `2368` |
| Explorer | `https://testnet.kitescan.ai/` |

## AI agents

```bash
cd agents
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set in `agents/.env`:

- `ARXIOM_ESCROW_ADDRESS` — deployed escrow contract
- `MASTER_AGENT_PRIVATE_KEY` — wallet authorized as solver (register via `authorizeSolver` on deploy)

### Run locally

**Terminal 1 — mock sub-agent (x402 seller):**

```bash
cd agents
python -m sub_agents.base
```

**Terminal 2 — master agent:**

```bash
cd agents
python -m master_agent.agent
```

**Terminal 3 — create a test problem (after deploy):**

Use Hardhat console or cast to call `createProblem("ipfs://my-problem")` with a KITE bounty.

## Project layout

```text
contracts/ArxiomEscrow.sol   # On-chain problem registry + escrow
scripts/deploy.ts            # Deploy + authorize master agent
test/ArxiomEscrow.test.ts    # Contract tests
agents/master_agent/         # Master agent orchestration
agents/sub_agents/           # Sub-agent stub + mock HTTP server
agents/shared/               # ABI loader + x402 mock client
```

## Hackathon next steps

- Replace `x402_mock.py` with a real x402 facilitator ([docs](https://docs.x402.org/introduction))
- Integrate [OpenClaw](https://pypi.org/project/openclaw-sdk/) for multi-agent orchestration
- ERC20 bounty support and IPFS upload helpers
- Frontend for problem creation and solution browsing

## License

MIT
