"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useZamaSDK } from "@zama-fhe/react-sdk";
import { sealedVickreyABI } from "@/lib/abi";
import { SEALED_VICKREY_ADDRESS } from "@/lib/config";

const STATE_NAMES = ["Open", "Settled", "Finalized", "Closed"];
const NULL_HANDLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

export function PrivacyProof() {
  const sdk = useZamaSDK();
  const { address } = useAccount();
  const [auctionId, setAuctionId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    if (!address || !auctionId) return;
    setLoading(true);
    setError(null);
    try {
      const auction = (await sdk.provider.readContract({
        address: SEALED_VICKREY_ADDRESS,
        abi: sealedVickreyABI,
        functionName: "getAuction",
        args: [BigInt(auctionId)],
      })) as any;

      const bidCount = (await sdk.provider.readContract({
        address: SEALED_VICKREY_ADDRESS,
        abi: sealedVickreyABI,
        functionName: "getBidCount",
        args: [BigInt(auctionId)],
      })) as bigint;

      setData({ ...auction, bidCount: Number(bidCount) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read auction");
    } finally {
      setLoading(false);
    }
  }

  const etherscanUrl = `https://sepolia.etherscan.io/address/${SEALED_VICKREY_ADDRESS}`;

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="heading text-base">On-Chain Privacy Proof</h3>
        <span className="text-[11px] text-slate mono">07</span>
      </div>

      <p className="text-[13px] text-fog leading-relaxed">
        Verify directly on Sepolia that only the winner address and second price
        are public. Bid amounts are stored as encrypted bytes32 handles.
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
          onClick={verify}
          disabled={loading || !address || !auctionId}
          className="btn-secondary px-4 py-2 text-sm whitespace-nowrap"
        >
          {loading ? "Reading..." : "Verify"}
        </button>
      </div>

      {data && (
        <div className="space-y-4 rounded-lg border border-graphite bg-obsidian p-4">
          <div>
            <p className="label mb-2">🔓 Public data</p>
            <div className="space-y-1.5 text-[13px] mono">
              <div className="flex justify-between">
                <span className="text-slate">Seller</span>
                <span className="text-snow">{data.seller.slice(0, 10)}...{data.seller.slice(-6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate">State</span>
                <span className="text-snow">{STATE_NAMES[Number(data.state)]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate">Bid count</span>
                <span className="text-snow">{data.bidCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate">Winner</span>
                <span className="text-success">{data.winner.slice(0, 10)}...{data.winner.slice(-6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate">Winning price</span>
                <span className="text-success">{data.winningPrice.toString()} cUSDC</span>
              </div>
            </div>
          </div>

          <div className="border-t border-graphite pt-4">
            <p className="label mb-2">🔒 Encrypted data (bytes32 handles)</p>
            <div className="space-y-2 text-[11px] mono break-all">
              <div>
                <span className="text-slate block">Max bid handle</span>
                <span className={data.maxBid === NULL_HANDLE ? "text-slate" : "text-fog"}>
                  {data.maxBid}
                </span>
              </div>
              <div>
                <span className="text-slate block">Second-highest handle</span>
                <span className={data.secondHighestBid === NULL_HANDLE ? "text-slate" : "text-fog"}>
                  {data.secondHighestBid}
                </span>
              </div>
              <div>
                <span className="text-slate block">Encrypted winner handle</span>
                <span className={data.encryptedWinner === NULL_HANDLE ? "text-slate" : "text-fog"}>
                  {data.encryptedWinner}
                </span>
              </div>
            </div>
          </div>

          <a
            href={etherscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center text-[12px] text-fog hover:text-snow border border-graphite py-2 transition-colors"
          >
            View contract on Sepolia Etherscan →
          </a>
        </div>
      )}

      {error && <p className="text-[12px] text-error">{error}</p>}
    </div>
  );
}
