// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/access/Ownable.sol";

contract TileCoreV2 is Ownable {
    struct Tile {
        address owner;
        string metadataUri;
        bool isNativePayment;
        uint256 createdAt;
        address originalBuyer; // Track who originally bought it
    }
    
    // State mappings
    mapping(uint256 => Tile) public tiles;
    mapping(uint256 => bool) public tileExists;
    mapping(address => uint256[]) public userOwnedTiles;
    
    // Track all tiles ever bought (for frontend queries)
    mapping(address => uint256[]) public userBoughtTiles; // All tiles user ever bought
    uint256[] public allCreatedTiles; // All tile IDs ever created
    
    // Count of total tiles created
    uint256 public totalTilesCount;
    
    // Marketplace management
    address public marketplace;
    bool public migrationComplete = false;
    
    // Events
    event TileCreated(
        address indexed owner, 
        uint256 indexed tileId, 
        string metadataUri,
        bool isNativePayment
    );
    
    event TileMetadataUpdated(
        uint256 indexed tileId, 
        string newMetadataUri,
        address indexed updatedBy
    );
    
    event TileOwnershipTransferred(
        uint256 indexed tileId,
        address indexed from,
        address indexed to
    );
    
    event MarketplaceUpdated(address indexed oldMarketplace, address indexed newMarketplace);
    event MigrationCompleted();
    event TilesMigrated(uint256 count);
    
    modifier onlyMarketplace() {
        require(msg.sender == marketplace, "Only marketplace can call this function");
        _;
    }
    
    modifier onlyDuringMigration() {
        require(!migrationComplete, "Migration is complete");
        _;
    }
    
    constructor() Ownable(msg.sender) {}
    
    // Owner-only functions for contract management
    function setMarketplace(address _marketplace) external onlyOwner {
        require(_marketplace != address(0), "Invalid marketplace address");
        address oldMarketplace = marketplace;
        marketplace = _marketplace;
        emit MarketplaceUpdated(oldMarketplace, _marketplace);
    }
    
    function completeMigration() external onlyOwner {
        migrationComplete = true;
        emit MigrationCompleted();
    }
    
    // Migration function - only callable by owner during migration period
    function migrateTiles(
        uint256[] calldata tileIds,
        address[] calldata owners,
        string[] calldata metadataUris,
        bool[] calldata isNativePayments,
        uint256[] calldata createdAts,
        address[] calldata originalBuyers
    ) external onlyOwner onlyDuringMigration {
        require(
            tileIds.length == owners.length &&
            owners.length == metadataUris.length &&
            metadataUris.length == isNativePayments.length &&
            isNativePayments.length == createdAts.length &&
            createdAts.length == originalBuyers.length,
            "Array lengths must match"
        );
        
        for (uint256 i = 0; i < tileIds.length; i++) {
            uint256 tileId = tileIds[i];
            address owner = owners[i];
            
            require(!tileExists[tileId], "Tile already exists");
            
            tiles[tileId] = Tile({
                owner: owner,
                metadataUri: metadataUris[i],
                isNativePayment: isNativePayments[i],
                createdAt: createdAts[i],
                originalBuyer: originalBuyers[i]
            });
            
            tileExists[tileId] = true;
            userOwnedTiles[owner].push(tileId);
            userBoughtTiles[originalBuyers[i]].push(tileId); // Track purchase history
            allCreatedTiles.push(tileId);
            totalTilesCount++;
        }
        
        emit TilesMigrated(tileIds.length);
    }
    
    // Marketplace functions - now called by marketplace contract instead of owner
    function createTile(uint256 tileId, address owner, string memory metadataUri, bool isNativePayment) external onlyMarketplace {
        require(migrationComplete, "Migration must be complete");
        require(!tileExists[tileId], "Tile already exists");
        
        tiles[tileId] = Tile({
            owner: owner,
            metadataUri: metadataUri,
            isNativePayment: isNativePayment,
            createdAt: block.timestamp,
            originalBuyer: owner
        });
        
        tileExists[tileId] = true;
        userOwnedTiles[owner].push(tileId);
        userBoughtTiles[owner].push(tileId); // Track purchase history
        allCreatedTiles.push(tileId);
        totalTilesCount++;
        
        emit TileCreated(owner, tileId, metadataUri, isNativePayment);
    }
    
    function updateTileMetadata(uint256 tileId, string memory newMetadataUri) external onlyMarketplace {
        require(tileExists[tileId], "Tile does not exist");
        tiles[tileId].metadataUri = newMetadataUri;
        emit TileMetadataUpdated(tileId, newMetadataUri, msg.sender);
    }
    
    function transferTile(uint256 tileId, address newOwner) external onlyMarketplace {
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
        
        emit TileOwnershipTransferred(tileId, oldOwner, newOwner);
    }
    
    // View functions (unchanged)
    function getUserOwnedTiles(address user) external view returns (uint256[] memory) {
        return userOwnedTiles[user];
    }
    
    function getUserBoughtTiles(address user) external view returns (uint256[] memory) {
        return userBoughtTiles[user];
    }
    
    function getAllCreatedTiles() external view returns (uint256[] memory) {
        return allCreatedTiles;
    }
    
    function getTile(uint256 tileId) external view returns (Tile memory) {
        require(tileExists[tileId], "Tile does not exist");
        return tiles[tileId];
    }
    
    function checkTileExists(uint256 tileId) external view returns (bool) {
        return tileExists[tileId];
    }
}