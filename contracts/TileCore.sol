// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract TileCore is Ownable {
    struct Tile {
        address owner;
        string metadataUri;
        bool isNativePayment;
    }
    
    // State mappings
    mapping(uint256 => Tile) public tiles;
    mapping(uint256 => bool) public tileExists;
    mapping(address => uint256[]) public userOwnedTiles;
    
    // Count of total tiles created
    uint256 public totalTilesCount;
    
    // Events
    event TileCreated(
        address indexed owner, 
        uint256 indexed tileId, 
        string metadataUri,
        bool isNativePayment
    );
    
    event TileMetadataUpdated(
        uint256 indexed tileId, 
        string newMetadataUri
    );
    
    constructor() Ownable(msg.sender) {}
    
    // Core functions
    function createTile(uint256 tileId, address owner, string memory metadataUri, bool isNativePayment) external onlyOwner {
        require(!tileExists[tileId], "Tile already exists");
        
        tiles[tileId] = Tile({
            owner: owner,
            metadataUri: metadataUri,
            isNativePayment: isNativePayment
        });
        
        tileExists[tileId] = true;
        userOwnedTiles[owner].push(tileId);
        totalTilesCount++;
        
        emit TileCreated(owner, tileId, metadataUri, isNativePayment);
    }
    
    function updateTileMetadata(uint256 tileId, string memory newMetadataUri) external onlyOwner {
        require(tileExists[tileId], "Tile does not exist");
        tiles[tileId].metadataUri = newMetadataUri;
        emit TileMetadataUpdated(tileId, newMetadataUri);
    }
    
    function transferTile(uint256 tileId, address newOwner) external onlyOwner {
        require(tileExists[tileId], "Tile does not exist");
        address oldOwner = tiles[tileId].owner;
        
        // Remove from old owner's list
        uint256[] storage oldOwnerTiles = userOwnedTiles[oldOwner];
        for (uint i = 0; i < oldOwnerTiles.length; i++) {
            if (oldOwnerTiles[i] == tileId) {
                oldOwnerTiles[i] = oldOwnerTiles[oldOwnerTiles.length - 1];
                oldOwnerTiles.pop();
                break;
            }
        }
        
        // Update owner and add to new owner's list
        tiles[tileId].owner = newOwner;
        userOwnedTiles[newOwner].push(tileId);
    }
    
    // View functions
    function getUserOwnedTiles(address user) external view returns (uint256[] memory) {
        return userOwnedTiles[user];
    }
    
    function getTile(uint256 tileId) external view returns (Tile memory) {
        require(tileExists[tileId], "Tile does not exist");
        return tiles[tileId];
    }
    
    function checkTileExists(uint256 tileId) external view returns (bool) {
        return tileExists[tileId];
    }
} 