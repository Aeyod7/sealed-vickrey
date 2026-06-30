"use client";

import { useState, useEffect, useCallback } from "react";
import { useZamaSDK } from "@zama-fhe/react-sdk";
import { sealedVickreyABI } from "@/lib/abi";
import { SEALED_VICKREY_ADDRESS } from "@/lib/config";

const STATE_NAMES = ["Open", "Settled", "Finalized", "Closed"];
const STATE_BADGES = ["badge-open", "badge-ended", "badge-finalized", "badge-closed"];

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
    <section className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="heading text-base">Auctions</h3>
          <span className="mono text-[11px] text-slate">
            {auctionCount.toString()} total
          </span>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="btn-secondary px-3 py-1.5 text-xs"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {auctions.length === 0 && !loading && (
        <p className="text-[13px] text-slate py-4 text-center">
          No auctions yet. Create one above.
        </p>
      )}

      <div className="space-y-2">
        {auctions.map((a) => {
          const ended = now >= Number(a.endTime);
          const stateName = STATE_NAMES[a.state] || "Unknown";
          const lotKindName = a.lotKind === 0 ? "NFT" : "ERC20";
          const badgeClass = ended && a.state === 0 ? "badge-ended" : STATE_BADGES[a.state];
          const displayState = ended && a.state === 0 ? "Ended" : stateName;

          return (
            <div
              key={a.id}
              className="rounded-lg border border-graphite bg-obsidian/50 p-4 hover:border-iron transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="mono text-sm text-indigo">
                    #{a.id.toString()}
                  </span>
                  <span className="text-[11px] text-slate">
                    {lotKindName} #{a.lotIdentifier.toString()}
                  </span>
                </div>
                <span className={`badge ${badgeClass}`}>{displayState}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-[12px]">
                <div>
                  <div className="text-slate mb-0.5">Seller</div>
                  <div className="mono text-fog">
                    {a.seller.slice(0, 6)}...{a.seller.slice(-4)}
                  </div>
                </div>
                <div>
                  <div className="text-slate mb-0.5">Bids</div>
                  <div className="text-snow mono">{a.bidCount.toString()}</div>
                </div>
                <div>
                  <div className="text-slate mb-0.5">Reserve</div>
                  <div className="text-snow mono">{a.reservePrice.toString()}</div>
                </div>
              </div>

              {a.state >= 2 &&
                a.winner !== "0x0000000000000000000000000000000000000000" && (
                  <div className="mt-3 pt-3 border-t border-graphite/60 grid grid-cols-2 gap-3 text-[12px]">
                    <div>
                      <div className="text-slate mb-0.5">Winner</div>
                      <div className="mono text-success">
                        {a.winner.slice(0, 10)}...{a.winner.slice(-6)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate mb-0.5">Price Paid</div>
                      <div className="mono text-success">
                        {a.winningPrice.toString()} cUSDC
                      </div>
                    </div>
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
