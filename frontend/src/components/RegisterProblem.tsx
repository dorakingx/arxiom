"use client";

import { FormEvent, useState } from "react";
import { parseEther } from "viem";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import {
  arxiomEscrowAbi,
  getEscrowAddress,
  getExplorerTxUrl,
} from "@/lib/contract";
import { kiteTestnet } from "@/lib/wagmi";

export function RegisterProblem() {
  const { isConnected } = useAccount();
  const [descriptionURI, setDescriptionURI] = useState("");
  const [bountyAmount, setBountyAmount] = useState("0.01");

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const escrowConfigured = Boolean(process.env.NEXT_PUBLIC_ESCROW_ADDRESS);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!descriptionURI.trim() || !bountyAmount) return;

    reset();
    writeContract({
      address: getEscrowAddress(),
      abi: arxiomEscrowAbi,
      functionName: "createProblem",
      args: [descriptionURI.trim()],
      value: parseEther(bountyAmount),
      chainId: kiteTestnet.id,
    });
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-6">
      <h2 className="text-lg font-semibold text-white">Register Problem</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Post a scientific or computational task with a native KITE bounty for AI solvers.
      </p>

      {!escrowConfigured && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          Set <code className="font-mono">NEXT_PUBLIC_ESCROW_ADDRESS</code> in{" "}
          <code className="font-mono">.env.local</code>.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm text-zinc-300">Description URI</span>
          <input
            type="text"
            value={descriptionURI}
            onChange={(e) => setDescriptionURI(e.target.value)}
            placeholder="ipfs://... or plain text problem statement"
            disabled={!isConnected || !escrowConfigured}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 disabled:opacity-50"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm text-zinc-300">Bounty (KITE)</span>
          <input
            type="text"
            value={bountyAmount}
            onChange={(e) => setBountyAmount(e.target.value)}
            placeholder="0.01"
            disabled={!isConnected || !escrowConfigured}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 disabled:opacity-50"
            required
          />
        </label>

        <button
          type="submit"
          disabled={
            !isConnected ||
            !escrowConfigured ||
            isPending ||
            isConfirming
          }
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isPending || isConfirming ? "Submitting..." : "Register Problem"}
        </button>
      </form>

      {!isConnected && escrowConfigured && (
        <p className="mt-3 text-sm text-zinc-500">Connect your wallet to register a problem.</p>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-400">
          {error.message.split("\n")[0]}
        </p>
      )}

      {isSuccess && txHash && (
        <p className="mt-3 text-sm text-emerald-400">
          Problem registered.{" "}
          <a
            href={getExplorerTxUrl(txHash)}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            View on Kitescan
          </a>
        </p>
      )}
    </section>
  );
}
