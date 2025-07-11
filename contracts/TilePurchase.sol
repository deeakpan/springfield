// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TilePurchase is Ownable {
    // Mapping of supported token addresses
    mapping(address => bool) public supportedTokens;

    event TilePurchased(address indexed buyer, address indexed token, uint256 amount);

    constructor(address[] memory _supportedTokens) Ownable(msg.sender) {
        for (uint i = 0; i < _supportedTokens.length; i++) {
            supportedTokens[_supportedTokens[i]] = true;
        }
    }

    // Owner can add more supported tokens
    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
    }

    // Owner can remove supported tokens
    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
    }

    // User buys a tile by paying the required amount of a supported token
    function buyTile(address token, uint256 amount) external {
        require(supportedTokens[token], "Token not supported");
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit TilePurchased(msg.sender, token, amount);
    }
} 