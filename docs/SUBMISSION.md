# Zama Developer Program Season 3 — Submission

## Project Name

**Sealed**

## Tagline

A fully-encrypted Vickrey (second-price) auction on Zama's FHEVM, live on Sepolia with a self-service faucet and on-chain privacy verification.

## Links

- **Live demo:** https://sealed-vickrey.vercel.app
- **Source code:** https://github.com/Aeyod7/sealed-vickrey
- **Contract (Sepolia):** https://sepolia.etherscan.io/address/0xE36671102739432754bE48d660F11f89465f3c6e

## One-liner

Sealed lets anyone create and participate in a Vickrey auction where every bid is encrypted on-chain, only the winner address and second price are revealed, and the result is computed on encrypted data without sorting.

## What it does

- Sellers create auctions by escrowing an NFT and setting a reserve price + duration.
- Bidders submit encrypted bids in cUSDC using client-side FHE encryption.
- After the auction ends, the contract computes the highest bid, second-highest bid, and winner identity on encrypted data.
- Finalize reveals only the winner address and the second price via public decryption.
- Bidders can privately check "did I win?" via user decryption.
- The winner claims the lot (paying the second price), losers withdraw their full bid.
- A built-in faucet lets anyone mint test NFTs and cUSDC on Sepolia without scripts.

## Why it matters

Vickrey auctions are economically strategy-proof — bidders should bid their true valuation. But on a public blockchain, sealed bids are either eventually revealed or require a trusted party. FHEVM lets the smart contract compute the result on ciphertext, so individual bids stay private forever while the auction remains transparent and trustless.

## Key technical details

- **Fold-and-mask O(n) algorithm** for finding the second-highest bid without sorting.
- **ERC-7984 confidential tokens** for encrypted bid transfers.
- **Public decryption** reveals only the winner and the second price.
- **User decryption** lets bidders privately check if they won.
- Deployed on **Sepolia testnet**.

## Test results

```
SealedVickrey
  ✓ should create an NFT auction and escrow the lot
  ✓ should accept encrypted bids from multiple bidders
  ✓ should settle a Vickrey auction: winner pays 2nd-highest bid
  ✓ should let the winner claim the lot after finalization
  ✓ should let losers withdraw their full bid
  ✓ should reject bids after auction ends
  ✓ should reject settle with fewer than 2 bidders
  ✓ should let a bidder privately check if they won via user decryption

8 passing
```

## Deployed contracts (Sepolia)

| Contract | Address |
|---|---|
| SealedVickrey | 0xE36671102739432754bE48d660F11f89465f3c6e |
| MockNFT | 0x6AC371141950F7958afA00494AD81b725Dd433f1 |
| cUSDCMock (bid token) | 0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639 |

## Video pitch

Upload the 3-minute screen recording showing:
1. Connect wallet
2. Use the faucet to mint NFT + cUSDC
3. Create auction
4. Place encrypted bids from two accounts
5. Settle + finalize
6. Show the On-Chain Privacy Proof card
7. Claim / withdraw

## X thread

See `docs/x-thread.md` for the full thread.

## Team

- Aeyod7 (solo)

## Track

Builder Track
