// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WeeklyAuction is ReentrancyGuard, Ownable {
    struct Bid {
        address bidder;
        string name;
        string description;
        uint256 amount;
        address tokenAddress;
        string metadataUrl;
        uint256 timestamp;
        uint256 auctionId;
    }

    struct AuctionInfo {
        uint256 auctionId;
        uint256 startTime;
        uint256 endTime;
        uint256 totalBids;
        uint256 totalAmount;
        uint256 uniqueBidders;
        address highestBidder;
        uint256 highestBidAmount;
        bool isActive;
        bool hasWinner;
        bool hasBeenExtendedForNoBids;
        Bid winningBid;
    }

    enum AuctionState { INACTIVE, ACTIVE, DISPLAY_PERIOD }

    // Current auction state
    AuctionState public currentState;
    uint256 public currentAuctionId;
    uint256 public auctionStartTime;
    uint256 public auctionEndTime;
    uint256 public constant AUCTION_DURATION = 5 minutes; // TESTING: 5 minutes instead of 24 hours
    uint256 public constant EXTENSION_TIME = 2 minutes; // TESTING: 2 minutes instead of 4 minutes
    uint256 public constant LAST_MINUTE_THRESHOLD = 10; // 10 seconds
    uint256 public constant NO_BID_EXTENSION_TIME = 12 hours; // 12 hours extension if no bids
    
    // ERC20 token for bidding
    IERC20 public biddingToken;
    
    // Current auction data
    Bid[] public currentBids;
    mapping(uint256 => Bid[]) public auctionBids; // auctionId => bids
    mapping(uint256 => AuctionInfo) public auctions; // auctionId => auction info
    
    // Refund tracking per auction
    mapping(address => mapping(uint256 => uint256)) public bidderRefunds; // bidder => auctionId => amount
    mapping(address => mapping(uint256 => bool)) public hasRefunded; // bidder => auctionId => claimed
    
    // Stats tracking
    mapping(address => bool) private uniqueBidderTracker;
    address[] private currentAuctionBidders;
    uint256 public totalAuctionsHeld;
    
    // Bot and recipient
    address public botAddress;
    address public bidRecipient;
    
    // Events with auction tracking
    event AuctionStarted(
        uint256 indexed auctionId,
        uint256 startTime, 
        uint256 endTime,
        address tokenAddress
    );
    
    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        string name,
        string description,
        uint256 amount,
        address tokenAddress,
        string metadataUrl,
        uint256 timestamp,
        uint256 bidIndex
    );
    
    event AuctionExtended(
        uint256 indexed auctionId,
        uint256 oldEndTime,
        uint256 newEndTime,
        string reason
    );
    
    event AuctionEndedNoBids(
        uint256 indexed auctionId,
        uint256 endTime,
        bool wasExtended
    );
    
    event AuctionEnded(
        uint256 indexed auctionId,
        address indexed winner,
        string name,
        string description,
        uint256 winningAmount,
        address tokenAddress,
        string metadataUrl,
        uint256 totalBids,
        uint256 totalAmount,
        uint256 uniqueBidders
    );
    
    event RefundClaimed(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        address tokenAddress
    );
    
    event FundsForwarded(
        uint256 indexed auctionId,
        address indexed recipient,
        uint256 amount,
        address tokenAddress
    );
    
    event AuctionStatsUpdated(
        uint256 indexed auctionId,
        uint256 totalBids,
        uint256 totalAmount,
        uint256 uniqueBidders,
        address currentHighestBidder,
        uint256 currentHighestAmount
    );

    modifier onlyBot() {
        require(msg.sender == botAddress, "Only bot can call this");
        _;
    }

    constructor(
        address _botAddress, 
        address _bidRecipient,
        address _biddingToken
    ) Ownable(msg.sender) {
        botAddress = _botAddress;
        bidRecipient = _bidRecipient;
        biddingToken = IERC20(_biddingToken);
        currentState = AuctionState.INACTIVE;
        currentAuctionId = 0;
        totalAuctionsHeld = 0;
    }

    // Bot calls this every Monday 12 PM UTC
    function startAuction() external onlyBot {
        require(currentState == AuctionState.INACTIVE, "Auction not inactive");
        
        // Increment auction ID for new auction
        currentAuctionId++;
        totalAuctionsHeld++;
        
        // Reset current auction data
        delete currentBids;
        delete currentAuctionBidders;
        
        // Initialize auction
        currentState = AuctionState.ACTIVE;
        auctionStartTime = block.timestamp;
        auctionEndTime = block.timestamp + AUCTION_DURATION;
        
        // Create auction info
        auctions[currentAuctionId] = AuctionInfo({
            auctionId: currentAuctionId,
            startTime: auctionStartTime,
            endTime: auctionEndTime,
            totalBids: 0,
            totalAmount: 0,
            uniqueBidders: 0,
            highestBidder: address(0),
            highestBidAmount: 0,
            isActive: true,
            hasWinner: false,
            hasBeenExtendedForNoBids: false,
            winningBid: Bid({
                bidder: address(0),
                name: "",
                description: "",
                amount: 0,
                tokenAddress: address(biddingToken),
                metadataUrl: "",
                timestamp: 0,
                auctionId: currentAuctionId
            })
        });
        
        emit AuctionStarted(currentAuctionId, auctionStartTime, auctionEndTime, address(biddingToken));
    }

    // Place a bid with ERC20 tokens
    function placeBid(
        uint256 _amount,
        string memory _name,
        string memory _description,
        string memory _metadataUrl
    ) external nonReentrant {
        require(currentState == AuctionState.ACTIVE, "Auction not active");
        require(_amount > 0, "Bid must be greater than 0");
        require(bytes(_name).length > 0, "Name required");
        
        // Transfer tokens from bidder
        require(
            biddingToken.transferFrom(msg.sender, address(this), _amount),
            "Token transfer failed"
        );
        
        // Check if bid is in last minute and extend if needed
        if (block.timestamp >= auctionEndTime - LAST_MINUTE_THRESHOLD) {
            uint256 oldEndTime = auctionEndTime;
            auctionEndTime += EXTENSION_TIME;
            auctions[currentAuctionId].endTime = auctionEndTime;
            emit AuctionExtended(currentAuctionId, oldEndTime, auctionEndTime, "Last minute bid");
        }
        
        // Track refunds per auction
        bidderRefunds[msg.sender][currentAuctionId] += _amount;
        hasRefunded[msg.sender][currentAuctionId] = false;
        
        // Track unique bidders
        if (!uniqueBidderTracker[msg.sender]) {
            uniqueBidderTracker[msg.sender] = true;
            currentAuctionBidders.push(msg.sender);
            auctions[currentAuctionId].uniqueBidders++;
        }
        
        // Create and store bid
        Bid memory newBid = Bid({
            bidder: msg.sender,
            name: _name,
            description: _description,
            amount: _amount,
            tokenAddress: address(biddingToken),
            metadataUrl: _metadataUrl,
            timestamp: block.timestamp,
            auctionId: currentAuctionId
        });
        
        currentBids.push(newBid);
        auctionBids[currentAuctionId].push(newBid);
        
        // Update auction stats
        auctions[currentAuctionId].totalBids++;
        auctions[currentAuctionId].totalAmount += _amount;
        
        // Update highest bidder if this is the highest bid
        if (_amount > auctions[currentAuctionId].highestBidAmount) {
            auctions[currentAuctionId].highestBidder = msg.sender;
            auctions[currentAuctionId].highestBidAmount = _amount;
        }
        
        emit BidPlaced(
            currentAuctionId,
            msg.sender,
            _name,
            _description,
            _amount,
            address(biddingToken),
            _metadataUrl,
            block.timestamp,
            currentBids.length - 1
        );
        
        emit AuctionStatsUpdated(
            currentAuctionId,
            auctions[currentAuctionId].totalBids,
            auctions[currentAuctionId].totalAmount,
            auctions[currentAuctionId].uniqueBidders,
            auctions[currentAuctionId].highestBidder,
            auctions[currentAuctionId].highestBidAmount
        );
    }

    // Bot calls this to extend auction by 12 hours if no bids received
    function extendAuctionForNoBids(uint256 _auctionId) external onlyBot {
        require(currentState == AuctionState.ACTIVE, "Auction not active");
        require(_auctionId == currentAuctionId, "Invalid auction ID");
        require(block.timestamp >= auctionEndTime, "Auction not ended yet");
        require(auctionBids[_auctionId].length == 0, "Auction has bids - cannot extend");
        require(!auctions[_auctionId].hasBeenExtendedForNoBids, "Already extended for no bids");
        
        // Extend auction by 12 hours
        uint256 oldEndTime = auctionEndTime;
        auctionEndTime += NO_BID_EXTENSION_TIME;
        auctions[currentAuctionId].endTime = auctionEndTime;
        auctions[currentAuctionId].hasBeenExtendedForNoBids = true;
        
        emit AuctionExtended(currentAuctionId, oldEndTime, auctionEndTime, "No bids received - 12 hour extension");
    }

    // Bot calls this after auction duration (+ any extensions)
    function endAuction() external onlyBot {
        require(currentState == AuctionState.ACTIVE, "Auction not active");
        require(block.timestamp >= auctionEndTime, "Auction still ongoing");
        
        currentState = AuctionState.DISPLAY_PERIOD;
        auctions[currentAuctionId].isActive = false;
        
        if (currentBids.length > 0) {
            // Find highest bid
            Bid memory highestBid = currentBids[0];
            for (uint i = 1; i < currentBids.length; i++) {
                if (currentBids[i].amount > highestBid.amount) {
                    highestBid = currentBids[i];
                }
            }
            
            // Store winning bid
            auctions[currentAuctionId].winningBid = highestBid;
            auctions[currentAuctionId].hasWinner = true;
            
            // Forward winning bid to recipient immediately
            require(
                biddingToken.transfer(bidRecipient, highestBid.amount),
                "Failed to forward tokens"
            );
            
            // Remove winner's refund so they can't claim
            bidderRefunds[highestBid.bidder][currentAuctionId] = 0;
            
            emit FundsForwarded(currentAuctionId, bidRecipient, highestBid.amount, address(biddingToken));
            emit AuctionEnded(
                currentAuctionId,
                highestBid.bidder,
                highestBid.name,
                highestBid.description,
                highestBid.amount,
                highestBid.tokenAddress,
                highestBid.metadataUrl,
                auctions[currentAuctionId].totalBids,
                auctions[currentAuctionId].totalAmount,
                auctions[currentAuctionId].uniqueBidders
            );
        } else {
            // No bids even after potential extension
            emit AuctionEndedNoBids(
                currentAuctionId, 
                block.timestamp, 
                auctions[currentAuctionId].hasBeenExtendedForNoBids
            );
        }
        
        // Reset unique bidder tracker for next auction
        for (uint i = 0; i < currentAuctionBidders.length; i++) {
            uniqueBidderTracker[currentAuctionBidders[i]] = false;
        }
    }

    // Bot calls this next Monday to reset for new auction
    function resetForNewAuction() external onlyBot {
        require(currentState == AuctionState.DISPLAY_PERIOD, "Not in display period");
        currentState = AuctionState.INACTIVE;
    }

    // Non-winners can claim refunds for specific auction
    function claimRefund(uint256 _auctionId) external nonReentrant {
        require(_auctionId > 0 && _auctionId <= currentAuctionId, "Invalid auction ID");
        require(!auctions[_auctionId].isActive, "Auction still active");
        require(!hasRefunded[msg.sender][_auctionId], "Already refunded for this auction");
        
        uint256 refundAmount = bidderRefunds[msg.sender][_auctionId];
        require(refundAmount > 0, "No refund available for this auction");
        
        hasRefunded[msg.sender][_auctionId] = true;
        bidderRefunds[msg.sender][_auctionId] = 0;
        
        require(
            biddingToken.transfer(msg.sender, refundAmount),
            "Refund transfer failed"
        );
        
        emit RefundClaimed(_auctionId, msg.sender, refundAmount, address(biddingToken));
    }

    // Batch claim refunds for multiple auctions
    function claimMultipleRefunds(uint256[] memory _auctionIds) external nonReentrant {
        uint256 totalRefund = 0;
        
        for (uint i = 0; i < _auctionIds.length; i++) {
            uint256 auctionId = _auctionIds[i];
            
            if (auctionId > 0 && 
                auctionId <= currentAuctionId && 
                !auctions[auctionId].isActive &&
                !hasRefunded[msg.sender][auctionId] &&
                bidderRefunds[msg.sender][auctionId] > 0) {
                
                uint256 refundAmount = bidderRefunds[msg.sender][auctionId];
                hasRefunded[msg.sender][auctionId] = true;
                bidderRefunds[msg.sender][auctionId] = 0;
                totalRefund += refundAmount;
                
                emit RefundClaimed(auctionId, msg.sender, refundAmount, address(biddingToken));
            }
        }
        
        require(totalRefund > 0, "No refunds available");
        require(
            biddingToken.transfer(msg.sender, totalRefund),
            "Batch refund transfer failed"
        );
    }

    // View functions for frontend
    function getCurrentAuctionInfo() external view returns (AuctionInfo memory) {
        if (currentAuctionId == 0) {
            return AuctionInfo({
                auctionId: 0,
                startTime: 0,
                endTime: 0,
                totalBids: 0,
                totalAmount: 0,
                uniqueBidders: 0,
                highestBidder: address(0),
                highestBidAmount: 0,
                isActive: false,
                hasWinner: false,
                hasBeenExtendedForNoBids: false,
                winningBid: Bid({
                    bidder: address(0),
                    name: "",
                    description: "",
                    amount: 0,
                    tokenAddress: address(biddingToken),
                    metadataUrl: "",
                    timestamp: 0,
                    auctionId: 0
                })
            });
        }
        return auctions[currentAuctionId];
    }
    
    function getAuctionInfo(uint256 _auctionId) external view returns (AuctionInfo memory) {
        return auctions[_auctionId];
    }
    
    function getCurrentBids() external view returns (Bid[] memory) {
        return currentBids;
    }
    
    function getAuctionBids(uint256 _auctionId) external view returns (Bid[] memory) {
        return auctionBids[_auctionId];
    }
    
    function getBidCount(uint256 _auctionId) external view returns (uint256) {
        if (_auctionId == 0) return currentBids.length;
        return auctionBids[_auctionId].length;
    }
    
    function getTimeUntilEnd() external view returns (uint256) {
        if (currentState != AuctionState.ACTIVE || block.timestamp >= auctionEndTime) {
            return 0;
        }
        return auctionEndTime - block.timestamp;
    }
    
    function getHighestBidder() external view returns (address, uint256) {
        if (currentAuctionId == 0) return (address(0), 0);
        return (auctions[currentAuctionId].highestBidder, auctions[currentAuctionId].highestBidAmount);
    }
    
    function getUserRefundableAuctions(address _user) external view returns (uint256[] memory, uint256[] memory) {
        uint256 count = 0;
        
        // Count refundable auctions
        for (uint256 i = 1; i <= currentAuctionId; i++) {
            if (!auctions[i].isActive && 
                !hasRefunded[_user][i] && 
                bidderRefunds[_user][i] > 0) {
                count++;
            }
        }
        
        uint256[] memory auctionIds = new uint256[](count);
        uint256[] memory amounts = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= currentAuctionId; i++) {
            if (!auctions[i].isActive && 
                !hasRefunded[_user][i] && 
                bidderRefunds[_user][i] > 0) {
                auctionIds[index] = i;
                amounts[index] = bidderRefunds[_user][i];
                index++;
            }
        }
        
        return (auctionIds, amounts);
    }
    
    function getTotalRefundableAmount(address _user) external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 1; i <= currentAuctionId; i++) {
            if (!auctions[i].isActive && 
                !hasRefunded[_user][i] && 
                bidderRefunds[_user][i] > 0) {
                total += bidderRefunds[_user][i];
            }
        }
        return total;
    }

    // Check if auction has been extended for no bids
    function hasAuctionBeenExtendedForNoBids(uint256 _auctionId) external view returns (bool) {
        require(_auctionId > 0 && _auctionId <= currentAuctionId, "Invalid auction ID");
        return auctions[_auctionId].hasBeenExtendedForNoBids;
    }

    // Admin functions
    function setBotAddress(address _newBot) external onlyOwner {
        botAddress = _newBot;
    }
    
    function setBidRecipient(address _newRecipient) external onlyOwner {
        bidRecipient = _newRecipient;
    }
    
    function setBiddingToken(address _newToken) external onlyOwner {
        require(currentState == AuctionState.INACTIVE, "Cannot change token during active auction");
        biddingToken = IERC20(_newToken);
    }
    
    // Emergency function (only when inactive)
    function emergencyWithdraw() external onlyOwner {
        require(currentState == AuctionState.INACTIVE, "Auction must be inactive");
        uint256 balance = biddingToken.balanceOf(address(this));
        require(biddingToken.transfer(owner(), balance), "Emergency withdrawal failed");
    }
}