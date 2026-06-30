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
const UNDERLYING_USDC = "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF";
const CUSDC_WRAPPER = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";
const SEALED_VICKREY = "0xE36671102739432754bE48d660F11f89465f3c6e";

const ERC20_ABI = [
  "function mint(address to, uint256 amount)",
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
];
const WRAPPER_ABI = ["function wrap(address to, uint256 amount) returns (bytes32)"];
const NFT_ABI = [
  "function mint(address to) returns (uint256 tokenId)",
  "function approve(address to, uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
];

async function getWallet(index) {
  const provider = new ethers.JsonRpcProvider(
    "https://sepolia.infura.io/v3/" + infuraKey
  );
  return ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromPhrase(mnemonic),
    "m/44'/60'/0'/0/" + index
  ).connect(provider);
}

async function main() {
  const seller = await getWallet(1);
  const bidder = await getWallet(2);

  console.log("Seller:", seller.address);
  console.log("Bidder:", bidder.address);

  const sellerBalance = await seller.provider.getBalance(seller.address);
  const bidderBalance = await bidder.provider.getBalance(bidder.address);
  console.log("Seller ETH:", ethers.formatEther(sellerBalance));
  console.log("Bidder ETH:", ethers.formatEther(bidderBalance));

  if (bidderBalance < ethers.parseEther("0.05")) {
    console.log("\nFunding bidder with 0.05 ETH...");
    const fundTx = await seller.sendTransaction({
      to: bidder.address,
      value: ethers.parseEther("0.05"),
    });
    await fundTx.wait();
    console.log("Funded. TX:", fundTx.hash);
  }

  // Mint new NFT to seller (token 1)
  const nft = new ethers.Contract(NFT_ADDRESS, NFT_ABI, seller);
  console.log("\nMinting NFT to seller...");
  const mintTx = await nft.mint(seller.address);
  const receipt = await mintTx.wait();
  const transferEvent = receipt.logs.find(
    (log) => log.topics[0] === ethers.id("Transfer(address,address,uint256)")
  );
  const tokenId = ethers.toBigInt(transferEvent.topics[3]);
  console.log("Minted NFT token ID:", tokenId.toString());
  console.log("NFT TX:", mintTx.hash);

  // Mint and wrap cUSDC for seller
  const usdc = new ethers.Contract(UNDERLYING_USDC, ERC20_ABI, seller);
  const wrapper = new ethers.Contract(CUSDC_WRAPPER, WRAPPER_ABI, seller);
  const amount = ethers.parseUnits("50000", 6);

  console.log("\nMinting cUSDC for seller...");
  await (await usdc.mint(seller.address, amount)).wait();
  await (await usdc.approve(CUSDC_WRAPPER, amount)).wait();
  await (await wrapper.wrap(seller.address, amount)).wait();
  console.log("Seller wrapped", ethers.formatUnits(amount, 6), "cUSDC");

  // Mint and wrap cUSDC for bidder
  const usdcBidder = new ethers.Contract(UNDERLYING_USDC, ERC20_ABI, bidder);
  const wrapperBidder = new ethers.Contract(CUSDC_WRAPPER, WRAPPER_ABI, bidder);

  console.log("\nMinting cUSDC for bidder...");
  await (await usdcBidder.mint(bidder.address, amount)).wait();
  await (await usdcBidder.approve(CUSDC_WRAPPER, amount)).wait();
  await (await wrapperBidder.wrap(bidder.address, amount)).wait();
  console.log("Bidder wrapped", ethers.formatUnits(amount, 6), "cUSDC");

  console.log("\n=== Setup complete ===");
  console.log("Seller account:", seller.address, "— has NFT token", tokenId.toString(), "+ 50k cUSDC");
  console.log("Bidder account:", bidder.address, "— has 50k cUSDC");
  console.log("\nNext steps:");
  console.log("1. Connect seller wallet in the UI");
  console.log("2. Create auction with NFT Token ID:", tokenId.toString(), "and short duration (e.g. 120 seconds)");
  console.log("3. Switch to bidder wallet");
  console.log("4. Place a bid (e.g. 200 cUSDC)");
  console.log("5. Switch back to seller wallet");
  console.log("6. Place a higher bid (e.g. 300 cUSDC)");
  console.log("7. Wait for the duration to end");
  console.log("8. Settle + Finalize in the UI");
  console.log("9. Winner claims the lot, loser withdraws");
}

main().catch(console.error);
