// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TileCore.sol";

contract TileMarketplace is Ownable, ReentrancyGuard {
    TileCore public tileCore;
    IERC20 public sprfdToken;
    address public constant PAYOUT_ADDRESS = 0x95C46439bD9559e10c4fF49bfF3e20720d93B66E;
    
    // Platform fees (in basis points: 500 = 5%)
    uint256 public platformFeeRate = 500; // 5%
    uint256 public constant MAX_RENTAL_DURATION = 7 days;
    
    struct SaleListing {
        uint256 tileId;
        address seller;
        uint256 price;
        bool isActive;
        bool isNativePayment;
    }
    
    struct RentalListing {
        uint256 tileId;
        address owner;
        uint256 pricePerDay;
        bool isActive;
        bool isNativePayment;
        address currentRenter;
        uint256 rentalStart;
        uint256 rentalEnd;
    }
    
    // Marketplace mappings
    mapping(uint256 => SaleListing) public saleListings;
    mapping(uint256 => RentalListing) public rentalListings;
    
    // Events
    event TilePurchased(
        address indexed buyer, 
        uint256 indexed tileId, 
        uint256 amount, 
        bool isNativePayment
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
        bool isNativePayment
    );
    
    constructor(address _tileCore, address _sprfdToken) Ownable(msg.sender) {
        tileCore = TileCore(_tileCore);
        sprfdToken = IERC20(_sprfdToken);
    }
    
    // Buy new tile with SPRFD
    function buyTile(uint256 amount, uint256 tileId, string memory metadataUri) external nonReentrant {
        require(!tileCore.checkTileExists(tileId), "Tile already exists");
        require(amount > 0, "Amount must be greater than 0");
        
        require(
            sprfdToken.transferFrom(msg.sender, PAYOUT_ADDRESS, amount),
            "SPRFD transfer failed"
        );
        
        tileCore.createTile(tileId, msg.sender, metadataUri, false);
        emit TilePurchased(msg.sender, tileId, amount, false);
    }
    
    // Buy new tile with native PEPU
    function buyTileWithNative(uint256 tileId, string memory metadataUri) external payable nonReentrant {
        require(!tileCore.checkTileExists(tileId), "Tile already exists");
        require(msg.value > 0, "Amount must be greater than 0");
        
        (bool success, ) = PAYOUT_ADDRESS.call{value: msg.value}("");
        require(success, "Native transfer failed");
        
        tileCore.createTile(tileId, msg.sender, metadataUri, true);
        emit TilePurchased(msg.sender, tileId, msg.value, true);
    }
    
    // List tile for sale
    function listTileForSale(uint256 tileId, uint256 price, bool isNativePayment) external {
        require(tileCore.checkTileExists(tileId), "Tile does not exist");
        require(tileCore.getTile(tileId).owner == msg.sender, "Not tile owner");
        
        saleListings[tileId] = SaleListing({
            tileId: tileId,
            seller: msg.sender,
            price: price,
            isActive: true,
            isNativePayment: isNativePayment
        });
        
        emit TileListedForSale(tileId, msg.sender, price, isNativePayment);
    }
    
    // Buy listed tile
    function buyListedTile(uint256 tileId) external payable nonReentrant {
        SaleListing storage listing = saleListings[tileId];
        require(listing.isActive, "Listing not active");
        
        if (listing.isNativePayment) {
            require(msg.value == listing.price, "Incorrect payment amount");
            (bool success, ) = listing.seller.call{value: msg.value}("");
            require(success, "Payment failed");
        } else {
            require(msg.value == 0, "No native tokens should be sent for SPRFD listings");
            require(
                sprfdToken.transferFrom(msg.sender, listing.seller, listing.price),
                "SPRFD transfer failed"
            );
        }
        
        // Transfer tile ownership
        tileCore.transferTile(tileId, msg.sender);
        
        // Remove listing
        delete saleListings[tileId];
        
        emit TileSold(tileId, listing.seller, msg.sender, listing.price, listing.isNativePayment);
    }
    
    // List tile for rent
    function listTileForRent(uint256 tileId, uint256 pricePerDay, bool isNativePayment) external {
        require(tileCore.checkTileExists(tileId), "Tile does not exist");
        require(tileCore.getTile(tileId).owner == msg.sender, "Not tile owner");
        
        rentalListings[tileId] = RentalListing({
            tileId: tileId,
            owner: msg.sender,
            pricePerDay: pricePerDay,
            isActive: true,
            isNativePayment: isNativePayment,
            currentRenter: address(0),
            rentalStart: 0,
            rentalEnd: 0
        });
        
        emit TileListedForRent(tileId, msg.sender, pricePerDay, isNativePayment);
    }
    
    // Rent tile
    function rentTile(uint256 tileId, uint256 duration) external payable nonReentrant {
        require(duration > 0 && duration <= MAX_RENTAL_DURATION, "Invalid duration");
        
        RentalListing storage listing = rentalListings[tileId];
        require(listing.isActive, "Listing not active");
        require(listing.currentRenter == address(0), "Tile already rented");
        
        uint256 totalPrice = listing.pricePerDay * duration;
        
        if (listing.isNativePayment) {
            require(msg.value == totalPrice, "Incorrect payment amount");
            (bool success, ) = listing.owner.call{value: msg.value}("");
            require(success, "Payment failed");
        } else {
            require(msg.value == 0, "No native tokens should be sent for SPRFD rentals");
            require(
                sprfdToken.transferFrom(msg.sender, listing.owner, totalPrice),
                "SPRFD transfer failed"
            );
        }
        
        listing.currentRenter = msg.sender;
        listing.rentalStart = block.timestamp;
        listing.rentalEnd = block.timestamp + (duration * 1 days);
        
        emit TileRented(tileId, listing.owner, msg.sender, duration, totalPrice, listing.rentalStart, listing.rentalEnd);
    }
    
    // Cancel rental listing
    function cancelRentalListing(uint256 tileId) external {
        RentalListing storage listing = rentalListings[tileId];
        require(listing.owner == msg.sender, "Not listing owner");
        require(listing.currentRenter == address(0), "Cannot cancel active rental");
        
        delete rentalListings[tileId];
    }
    
    // Cancel sale listing
    function cancelSaleListing(uint256 tileId) external {
        SaleListing storage listing = saleListings[tileId];
        require(listing.seller == msg.sender, "Not listing seller");
        
        delete saleListings[tileId];
    }
    
    // Admin functions
    function setTileCore(address newTileCore) external onlyOwner {
        tileCore = TileCore(newTileCore);
    }
    
    function setSprfdToken(address newToken) external onlyOwner {
        sprfdToken = IERC20(newToken);
    }
    
    function setPlatformFeeRate(uint256 newRate) external onlyOwner {
        platformFeeRate = newRate;
    }
    
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
    
    function emergencyWithdrawERC20(address token) external onlyOwner {
        IERC20(token).transfer(owner(), IERC20(token).balanceOf(address(this)));
    }
} 