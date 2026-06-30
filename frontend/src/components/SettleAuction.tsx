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

  async function handleSettle(auctionId: string) {
    if (!address) return;
    setError(null);
    setStatus(null);
    setResult(null);
    setIsPending(true);

    try {
      // 1. Settle — computes max + second-max + winner (all encrypted)
      setStatus("Settling (computing encrypted max + second-max)...");
      await sdk.signer!.writeContract({
        address: SEALED_VICKREY_ADDRESS,
        abi: sealedVickreyABI,
        functionName: "settle",
        args: [BigInt(auctionId)],
      });

      // 2. Read the encrypted handles for public decryption
      setStatus("Reading encrypted results...");
      const auction = (await sdk.provider.readContract({
        address: SEALED_VICKREY_ADDRESS,
        abi: sealedVickreyABI,
        functionName: "getAuction",
        args: [BigInt(auctionId)],
      })) as any;

      const secondPriceHandle = auction.secondHighestBid;
      const winnerHandle = auction.encryptedWinner;

      // 3. Public decrypt both handles
      setStatus("Decrypting winner + second price...");
      const decryptResult = await decryptPublicValues.mutateAsync([
        secondPriceHandle,
        winnerHandle,
      ]);

      const clearSecondPrice = decryptResult.clearValues[
        secondPriceHandle
      ] as bigint;
      const clearWinner = decryptResult.clearValues[winnerHandle] as `0x${string}`;

      // 4. Finalize — verify decryption on-chain
      setStatus("Finalizing (verifying decryption proof on-chain)...");

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

  const [auctionId, setAuctionId] = useState("");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="text-lg font-semibold mb-4">Settle & Finalize</h2>
      <p className="text-sm text-zinc-400 mb-4">
        After the auction ends, anyone can settle (compute encrypted winner +
        second price) and finalize (reveal the winner address + price via public
        decryption).
      </p>
      <div className="flex gap-3">
        <input
          type="number"
          placeholder="Auction ID"
          value={auctionId}
          onChange={(e) => setAuctionId(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm focus:border-indigo-500 outline-none"
        />
        <button
          onClick={() => handleSettle(auctionId)}
          disabled={isPending || !address || !auctionId}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50 text-sm font-medium whitespace-nowrap"
        >
          {isPending ? "Processing..." : "Settle + Finalize"}
        </button>
      </div>
      {status && <p className="mt-3 text-sm text-blue-400">{status}</p>}
      {result && (
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-green-400">
            Winner: {result.winner.slice(0, 8)}...{result.winner.slice(-6)}
          </p>
          <p className="text-green-400">
            Winning Price (2nd highest bid): {result.secondPrice} cUSDC
          </p>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
