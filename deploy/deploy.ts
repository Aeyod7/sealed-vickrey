import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy SealedVickrey
  const deployedSealed = await deploy("SealedVickrey", {
    from: deployer,
    log: true,
  });
  console.log(`SealedVickrey contract: `, deployedSealed.address);

  // Deploy MockNFT (the auction lot)
  const deployedNFT = await deploy("MockNFT", {
    from: deployer,
    log: true,
  });
  console.log(`MockNFT contract: `, deployedNFT.address);

  // On Sepolia, use the official cUSDCMock as the bid token
  // On local/hardhat, deploy our MockEncryptedToken
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId === 11155111n) {
    console.log(`\nSepolia deployment:`);
    console.log(`  Bid token (cUSDCMock): 0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`);
    console.log(`  Underlying USDC Mock:  0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF`);
    console.log(`  Wrappers Registry:     0x2f0750Bbb0A246059d80e94c454586a7F27a128e`);
    console.log(`\nUpdate frontend/src/lib/config.ts with these addresses.`);
  } else {
    const deployedToken = await deploy("MockEncryptedToken", {
      from: deployer,
      args: ["cUSDC", "cUSDC", ""],
      log: true,
    });
    console.log(`MockEncryptedToken contract: `, deployedToken.address);
  }
};

export default func;
func.id = "deploy_sealed";
func.tags = ["SealedVickrey"];
