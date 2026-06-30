# X (Twitter) Thread — Sealed Vickrey Auctions

## Thread

1/ Introducing **Sealed** — a fully-encrypted Vickrey (second-price) auction on @zama_fhe's FHEVM, live on Sepolia.

Every bid stays encrypted forever. The winner and price are computed on encrypted data. No sorting required.

Built for @zama_fhe Developer Program Season 3. 🧵

---

2/ The problem: On-chain auctions force a trade-off.

- Public bids → front-running
- Sealed bids → eventually revealed
- First-price → bid shading (economically inefficient)

The Vickrey auction is strategy-proof (bid your true value!) but requires bids to stay sealed even from the auctioneer.

---

3/ With Fully Homomorphic Encryption, bids are never revealed. The contract computes the highest bid, second-highest bid, and winner — all on encrypted data.

Only the winner address + second price are revealed via public decryption. Every individual bid stays encrypted forever.

---

4/ The key innovation: a fold-and-mask algorithm that finds the 2nd-highest bid in O(n) — no sorting needed.

3 FHE operations per bid: one comparison, two selects, one max.

This makes Vickrey auctions feasible on FHEVM, where sorting was previously too expensive.

---

5/ The full flow:
1. Seller escrows NFT, sets reserve + duration
2. Bidders submit encrypted bids (cUSDC)
3. Contract settles — computes max + 2nd-max on encrypted data
4. Finalize — reveals only winner + price
5. Private "did I win?" check via EIP-712 user decryption
6. Winner pays 2nd price, losers withdraw full bid

---

6/ All token movements stay encrypted. The winner pays the second-highest bid (not their own), gets the NFT + refund. Losers withdraw their full bid. Nobody learns any individual bid amount — ever.

---

7/ Built with:
- Solidity + FHEVM v0.11
- OpenZeppelin Confidential Contracts (ERC-7984)
- Next.js + wagmi + Zama React SDK
- Deployed on Sepolia

8 tests passing, covering the full auction lifecycle.

---

8/ Why this matters: FHE enables economically optimal auction mechanisms that were impossible on-chain before. Vickrey auctions incentivize truthful bidding — and with FHE, bids stay confidential forever.

Applications: treasury auctions, spectrum licenses, carbon credits, DeFi liquidations.

---

9/ Try it live: https://sealed-vickrey.vercel.app
Source code: https://github.com/Aeyod7/sealed-vickrey

Built for @zama_fhe Developer Program Season 3 — Builder Track.

#FHE #Zama #Ethereum #Auctions #Privacy
