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
const CUSDC_WRAPPER = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";
const BIDDER = "0x51E791766b4159a9c161913759f4e0092235e358";

const AUCTION_ABI = [
  "function getAuction(uint256 auctionId) view returns (tuple(address seller,uint8 lotKind,address lotToken,uint256 lotIdentifier,address bidToken,uint64 reservePrice,uint64 endTime,uint8 state,address winner,uint64 winningPrice,bytes32 maxBid,bytes32 secondHighestBid,bytes32 encryptedWinner))",
];
const CUSDC_ABI = ["function balanceOf(address account) view returns (uint256)"];

async function main() {
  const provider = new ethers.JsonRpcProvider(
    "https://sepolia.infura.io/v3/" + infuraKey
  );

  const auction = new ethers.Contract(SEALED_VICKREY, AUCTION_ABI, provider);
  const a = await auction.getAuction(4);
  const now = Math.floor(Date.now() / 1000);

  console.log("Auction #4 state:", a.state);
  console.log("End time:", a.endTime.toString());
  console.log("Now:", now);
  console.log("Open:", a.state === 0n && now < Number(a.endTime));
  console.log("Bid count:", a.maxBid !== "0x0000000000000000000000000000000000000000000000000000000000000000" ? "has bids" : "no bids");

  const cusdc = new ethers.Contract(CUSDC_WRAPPER, CUSDC_ABI, provider);
  const balance = await cusdc.balanceOf(BIDDER);
  console.log("\nBidder cUSDC balance:", balance.toString());

  const ethBalance = await provider.getBalance(BIDDER);
  console.log("Bidder ETH balance:", ethers.formatEther(ethBalance));
}

main().catch(console.error);
