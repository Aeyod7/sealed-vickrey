import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { QueryClient } from "@tanstack/react-query";
import { web } from "@zama-fhe/sdk/web";
import { createConfig as createZamaConfig } from "@zama-fhe/react-sdk/wagmi";
import { sepolia as sepoliaFhe, type FheChain } from "@zama-fhe/sdk/chains";

// Contract addresses — update after deployment
export const SEALED_VICKREY_ADDRESS =
  "0x0000000000000000000000000000000000000000" as `0x${string}`;
export const BID_TOKEN_ADDRESS =
  "0x0000000000000000000000000000000000000000" as `0x${string}`;
export const NFT_ADDRESS =
  "0x0000000000000000000000000000000000000000" as `0x${string}`;

export const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
});

export const mySepolia = {
  ...sepoliaFhe,
  relayerUrl: "https://api.zama.ai/relayer/11155111",
} as const satisfies FheChain;

export const zamaConfig = createZamaConfig({
  chains: [mySepolia],
  wagmiConfig,
  relayers: { [mySepolia.id]: web() },
});

export const queryClient = new QueryClient();
