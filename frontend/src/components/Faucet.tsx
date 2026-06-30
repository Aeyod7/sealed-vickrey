"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useZamaSDK } from "@zama-fhe/react-sdk";
import { hexToBigInt } from "viem";
import {
  NFT_ADDRESS,
  UNDERLYING_USDC_ADDRESS,
  CUSDC_WRAPPER_ADDRESS,
} from "@/lib/config";

const ERC20_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const WRAPPER_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "wrap",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const NFT_ABI = [
  {
    inputs: [{ name: "to", type: "address" }],
    name: "mint",
    outputs: [{ name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const TRANSFER_EVENT =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export function Faucet() {
  const sdk = useZamaSDK();
  const { address } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [lastNft, setLastNft] = useState<string | null>(null);
  const [lastCuusdc, setLastCuusdc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function mintNft() {
    if (!address || !sdk.signer) return;
    setError(null);
    setIsPending(true);
    setStatus("Minting test NFT...");

    try {
      const tx = await sdk.signer.writeContract({
        address: NFT_ADDRESS,
        abi: NFT_ABI,
        functionName: "mint",
        args: [address],
      });
      const receipt = await sdk.provider.waitForTransactionReceipt(tx);
      const transferLog = receipt.logs.find(
        (log) => log.topics[0] === TRANSFER_EVENT
      );
      const tokenId = transferLog
        ? hexToBigInt(transferLog.topics[3]).toString()
        : "?";
      setLastNft(tokenId);
      setStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "NFT mint failed");
    } finally {
      setIsPending(false);
    }
  }

  async function mintCuusdc() {
    if (!address || !sdk.signer) return;
    setError(null);
    setIsPending(true);
    setStatus("Minting 50,000 cUSDC...");

    try {
      const amount = BigInt(50_000) * BigInt(10 ** 6);

      const mintTx = await sdk.signer.writeContract({
        address: UNDERLYING_USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "mint",
        args: [address, amount],
      });
      await sdk.provider.waitForTransactionReceipt(mintTx);

      setStatus("Approving cUSDC wrapper...");
      const approveTx = await sdk.signer.writeContract({
        address: UNDERLYING_USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CUSDC_WRAPPER_ADDRESS, amount],
      });
      await sdk.provider.waitForTransactionReceipt(approveTx);

      setStatus("Wrapping into confidential cUSDC...");
      const wrapTx = await sdk.signer.writeContract({
        address: CUSDC_WRAPPER_ADDRESS,
        abi: WRAPPER_ABI,
        functionName: "wrap",
        args: [address, amount],
      });
      await sdk.provider.waitForTransactionReceipt(wrapTx);

      setLastCuusdc("50,000");
      setStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "cUSDC mint failed");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="heading text-base">Faucet</h3>
        <span className="text-[11px] text-slate mono">00</span>
      </div>

      <p className="text-[13px] text-fog leading-relaxed">
        Mint free test NFTs and confidential cUSDC on Sepolia. No real funds
        required.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={mintNft}
          disabled={isPending || !address}
          className="btn-secondary px-4 py-2.5 text-sm"
        >
          {isPending ? status || "Minting..." : "Mint Test NFT"}
        </button>
        <button
          onClick={mintCuusdc}
          disabled={isPending || !address}
          className="btn-secondary px-4 py-2.5 text-sm"
        >
          {isPending ? status || "Minting..." : "Mint 50k cUSDC"}
        </button>
      </div>

      {lastNft && (
        <p className="text-[12px] text-success mono">
          ✓ Minted NFT token #{lastNft}
        </p>
      )}
      {lastCuusdc && (
        <p className="text-[12px] text-success mono">
          ✓ Wrapped {lastCuusdc} cUSDC
        </p>
      )}
      {error && <p className="text-[12px] text-error">{error}</p>}
    </div>
  );
}
