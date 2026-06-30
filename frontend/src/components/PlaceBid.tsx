"use client";

import { useState, type FormEvent } from "react";
import { useAccount } from "wagmi";
import { useEncrypt, useZamaSDK } from "@zama-fhe/react-sdk";
import { encodeAbiParameters } from "viem";
import { sealedVickreyABI } from "@/lib/abi";
import { SEALED_VICKREY_ADDRESS, BID_TOKEN_ADDRESS } from "@/lib/config";

export function PlaceBid() {
  const sdk = useZamaSDK();
  const encrypt = useEncrypt();
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
      const auctionId = formData.get("auctionId") as string;
      const bidAmount = formData.get("bidAmount") as string;

      // 1. Encrypt the bid amount — contract address must be the bid token
      //    because the encrypted value is used in confidentialTransferAndCall
      const { encryptedValues, inputProof } = await encrypt.mutateAsync({
        values: [{ value: BigInt(bidAmount), type: "euint64" }],
        contractAddress: BID_TOKEN_ADDRESS,
        userAddress: address,
      });

      // 2. Call confidentialTransferAndCall on the bid token
      //    This transfers the encrypted bid to the auction contract and
      //    triggers the onConfidentialTransferReceived callback with the auctionId
      const tx = await sdk.signer!.writeContract({
        address: BID_TOKEN_ADDRESS,
        abi: [
          {
            inputs: [
              { name: "to", type: "address" },
              { name: "encryptedAmount", type: "bytes32" },
              { name: "inputProof", type: "bytes" },
              { name: "data", type: "bytes" },
            ],
            name: "confidentialTransferAndCall",
            outputs: [{ name: "", type: "bytes32" }],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "confidentialTransferAndCall",
        args: [
          SEALED_VICKREY_ADDRESS,
          encryptedValues[0]!,
          inputProof,
          encodeAbiParameters(
            [{ name: "auctionId", type: "uint256" }],
            [BigInt(auctionId)],
          ),
        ],
      });

      setTxHash(tx);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place bid");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="text-lg font-semibold mb-4">Place Sealed Bid</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Auction ID</label>
          <input
            name="auctionId"
            type="number"
            placeholder="e.g. 1"
            required
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm focus:border-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Bid Amount (cUSDC units)
          </label>
          <input
            name="bidAmount"
            type="number"
            placeholder="Your encrypted bid"
            required
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm focus:border-indigo-500 outline-none"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Your bid is encrypted client-side. No one can see it — not even the
            auction contract.
          </p>
        </div>
        <button
          type="submit"
          disabled={isPending || encrypt.isPending || !address}
          className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          {isPending || encrypt.isPending
            ? "Encrypting & bidding..."
            : "Place Encrypted Bid"}
        </button>
      </form>
      {txHash && (
        <p className="mt-3 text-sm text-green-400">
          Bid placed! TX: {txHash.slice(0, 18)}...
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
