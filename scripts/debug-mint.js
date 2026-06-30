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

const NFT_ADDRESS = "0x6AC371141950F7958afA00494AD81b725Dd433f1";
const NFT_TX = "0x7925530e7ac9c90642da1203af1c0faa67fab3f7242ca1a99fdac5c61bb1a423";

async function main() {
  const provider = new ethers.JsonRpcProvider(
    "https://sepolia.infura.io/v3/" + infuraKey
  );

  console.log("Checking transaction receipt for token 3 mint...");
  const receipt = await provider.getTransactionReceipt(NFT_TX);
  if (!receipt) {
    console.log("No receipt found. Transaction may not be mined yet.");
    return;
  }

  console.log("Transaction hash:", receipt.hash);
  console.log("Block number:", receipt.blockNumber);
  console.log("Status:", receipt.status);

  const nft = new ethers.Contract(
    NFT_ADDRESS,
    ["function ownerOf(uint256 tokenId) view returns (address)"],
    provider
  );
  const owner = await nft.ownerOf(3);
  console.log("Owner of token 3:", owner);
}

main().catch(console.error);
