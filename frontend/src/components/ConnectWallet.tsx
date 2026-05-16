"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";

import { truncateAddress } from "@/lib/contract";
import { kiteTestnet } from "@/lib/wagmi";

export function ConnectWallet() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const wrongNetwork = isConnected && chain?.id !== kiteTestnet.id;

  if (!isConnected) {
    return (
      <button
        type="button"
        onClick={() => connect({ connector: connectors[0], chainId: kiteTestnet.id })}
        disabled={isPending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {wrongNetwork && (
        <button
          type="button"
          onClick={() => switchChain({ chainId: kiteTestnet.id })}
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
        >
          Switch to Kite Testnet
        </button>
      )}
      <span className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-200">
        {truncateAddress(address!)}
      </span>
      <button
        type="button"
        onClick={() => disconnect()}
        className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
      >
        Disconnect
      </button>
    </div>
  );
}
