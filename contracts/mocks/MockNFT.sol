// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title MockNFT
/// @notice Minimal ERC-721 for testing the auction lot. Only what we need: mint + transferFrom.
contract MockNFT is IERC165 {
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;

    uint256 private _nextId;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = _nextId++;
        _balances[to]++;
        _owners[tokenId] = to;
        emit Transfer(address(0), to, tokenId);
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Nonexistent token");
        return owner;
    }

    function balanceOf(address owner) external view returns (uint256) {
        return _balances[owner];
    }

    function approve(address to, uint256 tokenId) external {
        require(_owners[tokenId] == msg.sender, "Not owner");
        _tokenApprovals[tokenId] = to;
        emit Approval(msg.sender, to, tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId) external {
        require(_owners[tokenId] == from, "Wrong owner");
        require(
            msg.sender == from || _tokenApprovals[tokenId] == msg.sender,
            "Not approved"
        );
        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;
        _tokenApprovals[tokenId] = address(0);
        emit Transfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd; // ERC165, ERC721
    }
}
