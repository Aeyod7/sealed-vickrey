const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const os = require("os");

const varsPath = path.join(
  os.homedir(),
  "AppData",
  "Roaming",
  "hardhat-nodejs",
  "Config",
  "vars.json"
);
const varsRaw = JSON.parse(fs.readFileSync(varsPath, "utf8"));
const infuraKey = varsRaw.vars.INFURA_API_KEY.value;

const SEALED_VICKREY = "0xE36671102739432754bE48d660F11f89465f3c6e";

const AUCTION_ABI = [
  "function getAuction(uint256 auctionId) view returns (tuple(address seller,uint8 lotKind,address lotToken,uint256 lotIdentifier,address bidToken,uint64 reservePrice,uint64 endTime,uint8 state,address winner,uint64 winningPrice,bytes32 maxBid,bytes32 secondHighestBid,bytes32 encryptedWinner))",
  "function getBidCount(uint256 auctionId) view returns (uint256)",
];

const STATE_NAMES = ["Open", "Settled", "Finalized", "Closed"];

async function main(auctionId) {
  if (!auctionId) {
    console.log("Usage: node scripts/privacy-proof.js <auctionId>");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(
    "https://sepolia.infura.io/v3/" + infuraKey
  );
  const contract = new ethers.Contract(SEALED_VICKREY, AUCTION_ABI, provider);

  const a = await contract.getAuction(auctionId);
  const bidCount = await contract.getBidCount(auctionId);

  console.log("══════════════════════════════════════════════════════════");
  console.log("  PRIVACY PROOF — Sealed Vickrey Auction #" + auctionId);
  console.log("══════════════════════════════════════════════════════════\n");

  console.log("🔓 PUBLIC DATA (visible to everyone)");
  console.log("────────────────────────────────────");
  console.log("Seller:         ", a.seller);
  console.log("Lot token:      ", a.lotToken, "#" + a.lotIdentifier.toString());
  console.log("Bid token:      ", a.bidToken);
  console.log("Reserve price:  ", a.reservePrice.toString(), "cUSDC");
  console.log("End time:       ", new Date(Number(a.endTime) * 1000).toISOString());
  console.log("State:          ", STATE_NAMES[Number(a.state)] ?? a.state);
  console.log("Bid count:      ", bidCount.toString());
  console.log("Winner:         ", a.winner);
  console.log("Winning price:  ", a.winningPrice.toString(), "cUSDC");

  console.log("\n🔒 PRIVATE DATA (encrypted — never decrypted on-chain)");
  console.log("──────────────────────────────────────────────────────");
  console.log("Max bid handle:         ", a.maxBid);
  console.log("Second-highest handle:  ", a.secondHighestBid);
  console.log("Encrypted winner handle:", a.encryptedWinner);
  console.log("\nNote: These are bytes32 FHE ciphertext handles.");
  console.log("      The actual bid amounts and bidder identities are never revealed.");

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  Only the winner address and second price are public.");
  console.log("  Every individual bid amount stays encrypted forever.");
  console.log("══════════════════════════════════════════════════════════");
  console.log("\nVerify on Sepolia Etherscan:");
  console.log("https://sepolia.etherscan.io/address/" + SEALED_VICKREY);
}

main(process.argv[2]).catch(console.error);
