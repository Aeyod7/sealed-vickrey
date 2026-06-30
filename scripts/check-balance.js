const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const os = require("os");

const varsPath = path.join(os.homedir(), "AppData", "Roaming", "hardhat-nodejs", "Config", "vars.json");
const varsRaw = JSON.parse(fs.readFileSync(varsPath, "utf8"));
const vars = {
  MNEMONIC: varsRaw.vars.MNEMONIC.value,
  INFURA_API_KEY: varsRaw.vars.INFURA_API_KEY.value,
};

const provider = new ethers.JsonRpcProvider(
  "https://sepolia.infura.io/v3/" + vars.INFURA_API_KEY
);

const mnemonic = ethers.Mnemonic.fromPhrase(vars.MNEMONIC);

async function main() {
  for (let i = 0; i < 5; i++) {
    const wallet = ethers.HDNodeWallet.fromMnemonic(
      mnemonic,
      "m/44'/60'/0'/0/" + i
    );
    const balance = await provider.getBalance(wallet.address);
    console.log(
      "Index " + i + ": " + wallet.address + " — " + ethers.formatEther(balance) + " ETH"
    );
  }
}

main().catch(console.error);
