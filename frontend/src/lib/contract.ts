import { isAddress, zeroAddress, type Address } from "viem";

import { arxiomEscrowAbi } from "./arxiomEscrowAbi";
import { kiteTestnet } from "./wagmi";

export { arxiomEscrowAbi };

export function isEscrowConfigured(): boolean {
  const address = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;
  if (!address || !isAddress(address)) return false;
  return address.toLowerCase() !== zeroAddress.toLowerCase();
}

export function getEscrowAddress(): Address {
  const address = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;
  if (!isEscrowConfigured()) {
    throw new Error("NEXT_PUBLIC_ESCROW_ADDRESS is not set or invalid");
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
