// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TileAuction {
    address public payoutAddress;
    address public highestBidder;
    uint256 public highestBid;
    mapping(address => uint256) public refunds;

    event BidPlaced(address indexed bidder, uint256 amount);
    event RefundClaimed(address indexed user, uint256 amount);
    event Payout(address indexed to, uint256 amount);

    constructor(address _payoutAddress) {
        payoutAddress = _payoutAddress;
    }

    // Place a bid with PEPU (native)
    function placeBid() external payable {
        require(msg.value > highestBid, "Bid too low");
        if (highestBidder != address(0)) {
            refunds[highestBidder] += highestBid;
        }
        highestBidder = msg.sender;
        highestBid = msg.value;
        emit BidPlaced(msg.sender, msg.value);
    }

    // Claim refund if outbid
    function claimRefund() external {
        uint256 amount = refunds[msg.sender];
        require(amount > 0, "No refund available");
        refunds[msg.sender] = 0;
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Failed to send refund");
        emit RefundClaimed(msg.sender, amount);
    }

    // Payout to payoutAddress (only payoutAddress can call)
    function payout() external {
        require(msg.sender == payoutAddress, "Only payout wallet can call");
        uint256 amount = address(this).balance;
        require(amount > 0, "No funds");
        (bool sent, ) = payoutAddress.call{value: amount}("");
        require(sent, "Failed to send payout");
        emit Payout(payoutAddress, amount);
    }
} 