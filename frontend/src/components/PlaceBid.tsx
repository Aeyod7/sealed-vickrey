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

      const { encryptedValues, inputProof } = await encrypt.mutateAsync({
        values: [{ value: BigInt(bidAmount), type: "euint64" }],
        contractAddress: BID_TOKEN_ADDRESS,
        userAddress: address,
      });

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
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="heading text-base">Place Sealed Bid</h3>
        <span className="text-[11px] text-slate mono">02</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="label block">Auction ID</label>
          <input
            name="auctionId"
            type="number"
            placeholder="e.g. 1"
            required
            className="input w-full px-3 py-2"
          />
        </div>
        <div className="space-y-1.5">
          <label className="label block">Bid Amount</label>
          <input
            name="bidAmount"
            type="number"
            placeholder="Your encrypted bid"
            required
            className="input w-full px-3 py-2"
          />
          <p className="text-[11px] text-slate">
            Encrypted client-side. No one can see your bid — not even the
            contract.
          </p>
        </div>
        <button
          type="submit"
          disabled={isPending || encrypt.isPending || !address}
          className="btn-primary w-full px-4 py-2.5 text-sm"
        >
          {isPending || encrypt.isPending
            ? "Encrypting & bidding..."
            : "Place Encrypted Bid"}
        </button>
      </form>

      {txHash && (
        <p className="text-[12px] text-success mono">
          ✓ Bid placed · {txHash.slice(0, 18)}...
        </p>
      )}
      {error && <p className="text-[12px] text-error">{error}</p>}
    </div>
  );
}
