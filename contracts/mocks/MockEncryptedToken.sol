// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title MockEncryptedToken
/// @notice Concrete ERC-7984 token for testing. Anyone can mint encrypted tokens.
contract MockEncryptedToken is ERC7984, ZamaEthereumConfig {
    constructor(
        string memory name_,
        string memory symbol_,
        string memory contractURI_
    ) ERC7984(name_, symbol_, contractURI_) {}

    /// @notice Mints encrypted tokens to the caller.
    function mint(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        _mint(msg.sender, amount);
    }

    /// @notice Mints a plaintext amount to the caller (for test setup convenience).
    function mintPlain(uint64 amount) external {
        _mint(msg.sender, FHE.asEuint64(amount));
    }
}
