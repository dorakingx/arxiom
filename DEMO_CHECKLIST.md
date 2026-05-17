# arXiom — Final Demo Recording Checklist

Use this script **before** you hit Record. All `.env` files (root, `agents/`, `frontend/`) should already be configured with your deployed `ArxiomEscrow` address, keys, and OpenAI API key. **Do not edit `.env` on camera.**

**Network:** Kite AI Testnet · Chain ID **2368** · RPC `https://rpc-testnet.gokite.ai/`

---

## 1. Pre-flight check (do this first)

### MetaMask (human / demo wallet)

- [ ] Network is **KiteAI Testnet** (Chain ID `2368`).
- [ ] Wallet has enough KITE for the demo bounty (e.g. **≥ 0.02 KITE** for a `0.01` problem + gas).
- [ ] **Clear the Activity tab** (or note the current nonce) so a stuck pending tx cannot block `createProblem` during recording.
  - MetaMask → **Activity** → cancel or speed up any pending transactions, or reset the account’s activity if needed.
- [ ] Optional: disconnect and reconnect the site on `localhost:3000` for a fresh session.

### Master Agent wallet (solver)

- [ ] `agents/.env` has `MASTER_AGENT_PRIVATE_KEY` and `ARXIOM_ESCROW_ADDRESS` set (already done).
- [ ] Master Agent has **already** called `registerAsSolver()` with **0.1 KITE** (economy mode). Verify on [Kitescan](https://testnet.kitescan.ai/) → your escrow contract → **Read** → `solverStakes(yourMasterAddress)` ≥ `0.1` ether.

If not staked yet, run **once** from any terminal (not on camera):

```bash
cd /Users/hatanakatomoya/Developer/arXiom/arxiom

export ARXIOM_ESCROW_ADDRESS=0xYourDeployedEscrowAddress
export MASTER_AGENT_PRIVATE_KEY=0xYourMasterAgentPrivateKey

cast send $ARXIOM_ESCROW_ADDRESS "registerAsSolver()" \
  --value 0.1ether \
  --rpc-url https://rpc-testnet.gokite.ai/ \
  --private-key $MASTER_AGENT_PRIVATE_KEY
```

### Config sanity (offline, 30 seconds)

- [ ] `agents/.env` — `OPENAI_API_KEY`, `SUB_AGENT_URL=http://127.0.0.1:8402/task`
- [ ] `frontend/.env` — `NEXT_PUBLIC_ESCROW_ADDRESS` matches the same escrow as agents
- [ ] Sub-agent and master agent venv exists: `agents/.venv` (run `pip install -r requirements.txt` once if needed)

---

## 2. Terminal layout

Open **4 windows** before recording:

| Window | Role |
|--------|------|
| **Browser** | `http://localhost:3000` — arXiom UI (half screen) |
| **Terminal 1** | Sub-Agent (x402 seller) |
| **Terminal 2** | Master Agent (orchestrator) |
| **Terminal 3** | Next.js frontend |

Arrange **3 terminals side-by-side** under or beside the browser so judges can see agent logs during the pitch.

---

## 3. Boot sequence (in order)

Start services **top to bottom**. Wait for each to show “ready” before starting the next.

### Terminal 1 — Sub-Agent

```bash
cd /Users/hatanakatomoya/Developer/arXiom/arxiom/agents
source .venv/bin/activate
python -m sub_agents.server
```

**Ready when you see:** Uvicorn listening on `http://127.0.0.1:8402` (or similar).

---

### Terminal 2 — Master Agent

```bash
cd /Users/hatanakatomoya/Developer/arXiom/arxiom/agents
source .venv/bin/activate
python -m master_agent.agent
```

**Ready when you see:** RPC connected + polling / waiting for `ProblemCreated` events.

---

### Terminal 3 — Frontend

```bash
cd /Users/hatanakatomoya/Developer/arXiom/arxiom/frontend
npm run dev
```

**Ready when you see:** `Ready` on `http://localhost:3000`.

---

### Browser

Open: **http://localhost:3000**

---

## 4. Clean slate (critical for a professional recording)

After **all three services are running and the browser loads**, clear terminal scrollback so only **new** demo logs appear on screen:

**macOS / Linux (each of Terminal 1, 2, 3):**

```bash
clear
```

**Windows:**

```cmd
cls
```

- [ ] Terminal 1 cleared (Sub-Agent idle, port 8402 listening)
- [ ] Terminal 2 cleared (Master Agent polling)
- [ ] Terminal 3 cleared (`npm run dev` ready line only)
- [ ] Browser on the home page — wallet **not** connected yet (connect on camera)

**Now start the screen recording.**

---

## 5. On-camera action script (~2–3 minutes)

### A. Connect wallet

1. Click **Connect Wallet** (top right).
2. Confirm MetaMask on **Kite testnet (2368)**.
3. Success toast: *“Wallet connected”*.

### B. Register a problem

1. In **Register Problem**:
   - **Description URI:** a short scientific task (plain text is fine), e.g.  
     `Optimize a Monte Carlo sampler for protein folding energy landscapes`
   - **Bounty:** `0.01` KITE
2. Click **Register Problem** → approve in MetaMask.
3. Wait for toast: *“Problem registered!”* (optional: **View on Kitescan**).

### C. Show the bounty board

1. Scroll to **Bounty board** — new card appears as **Open** (amber).
2. Mention live on-chain registry + 12s polling fallback if WebSocket drops.

### D. Watch the agent pipeline (terminals)

1. **Terminal 2 (Master):** `ProblemCreated` → LLM decomposition → x402 payments → `solveProblem` tx.
2. **Terminal 1 (Sub-Agent):** HTTP `402` → paid request → specialist role logs / OpenAI work.
3. Point out **x402 ECDSA** micropayments between agents (no card rails).

### E. Reveal the result (UI)

1. Within ~15–30 seconds, bounty card flips to **Solved** (green) — polling + events.
2. Click **View solution** → markdown with `**[Executed by {role}]**` headers and syntax-highlighted code.
3. Optional: click **Refresh** only if the card is slow; normally not needed.

### F. Closing line (optional)

> “Human posts bounty on Kite → Master Agent decomposes and pays specialists via x402 → solution settles on-chain. That’s the arXiom agentic economy.”

---

## Quick troubleshooting (off-camera)

| Issue | Fix |
|-------|-----|
| MetaMask tx stuck | Clear Activity tab; ensure nonce isn’t blocked |
| Master never solves | Confirm 0.1 KITE stake + `ARXIOM_ESCROW_ADDRESS` in `agents/.env` |
| Sub-agent 503 | `OPENAI_API_KEY` in `agents/.env`; restart Terminal 1 |
| UI not updating | Wait 12s (silent poll) or click **Refresh** |
| Wrong network | Switch MetaMask to Kite testnet `2368` |

---

**Good luck with the Kite AI Global Hackathon recording.**
