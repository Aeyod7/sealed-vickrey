"use client";

import { useState, type FormEvent } from "react";
import { useAccount } from "wagmi";
import { useZamaSDK } from "@zama-fhe/react-sdk";
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
          0,
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
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="heading text-base">Create Auction</h3>
        <span className="text-[11px] text-slate mono">01</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="label block">NFT Token ID</label>
          <input
            name="tokenId"
            type="number"
            placeholder="e.g. 0"
            required
            className="input w-full px-3 py-2"
          />
        </div>
        <div className="space-y-1.5">
          <label className="label block">Reserve Price</label>
          <input
            name="reservePrice"
            type="number"
            placeholder="0 = no reserve"
            className="input w-full px-3 py-2"
          />
          <p className="text-[11px] text-slate">cUSDC units</p>
        </div>
        <div className="space-y-1.5">
          <label className="label block">Duration</label>
          <input
            name="duration"
            type="number"
            placeholder="3600"
            defaultValue="3600"
            required
            className="input w-full px-3 py-2"
          />
          <p className="text-[11px] text-slate">seconds (3600 = 1 hour)</p>
        </div>
        <button
          type="submit"
          disabled={isPending || !address}
          className="btn-primary w-full px-4 py-2.5 text-sm"
        >
          {isPending ? "Creating..." : "Create Auction"}
        </button>
      </form>

      {txHash && (
        <p className="text-[12px] text-success mono">
          ✓ Created · {txHash.slice(0, 18)}...
        </p>
      )}
      {error && <p className="text-[12px] text-error">{error}</p>}
    </div>
  );
}
