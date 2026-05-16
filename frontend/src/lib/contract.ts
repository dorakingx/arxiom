import type { Address } from "viem";

import { arxiomEscrowAbi } from "./arxiomEscrowAbi";
import { kiteTestnet } from "./wagmi";

export { arxiomEscrowAbi };

export function getEscrowAddress(): Address {
  const address = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;
  if (!address) {
    throw new Error("NEXT_PUBLIC_ESCROW_ADDRESS is not set");
  }
  return address as Address;
}

export function getExplorerTxUrl(txHash: string): string {
  const base = kiteTestnet.blockExplorers?.default?.url ?? "https://testnet.kitescan.ai";
  return `${base}/tx/${txHash}`;
}

export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
