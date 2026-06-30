# 3-Minute Video Pitch Script

## Sealed — Fully-Encrypted Vickrey Auctions on FHEVM

**Total time: ~3 minutes**

---

### [0:00–0:30] The Problem

**On-screen:** Title card — "Sealed: Vickrey Auctions on FHEVM"

**Narration:**
On-chain auctions have a fundamental problem. If bids are public, bidders can
react and front-run. If bids are sealed with commit-reveal, they're eventually
revealed — and first-price sealed-bid auctions incentivize bid shading, where
bidders bid less than their true valuation.

The Vickrey auction — where the winner pays the second-highest price — is
economically optimal because truthful bidding is the dominant strategy. But
it requires that all bids stay sealed even from the auctioneer. On a public
blockchain, this was impossible.

**On-screen:** Diagram showing "Public bids → front-running" vs "Sealed bids → revealed later"

---

### [0:30–1:00] The Solution

**Narration:**
Sealed is the first fully-encrypted Vickrey auction on Zama's FHEVM. Every bid
is encrypted with Fully Homomorphic Encryption and stays encrypted forever —
even after the auction ends.

The contract computes the winner and second-highest price on encrypted data
using a fold-and-mask algorithm — O(n) with no sorting required. This was
previously considered too expensive for FHEVM.

**On-screen:** Animation of encrypted bids flowing into the contract, FHE.max operations computing the result

---

### [1:00–1:45] Live Demo

**On-screen:** Screen recording of the dApp

**Narration:**
Let me walk through a full auction cycle.

First, the seller creates an auction — escrowing an NFT as the lot, setting a
reserve price and duration.

Three bidders place encrypted bids. Each bid is encrypted client-side using the
Zama SDK — the transaction is visible on-chain, but the bid amount is not.

After the auction ends, anyone can settle. The contract computes the highest
bid, second-highest bid, and winner identity — all in the encrypted domain.

Then, finalize reveals only the winner address and the second price via public
decryption. Every individual bid — including the winning bid — stays encrypted
forever.

Bidders can privately check "did I win?" using EIP-712 user decryption — only
they learn the result.

The winner claims the lot, paying the second price. Losers withdraw their full
bid. All token movements stay encrypted.

**On-screen:** Walk through each step in the UI — create, bid, settle, check, claim

---

### [1:45–2:20] Technical Deep Dive

**Narration:**
The key innovation is the fold-and-mask algorithm for finding the second-highest
bid without sorting. For each bid, we do one encrypted comparison, two selects,
and one max — three FHE operations per bid, O(n) total.

This is what makes Vickrey auctions feasible on FHEVM, where previous
implementations used partial hiding — encrypting quantities but leaving prices
public.

The contract uses OpenZeppelin's ERC-7984 confidential tokens for encrypted
payments, and the Zama React SDK for client-side encryption and user decryption.

**On-screen:** Code snippet of the fold-and-mask loop from SealedVickrey.sol

---

### [2:20–2:50] Why This Matters

**Narration:**
Sealed demonstrates that FHE enables economically optimal auction mechanisms
that were previously impossible on-chain. Vickrey auctions incentivize truthful
bidding — and with FHE, we can guarantee that bids stay confidential forever,
not just until reveal.

This has applications beyond NFTs: treasury auctions, spectrum licenses, carbon
credits, DeFi liquidations — any market where strategy-proofness and privacy
matter.

**On-screen:** Use case icons — treasury, spectrum, carbon credits, DeFi

---

### [2:50–3:00] Call to Action

**Narration:**
Sealed is open source and deployed on Sepolia. Try it at [URL]. Built for Zama
Developer Program Season 3.

**On-screen:** GitHub URL, deployed app URL, "Built with FHEVM" logo
