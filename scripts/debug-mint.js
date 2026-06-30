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
const NFT_TX = "0x754c41b508474f1bc40174d1918c0bea33deecbdbaf532ac8fa2ab100c701147";

async function main() {
  const provider = new ethers.JsonRpcProvider(
    "https://sepolia.infura.io/v3/" + infuraKey
  );

  console.log("Checking transaction receipt...");
  const receipt = await provider.getTransactionReceipt(NFT_TX);
  if (!receipt) {
    console.log("No receipt found. Transaction may not be mined yet.");
    return;
  }

  console.log("Transaction hash:", receipt.hash);
  console.log("Block number:", receipt.blockNumber);
  console.log("Status:", receipt.status);
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Contract address:", receipt.to);
  console.log("Logs count:", receipt.logs.length);

  receipt.logs.forEach((log, i) => {
    console.log(`\nLog ${i}:`);
    console.log("  address:", log.address);
    console.log("  topics:", log.topics);
    console.log("  data:", log.data);
  });

  const nft = new ethers.Contract(
    NFT_ADDRESS,
    ["function ownerOf(uint256 tokenId) view returns (address)"],
    provider
  );
  const owner = await nft.ownerOf(2);
  console.log("\nOwner of token 2:", owner);
}

main().catch(console.error);
