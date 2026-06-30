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
const SEALED_VICKREY = "0xE36671102739432754bE48d660F11f89465f3c6e";

const NFT_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getApproved(uint256 tokenId) view returns (address)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(
    "https://sepolia.infura.io/v3/" + infuraKey
  );
  const nft = new ethers.Contract(NFT_ADDRESS, NFT_ABI, provider);

  for (let i = 0; i <= 5; i++) {
    try {
      const owner = await nft.ownerOf(i);
      const approved = await nft.getApproved(i);
      console.log(`Token ${i}: owner=${owner}, approved=${approved}`);
    } catch (e) {
      console.log(`Token ${i}: does not exist`);
    }
  }

  console.log(`\nAuction contract: ${SEALED_VICKREY}`);
}

main().catch(console.error);
