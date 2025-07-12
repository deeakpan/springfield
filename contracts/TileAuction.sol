// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TileAuction is Ownable, ReentrancyGuard {
    // Auction structure
    struct Auction {
        address highestBidder;
        uint256 highestBid;
        uint256 endTime;
        bool ended;
        address token; // PENK or PEPU (native)
        bool isNative;
        // Only store the metadata CID
        string metadataCID;
    }
    
    // Mapping from tileId to auction
    mapping(uint256 => Auction) public auctions;
    
    // Mapping to track bids for refunds
    mapping(uint256 => mapping(address => uint256)) public bids;
    
    // Events
    event AuctionCreated(uint256 indexed tileId, uint256 endTime);
    event BidPlaced(uint256 indexed tileId, address indexed bidder, uint256 amount, address token, string metadataCID);
    event AuctionEnded(uint256 indexed tileId, address indexed winner, uint256 amount, string metadataCID);
    event BidRefunded(uint256 indexed tileId, address indexed bidder, uint256 amount);
    
    address public constant PAYOUT_ADDRESS = 0x95C46439bD9559e10c4fF49bfF3e20720d93B66E;
    uint256 public constant AUCTION_DURATION = 1 minutes;
    
    constructor() Ownable(msg.sender) {}
    
    // Create auction for a tile
    function createAuction(uint256 tileId) external onlyOwner {
        require(auctions[tileId].endTime == 0, "Auction already exists");
        
        auctions[tileId] = Auction({
            highestBidder: address(0),
            highestBid: 0,
            endTime: block.timestamp + AUCTION_DURATION,
            ended: false,
            token: address(0),
            isNative: false,
            metadataCID: ""
        });
        
        emit AuctionCreated(tileId, block.timestamp + AUCTION_DURATION);
    }
    
    // Place bid with PENK (ERC20) and store metadata CID
    function placeBid(
        uint256 tileId, 
        uint256 amount,
        string memory metadataCID
    ) external nonReentrant {
        Auction storage auction = auctions[tileId];
        require(auction.endTime > 0, "Auction does not exist");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(amount > auction.highestBid, "Bid too low");
        require(bytes(metadataCID).length > 0, "Metadata CID required");
        
        // Transfer tokens from bidder to contract
        IERC20 token = IERC20(0xE8a859a25249c8A5b9F44059937145FC67d65eD4); // PENK
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Refund previous highest bidder if exists
        if (auction.highestBidder != address(0)) {
            bids[tileId][auction.highestBidder] += auction.highestBid;
        }
        
        // Update auction with new bid and metadata CID
        auction.highestBidder = msg.sender;
        auction.highestBid = amount;
        auction.token = address(token);
        auction.isNative = false;
        auction.metadataCID = metadataCID;
        
        emit BidPlaced(tileId, msg.sender, amount, address(token), metadataCID);
    }
    
    // Place bid with PEPU (native) and store metadata CID
    function placeBidNative(
        uint256 tileId,
        string memory metadataCID
    ) external payable nonReentrant {
        Auction storage auction = auctions[tileId];
        require(auction.endTime > 0, "Auction does not exist");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value > auction.highestBid, "Bid too low");
        require(bytes(metadataCID).length > 0, "Metadata CID required");
        
        // Refund previous highest bidder if exists
        if (auction.highestBidder != address(0)) {
            bids[tileId][auction.highestBidder] += auction.highestBid;
        }
        
        // Update auction with new bid and metadata CID
        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;
        auction.token = address(0);
        auction.isNative = true;
        auction.metadataCID = metadataCID;
        
        emit BidPlaced(tileId, msg.sender, msg.value, address(0), metadataCID);
    }
    
    // End auction and transfer funds
    function endAuction(uint256 tileId) external onlyOwner {
        Auction storage auction = auctions[tileId];
        require(auction.endTime > 0, "Auction does not exist");
        require(block.timestamp >= auction.endTime, "Auction not ended");
        require(!auction.ended, "Auction already ended");
        
        auction.ended = true;
        
        if (auction.highestBidder != address(0)) {
            // Transfer winning bid to payout address
            if (auction.isNative) {
                (bool sent, ) = PAYOUT_ADDRESS.call{value: auction.highestBid}("");
                require(sent, "Failed to send native tokens");
            } else {
                IERC20 token = IERC20(auction.token);
                require(token.transfer(PAYOUT_ADDRESS, auction.highestBid), "Failed to send tokens");
            }
            
            emit AuctionEnded(tileId, auction.highestBidder, auction.highestBid, auction.metadataCID);
        }
    }
    
    // Allow bidders to claim refunds
    function claimRefund(uint256 tileId) external nonReentrant {
        uint256 refundAmount = bids[tileId][msg.sender];
        require(refundAmount > 0, "No refund available");
        
        bids[tileId][msg.sender] = 0;
        
        // Send refund
        (bool sent, ) = msg.sender.call{value: refundAmount}("");
        require(sent, "Failed to send refund");
        
        emit BidRefunded(tileId, msg.sender, refundAmount);
    }
    
    // Get auction info
    function getAuction(uint256 tileId) external view returns (
        address highestBidder,
        uint256 highestBid,
        uint256 endTime,
        bool ended,
        address token,
        bool isNative,
        string memory metadataCID
    ) {
        Auction storage auction = auctions[tileId];
        return (
            auction.highestBidder,
            auction.highestBid,
            auction.endTime,
            auction.ended,
            auction.token,
            auction.isNative,
            auction.metadataCID
        );
    }
    
    // Get bid amount for a user
    function getBid(uint256 tileId, address bidder) external view returns (uint256) {
        return bids[tileId][bidder];
    }
    
    // Emergency function to withdraw stuck tokens (only owner)
    function emergencyWithdraw(address token) external onlyOwner {
        if (token == address(0)) {
            (bool sent, ) = owner().call{value: address(this).balance}("");
            require(sent, "Failed to withdraw native tokens");
        } else {
            IERC20 erc20Token = IERC20(token);
            uint256 balance = erc20Token.balanceOf(address(this));
            require(erc20Token.transfer(owner(), balance), "Failed to withdraw tokens");
        }
    }
} 