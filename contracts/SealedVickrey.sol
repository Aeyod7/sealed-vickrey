// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, ebool, eaddress} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {IERC7984Receiver} from "@openzeppelin/confidential-contracts/interfaces/IERC7984Receiver.sol";

/* ------------------------------------------------------------------ */
/*  Minimal lot interfaces (no extra deps)                            */
/* ------------------------------------------------------------------ */

interface IERC721Minimal {
    function transferFrom(address from, address to, uint256 tokenId) external;
}

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title SealedVickrey
/// @notice Fully-encrypted Vickrey (second-price) sealed-bid auction on FHEVM.
/// @dev Bids are encrypted euint64 amounts of an ERC-7984 confidential token.
///      At settle time, max and second-max are computed via O(n) fold-and-mask —
///      no sorting required. The winner address is computed in the encrypted domain
///      via eaddress select. Only the winner address and second price (the amount
///      the winner pays) are revealed via public decryption. All individual bids,
///      including the winning bid amount, stay confidential forever.
contract SealedVickrey is ZamaEthereumConfig, IERC7984Receiver {
    /* ------------------------------------------------------------------ */
    /*  Types                                                              */
    /* ------------------------------------------------------------------ */

    enum LotKind {
        NFT,
        ERC20
    }

    enum AuctionState {
        Open, // accepting bids
        Settled, // settle() called, encrypted results computed, awaiting decryption
        Finalized, // decryption verified, winner + price known
        Closed // winner claimed + lot transferred
    }

    struct Auction {
        address seller;
        LotKind lotKind;
        address lotToken; // ERC-721 or ERC-20 contract
        uint256 lotIdentifier; // tokenId for NFT, amount for ERC-20
        address bidToken; // ERC-7984 confidential token
        uint64 reservePrice; // plaintext reserve (out of scope: encrypted reserve)
        uint64 endTime; // bidding deadline
        AuctionState state;
        // Plaintext results (set after finalization)
        address winner;
        uint64 winningPrice; // second-highest bid
        // Encrypted results (set at settle time)
        euint64 maxBid;
        euint64 secondHighestBid;
        eaddress encryptedWinner;
    }

    /* ------------------------------------------------------------------ */
    /*  Storage                                                            */
    /* ------------------------------------------------------------------ */

    uint256 public auctionCount;
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => address[]) internal _bidders;
    mapping(uint256 => mapping(address => euint64)) public bids;
    mapping(uint256 => mapping(address => ebool)) public isWinner;
    mapping(uint256 => mapping(address => bool)) public hasBid;
    mapping(uint256 => mapping(address => bool)) public hasWithdrawn;

    /* ------------------------------------------------------------------ */
    /*  Events                                                             */
    /* ------------------------------------------------------------------ */

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        LotKind lotKind,
        address lotToken,
        uint256 lotIdentifier,
        address bidToken,
        uint64 reservePrice,
        uint64 endTime
    );

    event BidPlaced(uint256 indexed auctionId, address indexed bidder);
    event AuctionSettled(uint256 indexed auctionId);
    event AuctionFinalized(uint256 indexed auctionId, address winner, uint64 winningPrice);
    event AuctionClaimed(uint256 indexed auctionId, address winner);
    event BidWithdrawn(uint256 indexed auctionId, address indexed bidder);

    /* ------------------------------------------------------------------ */
    /*  Errors                                                             */
    /* ------------------------------------------------------------------ */

    error AuctionNotFound(uint256 auctionId);
    error AuctionNotOpen(uint256 auctionId);
    error AuctionNotSettled(uint256 auctionId);
    error AuctionNotFinalized(uint256 auctionId);
    error AuctionNotEnded(uint256 auctionId);
    error AlreadyBid(uint256 auctionId, address bidder);
    error NotWinner(uint256 auctionId, address caller);
    error AlreadyClaimed(uint256 auctionId);
    error AlreadyWithdrawn(uint256 auctionId, address bidder);
    error IsWinner(uint256 auctionId, address bidder);
    error NotEnoughBidders(uint256 auctionId, uint256 count);
    error Unauthorized();
    error DecryptionFailed();

    /* ------------------------------------------------------------------ */
    /*  Create auction                                                     */
    /* ------------------------------------------------------------------ */

    /// @notice Creates a new Vickrey auction. Transfers the lot into this contract for escrow.
    /// @param lotKind NFT or ERC20
    /// @param lotToken The token contract address
    /// @param lotIdentifier tokenId (NFT) or amount (ERC20)
    /// @param bidToken The ERC-7984 confidential token used for bidding
    /// @param reservePrice Plaintext reserve price (0 = no reserve)
    /// @param duration Bidding duration in seconds
    function createAuction(
        LotKind lotKind,
        address lotToken,
        uint256 lotIdentifier,
        address bidToken,
        uint64 reservePrice,
        uint64 duration
    ) external returns (uint256 auctionId) {
        if (duration == 0) revert Unauthorized();
        if (lotToken == address(0)) revert Unauthorized();
        if (bidToken == address(0)) revert Unauthorized();

        auctionId = ++auctionCount;

        // Escrow the lot
        if (lotKind == LotKind.NFT) {
            IERC721Minimal(lotToken).transferFrom(msg.sender, address(this), lotIdentifier);
        } else {
            require(
                IERC20Minimal(lotToken).transferFrom(msg.sender, address(this), lotIdentifier),
                "ERC20 transfer failed"
            );
        }

        auctions[auctionId] = Auction({
            seller: msg.sender,
            lotKind: lotKind,
            lotToken: lotToken,
            lotIdentifier: lotIdentifier,
            bidToken: bidToken,
            reservePrice: reservePrice,
            endTime: uint64(block.timestamp) + duration,
            state: AuctionState.Open,
            winner: address(0),
            winningPrice: 0,
            maxBid: euint64.wrap(0),
            secondHighestBid: euint64.wrap(0),
            encryptedWinner: eaddress.wrap(0)
        });

        emit AuctionCreated(
            auctionId, msg.sender, lotKind, lotToken, lotIdentifier, bidToken, reservePrice, uint64(block.timestamp) + duration
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Bid (via ERC-7984 confidentialTransferAndCall callback)           */
    /* ------------------------------------------------------------------ */

    /// @notice Bidders call `bidToken.confidentialTransferAndCall(auctionContract, encryptedAmount, proof, abi.encode(auctionId))`.
    ///         The token contract transfers the encrypted bid and invokes this callback.
    function onConfidentialTransferReceived(
        address, // operator
        address from,
        euint64 amount,
        bytes calldata data
    ) external override returns (ebool) {
        uint256 auctionId = abi.decode(data, (uint256));
        Auction storage a = auctions[auctionId];
        if (auctionId == 0 || auctionId > auctionCount) revert AuctionNotFound(auctionId);
        if (msg.sender != a.bidToken) revert Unauthorized();
        if (a.state != AuctionState.Open) revert AuctionNotOpen(auctionId);
        if (block.timestamp >= a.endTime) revert AuctionNotOpen(auctionId);
        if (hasBid[auctionId][from]) revert AlreadyBid(auctionId, from);

        // Record the bid
        bids[auctionId][from] = amount;
        hasBid[auctionId][from] = true;
        _bidders[auctionId].push(from);

        // ACL: contract needs access for settle(); bidder needs access for user-decrypt
        FHE.allowThis(amount);
        FHE.allow(amount, from);

        emit BidPlaced(auctionId, from);

        // Return encrypted true — allow the token contract to read it transiently
        ebool success = FHE.asEbool(true);
        FHE.allowTransient(success, msg.sender);
        return success;
    }

    /* ------------------------------------------------------------------ */
    /*  Settle — compute max + second-max + winner (all encrypted)         */
    /* ------------------------------------------------------------------ */

    /// @notice Anyone calls after endTime. Computes the encrypted max bid, second-highest
    ///         bid, and winner address via O(n) fold-and-mask. Makes winner address and
    ///         second price publicly decryptable.
    function settle(uint256 auctionId) external {
        Auction storage a = auctions[auctionId];
        if (auctionId == 0 || auctionId > auctionCount) revert AuctionNotFound(auctionId);
        if (a.state != AuctionState.Open) revert AuctionNotOpen(auctionId);
        if (block.timestamp < a.endTime) revert AuctionNotEnded(auctionId);

        address[] storage bidderList = _bidders[auctionId];
        uint256 n = bidderList.length;
        if (n < 2) revert NotEnoughBidders(auctionId, n);

        // 1. Fold to find max bid — O(n), no sorting
        euint64 maxBid = bids[auctionId][bidderList[0]];
        for (uint256 i = 1; i < n; i++) {
            maxBid = FHE.max(maxBid, bids[auctionId][bidderList[i]]);
        }

        // 2. Mask the max bidder(s) and fold again for second-highest — O(n)
        euint64 secondHighest = FHE.asEuint64(0);
        for (uint256 i = 0; i < n; i++) {
            ebool isMax = FHE.eq(bids[auctionId][bidderList[i]], maxBid);
            euint64 masked = FHE.select(isMax, FHE.asEuint64(0), bids[auctionId][bidderList[i]]);
            secondHighest = FHE.max(secondHighest, masked);
        }

        // 3. Compute winner address in the encrypted domain + per-bidder isWinner — O(n)
        eaddress winner = FHE.asEaddress(address(0));
        for (uint256 i = 0; i < n; i++) {
            ebool isMax = FHE.eq(bids[auctionId][bidderList[i]], maxBid);
            winner = FHE.select(isMax, FHE.asEaddress(bidderList[i]), winner);
            // Store per-bidder winner flag for private "did I win?" check via user decryption
            isWinner[auctionId][bidderList[i]] = isMax;
            FHE.allowThis(isMax);
            FHE.allow(isMax, bidderList[i]);
        }

        // 4. Store encrypted results
        a.maxBid = maxBid;
        a.secondHighestBid = secondHighest;
        a.encryptedWinner = winner;

        FHE.allowThis(maxBid);
        FHE.allowThis(secondHighest);
        FHE.allowThis(winner);

        // 5. Make winner address + second price publicly decryptable
        //    (these are the only values revealed — all bids stay private)
        FHE.makePubliclyDecryptable(secondHighest);
        FHE.makePubliclyDecryptable(winner);

        a.state = AuctionState.Settled;
        emit AuctionSettled(auctionId);
    }

    /* ------------------------------------------------------------------ */
    /*  Finalize — verify public decryption, reveal winner + price         */
    /* ------------------------------------------------------------------ */

    /// @notice Called after off-chain public decryption of the winner address and second price.
    ///         Verifies the decryption proof on-chain and stores the plaintext results.
    /// @param clearWinner The decrypted winner address
    /// @param clearSecondPrice The decrypted second-highest bid (the price the winner pays)
    /// @param decryptionProof Proof from the relayer/KMS
    function finalize(
        uint256 auctionId,
        address clearWinner,
        uint64 clearSecondPrice,
        bytes calldata decryptionProof
    ) external {
        Auction storage a = auctions[auctionId];
        if (auctionId == 0 || auctionId > auctionCount) revert AuctionNotFound(auctionId);
        if (a.state != AuctionState.Settled) revert AuctionNotSettled(auctionId);

        // Build handles list: [secondHighestBid, encryptedWinner]
        bytes32[] memory cts = new bytes32[](2);
        cts[0] = FHE.toBytes32(a.secondHighestBid);
        cts[1] = FHE.toBytes32(a.encryptedWinner);

        // ABI-encode the clear values in the same order
        bytes memory abiEncodedClear = abi.encode(clearSecondPrice, clearWinner);

        // Verify the decryption proof — reverts if invalid
        FHE.checkSignatures(cts, abiEncodedClear, decryptionProof);

        // Store plaintext results
        a.winner = clearWinner;
        a.winningPrice = clearSecondPrice;
        a.state = AuctionState.Finalized;

        emit AuctionFinalized(auctionId, clearWinner, clearSecondPrice);
    }

    /* ------------------------------------------------------------------ */
    /*  Claim — winner pays second price, gets lot + refund                */
    /* ------------------------------------------------------------------ */

    /// @notice Winner calls after finalize. Transfers the second price (encrypted) to the
    ///         seller, refunds the difference (maxBid - secondPrice) to the winner, and
    ///         transfers the lot to the winner. All token movements stay confidential.
    function claim(uint256 auctionId) external {
        Auction storage a = auctions[auctionId];
        if (auctionId == 0 || auctionId > auctionCount) revert AuctionNotFound(auctionId);
        if (a.state != AuctionState.Finalized) revert AuctionNotFinalized(auctionId);
        if (msg.sender != a.winner) revert NotWinner(auctionId, msg.sender);

        // Transfer second price (encrypted) to seller
        euint64 payment = FHE.asEuint64(a.winningPrice);
        FHE.allowThis(payment);
        IERC7984(a.bidToken).confidentialTransfer(a.seller, payment);

        // Refund difference (winnerBid - secondPrice) to winner — stays encrypted
        euint64 winnerBid = bids[auctionId][msg.sender];
        euint64 refund = FHE.sub(winnerBid, payment);
        FHE.allowThis(refund);
        FHE.allow(refund, msg.sender);
        IERC7984(a.bidToken).confidentialTransfer(msg.sender, refund);

        // Transfer lot to winner
        _transferLot(a, msg.sender);

        a.state = AuctionState.Closed;
        emit AuctionClaimed(auctionId, msg.sender);
    }

    /* ------------------------------------------------------------------ */
    /*  Withdraw — losers get their full bid back                          */
    /* ------------------------------------------------------------------ */

    /// @notice Non-winners call after finalize to withdraw their full encrypted bid.
    function withdraw(uint256 auctionId) external {
        Auction storage a = auctions[auctionId];
        if (auctionId == 0 || auctionId > auctionCount) revert AuctionNotFound(auctionId);
        if (a.state != AuctionState.Finalized && a.state != AuctionState.Closed) {
            revert AuctionNotFinalized(auctionId);
        }
        if (msg.sender == a.winner) revert IsWinner(auctionId, msg.sender);
        if (!hasBid[auctionId][msg.sender]) revert AlreadyWithdrawn(auctionId, msg.sender);
        if (hasWithdrawn[auctionId][msg.sender]) revert AlreadyWithdrawn(auctionId, msg.sender);

        hasWithdrawn[auctionId][msg.sender] = true;

        euint64 bidAmount = bids[auctionId][msg.sender];
        FHE.allowThis(bidAmount);
        IERC7984(a.bidToken).confidentialTransfer(msg.sender, bidAmount);

        emit BidWithdrawn(auctionId, msg.sender);
    }

    /* ------------------------------------------------------------------ */
    /*  View — private "did I win?" check (user decryption via EIP-712)    */
    /* ------------------------------------------------------------------ */

    /// @notice Returns an encrypted boolean: true if the caller is the highest bidder.
    ///         The caller can decrypt this privately via EIP-712 user decryption.
    ///         Only callable after settle (isWinner is computed).
    function amIWinner(uint256 auctionId) external view returns (ebool) {
        require(auctions[auctionId].state >= AuctionState.Settled, "Not settled yet");
        require(hasBid[auctionId][msg.sender], "No bid placed");
        return isWinner[auctionId][msg.sender];
    }

    /* ------------------------------------------------------------------ */
    /*  View — auction info                                               */
    /* ------------------------------------------------------------------ */

    function getAuction(uint256 auctionId) external view returns (Auction memory) {
        return auctions[auctionId];
    }

    function getBidders(uint256 auctionId) external view returns (address[] memory) {
        return _bidders[auctionId];
    }

    function getBidCount(uint256 auctionId) external view returns (uint256) {
        return _bidders[auctionId].length;
    }

    /* ------------------------------------------------------------------ */
    /*  Internal                                                          */
    /* ------------------------------------------------------------------ */

    function _transferLot(Auction storage a, address to) internal {
        if (a.lotKind == LotKind.NFT) {
            IERC721Minimal(a.lotToken).transferFrom(address(this), to, a.lotIdentifier);
        } else {
            require(IERC20Minimal(a.lotToken).transfer(to, a.lotIdentifier), "ERC20 transfer failed");
        }
    }
}
