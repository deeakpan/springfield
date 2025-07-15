// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TileAuction is Ownable, ReentrancyGuard {
    constructor() Ownable(msg.sender) {
        // Initialize the auction for tile 665 so getAuction(665) always returns a valid struct
        uint256 centerTileId = 665;
        auctions[centerTileId] = Auction({
            highestBidder: address(0),
            highestBid: 0,
            token: address(0),
            isNative: false,
            metadataCID: ""
        });
    }

    struct Auction {
        address highestBidder;
        uint256 highestBid;
        address token; // PENK or PEPU (native)
        bool isNative;
        string metadataCID;
    }
    
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => mapping(address => uint256)) public bids;
    
    address public constant PAYOUT_ADDRESS = 0x95C46439bD9559e10c4fF49bfF3e20720d93B66E;
    uint256 public constant AUCTION_DURATION = 5 minutes;
    uint256 public constant WINNER_DISPLAY_DURATION = 5 minutes;
    uint256 public constant WEEK = 7 days;
    uint256 public constant TUESDAY_UTC = 2 days; // 0 = Sunday, 1 = Monday, 2 = Tuesday
    uint256 public constant AUCTION_START_HOUR = 16;
    uint256 public constant AUCTION_START_MINUTE = 34;

    event BidPlaced(uint256 indexed tileId, address indexed bidder, uint256 amount, address token, string metadataCID);
    event AuctionSettled(uint256 indexed tileId, address indexed winner, uint256 amount, string metadataCID);
    event BidRefunded(uint256 indexed tileId, address indexed bidder, uint256 amount);

    // Returns the timestamp for the next Tuesday 1:30 UTC after a given timestamp
    function getNextTuesdayAuctionStart(uint256 fromTimestamp) public pure returns (uint256) {
        uint256 dayOfWeek = (fromTimestamp / 1 days + 4) % 7; // 1970-01-01 was a Thursday
        uint256 daysUntilTuesday = (TUESDAY_UTC + 7 - dayOfWeek) % 7;
        uint256 nextTuesday = (fromTimestamp / 1 days + daysUntilTuesday) * 1 days;
        uint256 auctionStart = nextTuesday + AUCTION_START_HOUR * 1 hours + AUCTION_START_MINUTE * 1 minutes;
        if (auctionStart <= fromTimestamp) {
            auctionStart += WEEK;
        }
        return auctionStart;
    }

    // Returns the current auction period (start, end, displayEnd)
    function getCurrentAuctionPeriod() public view returns (uint256 start, uint256 end, uint256 displayEnd) {
        uint256 nowTs = block.timestamp;
        uint256 lastAuctionStart = getNextTuesdayAuctionStart(nowTs) - WEEK;
        start = lastAuctionStart;
        end = start + AUCTION_DURATION;
        displayEnd = end + WINNER_DISPLAY_DURATION;
    }

    // Returns true if the auction is currently active
    function isAuctionActive() public view returns (bool) {
        (uint256 start, uint256 end, ) = getCurrentAuctionPeriod();
        return block.timestamp >= start && block.timestamp < end;
    }

    // Returns true if the winner display period is active
    function isWinnerDisplayActive() public view returns (bool) {
        (uint256 start, uint256 end, uint256 displayEnd) = getCurrentAuctionPeriod();
        return block.timestamp >= end && block.timestamp < displayEnd;
    }

    // Returns true if the auction is in the idle period
    function isIdlePeriod() public view returns (bool) {
        (uint256 start, , uint256 displayEnd) = getCurrentAuctionPeriod();
        return block.timestamp >= displayEnd && block.timestamp < start + WEEK;
    }

    // Place bid with PENK (ERC20)
    function placeBid(uint256 tileId, uint256 amount, string memory metadataCID) external nonReentrant {
        require(isAuctionActive(), "Auction not active");
        require(amount > auctions[tileId].highestBid, "Bid too low");
        require(bytes(metadataCID).length > 0, "Metadata CID required");
        IERC20 token = IERC20(0xE8a859a25249c8A5b9F44059937145FC67d65eD4); // PENK
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        if (auctions[tileId].highestBidder != address(0)) {
            bids[tileId][auctions[tileId].highestBidder] += auctions[tileId].highestBid;
        }
        auctions[tileId].highestBidder = msg.sender;
        auctions[tileId].highestBid = amount;
        auctions[tileId].token = address(token);
        auctions[tileId].isNative = false;
        auctions[tileId].metadataCID = metadataCID;
        emit BidPlaced(tileId, msg.sender, amount, address(token), metadataCID);
    }
    
    // Place bid with PEPU (native)
    function placeBidNative(uint256 tileId, string memory metadataCID) external payable nonReentrant {
        require(isAuctionActive(), "Auction not active");
        require(msg.value > auctions[tileId].highestBid, "Bid too low");
        require(bytes(metadataCID).length > 0, "Metadata CID required");
        if (auctions[tileId].highestBidder != address(0)) {
            bids[tileId][auctions[tileId].highestBidder] += auctions[tileId].highestBid;
        }
        auctions[tileId].highestBidder = msg.sender;
        auctions[tileId].highestBid = msg.value;
        auctions[tileId].token = address(0);
        auctions[tileId].isNative = true;
        auctions[tileId].metadataCID = metadataCID;
        emit BidPlaced(tileId, msg.sender, msg.value, address(0), metadataCID);
    }
    
    // Settle auction and transfer funds to payout address (can be called by anyone, only during winner display period)
    function settleAuction(uint256 tileId) public nonReentrant {
        require(isWinnerDisplayActive(), "Not in winner display period");
        Auction storage auction = auctions[tileId];
        if (auction.highestBidder != address(0) && auction.highestBid > 0) {
            if (auction.isNative) {
                (bool sent, ) = PAYOUT_ADDRESS.call{value: auction.highestBid}("");
                require(sent, "Failed to send native tokens");
            } else {
                IERC20 token = IERC20(auction.token);
                require(token.transfer(PAYOUT_ADDRESS, auction.highestBid), "Failed to send tokens");
            }
            emit AuctionSettled(tileId, auction.highestBidder, auction.highestBid, auction.metadataCID);
            // Reset auction for next week
            auction.highestBidder = address(0);
            auction.highestBid = 0;
            auction.token = address(0);
            auction.isNative = false;
            auction.metadataCID = "";
        }
    }
    
    // Allow bidders to claim refunds
    function claimRefund(uint256 tileId) external nonReentrant {
        uint256 refundAmount = bids[tileId][msg.sender];
        require(refundAmount > 0, "No refund available");
        bids[tileId][msg.sender] = 0;
        (bool sent, ) = msg.sender.call{value: refundAmount}("");
        require(sent, "Failed to send refund");
        emit BidRefunded(tileId, msg.sender, refundAmount);
    }
    
    // Get auction info for frontend
    function getAuction(uint256 tileId) external view returns (
        address highestBidder,
        uint256 highestBid,
        address token,
        bool isNative,
        string memory metadataCID,
        bool auctionActive,
        bool winnerDisplayActive
    ) {
        Auction storage auction = auctions[tileId];
        highestBidder = auction.highestBidder;
        highestBid = auction.highestBid;
        token = auction.token;
        isNative = auction.isNative;
        metadataCID = auction.metadataCID;
        auctionActive = isAuctionActive();
        winnerDisplayActive = isWinnerDisplayActive();
    }
} 