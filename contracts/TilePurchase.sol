// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TilePurchase is Ownable {
    // Only PENK is supported as ERC20
    address public penkToken;
    // Mapping to track purchased tiles (optional, for demo)
    mapping(uint256 => address) public tileOwners;
    address public constant PAYOUT_ADDRESS = 0x95C46439bD9559e10c4fF49bfF3e20720d93B66E;

    event TilePurchased(address indexed buyer, address indexed token, uint256 amount, uint256 tileId);
    event TilePurchasedNative(address indexed buyer, uint256 amount, uint256 tileId);

    constructor(address _penkToken) Ownable(msg.sender) {
        penkToken = _penkToken;
    }

    // Buy with PENK (ERC20)
    function buyTile(address token, uint256 amount, uint256 tileId) external {
        require(token == penkToken, "Only PENK supported");
        require(IERC20(token).transferFrom(msg.sender, PAYOUT_ADDRESS, amount), "Transfer failed");
        tileOwners[tileId] = msg.sender;
        emit TilePurchased(msg.sender, token, amount, tileId);
    }

    // Buy with native PEPU
    function buyTileNative(uint256 tileId) external payable {
        require(msg.value > 0, "No native sent");
        (bool sent, ) = PAYOUT_ADDRESS.call{value: msg.value}("");
        require(sent, "Native transfer failed");
        tileOwners[tileId] = msg.sender;
        emit TilePurchasedNative(msg.sender, msg.value, tileId);
    }
} 