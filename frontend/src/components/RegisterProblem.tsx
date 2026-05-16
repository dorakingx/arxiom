"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { parseEther } from "viem";
import { toast } from "sonner";
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

function getTxErrorMessage(error: Error): string {
  if (
    error.name === "UserRejectedRequestError" ||
    /rejected/i.test(error.message)
  ) {
    return "Transaction rejected in wallet";
  }
  return error.message.split("\n")[0] || "Transaction failed";
}

export function RegisterProblem() {
  const { isConnected } = useAccount();
  const [descriptionURI, setDescriptionURI] = useState("");
  const [bountyAmount, setBountyAmount] = useState("0.01");

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const toastIdRef = useRef<string | number | undefined>(undefined);
  const escrowConfigured = Boolean(process.env.NEXT_PUBLIC_ESCROW_ADDRESS);

  useEffect(() => {
    if (isPending) {
      toastIdRef.current = toast.loading("Confirm in your wallet...");
    }
  }, [isPending]);

  useEffect(() => {
    if (isConfirming && toastIdRef.current !== undefined) {
      toast.loading("Confirming on Kite testnet...", { id: toastIdRef.current });
    }
  }, [isConfirming]);

  useEffect(() => {
    if (isSuccess && txHash) {
      toast.success("Problem registered!", {
        id: toastIdRef.current,
        description: "Your bounty is escrowed and agents can pick up the task.",
        action: {
          label: "View on Kitescan",
          onClick: () => window.open(getExplorerTxUrl(txHash), "_blank"),
        },
      });
      setDescriptionURI("");
      setBountyAmount("0.01");
      reset();
      toastIdRef.current = undefined;
    }
  }, [isSuccess, txHash, reset]);

  useEffect(() => {
    if (error) {
      toast.error(getTxErrorMessage(error), { id: toastIdRef.current });
      toastIdRef.current = undefined;
    }
  }, [error]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!descriptionURI.trim() || !bountyAmount) return;

    reset();
    toastIdRef.current = toast.loading("Preparing transaction...");
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
    </section>
  );
}
