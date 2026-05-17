import { formatEther } from "viem";

import type { ProblemRow } from "./problems";

export type SolutionDisplay = {
  body: string;
  isMock: boolean;
  sourceLabel: string;
};

const URI_SCHEME = /^(ipfs|https?|ar|bafy):\/\//i;

export function isRemoteSolutionUri(uri: string): boolean {
  const trimmed = uri.trim();
  return URI_SCHEME.test(trimmed) || trimmed.startsWith("bafy");
}

export function buildMockAggregatedSolution(problem: ProblemRow): string {
  const bounty = problem.bountyAmount
    ? `${formatEther(problem.bountyAmount)} KITE`
    : "escrowed KITE";

  return `## Aggregated Scientific Report

**Problem #${problem.id.toString()}** · Master Agent consensus pipeline

### Executive summary
Authorized solver agents completed parallel sub-tasks via **x402 micropayments**, merged outputs, and attested the final result on Kite testnet. Bounty **${bounty}** was released from escrow.

### Methodology
1. Problem decomposed into specialized sub-tasks (LLM planner)
2. Sub-agents executed work after cryptographic payment headers
3. Results aggregated and registered on-chain

### Key findings
- Multi-agent decomposition reduced time-to-solution vs. monolithic models
- Machine-to-machine settlement verified without human payment rails
- Solution hash anchored at \`${problem.solutionURI ?? "on-chain URI"}\`

### Sub-agent outputs (representative)
| Agent | Task | Status |
|-------|------|--------|
| Sub-agent α | Literature / data synthesis | ✓ Complete |
| Sub-agent β | Numerical validation | ✓ Complete |
| Sub-agent γ | Summary generation | ✓ Complete |

### Reference implementation (Python)

\`\`\`python
def aggregate_sub_results(results: list[dict]) -> dict:
    """Merge paid sub-agent payloads into a consensus report."""
    return {
        "problem_id": results[0]["problem_id"],
        "consensus": [r["result"] for r in results],
        "settlement": "x402-verified",
    }
\`\`\`

### Conclusion
The agentic economy successfully closed bounty **#${problem.id.toString()}**. Judges can verify the \`ProblemSolved\` event and solver stake on Kitescan.

---
*Demo preview — full payload would be fetched from IPFS in production.*`;
}

export function resolveSolutionDisplay(problem: ProblemRow): SolutionDisplay | null {
  const uri = problem.solutionURI?.trim();
  if (!uri || problem.status !== "Solved") return null;

  if (isRemoteSolutionUri(uri)) {
    return {
      body: buildMockAggregatedSolution(problem),
      isMock: true,
      sourceLabel: uri,
    };
  }

  return {
    body: uri,
    isMock: false,
    sourceLabel: "On-chain solution payload",
  };
}
