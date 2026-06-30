import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { QueryClient } from "@tanstack/react-query";
import { web } from "@zama-fhe/sdk/web";
import { createConfig as createZamaConfig } from "@zama-fhe/react-sdk/wagmi";
import { sepolia as sepoliaFhe } from "@zama-fhe/sdk/chains";

// Contract addresses — deployed on Sepolia
export const SEALED_VICKREY_ADDRESS =
  "0xE36671102739432754bE48d660F11f89465f3c6e" as `0x${string}`;
export const BID_TOKEN_ADDRESS =
  "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639" as `0x${string}`; // cUSDCMock
export const NFT_ADDRESS =
  "0x6AC371141950F7958afA00494AD81b725Dd433f1" as `0x${string}`;

export const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
});

// Use the default sepolia preset — relayerUrl is included
export const zamaConfig = createZamaConfig({
  chains: [sepoliaFhe],
  wagmiConfig,
  relayers: { [sepoliaFhe.id]: web() },
});

export const queryClient = new QueryClient();
