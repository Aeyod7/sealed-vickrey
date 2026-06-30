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
  "function auctionCount() view returns (uint256)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(
    "https://sepolia.infura.io/v3/" + infuraKey
  );
  const contract = new ethers.Contract(SEALED_VICKREY, AUCTION_ABI, provider);

  const count = await contract.auctionCount();
  console.log("Auction count:", count.toString());

  const now = Math.floor(Date.now() / 1000);
  console.log("Current time:", now);

  for (let i = 1n; i <= count; i++) {
    const a = await contract.getAuction(i);
    const bidCount = await contract.getBidCount(i);
    console.log(`\nAuction #${i}:`);
    console.log("  seller:", a.seller);
    console.log("  state:", a.state);
    console.log("  endTime:", a.endTime.toString());
    console.log("  ended:", now >= a.endTime);
    console.log("  bidCount:", bidCount.toString());
    console.log("  winner:", a.winner);
    console.log("  winningPrice:", a.winningPrice.toString());
    console.log("  secondHighestBid handle:", a.secondHighestBid);
    console.log("  encryptedWinner handle:", a.encryptedWinner);
  }
}

main().catch(console.error);
