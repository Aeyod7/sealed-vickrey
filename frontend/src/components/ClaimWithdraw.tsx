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
      await sdk.signer!.writeContract({
        address: SEALED_VICKREY_ADDRESS,
        abi: sealedVickreyABI,
        functionName: action,
        args: [BigInt(auctionId)],
      });
      setSuccess(
        action === "claim"
          ? "Claimed the lot. You paid the 2nd-highest bid."
          : "Withdrew your full bid.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="heading text-base">Claim & Withdraw</h3>
        <span className="text-[11px] text-slate mono">06</span>
      </div>

      <p className="text-[13px] text-fog leading-relaxed">
        After finalization: the winner claims the lot (pays 2nd price, gets
        refund). Losers withdraw their full bid. All token movements stay
        encrypted.
      </p>

      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Auction ID"
          value={auctionId}
          onChange={(e) => setAuctionId(e.target.value)}
          className="input flex-1 px-3 py-2"
        />
        <button
          onClick={() => handleAction("claim")}
          disabled={isPending || !address || !auctionId}
          className="btn-primary px-4 py-2 text-sm whitespace-nowrap"
        >
          {isPending ? "..." : "Claim"}
        </button>
        <button
          onClick={() => handleAction("withdraw")}
          disabled={isPending || !address || !auctionId}
          className="btn-secondary px-4 py-2 text-sm whitespace-nowrap"
        >
          {isPending ? "..." : "Withdraw"}
        </button>
      </div>

      {success && (
        <p className="text-[12px] text-success flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
          {success}
        </p>
      )}
      {error && <p className="text-[12px] text-error">{error}</p>}
    </div>
  );
}
