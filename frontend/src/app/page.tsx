"use client";

import { WalletConnect } from "@/components/WalletConnect";
import { CreateAuction } from "@/components/CreateAuction";
import { PlaceBid } from "@/components/PlaceBid";
import { SettleAuction } from "@/components/SettleAuction";
import { ClaimWithdraw } from "@/components/ClaimWithdraw";
import { AmIWinner } from "@/components/AmIWinner";
import { AuctionList } from "@/components/AuctionList";
import { Faucet } from "@/components/Faucet";
import { PrivacyProof } from "@/components/PrivacyProof";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-graphite/60 backdrop-blur-sm px-6 py-4 sticky top-0 z-20 bg-onyx/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg border border-graphite flex items-center justify-center bg-charcoal">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8L6 11L13 4"
                  stroke="var(--color-acid-lime)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect
                  x="1"
                  y="1"
                  width="14"
                  height="14"
                  rx="3"
                  stroke="var(--color-graphite)"
                  strokeWidth="1"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-medium tracking-tight text-snow">
                Sealed
              </h1>
              <p className="text-[11px] text-slate tracking-wide">
                Vickrey auctions on FHEVM
              </p>
            </div>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-10">
          {/* Hero */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="badge badge-open">Live on Sepolia</span>
              <span className="text-[11px] text-slate mono">
                Zama Developer Program · Season 3
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-snow leading-tight">
              A fully-encrypted{" "}
              <span className="text-acid-lime">Vickrey auction</span> on FHEVM
            </h2>
            <p className="text-base text-fog max-w-2xl leading-relaxed">
              Bids are encrypted with Fully Homomorphic Encryption. The contract
              computes the winner and second-highest price on encrypted data —
              no sorting required, just O(n) fold-and-mask. Only the winner
              address and second price are revealed. Every individual bid stays
              confidential forever.
            </p>
          </section>

          {/* Faucet + action grid */}
          <section className="space-y-4">
            <Faucet />
            <div className="grid md:grid-cols-2 gap-4">
              <CreateAuction />
              <PlaceBid />
              <SettleAuction />
              <AmIWinner />
            </div>
          </section>

          {/* On-chain privacy proof */}
          <PrivacyProof />

          {/* Claim / Withdraw */}
          <ClaimWithdraw />

          {/* Auction list */}
          <AuctionList />

          {/* How it works */}
          <section className="card p-8">
            <h3 className="heading text-lg mb-6">How it works</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  title: "Create",
                  desc: "Seller escrows an NFT and sets a reserve + duration. The lot is held in the contract.",
                },
                {
                  step: "02",
                  title: "Bid",
                  desc: "Bidders submit encrypted bids in cUSDC. The bid amount is encrypted client-side — no one can see it.",
                },
                {
                  step: "03",
                  title: "Settle",
                  desc: "After the auction ends, the contract computes max + second-max via O(n) fold-and-mask on encrypted data.",
                },
                {
                  step: "04",
                  title: "Finalize",
                  desc: "Public decryption reveals only the winner address + second price. All bids stay encrypted forever.",
                },
                {
                  step: "05",
                  title: "Check",
                  desc: "Bidders privately check “did I win?” via EIP-712 user decryption. Only they learn the result.",
                },
                {
                  step: "06",
                  title: "Claim",
                  desc: "Winner pays the second price (not their bid) and gets the lot + refund. Losers withdraw their full bid.",
                },
              ].map((item) => (
                <div key={item.step} className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="mono text-xs text-indigo">{item.step}</span>
                    <h4 className="text-sm font-medium text-snow tracking-tight">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-[13px] text-fog leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <footer className="text-center text-[11px] text-slate py-6 border-t border-graphite/40">
            Built for Zama Developer Program Season 3 · Powered by FHEVM ·
            Every bid stays encrypted forever
          </footer>
        </div>
      </main>
    </div>
  );
}
