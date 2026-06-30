"use client";

import { useState, type FormEvent } from "react";
import { useAccount } from "wagmi";
import { useZamaSDK } from "@zama-fhe/react-sdk";
import { encodeAbiParameters, parseAbiParameters } from "viem";
import { sealedVickreyABI } from "@/lib/abi";
import {
  SEALED_VICKREY_ADDRESS,
  NFT_ADDRESS,
  BID_TOKEN_ADDRESS,
} from "@/lib/config";

export function CreateAuction() {
  const sdk = useZamaSDK();
  const { address } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!address) return;
    setError(null);
    setTxHash(null);
    setIsPending(true);

    try {
      const formData = new FormData(e.currentTarget);
      const tokenId = formData.get("tokenId") as string;
      const reservePrice = formData.get("reservePrice") as string;
      const duration = formData.get("duration") as string;

      // Approve NFT transfer to the auction contract
      await sdk.signer!.writeContract({
        address: NFT_ADDRESS,
        abi: [
          {
            inputs: [
              { name: "to", type: "address" },
              { name: "tokenId", type: "uint256" },
            ],
            name: "approve",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "approve",
        args: [SEALED_VICKREY_ADDRESS, BigInt(tokenId)],
      });

      // Create auction: LotKind.NFT = 0
      const tx = await sdk.signer!.writeContract({
        address: SEALED_VICKREY_ADDRESS,
        abi: sealedVickreyABI,
        functionName: "createAuction",
        args: [
          0, // LotKind.NFT
          NFT_ADDRESS,
          BigInt(tokenId),
          BID_TOKEN_ADDRESS,
          BigInt(reservePrice || "0"),
          BigInt(duration || "3600"),
        ],
      });

      setTxHash(tx);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create auction");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="text-lg font-semibold mb-4">Create Auction</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">NFT Token ID</label>
          <input
            name="tokenId"
            type="number"
            placeholder="e.g. 1"
            required
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm focus:border-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Reserve Price (cUSDC units)
          </label>
          <input
            name="reservePrice"
            type="number"
            placeholder="0 = no reserve"
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm focus:border-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Duration (seconds)
          </label>
          <input
            name="duration"
            type="number"
            placeholder="3600 = 1 hour"
            defaultValue="3600"
            required
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm focus:border-indigo-500 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !address}
          className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          {isPending ? "Creating..." : "Create Auction"}
        </button>
      </form>
      {txHash && (
        <p className="mt-3 text-sm text-green-400">
          Created! TX: {txHash.slice(0, 18)}...
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
