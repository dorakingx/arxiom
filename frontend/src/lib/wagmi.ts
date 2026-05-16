import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 2368);
const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc-testnet.gokite.ai/";

export const kiteTestnet = defineChain({
  id: chainId,
  name: "KiteAI Testnet",
  nativeCurrency: { name: "KITE", symbol: "KITE", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: {
    default: { name: "Kitescan", url: "https://testnet.kitescan.ai" },
  },
});

export const config = createConfig({
  chains: [kiteTestnet],
  connectors: [injected()],
  transports: {
    [kiteTestnet.id]: http(rpcUrl),
  },
  ssr: true,
});
