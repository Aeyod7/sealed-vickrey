"use client";

import { WalletConnect } from "@/components/WalletConnect";
import { CreateAuction } from "@/components/CreateAuction";
import { PlaceBid } from "@/components/PlaceBid";
import { SettleAuction } from "@/components/SettleAuction";
import { ClaimWithdraw } from "@/components/ClaimWithdraw";
import { AmIWinner } from "@/components/AmIWinner";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Sealed
              <span className="text-indigo-400">.</span>
            </h1>
            <p className="text-xs text-zinc-500">
              Vickrey auctions on FHEVM — every bid stays encrypted forever
            </p>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Pitch banner */}
          <div className="rounded-xl border border-indigo-900/50 bg-indigo-950/30 p-6">
            <h2 className="text-lg font-semibold mb-2">
              The first fully-encrypted Vickrey auction on FHEVM
            </h2>
            <p className="text-sm text-zinc-400">
              Bids are encrypted with Fully Homomorphic Encryption. The contract
              computes the winner and second-highest price on encrypted data —
              no sorting required, just O(n) fold-and-mask. Only the winner
              address and second price are revealed. Every individual bid,
              including the winning amount, stays confidential forever. Truthful
              bidding is the dominant strategy — impossible onchain until FHE.
            </p>
          </div>

          {/* Action grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <CreateAuction />
            <PlaceBid />
            <SettleAuction />
            <AmIWinner />
          </div>

          <ClaimWithdraw />

          {/* How it works */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-semibold mb-4">How It Works</h2>
            <ol className="space-y-3 text-sm text-zinc-400">
              <li>
                <span className="text-indigo-400 font-mono mr-2">1.</span>
                <strong className="text-zinc-200">Create</strong> — Seller
                escrows an NFT and sets a reserve + duration.
              </li>
              <li>
                <span className="text-indigo-400 font-mono mr-2">2.</span>
                <strong className="text-zinc-200">Bid</strong> — Bidders submit
                encrypted bids in cUSDC. No one can see any bid.
              </li>
              <li>
                <span className="text-indigo-400 font-mono mr-2">3.</span>
                <strong className="text-zinc-200">Settle</strong> — After the
                auction ends, the contract computes max + second-max via O(n)
                fold-and-mask (no sorting). Winner address is computed in the
                encrypted domain.
              </li>
              <li>
                <span className="text-indigo-400 font-mono mr-2">4.</span>
                <strong className="text-zinc-200">Finalize</strong> — Public
                decryption reveals only the winner address + second price. All
                bids stay private.
              </li>
              <li>
                <span className="text-indigo-400 font-mono mr-2">5.</span>
                <strong className="text-zinc-200">Check</strong> — Bidders
                privately check &ldquo;did I win?&rdquo; via EIP-712 user
                decryption.
              </li>
              <li>
                <span className="text-indigo-400 font-mono mr-2">6.</span>
                <strong className="text-zinc-200">Claim / Withdraw</strong> —
                Winner pays the second price (not their bid) and gets the lot +
                refund. Losers withdraw their full bid. All encrypted.
              </li>
            </ol>
          </div>

          {/* Footer */}
          <footer className="text-center text-xs text-zinc-600 py-4">
            Built for Zama Developer Program Season 3 · Powered by FHEVM
          </footer>
        </div>
      </main>
    </div>
  );
}
