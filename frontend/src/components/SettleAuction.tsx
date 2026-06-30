"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useZamaSDK, useDecryptPublicValues } from "@zama-fhe/react-sdk";
import { sealedVickreyABI } from "@/lib/abi";
import { SEALED_VICKREY_ADDRESS } from "@/lib/config";

export function SettleAuction() {
  const sdk = useZamaSDK();
  const decryptPublicValues = useDecryptPublicValues();
  const { address } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<{
    winner: string;
    secondPrice: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auctionId, setAuctionId] = useState("");

  async function handleSettle(auctionId: string) {
    if (!address) return;
    setError(null);
    setStatus(null);
    setResult(null);
    setIsPending(true);

    try {
      // Read current auction state
      setStatus("Reading auction state...");
      const auction = (await sdk.provider.readContract({
        address: SEALED_VICKREY_ADDRESS,
        abi: sealedVickreyABI,
        functionName: "getAuction",
        args: [BigInt(auctionId)],
      })) as any;

      const state = Number(auction.state);
      const now = Math.floor(Date.now() / 1000);
      const endTime = Number(auction.endTime);
      const secondPriceHandle = auction.secondHighestBid;
      const winnerHandle = auction.encryptedWinner;

      if (state === 0 && now < endTime) {
        throw new Error(`Auction ends in ${endTime - now} seconds. Wait until then.`);
      }

      // Only settle if not already settled
      if (state === 0) {
        setStatus("Settling — computing encrypted max + second-max...");
        const settleHash = await sdk.signer!.writeContract({
          address: SEALED_VICKREY_ADDRESS,
          abi: sealedVickreyABI,
          functionName: "settle",
          args: [BigInt(auctionId)],
        });
        await sdk.provider.waitForTransactionReceipt(settleHash);

        // Re-read auction after settle
        const settledAuction = (await sdk.provider.readContract({
          address: SEALED_VICKREY_ADDRESS,
          abi: sealedVickreyABI,
          functionName: "getAuction",
          args: [BigInt(auctionId)],
        })) as any;
      }

      // Ensure handles are non-zero
      if (
        secondPriceHandle ===
          "0x0000000000000000000000000000000000000000000000000000000000000000" ||
        winnerHandle ===
          "0x0000000000000000000000000000000000000000000000000000000000000000"
      ) {
        throw new Error("Encrypted handles are empty. Settlement may have failed.");
      }

      // Public decrypt both handles
      setStatus("Decrypting winner + second price via Zama relayer...");
      const decryptResult = await decryptPublicValues.mutateAsync([
        secondPriceHandle,
        winnerHandle,
      ]);

      const clearSecondPrice = decryptResult.clearValues[secondPriceHandle] as bigint;
      const clearWinner = decryptResult.clearValues[winnerHandle] as `0x${string}`;

      if (clearSecondPrice === undefined || clearWinner === undefined) {
        throw new Error("Public decryption returned empty values. Try again in a few seconds.");
      }

      // Finalize
      setStatus("Finalizing — verifying proof on-chain...");
      await sdk.signer!.writeContract({
        address: SEALED_VICKREY_ADDRESS,
        abi: sealedVickreyABI,
        functionName: "finalize",
        args: [
          BigInt(auctionId),
          clearWinner,
          clearSecondPrice,
          decryptResult.decryptionProof,
        ],
      });

      setResult({
        winner: clearWinner,
        secondPrice: clearSecondPrice.toString(),
      });
      setStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Settle failed");
      setStatus(null);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="heading text-base">Settle & Finalize</h3>
        <span className="text-[11px] text-slate mono">03</span>
      </div>

      <p className="text-[13px] text-fog leading-relaxed">
        After the auction ends, anyone can settle (compute encrypted winner +
        second price) and finalize (reveal the winner address + price).
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
          onClick={() => handleSettle(auctionId)}
          disabled={isPending || !address || !auctionId}
          className="btn-secondary px-4 py-2 text-sm whitespace-nowrap"
        >
          {isPending ? "Processing..." : "Settle + Finalize"}
        </button>
      </div>

      {status && (
        <p className="text-[12px] text-status flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo animate-pulse" />
          {status}
        </p>
      )}

      {result && (
        <div className="space-y-1.5 rounded-lg border border-graphite bg-obsidian p-4">
          <div className="flex items-center justify-between">
            <span className="label">Winner</span>
            <span className="mono text-[12px] text-success">
              {result.winner.slice(0, 8)}...{result.winner.slice(-6)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="label">Winning Price</span>
            <span className="mono text-[12px] text-success">
              {result.secondPrice} cUSDC
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="space-y-2">
          <p className="text-[12px] text-error">{error}</p>
          <button
            onClick={() => handleSettle(auctionId)}
            disabled={isPending || !address || !auctionId}
            className="text-[12px] text-fog hover:text-snow underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
