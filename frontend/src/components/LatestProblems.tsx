"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import type { Address } from "viem";
import { usePublicClient, useWatchContractEvent } from "wagmi";

import {
  arxiomEscrowAbi,
  truncateAddress,
} from "@/lib/contract";
import {
  mergeProblemCreated,
  mergeProblemSolved,
  sortProblems,
  type ProblemRow,
} from "@/lib/problems";
import { SolutionMarkdown } from "@/components/SolutionMarkdown";
import { resolveSolutionDisplay } from "@/lib/solutionDisplay";
import { kiteTestnet } from "@/lib/wagmi";

const LOG_BLOCK_RANGE = 50_000n;
/** Silent HTTP polling when testnet WebSocket subscriptions drop during live demos. */
const POLL_INTERVAL_MS = 12_000;

function ProblemCard({
  problem,
  expanded,
  onToggleSolution,
}: {
  problem: ProblemRow;
  expanded: boolean;
  onToggleSolution: () => void;
}) {
  const isSolved = problem.status === "Solved";
  const solution = resolveSolutionDisplay(problem);

  return (
    <li
      className={`group relative overflow-hidden rounded-xl border transition-colors ${
        isSolved
          ? "border-emerald-500/25 bg-gradient-to-br from-emerald-950/30 via-zinc-900/60 to-zinc-950/80"
          : "border-amber-500/20 bg-gradient-to-br from-amber-950/15 via-zinc-900/50 to-zinc-950/80"
      }`}
    >
      <div
        className={`absolute left-0 top-0 h-full w-1 ${
          isSolved ? "bg-emerald-500" : "bg-amber-500"
        }`}
        aria-hidden
      />

      <div className="p-5 pl-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg font-semibold tracking-tight text-white">
              #{problem.id.toString()}
            </span>
            <StatusBadge status={problem.status} />
            {isSolved && solution?.isMock && (
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-indigo-300">
                Agentic pipeline
              </span>
            )}
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Bounty</p>
            <p className="font-mono text-lg font-semibold text-amber-200">
              {formatEther(problem.bountyAmount)}{" "}
              <span className="text-sm font-normal text-zinc-400">KITE</span>
            </p>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-300">
          {problem.descriptionURI || "No description"}
        </p>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span>
            <span className="text-zinc-600">Poster · </span>
            {truncateAddress(problem.creator)}
          </span>
          {problem.solver && (
            <span>
              <span className="text-zinc-600">Solver · </span>
              <span className="text-emerald-400/90">{truncateAddress(problem.solver)}</span>
            </span>
          )}
        </div>

        {isSolved && solution && (
          <div className="mt-4">
            <button
              type="button"
              onClick={onToggleSolution}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
            >
              <ChevronIcon expanded={expanded} />
              {expanded ? "Hide solution" : "View solution"}
            </button>
          </div>
        )}

        {isSolved && expanded && solution && (
          <div className="mt-4">
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/90 p-4 shadow-inner ring-1 ring-white/5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                    ✦
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">AI-generated solution</p>
                    <p className="text-xs text-zinc-500">{solution.sourceLabel}</p>
                  </div>
                </div>
                {solution.isMock && (
                  <span className="rounded-md bg-zinc-800 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                    Demo aggregate
                  </span>
                )}
              </div>
              <SolutionMarkdown content={solution.body} />
            </div>
          </div>
        )}

        {!isSolved && (
          <p className="mt-3 text-xs text-amber-200/70">
            Awaiting authorized solver — Master Agent may claim via stake + x402 pipeline.
          </p>
        )}
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: ProblemRow["status"] }) {
  const isSolved = status === "Solved";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isSolved
          ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
          : "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isSolved ? "bg-emerald-400" : "bg-amber-400"}`}
      />
      {isSolved ? "Solved" : "Open"}
    </span>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function LatestProblems() {
  const publicClient = usePublicClient({ chainId: kiteTestnet.id });
  const [problems, setProblems] = useState<Map<string, ProblemRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as Address | undefined;

  const toggleSolution = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadHistorical = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (!publicClient || !escrowAddress) {
        if (!silent) setLoading(false);
        return;
      }

      try {
        if (!silent) setLoadError(null);

        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock =
          latestBlock > LOG_BLOCK_RANGE ? latestBlock - LOG_BLOCK_RANGE : 0n;

        const [createdLogs, solvedLogs] = await Promise.all([
          publicClient.getContractEvents({
            address: escrowAddress,
            abi: arxiomEscrowAbi,
            eventName: "ProblemCreated",
            fromBlock,
            toBlock: "latest",
          }),
          publicClient.getContractEvents({
            address: escrowAddress,
            abi: arxiomEscrowAbi,
            eventName: "ProblemSolved",
            fromBlock,
            toBlock: "latest",
          }),
        ]);

        let map = new Map<string, ProblemRow>();

        for (const log of createdLogs) {
          map = mergeProblemCreated(
            map,
            log.args.problemId!,
            log.args.creator!,
            log.args.descriptionURI!,
            log.args.bountyAmount!,
          );
        }

        for (const log of solvedLogs) {
          map = mergeProblemSolved(
            map,
            log.args.problemId!,
            log.args.solver!,
            log.args.solutionURI!,
          );
        }

        setProblems(map);
      } catch (err) {
        if (!silent) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load problems",
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [publicClient, escrowAddress],
  );

  useEffect(() => {
    void loadHistorical();
  }, [loadHistorical]);

  useEffect(() => {
    if (!publicClient || !escrowAddress) return;

    const intervalId = window.setInterval(() => {
      void loadHistorical({ silent: true });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [publicClient, escrowAddress, loadHistorical]);

  useWatchContractEvent({
    address: escrowAddress,
    abi: arxiomEscrowAbi,
    eventName: "ProblemCreated",
    chainId: kiteTestnet.id,
    onLogs(logs) {
      setProblems((prev) => {
        let next = prev;
        for (const log of logs) {
          next = mergeProblemCreated(
            next,
            log.args.problemId!,
            log.args.creator!,
            log.args.descriptionURI!,
            log.args.bountyAmount!,
          );
        }
        return next;
      });
    },
  });

  useWatchContractEvent({
    address: escrowAddress,
    abi: arxiomEscrowAbi,
    eventName: "ProblemSolved",
    chainId: kiteTestnet.id,
    onLogs(logs) {
      setProblems((prev) => {
        let next = prev;
        for (const log of logs) {
          next = mergeProblemSolved(
            next,
            log.args.problemId!,
            log.args.solver!,
            log.args.solutionURI!,
          );
        }
        return next;
      });
    },
  });

  const rows = sortProblems(problems);
  const openCount = rows.filter((r) => r.status === "Open").length;
  const solvedCount = rows.filter((r) => r.status === "Solved").length;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Bounty board</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Live on-chain registry — open bounties and agent-verified solutions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void loadHistorical();
          }}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800"
        >
          Refresh
        </button>
      </div>

      {rows.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          <StatPill label="Open" value={openCount} tone="amber" />
          <StatPill label="Solved" value={solvedCount} tone="emerald" />
          <StatPill label="Total" value={rows.length} tone="zinc" />
        </div>
      )}

      {!escrowAddress && (
        <p className="mt-4 text-sm text-zinc-500">
          Configure escrow address to load problems.
        </p>
      )}

      {loading && <p className="mt-6 text-sm text-zinc-500">Loading events...</p>}
      {loadError && <p className="mt-6 text-sm text-red-400">{loadError}</p>}

      {!loading && !loadError && rows.length === 0 && (
        <p className="mt-6 rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">
          No bounties yet. Register a problem to kick off the Master Agent pipeline.
        </p>
      )}

      <ul className="mt-6 space-y-4">
        {rows.map((problem) => {
          const key = problem.id.toString();
          return (
            <ProblemCard
              key={key}
              problem={problem}
              expanded={expandedIds.has(key)}
              onToggleSolution={() => toggleSolution(key)}
            />
          );
        })}
      </ul>
    </section>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald" | "zinc";
}) {
  const tones = {
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    zinc: "border-zinc-600 bg-zinc-800/50 text-zinc-300",
  };
  return (
    <div
      className={`rounded-lg border px-3 py-1.5 text-xs ${tones[tone]}`}
    >
      <span className="text-zinc-500">{label} · </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
