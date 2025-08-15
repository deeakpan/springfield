// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TileCore.sol";

contract TileMarketplace is Ownable, ReentrancyGuard {
    TileCore public tileCore;
    IERC20 public springToken;
    address public constant PAYOUT_ADDRESS = 0x95C46439bD9559e10c4fF49bfF3e20720d93B66E;
    
    uint256 public platformFeeRate; // basis points (500 = 5%)
    uint256 public constant MAX_RENTAL_DURATION = 7 days;
    
    struct SaleListing {
        uint256 tileId;
        address seller;
        uint256 price;
        bool isActive;
        bool isNativePayment;
        uint256 listedAt;
    }
    
    struct RentalListing {
        uint256 tileId;
        address owner;
        uint256 pricePerDay;
        uint256 duration; // Owner sets duration in days
        bool isActive;
        bool isNativePayment;
        address currentRenter;
        uint256 rentalStart;
        uint256 rentalEnd;
        uint256 listedAt;
    }

    struct TileDetails {
        uint256 tileId;
        address owner;
        string metadataUri;
        bool isNativePayment;
        uint256 createdAt;
        address originalBuyer;
        bool isForSale;
        bool isForRent;
        bool isCurrentlyRented;
        uint256 salePrice;
        uint256 rentPricePerDay;
        uint256 rentDuration;
        address currentRenter;
        uint256 rentalEnd;
    }
    
    // Marketplace mappings
    mapping(uint256 => SaleListing) public saleListings;
    mapping(uint256 => RentalListing) public rentalListings;
    
    // Track listings to prevent duplicates and enable queries
    mapping(uint256 => bool) public isListedForSale;
    mapping(uint256 => bool) public isListedForRent;
    mapping(address => uint256[]) public userSaleListings;
    mapping(address => uint256[]) public userRentalListings;
    uint256[] public allSaleListings;
    uint256[] public allRentalListings;
    
    // Events
    event TilePurchased(
        address indexed buyer, 
        uint256 indexed tileId, 
        uint256 amount, 
        bool isNativePayment,
        string metadataUri
    );
    
    event TileListedForSale(
        uint256 indexed tileId, 
        address indexed seller, 
        uint256 price, 
        bool isNativePayment
    );
    
    event TileListedForRent(
        uint256 indexed tileId, 
        address indexed owner, 
        uint256 pricePerDay,
        uint256 duration,
        bool isNativePayment
    );
    
    event TileRented(
        uint256 indexed tileId, 
        address indexed owner, 
        address indexed renter, 
        uint256 duration, 
        uint256 totalPrice, 
        uint256 startTime, 
        uint256 endTime
    );
    
    event TileSold(
        uint256 indexed tileId, 
        address indexed seller, 
        address indexed buyer, 
        uint256 price, 
        bool isNativePayment,
        string metadataUri
    );

    event RentalExpired(uint256 indexed tileId, address indexed renter);
    event TileCoreUpdated(address indexed oldTileCore, address indexed newTileCore);
    
    constructor(address _tileCore, address _springToken, uint256 _platformFeeRate) Ownable(msg.sender) {
        tileCore = TileCore(_tileCore);
        springToken = IERC20(_springToken);
        platformFeeRate = _platformFeeRate; // e.g., 500 for 5%
    }
    
    // Buy new tile with SPRING
    function buyTile(uint256 amount, uint256 tileId, string memory metadataUri) external nonReentrant {
        require(!tileCore.checkTileExists(tileId), "Tile already exists");
        require(amount > 0, "Amount must be greater than 0");
        
        require(
            springToken.transferFrom(msg.sender, PAYOUT_ADDRESS, amount),
            "SPRING transfer failed"
        );
        
        tileCore.createTile(tileId, msg.sender, metadataUri, false);
        emit TilePurchased(msg.sender, tileId, amount, false, metadataUri);
    }
    
    // Buy new tile with native PEPU
    function buyTileWithNative(uint256 tileId, string memory metadataUri) external payable nonReentrant {
        require(!tileCore.checkTileExists(tileId), "Tile already exists");
        require(msg.value > 0, "Amount must be greater than 0");
        
        (bool success, ) = PAYOUT_ADDRESS.call{value: msg.value}("");
        require(success, "Native transfer failed");
        
        tileCore.createTile(tileId, msg.sender, metadataUri, true);
        emit TilePurchased(msg.sender, tileId, msg.value, true, metadataUri);
    }
    
    // List tile for sale
    function listTileForSale(uint256 tileId, uint256 price, bool isNativePayment) external {
        require(tileCore.checkTileExists(tileId), "Tile does not exist");
        require(tileCore.getTile(tileId).owner == msg.sender, "Not tile owner");
        require(!isListedForSale[tileId], "Tile already listed for sale");
        require(price > 0, "Price must be greater than 0");
        
        // Check if tile is currently rented
        RentalListing storage rental = rentalListings[tileId];
        if (rental.currentRenter != address(0) && block.timestamp < rental.rentalEnd) {
            revert("Cannot list rented tile for sale");
        }
        
        saleListings[tileId] = SaleListing({
            tileId: tileId,
            seller: msg.sender,
            price: price,
            isActive: true,
            isNativePayment: isNativePayment,
            listedAt: block.timestamp
        });
        
        isListedForSale[tileId] = true;
        userSaleListings[msg.sender].push(tileId);
        allSaleListings.push(tileId);
        
        emit TileListedForSale(tileId, msg.sender, price, isNativePayment);
    }
    
    // Buy listed tile
    function buyListedTile(uint256 tileId) external payable nonReentrant {
        SaleListing storage listing = saleListings[tileId];
        require(listing.isActive, "Listing not active");
        
        uint256 platformFee = (listing.price * platformFeeRate) / 10000;
        uint256 sellerAmount = listing.price - platformFee;
        
        if (listing.isNativePayment) {
            require(msg.value == listing.price, "Incorrect payment amount");
            (bool success1, ) = listing.seller.call{value: sellerAmount}("");
            (bool success2, ) = PAYOUT_ADDRESS.call{value: platformFee}("");
            require(success1 && success2, "Payment failed");
        } else {
            require(msg.value == 0, "No native tokens should be sent for SPRING listings");
            require(
                springToken.transferFrom(msg.sender, listing.seller, sellerAmount),
                "SPRING transfer to seller failed"
            );
            require(
                springToken.transferFrom(msg.sender, PAYOUT_ADDRESS, platformFee),
                "SPRING fee transfer failed"
            );
        }
        
        // Get metadata before transfer for event
        string memory metadataUri = tileCore.getTile(tileId).metadataUri;
        
        // Transfer tile ownership
        tileCore.transferTile(tileId, msg.sender);
        
        // Clean up listing
        _removeSaleListing(tileId, listing.seller);
        
        emit TileSold(tileId, listing.seller, msg.sender, listing.price, listing.isNativePayment, metadataUri);
    }
    
    // List tile for rent - FIXED: Owner sets duration
    function listTileForRent(uint256 tileId, uint256 pricePerDay, uint256 duration, bool isNativePayment) external {
        require(tileCore.checkTileExists(tileId), "Tile does not exist");
        require(tileCore.getTile(tileId).owner == msg.sender, "Not tile owner");
        require(!isListedForRent[tileId], "Tile already listed for rent");
        require(pricePerDay > 0, "Price must be greater than 0");
        require(duration > 0 && duration <= MAX_RENTAL_DURATION / 1 days, "Invalid duration");
        
        rentalListings[tileId] = RentalListing({
            tileId: tileId,
            owner: msg.sender,
            pricePerDay: pricePerDay,
            duration: duration,
            isActive: true,
            isNativePayment: isNativePayment,
            currentRenter: address(0),
            rentalStart: 0,
            rentalEnd: 0,
            listedAt: block.timestamp
        });
        
        isListedForRent[tileId] = true;
        userRentalListings[msg.sender].push(tileId);
        allRentalListings.push(tileId);
        
        emit TileListedForRent(tileId, msg.sender, pricePerDay, duration, isNativePayment);
    }
    
    // Rent tile - FIXED: Uses owner-set duration
    function rentTile(uint256 tileId) external payable nonReentrant {
        RentalListing storage listing = rentalListings[tileId];
        require(listing.isActive, "Listing not active");
        require(listing.currentRenter == address(0) || block.timestamp >= listing.rentalEnd, "Tile currently rented");
        
        uint256 totalPrice = listing.pricePerDay * listing.duration;
        uint256 platformFee = (totalPrice * platformFeeRate) / 10000;
        uint256 ownerAmount = totalPrice - platformFee;
        
        if (listing.isNativePayment) {
            require(msg.value == totalPrice, "Incorrect payment amount");
            (bool success1, ) = listing.owner.call{value: ownerAmount}("");
            (bool success2, ) = PAYOUT_ADDRESS.call{value: platformFee}("");
            require(success1 && success2, "Payment failed");
        } else {
            require(msg.value == 0, "No native tokens should be sent for SPRING rentals");
            require(
                springToken.transferFrom(msg.sender, listing.owner, ownerAmount),
                "SPRING transfer to owner failed"
            );
            require(
                springToken.transferFrom(msg.sender, PAYOUT_ADDRESS, platformFee),
                "SPRING fee transfer failed"
            );
        }
        
        listing.currentRenter = msg.sender;
        listing.rentalStart = block.timestamp;
        listing.rentalEnd = block.timestamp + (listing.duration * 1 days);
        
        emit TileRented(tileId, listing.owner, msg.sender, listing.duration, totalPrice, listing.rentalStart, listing.rentalEnd);
    }
    
    // Auto-cleanup expired rental (can be called by anyone)
    function cleanupExpiredRental(uint256 tileId) external {
        RentalListing storage rental = rentalListings[tileId];
        require(rental.currentRenter != address(0), "No active rental");
        require(block.timestamp >= rental.rentalEnd, "Rental not expired");
        
        address expiredRenter = rental.currentRenter;
        rental.currentRenter = address(0);
        rental.rentalStart = 0;
        rental.rentalEnd = 0;
        
        emit RentalExpired(tileId, expiredRenter);
    }
    
    // Cancel listings
    function cancelSaleListing(uint256 tileId) external {
        SaleListing storage listing = saleListings[tileId];
        require(listing.seller == msg.sender, "Not listing seller");
        _removeSaleListing(tileId, msg.sender);
    }
    
    function cancelRentalListing(uint256 tileId) external {
        RentalListing storage listing = rentalListings[tileId];
        require(listing.owner == msg.sender, "Not listing owner");
        require(listing.currentRenter == address(0) || block.timestamp >= listing.rentalEnd, "Cannot cancel active rental");
        _removeRentalListing(tileId, msg.sender);
    }
    
    // FIXED: Update tile metadata - Owner OR current renter can edit
    function updateTileMetadata(uint256 tileId, string memory newMetadataUri) external {
        require(tileCore.checkTileExists(tileId), "Tile does not exist");
        
        TileCore.Tile memory tile = tileCore.getTile(tileId);
        RentalListing memory rental = rentalListings[tileId];
        
        bool isOwner = tile.owner == msg.sender;
        bool isCurrentRenter = rental.currentRenter == msg.sender && block.timestamp < rental.rentalEnd;
        
        require(isOwner || isCurrentRenter, "Only owner or current renter can update metadata");
        
        tileCore.updateTileMetadata(tileId, newMetadataUri);
    }
    
    // Internal cleanup functions
    function _removeSaleListing(uint256 tileId, address seller) internal {
        delete saleListings[tileId];
        isListedForSale[tileId] = false;
        _removeFromArray(userSaleListings[seller], tileId);
        _removeFromArray(allSaleListings, tileId);
    }
    
    function _removeRentalListing(uint256 tileId, address owner) internal {
        delete rentalListings[tileId];
        isListedForRent[tileId] = false;
        _removeFromArray(userRentalListings[owner], tileId);
        _removeFromArray(allRentalListings, tileId);
    }
    
    function _removeFromArray(uint256[] storage array, uint256 value) internal {
        for (uint i = 0; i < array.length; i++) {
            if (array[i] == value) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
    }
    
    // ESSENTIAL QUERY FUNCTIONS
    
    // 1. Get all user owned tiles with full details
    function getUserTilesWithDetails(address user) external view returns (TileDetails[] memory) {
        uint256[] memory ownedTiles = tileCore.getUserOwnedTiles(user);
        TileDetails[] memory details = new TileDetails[](ownedTiles.length);
        
        for (uint i = 0; i < ownedTiles.length; i++) {
            details[i] = _getTileDetails(ownedTiles[i]);
        }
        return details;
    }
    
    // 2. Get tile details by ID
    function getTileDetails(uint256 tileId) external view returns (TileDetails memory) {
        require(tileCore.checkTileExists(tileId), "Tile does not exist");
        return _getTileDetails(tileId);
    }
    
    // 3. Get all listings (for marketplace browsing)
    function getAllSaleListings() external view returns (uint256[] memory) {
        return allSaleListings;
    }
    
    function getAllRentalListings() external view returns (uint256[] memory) {
        return allRentalListings;
    }
    
    // 4. Get user's listings
    function getUserSaleListings(address user) external view returns (uint256[] memory) {
        return userSaleListings[user];
    }
    
    function getUserRentalListings(address user) external view returns (uint256[] memory) {
        return userRentalListings[user];
    }
    
    // 5. Get all tiles user ever bought (for frontend metadata queries)
    function getUserBoughtTiles(address user) external view returns (uint256[] memory) {
        return tileCore.getUserBoughtTiles(user);
    }
    
    // 6. Get all created tiles (for complete marketplace overview)
    function getAllCreatedTiles() external view returns (uint256[] memory) {
        return tileCore.getAllCreatedTiles();
    }
    
    // Internal helper
    function _getTileDetails(uint256 tileId) internal view returns (TileDetails memory) {
        TileCore.Tile memory tile = tileCore.getTile(tileId);
        SaleListing memory saleListing = saleListings[tileId];
        RentalListing memory rentalListing = rentalListings[tileId];
        
        bool isCurrentlyRented = rentalListing.currentRenter != address(0) && 
                               block.timestamp < rentalListing.rentalEnd;
        
        return TileDetails({
            tileId: tileId,
            owner: tile.owner,
            metadataUri: tile.metadataUri,
            isNativePayment: tile.isNativePayment,
            createdAt: tile.createdAt,
            originalBuyer: tile.originalBuyer,
            isForSale: saleListing.isActive,
            isForRent: rentalListing.isActive,
            isCurrentlyRented: isCurrentlyRented,
            salePrice: saleListing.price,
            rentPricePerDay: rentalListing.pricePerDay,
            rentDuration: rentalListing.duration,
            currentRenter: rentalListing.currentRenter,
            rentalEnd: rentalListing.rentalEnd
        });
    }
    
    // Admin functions - FIXED: Made TileCore setable
    function setTileCore(address newTileCore) external onlyOwner {
        require(newTileCore != address(0), "Invalid TileCore address");
        address oldTileCore = address(tileCore);
        tileCore = TileCore(newTileCore);
        emit TileCoreUpdated(oldTileCore, newTileCore);
    }
    
    function setSpringToken(address newToken) external onlyOwner {
        springToken = IERC20(newToken);
    }
    
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
}