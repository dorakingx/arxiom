import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const KITE_RPC_URL =
  process.env.KITE_RPC_URL || "https://rpc-testnet.gokite.ai/";
const KITE_CHAIN_ID = process.env.KITE_CHAIN_ID
  ? Number(process.env.KITE_CHAIN_ID)
  : 2368;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    kiteTestnet: {
      url: KITE_RPC_URL,
      chainId: KITE_CHAIN_ID,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      kiteTestnet: process.env.EXPLORER_API_KEY || "",
    },
    customChains: [
      {
        network: "kiteTestnet",
        chainId: KITE_CHAIN_ID,
        urls: {
          apiURL: process.env.KITE_EXPLORER_API_URL || "",
          browserURL:
            process.env.KITE_EXPLORER_BROWSER_URL ||
            "https://testnet.kitescan.ai/",
        },
      },
    ],
  },
};

export default config;
