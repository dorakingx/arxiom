"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";

import { truncateAddress } from "@/lib/contract";
import { kiteTestnet } from "@/lib/wagmi";

export function ConnectWallet() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const {
    switchChain,
    isPending: isSwitching,
    error: switchError,
  } = useSwitchChain();

  const wasConnectedRef = useRef(false);
  const connectToastIdRef = useRef<string | number | undefined>(undefined);
  const switchToastIdRef = useRef<string | number | undefined>(undefined);

  const wrongNetwork = isConnected && chain?.id !== kiteTestnet.id;

  useEffect(() => {
    if (isPending) {
      connectToastIdRef.current = toast.loading("Connecting wallet...");
    }
  }, [isPending]);

  useEffect(() => {
    if (isConnected && !wasConnectedRef.current) {
      if (connectToastIdRef.current !== undefined) {
        toast.success("Wallet connected", { id: connectToastIdRef.current });
        connectToastIdRef.current = undefined;
      } else {
        toast.success("Wallet connected");
      }
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    if (connectError) {
      toast.error(connectError.message.split("\n")[0] || "Connection failed", {
        id: connectToastIdRef.current,
      });
      connectToastIdRef.current = undefined;
    }
  }, [connectError]);

  useEffect(() => {
    if (isSwitching) {
      switchToastIdRef.current = toast.loading("Switching to Kite testnet...");
    }
  }, [isSwitching]);

  useEffect(() => {
    if (!isSwitching && switchToastIdRef.current !== undefined) {
      if (switchError) {
        toast.error(switchError.message.split("\n")[0] || "Failed to switch network", {
          id: switchToastIdRef.current,
        });
      } else if (chain?.id === kiteTestnet.id) {
        toast.success("Connected to Kite testnet", { id: switchToastIdRef.current });
      }
      switchToastIdRef.current = undefined;
    }
  }, [isSwitching, switchError, chain?.id]);

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
          disabled={isSwitching}
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 disabled:opacity-50"
        >
          {isSwitching ? "Switching..." : "Switch to Kite Testnet"}
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
