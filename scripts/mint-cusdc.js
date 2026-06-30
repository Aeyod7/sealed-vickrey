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

// cUSDCMock wrapper: 0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639
// Underlying USDC Mock: 0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF
const UNDERLYING_USDC = "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF";
const CUSDC_WRAPPER = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";

const ERC20_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const WRAPPER_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "wrap",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
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

  console.log("Account:", wallet.address);

  // 1. Mint underlying USDC mock tokens
  const usdc = new ethers.Contract(UNDERLYING_USDC, ERC20_ABI, wallet);
  const mintAmount = ethers.parseUnits("10000", 6); // 10,000 USDC (6 decimals)
  console.log("Minting", ethers.formatUnits(mintAmount, 6), "USDC mock...");
  const mintTx = await usdc.mint(wallet.address, mintAmount);
  await mintTx.wait();
  console.log("Minted USDC. TX:", mintTx.hash);

  // 2. Approve the wrapper to spend the USDC
  console.log("Approving wrapper to spend USDC...");
  const approveTx = await usdc.approve(CUSDC_WRAPPER, mintAmount);
  await approveTx.wait();
  console.log("Approved. TX:", approveTx.hash);

  // 3. Wrap (shield) into the cUSDCMock wrapper
  console.log("Wrapping into cUSDCMock...");
  const wrapper = new ethers.Contract(CUSDC_WRAPPER, WRAPPER_ABI, wallet);
  const wrapTx = await wrapper.wrap(wallet.address, mintAmount);
  await wrapTx.wait();
  console.log("Wrapped! TX:", wrapTx.hash);

  // 4. Check balances
  const usdcBal = await usdc.balanceOf(wallet.address);
  console.log("Public USDC balance:", ethers.formatUnits(usdcBal, 6));
  console.log("Done! The confidential balance is now on-chain (encrypted).");
}

main().catch(console.error);
