import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers as EthersT } from "ethers";
import { ethers, fhevm } from "hardhat";
import * as hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import { SealedVickrey, SealedVickrey__factory } from "../types";
import { MockEncryptedToken, MockEncryptedToken__factory } from "../types";
import { MockNFT, MockNFT__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  seller: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  carol: HardhatEthersSigner;
};

async function deployFixture() {
  const sealedFactory = (await ethers.getContractFactory("SealedVickrey")) as SealedVickrey__factory;
  const sealed = (await sealedFactory.deploy()) as SealedVickrey;
  const sealedAddress = await sealed.getAddress();

  const tokenFactory = (await ethers.getContractFactory("MockEncryptedToken")) as MockEncryptedToken__factory;
  const bidToken = (await tokenFactory.deploy("cUSDC", "cUSDC", "")) as MockEncryptedToken;
  const bidTokenAddress = await bidToken.getAddress();

  const nftFactory = (await ethers.getContractFactory("MockNFT")) as MockNFT__factory;
  const nft = (await nftFactory.deploy()) as MockNFT;
  const nftAddress = await nft.getAddress();

  return { sealed, sealedAddress, bidToken, bidTokenAddress, nft, nftAddress };
}

describe("SealedVickrey", function () {
  let signers: Signers;
  let sealed: SealedVickrey;
  let sealedAddress: string;
  let bidToken: MockEncryptedToken;
  let bidTokenAddress: string;
  let nft: MockNFT;
  let nftAddress: string;

  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      seller: ethSigners[1],
      alice: ethSigners[2],
      bob: ethSigners[3],
      carol: ethSigners[4],
    };
  });

  beforeEach(async function () {
    ({ sealed, sealedAddress, bidToken, bidTokenAddress, nft, nftAddress } = await deployFixture());
  });

  /// Helper: mint encrypted tokens to a bidder via the mock token's mintPlain
  async function mintEncrypted(bidder: HardhatEthersSigner, amount: bigint) {
    const tx = await bidToken.connect(bidder).mintPlain(amount);
    await tx.wait();
  }

  /// Helper: place an encrypted bid via confidentialTransferAndCall
  async function placeBid(
    bidder: HardhatEthersSigner,
    auctionId: bigint,
    bidAmount: bigint,
  ) {
    // Encrypt the bid amount
    const input = await fhevm
      .createEncryptedInput(bidTokenAddress, bidder.address)
      .add64(bidAmount)
      .encrypt();

    const tx = await bidToken
      .connect(bidder)
      ["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
        sealedAddress,
        input.handles[0],
        input.inputProof,
        ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [auctionId]),
      );
    await tx.wait();
  }

  /// Helper: settle + finalize an auction, returns { winner, secondPrice }
  async function settleAndFinalize(auctionId: bigint) {
    // Settle
    const settleTx = await sealed.settle(auctionId);
    await settleTx.wait();

    // Get encrypted handles for public decryption
    const auction = await sealed.getAuction(auctionId);
    const secondPriceHandle = auction.secondHighestBid;
    const winnerHandle = auction.encryptedWinner;

    // Public decrypt both
    const decryptResults = await fhevm.publicDecrypt([secondPriceHandle, winnerHandle]);

    // The clearValues are keyed by handle; decode them
    const clearSecondPrice = decryptResults.clearValues[secondPriceHandle] as bigint;
    const clearWinner = decryptResults.clearValues[winnerHandle] as string;

    // Build the abi-encoded clear values in the SAME ORDER as the contract expects:
    // abi.encode(clearSecondPrice, clearWinner) — uint64, address
    const abiEncodedClear = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint64", "address"],
      [clearSecondPrice, clearWinner],
    );

    // Finalize
    const finalizeTx = await sealed.finalize(
      auctionId,
      clearWinner,
      clearSecondPrice,
      decryptResults.decryptionProof,
    );
    await finalizeTx.wait();

    return { winner: clearWinner, secondPrice: clearSecondPrice };
  }

  it("should create an NFT auction and escrow the lot", async function () {
    // Mint NFT to seller
    const mintTx = await nft.connect(signers.seller).mint(signers.seller.address);
    const receipt = await mintTx.wait();
    const transferEvent = receipt?.logs.find(
      (log) => nft.interface.parseLog(log)?.name === "Transfer",
    );
    const tokenId = nft.interface.parseLog(transferEvent!)?.args[2] as bigint;

    // Approve the auction contract to transfer the NFT
    await nft.connect(signers.seller).approve(sealedAddress, tokenId);

    // Create auction
    const duration = 3600n;
    const reserve = 100n;
    const tx = await sealed
      .connect(signers.seller)
      .createAuction(0, nftAddress, tokenId, bidTokenAddress, reserve, duration); // LotKind.NFT = 0
    await tx.wait();

    const auction = await sealed.getAuction(1n);
    expect(auction.seller).to.eq(signers.seller.address);
    expect(auction.lotKind).to.eq(0); // NFT
    expect(auction.state).to.eq(0); // Open
    expect(await nft.ownerOf(tokenId)).to.eq(sealedAddress); // escrowed
  });

  it("should accept encrypted bids from multiple bidders", async function () {
    // Setup: mint NFT, create auction
    const mintTx = await nft.connect(signers.seller).mint(signers.seller.address);
    const receipt = await mintTx.wait();
    const transferEvent = receipt?.logs.find(
      (log) => nft.interface.parseLog(log)?.name === "Transfer",
    );
    const tokenId = nft.interface.parseLog(transferEvent!)?.args[2] as bigint;
    await nft.connect(signers.seller).approve(sealedAddress, tokenId);

    await sealed
      .connect(signers.seller)
      .createAuction(0, nftAddress, tokenId, bidTokenAddress, 0n, 3600n);

    // Mint encrypted tokens to bidders
    await mintEncrypted(signers.alice, 1000n);
    await mintEncrypted(signers.bob, 1000n);
    await mintEncrypted(signers.carol, 1000n);

    // Place bids: alice=100, bob=300, carol=200
    await placeBid(signers.alice, 1n, 100n);
    await placeBid(signers.bob, 1n, 300n);
    await placeBid(signers.carol, 1n, 200n);

    expect(await sealed.getBidCount(1n)).to.eq(3);
    expect(await sealed.hasBid(1n, signers.alice.address)).to.eq(true);
    expect(await sealed.hasBid(1n, signers.bob.address)).to.eq(true);
    expect(await sealed.hasBid(1n, signers.carol.address)).to.eq(true);
  });

  it("should settle a Vickrey auction: winner pays 2nd-highest bid", async function () {
    // Setup: mint NFT, create auction
    const mintTx = await nft.connect(signers.seller).mint(signers.seller.address);
    const receipt = await mintTx.wait();
    const transferEvent = receipt?.logs.find(
      (log) => nft.interface.parseLog(log)?.name === "Transfer",
    );
    const tokenId = nft.interface.parseLog(transferEvent!)?.args[2] as bigint;
    await nft.connect(signers.seller).approve(sealedAddress, tokenId);

    await sealed
      .connect(signers.seller)
      .createAuction(0, nftAddress, tokenId, bidTokenAddress, 0n, 3600n);

    // Mint encrypted tokens to bidders
    await mintEncrypted(signers.alice, 1000n);
    await mintEncrypted(signers.bob, 1000n);
    await mintEncrypted(signers.carol, 1000n);

    // Place bids: alice=100, bob=300, carol=200
    // Expected: winner = bob (300), second price = 200 (carol's bid)
    await placeBid(signers.alice, 1n, 100n);
    await placeBid(signers.bob, 1n, 300n);
    await placeBid(signers.carol, 1n, 200n);

    // Advance time past end
    await time.increase(3700);

    // Settle + finalize
    const result = await settleAndFinalize(1n);

    expect(result.winner).to.eq(signers.bob.address);
    expect(result.secondPrice).to.eq(200n);

    // Verify auction state
    const auction = await sealed.getAuction(1n);
    expect(auction.state).to.eq(2); // Finalized
    expect(auction.winner).to.eq(signers.bob.address);
    expect(auction.winningPrice).to.eq(200n);
  });

  it("should let the winner claim the lot after finalization", async function () {
    const mintTx = await nft.connect(signers.seller).mint(signers.seller.address);
    const receipt = await mintTx.wait();
    const transferEvent = receipt?.logs.find(
      (log) => nft.interface.parseLog(log)?.name === "Transfer",
    );
    const tokenId = nft.interface.parseLog(transferEvent!)?.args[2] as bigint;
    await nft.connect(signers.seller).approve(sealedAddress, tokenId);

    await sealed
      .connect(signers.seller)
      .createAuction(0, nftAddress, tokenId, bidTokenAddress, 0n, 3600n);

    await mintEncrypted(signers.alice, 1000n);
    await mintEncrypted(signers.bob, 1000n);
    await mintEncrypted(signers.carol, 1000n);

    await placeBid(signers.alice, 1n, 100n);
    await placeBid(signers.bob, 1n, 300n);
    await placeBid(signers.carol, 1n, 200n);

    await time.increase(3700);
    await settleAndFinalize(1n);

    // Winner (bob) claims
    const claimTx = await sealed.connect(signers.bob).claim(1n);
    await claimTx.wait();

    // NFT should be transferred to bob
    expect(await nft.ownerOf(tokenId)).to.eq(signers.bob.address);

    const auction = await sealed.getAuction(1n);
    expect(auction.state).to.eq(3); // Closed
  });

  it("should let losers withdraw their full bid", async function () {
    const mintTx = await nft.connect(signers.seller).mint(signers.seller.address);
    const receipt = await mintTx.wait();
    const transferEvent = receipt?.logs.find(
      (log) => nft.interface.parseLog(log)?.name === "Transfer",
    );
    const tokenId = nft.interface.parseLog(transferEvent!)?.args[2] as bigint;
    await nft.connect(signers.seller).approve(sealedAddress, tokenId);

    await sealed
      .connect(signers.seller)
      .createAuction(0, nftAddress, tokenId, bidTokenAddress, 0n, 3600n);

    await mintEncrypted(signers.alice, 1000n);
    await mintEncrypted(signers.bob, 1000n);
    await mintEncrypted(signers.carol, 1000n);

    await placeBid(signers.alice, 1n, 100n);
    await placeBid(signers.bob, 1n, 300n);
    await placeBid(signers.carol, 1n, 200n);

    await time.increase(3700);
    await settleAndFinalize(1n);

    // Alice (loser, bid 100) withdraws
    const aliceBalBefore = await bidToken.confidentialBalanceOf(signers.alice.address);
    const withdrawTx = await sealed.connect(signers.alice).withdraw(1n);
    await withdrawTx.wait();
    const aliceBalAfter = await bidToken.confidentialBalanceOf(signers.alice.address);

    // Decrypt balances to verify
    const before = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      aliceBalBefore,
      bidTokenAddress,
      signers.alice,
    );
    const after = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      aliceBalAfter,
      bidTokenAddress,
      signers.alice,
    );
    expect(after - before).to.eq(100n);

    // Carol (loser, bid 200) withdraws
    const carolWithdrawTx = await sealed.connect(signers.carol).withdraw(1n);
    await carolWithdrawTx.wait();
    expect(await sealed.hasWithdrawn(1n, signers.carol.address)).to.eq(true);
  });

  it("should reject bids after auction ends", async function () {
    const mintTx = await nft.connect(signers.seller).mint(signers.seller.address);
    const receipt = await mintTx.wait();
    const transferEvent = receipt?.logs.find(
      (log) => nft.interface.parseLog(log)?.name === "Transfer",
    );
    const tokenId = nft.interface.parseLog(transferEvent!)?.args[2] as bigint;
    await nft.connect(signers.seller).approve(sealedAddress, tokenId);

    await sealed
      .connect(signers.seller)
      .createAuction(0, nftAddress, tokenId, bidTokenAddress, 0n, 3600n);

    await mintEncrypted(signers.alice, 1000n);
    await time.increase(3700);

    await expect(placeBid(signers.alice, 1n, 100n)).to.be.reverted;
  });

  it("should reject settle with fewer than 2 bidders", async function () {
    const mintTx = await nft.connect(signers.seller).mint(signers.seller.address);
    const receipt = await mintTx.wait();
    const transferEvent = receipt?.logs.find(
      (log) => nft.interface.parseLog(log)?.name === "Transfer",
    );
    const tokenId = nft.interface.parseLog(transferEvent!)?.args[2] as bigint;
    await nft.connect(signers.seller).approve(sealedAddress, tokenId);

    await sealed
      .connect(signers.seller)
      .createAuction(0, nftAddress, tokenId, bidTokenAddress, 0n, 3600n);

    await mintEncrypted(signers.alice, 1000n);
    await placeBid(signers.alice, 1n, 100n);

    await time.increase(3700);
    await expect(sealed.settle(1n)).to.be.reverted;
  });

  it("should let a bidder privately check if they won via user decryption", async function () {
    const mintTx = await nft.connect(signers.seller).mint(signers.seller.address);
    const receipt = await mintTx.wait();
    const transferEvent = receipt?.logs.find(
      (log) => nft.interface.parseLog(log)?.name === "Transfer",
    );
    const tokenId = nft.interface.parseLog(transferEvent!)?.args[2] as bigint;
    await nft.connect(signers.seller).approve(sealedAddress, tokenId);

    await sealed
      .connect(signers.seller)
      .createAuction(0, nftAddress, tokenId, bidTokenAddress, 0n, 3600n);

    await mintEncrypted(signers.alice, 1000n);
    await mintEncrypted(signers.bob, 1000n);
    await placeBid(signers.alice, 1n, 100n);
    await placeBid(signers.bob, 1n, 300n);

    await time.increase(3700);
    const settleTx = await sealed.settle(1n);
    await settleTx.wait();

    // Bob (winner) checks privately
    const bobIsWinnerHandle = await sealed.connect(signers.bob).amIWinner(1n);
    const bobIsWinner = await fhevm.userDecryptEbool(
      bobIsWinnerHandle,
      sealedAddress,
      signers.bob,
    );
    expect(bobIsWinner).to.eq(true);

    // Alice (loser) checks privately
    const aliceIsWinnerHandle = await sealed.connect(signers.alice).amIWinner(1n);
    const aliceIsWinner = await fhevm.userDecryptEbool(
      aliceIsWinnerHandle,
      sealedAddress,
      signers.alice,
    );
    expect(aliceIsWinner).to.eq(false);
  });
});
