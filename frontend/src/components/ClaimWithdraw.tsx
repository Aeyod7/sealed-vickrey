"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useZamaSDK } from "@zama-fhe/react-sdk";
import { sealedVickreyABI } from "@/lib/abi";
import { SEALED_VICKREY_ADDRESS } from "@/lib/config";

export function ClaimWithdraw() {
  const sdk = useZamaSDK();
  const { address } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [auctionId, setAuctionId] = useState("");

  async function handleAction(action: "claim" | "withdraw") {
    if (!address || !auctionId) return;
    setError(null);
    setSuccess(null);
    setIsPending(true);

    try {
      const tx = await sdk.signer!.writeContract({
        address: SEALED_VICKREY_ADDRESS,
        abi: sealedVickreyABI,
        functionName: action,
        args: [BigInt(auctionId)],
      });
      setSuccess(
        action === "claim"
          ? "Claimed the lot! You paid the 2nd-highest bid."
          : "Withdrew your full bid.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="text-lg font-semibold mb-4">Claim / Withdraw</h2>
      <p className="text-sm text-zinc-400 mb-4">
        After finalization: the winner claims the lot (pays 2nd price, gets
        refund). Losers withdraw their full bid. All token movements stay
        encrypted.
      </p>
      <div className="flex gap-3 mb-3">
        <input
          type="number"
          placeholder="Auction ID"
          value={auctionId}
          onChange={(e) => setAuctionId(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm focus:border-indigo-500 outline-none"
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => handleAction("claim")}
          disabled={isPending || !address || !auctionId}
          className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          {isPending ? "..." : "Claim (Winner)"}
        </button>
        <button
          onClick={() => handleAction("withdraw")}
          disabled={isPending || !address || !auctionId}
          className="flex-1 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          {isPending ? "..." : "Withdraw (Loser)"}
        </button>
      </div>
      {success && <p className="mt-3 text-sm text-green-400">{success}</p>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
