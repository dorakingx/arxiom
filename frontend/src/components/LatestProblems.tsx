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
import { kiteTestnet } from "@/lib/wagmi";

const LOG_BLOCK_RANGE = 50_000n;

export function LatestProblems() {
  const publicClient = usePublicClient({ chainId: kiteTestnet.id });
  const [problems, setProblems] = useState<Map<string, ProblemRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as Address | undefined;

  const loadHistorical = useCallback(async () => {
    if (!publicClient || !escrowAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoadError(null);
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
      setLoadError(err instanceof Error ? err.message : "Failed to load problems");
    } finally {
      setLoading(false);
    }
  }, [publicClient, escrowAddress]);

  useEffect(() => {
    loadHistorical();
  }, [loadHistorical]);

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

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Latest Problems</h2>
          <p className="mt-1 text-sm text-zinc-400">
            On-chain registry — updates live from contract events.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            loadHistorical();
          }}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Refresh
        </button>
      </div>

      {!escrowAddress && (
        <p className="mt-4 text-sm text-zinc-500">
          Configure escrow address to load problems.
        </p>
      )}

      {loading && <p className="mt-6 text-sm text-zinc-500">Loading events...</p>}
      {loadError && <p className="mt-6 text-sm text-red-400">{loadError}</p>}

      {!loading && !loadError && rows.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">
          No problems yet. Register one to trigger the agent pipeline.
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {rows.map((problem) => (
          <li
            key={problem.id.toString()}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm text-indigo-300">
                #{problem.id.toString()}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  problem.status === "Solved"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {problem.status}
              </span>
            </div>
            <p className="mt-2 break-all text-sm text-zinc-300">
              {problem.descriptionURI || "—"}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
              <span>Creator: {truncateAddress(problem.creator)}</span>
              <span>Bounty: {formatEther(problem.bountyAmount)} KITE</span>
              {problem.solver && (
                <span>Solver: {truncateAddress(problem.solver)}</span>
              )}
            </div>
            {problem.solutionURI && (
              <p className="mt-2 break-all text-xs text-zinc-500">
                Solution: {problem.solutionURI}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
