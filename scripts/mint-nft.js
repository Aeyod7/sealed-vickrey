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
const mnemonic = varsRaw.vars.MNEMONIC.value;
const infuraKey = varsRaw.vars.INFURA_API_KEY.value;

const NFT_ADDRESS = "0x6AC371141950F7958afA00494AD81b725Dd433f1";
const NFT_ABI = [
  {
    inputs: [{ name: "to", type: "address" }],
    name: "mint",
    outputs: [{ name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

async function main() {
  const provider = new ethers.JsonRpcProvider(
    "https://sepolia.infura.io/v3/" + infuraKey
  );
  const wallet = ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromPhrase(mnemonic),
    "m/44'/60'/0'/0/1"
  ).connect(provider);

  console.log("Minting from:", wallet.address);

  const nft = new ethers.Contract(NFT_ADDRESS, NFT_ABI, wallet);
  const tx = await nft.mint(wallet.address);
  console.log("Mint tx:", tx.hash);
  const receipt = await tx.wait();
  console.log("Minted! Gas used:", receipt.gasUsed.toString());

  // Find the token ID from the Transfer event
  const transferEvent = receipt.logs.find(
    (log) => log.topics[0] === ethers.id("Transfer(address,address,uint256)")
  );
  if (transferEvent) {
    const tokenId = ethers.toBigInt(transferEvent.topics[3]);
    console.log("Token ID:", tokenId.toString());
    const owner = await nft.ownerOf(tokenId);
    console.log("Owner:", owner);
  }
}

main().catch(console.error);
