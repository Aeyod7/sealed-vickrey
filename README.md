# Sealed — Fully-Encrypted Vickrey Auctions on FHEVM

> A fully-encrypted second-price (Vickrey) sealed-bid auction on Zama's FHEVM, deployed on Sepolia with a self-service faucet and on-chain privacy verification. Every bid stays confidential forever — even after the auction ends. Only the winner's address and the second-highest price are revealed.

Built for **Zama Developer Program Mainnet Season 3** — Builder Track.

- **Live demo:** https://sealed-vickrey.vercel.app
- **Source code:** https://github.com/Aeyod7/sealed-vickrey
- **Network:** Sepolia testnet
- **Bid currency:** Zama cUSDCMock (`0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`)

## Why FHE? Why Vickrey?

### The problem

On-chain auctions have a fundamental tension: **transparency vs. strategy-proofness**.

- **English auctions** reveal every bid — bidders can see the current price and react. But this requires active participation and reveals strategy.
- **First-price sealed-bid auctions** hide bids until reveal, but incentivize **bid shading** — bidders bid less than their true valuation to maximize surplus. This is economically inefficient.
- **Vickrey (second-price) auctions** are **strategy-proof**: the dominant strategy is to bid your true valuation. The winner pays the second-highest bid, not their own. This is the economically optimal auction format — but it requires that **all bids remain sealed even from the auctioneer** until the auction ends.

On a public blockchain, this was impossible. Even with commit-reveal schemes, bids are eventually revealed. With FHE, bids are **never revealed** — the winner and second price are computed on encrypted data.

### The FHEVM wedge

FHEVM auction implementations often use **partial hiding** — prices are public, only quantities are encrypted. Sorting-based single-price auctions are computationally expensive in FHE.

**Sealed** takes a different approach:

1. **Vickrey, not single-price** — no sorting required. Finding the max and second-max is O(n) with `FHE.max` and `FHE.select` (fold-and-mask), vs. O(n log n) for sorting.
2. **All bids fully encrypted** — not just quantities. The bid amount, the winner identity, and the second price are all computed in the encrypted domain.
3. **Minimal revelation** — only the winner address and second price are revealed via public decryption. Every individual bid (including the winning bid) stays encrypted forever.
4. **Live on Sepolia** with a built-in faucet — anyone can mint test NFTs and cUSDC, create auctions, and verify privacy directly on-chain.

## How it works

```
┌─────────────────────────────────────────────────────────────────┐
│                    Sealed Vickrey Auction                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CREATE    Seller escrows NFT, sets reserve + duration        │
│       │                                                          │
│  2. BID       Bidders submit encrypted bids (cUSDC)              │
│       │       Bid amount encrypted client-side via FHE           │
│       │       Transferred via confidentialTransferAndCall        │
│       │                                                          │
│  3. SETTLE    After auction ends, contract computes:             │
│       │       • highestBid = FHE.max(bid1, bid2, ..., bidN)      │
│       │       • secondHighestBid = fold-and-mask O(n)            │
│       │       • encryptedWinner = FHE.select(isMax, bidder, 0)   │
│       │       All operations on encrypted data — no decryption   │
│       │                                                          │
│  4. FINALIZE  Public decryption reveals ONLY:                    │
│       │       • winner address                                   │
│       │       • second price (winning price)                     │
│       │       Individual bids stay encrypted forever             │
│       │                                                          │
│  5. CHECK     Bidders privately check "did I win?"               │
│       │       via EIP-712 user decryption (only they learn)      │
│       │                                                          │
│  6. CLAIM     Winner pays 2nd price, gets NFT + refund           │
│     WITHDRAW  Losers withdraw full bid                           │
│               All token movements stay encrypted                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### The fold-and-mask algorithm (O(n), no sorting)

Finding the second-highest bid without sorting:

```
highestBid = bids[0]
secondHighest = 0

for each bid[i] (i = 1..n-1):
    isGreater = FHE.gt(bid[i], highestBid)          // encrypted comparison
    newSecond = FHE.select(isGreater, highestBid, secondHighest)  // old max → 2nd
    highestBid = FHE.select(isGreater, bid[i], highestBid)        // new max
    secondHighest = FHE.max(secondHighest, newSecond)             // fold
```

This is O(n) with 3 FHE operations per bid — feasible on FHEVM.

## Smart contract

`SealedVickrey.sol` — a single Solidity contract implementing the full auction lifecycle:

- **`createAuction`** — escrows the lot (NFT or ERC-20), sets reserve + duration
- **`onConfidentialTransferReceived`** — ERC-1363 callback that records encrypted bids
- **`settle`** — computes highest, second-highest, and winner (all encrypted)
- **`finalize`** — verifies public decryption proof, stores winner + price
- **`amIWinner`** — returns encrypted boolean for private winner check
- **`claim`** — winner pays 2nd price, gets lot + refund (encrypted transfers)
- **`withdraw`** — losers withdraw full bid (encrypted transfer)

## Deployed contracts (Sepolia)

| Contract | Address |
|----------|---------|
| `SealedVickrey` | `0xE36671102739432754bE48d660F11f89465f3c6e` |
| `MockNFT` | `0x6AC371141950F7958afA00494AD81b725Dd433f1` |
| `cUSDCMock` (bid token) | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` |

## Tech stack

| Layer | Technology |
|-------|-----------|
| Smart contracts | Solidity 0.8.27 + FHEVM v0.11 |
| Confidential tokens | OpenZeppelin Confidential Contracts (ERC-7984) |
| Tests | Hardhat + Chai + FHEVM mock environment |
| Frontend | Next.js 16 + React 19 + Tailwind CSS |
| Wallet/FHE | wagmi + viem + Zama React SDK (`@zama-fhe/react-sdk`) |
| Deployment | Sepolia testnet |

## Project structure

```
sealed/
├── contracts/
│   ├── SealedVickrey.sol          # Main auction contract
│   └── mocks/
│       ├── MockEncryptedToken.sol  # ERC-7984 test token
│       └── MockNFT.sol             # ERC-721 test NFT
├── test/
│   └── SealedVickrey.ts           # 8 tests: create, bid, settle, claim, withdraw, ...
├── deploy/
│   └── deploy.ts                  # Deployment script
├── frontend/
│   └── src/
│       ├── app/                    # Next.js app router
│       ├── components/             # WalletConnect, CreateAuction, PlaceBid, ...
│       ├── lib/config.ts           # Zama SDK + wagmi config
│       └── abi/SealedVickrey.json  # Contract ABI
└── hardhat.config.ts
```

## Getting started

### Prerequisites

- Node.js 18+
- A wallet with Sepolia ETH
- Infura API key (or Alchemy)

### Install

```bash
npm install
```

### Set credentials

```bash
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
```

### Run tests

```bash
npx hardhat test
```

### Deploy to Sepolia

```bash
npx hardhat deploy --network sepolia --tags SealedVickrey
```

### Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Update `frontend/src/lib/config.ts` with the deployed contract addresses.

## Privacy proof

You can verify on-chain that only the winner address and second price are public. Every individual bid stays encrypted as a `bytes32` FHE ciphertext handle.

```bash
node scripts/privacy-proof.js 2
```

Example output for a finalized auction:

```
🔓 PUBLIC DATA (visible to everyone)
────────────────────────────────────
Seller:          0xBE55...A75B
Lot token:       0x6AC3...33f1 #2
Bid count:       2
Winner:          0xBE55...A75B
Winning price:   200 cUSDC

🔒 PRIVATE DATA (encrypted — never decrypted on-chain)
──────────────────────────────────────────────────────
Max bid handle:          0x49669a8ab074d87439ff1b84bad67d39d4ec069254ff0000000000aa36a70500
Second-highest handle:   0xabe1fb8222ff670585876d01d89f1f6a6885507b58ff0000000000aa36a70500
Encrypted winner handle: 0xf2047306c2bb57f285f9c9339a8200da7ffdd8538aff0000000000aa36a70700
```

Check the contract directly on Sepolia Etherscan:
https://sepolia.etherscan.io/address/0xE36671102739432754bE48d660F11f89465f3c6e

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

  8 passing (2s)
```

## License

MIT
