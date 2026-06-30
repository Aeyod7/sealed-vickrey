"use client";

import { useState, useEffect, useCallback } from "react";
import { useZamaSDK } from "@zama-fhe/react-sdk";
import { sealedVickreyABI } from "@/lib/abi";
import { SEALED_VICKREY_ADDRESS } from "@/lib/config";

const STATE_NAMES = ["Open", "Settled", "Finalized", "Closed"];

export function AuctionList() {
  const sdk = useZamaSDK();
  const [auctionCount, setAuctionCount] = useState(BigInt(0));
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const count = (await sdk.provider.readContract({
        address: SEALED_VICKREY_ADDRESS,
        abi: sealedVickreyABI,
        functionName: "auctionCount",
        args: [],
      })) as bigint;

      setAuctionCount(count);

      const items: any[] = [];
      for (let i = BigInt(1); i <= count; i++) {
        const auction = (await sdk.provider.readContract({
          address: SEALED_VICKREY_ADDRESS,
          abi: sealedVickreyABI,
          functionName: "getAuction",
          args: [i],
        })) as any;

        const bidCount = (await sdk.provider.readContract({
          address: SEALED_VICKREY_ADDRESS,
          abi: sealedVickreyABI,
          functionName: "getBidCount",
          args: [i],
        })) as bigint;

        items.push({
          id: i,
          seller: auction.seller,
          lotKind: Number(auction.lotKind),
          lotToken: auction.lotToken,
          lotIdentifier: auction.lotIdentifier,
          bidToken: auction.bidToken,
          reservePrice: auction.reservePrice,
          endTime: auction.endTime,
          state: Number(auction.state),
          winner: auction.winner,
          winningPrice: auction.winningPrice,
          bidCount,
        });
      }
      setAuctions(items);
    } catch (err) {
      console.error("Failed to load auctions:", err);
    } finally {
      setLoading(false);
    }
  }, [sdk]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const now = Math.floor(Date.now() / 1000);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Auctions ({auctionCount.toString()})</h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1.5 text-sm rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {auctions.length === 0 && !loading && (
        <p className="text-sm text-zinc-500">No auctions yet. Create one above.</p>
      )}

      <div className="space-y-3">
        {auctions.map((a) => {
          const ended = now >= Number(a.endTime);
          const stateName = STATE_NAMES[a.state] || "Unknown";
          const lotKindName = a.lotKind === 0 ? "NFT" : "ERC20";

          return (
            <div
              key={a.id}
              className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-indigo-400">
                  Auction #{a.id.toString()}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    a.state === 0
                      ? ended
                        ? "bg-amber-900/50 text-amber-300"
                        : "bg-green-900/50 text-green-300"
                      : a.state === 3
                        ? "bg-zinc-700 text-zinc-400"
                        : "bg-blue-900/50 text-blue-300"
                  }`}
                >
                  {a.state === 0 && ended ? "Ended" : stateName}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                <div>
                  <span className="text-zinc-500">Seller:</span>{" "}
                  <span className="font-mono">
                    {a.seller.slice(0, 8)}...{a.seller.slice(-4)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Lot:</span> {lotKindName} #
                  {a.lotIdentifier.toString()}
                </div>
                <div>
                  <span className="text-zinc-500">Bids:</span>{" "}
                  {a.bidCount.toString()}
                </div>
                <div>
                  <span className="text-zinc-500">Reserve:</span>{" "}
                  {a.reservePrice.toString()}
                </div>
                {a.state >= 2 && a.winner !== "0x0000000000000000000000000000000000000000" && (
                  <>
                    <div className="col-span-2">
                      <span className="text-zinc-500">Winner:</span>{" "}
                      <span className="font-mono text-green-400">
                        {a.winner.slice(0, 10)}...{a.winner.slice(-6)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-zinc-500">Winning Price:</span>{" "}
                      <span className="text-green-400">
                        {a.winningPrice.toString()} cUSDC
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
