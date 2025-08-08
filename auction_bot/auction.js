const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const CONFIG = {
    RPC_URL: process.env.NEXT_PUBLIC_RPC_URL, // Your blockchain RPC endpoint
    BOT_PRIVATE_KEY: process.env.BOT_KEY, // Bot wallet private key (separate from main wallet)
    CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_AUCTION_CONTRACT, // Deployed contract address
    CHECK_INTERVAL: 5000, // Check every 5 seconds
    GAS_LIMIT: 500000,
    MAX_GAS_PRICE: ethers.parseUnits('20', 'gwei') // Adjust for your chain
};

// Contract ABI (updated with new functions)
const CONTRACT_ABI = [
    "function startAuction() external",
    "function endAuction() external", 
    "function resetForNewAuction() external",
    "function extendAuctionForNoBids(uint256 _auctionId) external",
    "function currentState() external view returns (uint8)",
    "function auctionEndTime() external view returns (uint256)",
    "function botAddress() external view returns (address)",
    "function currentAuctionId() external view returns (uint256)",
    "function bidRecipient() external view returns (address)",
    "function biddingToken() external view returns (address)",
    "function getBidCount(uint256 _auctionId) external view returns (uint256)",
    "function hasAuctionBeenExtendedForNoBids(uint256 _auctionId) external view returns (bool)",
    "event AuctionStarted(uint256 indexed auctionId, uint256 startTime, uint256 endTime, address tokenAddress)",
    "event AuctionEnded(uint256 indexed auctionId, address indexed winner, string name, string description, uint256 winningAmount, address tokenAddress, string metadataUrl, uint256 totalBids, uint256 totalAmount, uint256 uniqueBidders)",
    "event AuctionEndedNoBids(uint256 indexed auctionId, uint256 endTime, bool wasExtended)",
    "event AuctionExtended(uint256 indexed auctionId, uint256 oldEndTime, uint256 newEndTime, string reason)"
];

class AuctionBot {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        this.wallet = new ethers.Wallet(CONFIG.BOT_PRIVATE_KEY, this.provider);
        this.contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, this.wallet);
        
        console.log(`🤖 Auction Bot started`);
        console.log(`📍 Contract: ${CONFIG.CONTRACT_ADDRESS}`);
        console.log(`👛 Bot address: ${this.wallet.address}`);
    }

    // Get next Friday 10:50 AM UTC timestamp
    getNextFridayTenFifty() {
        const now = new Date();
        const friday = new Date(now);
        
        // Get days until next Friday (5 = Friday)
        const daysUntilFriday = (12 - now.getDay()) % 7;
        friday.setDate(now.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
        
        // Set to 10:50 AM UTC
        friday.setUTCHours(10, 50, 0, 0);
        
        return friday;
    }

    // FIXED: Check if it's time to start auction (Friday 10:50 AM UTC)
    shouldStartAuction() {
        const now = new Date();
        const isFriday = now.getUTCDay() === 5; // Friday = 5
        const isCorrectHour = now.getUTCHours() === 10; // Must be 10:xx UTC
        const isInTimeWindow = now.getUTCMinutes() >= 50 && now.getUTCMinutes() <= 51; // 10:50 to 10:51
        
        // ALL three conditions must be true
        const shouldStart = isFriday && isCorrectHour && isInTimeWindow;
        
        console.log(`🔍 DEBUG: isFriday=${isFriday}, isCorrectHour=${isCorrectHour}, isInTimeWindow=${isInTimeWindow}, shouldStart=${shouldStart}`);
        console.log(`🔍 DEBUG: Current UTC time: ${now.getUTCHours()}:${now.getUTCMinutes().toString().padStart(2, '0')}, Day: ${now.getUTCDay()}`);
        
        return shouldStart;
    }

    // Get current auction state from contract
    async getAuctionState() {
        try {
            const state = await this.contract.currentState();
            return Number(state); // Convert BigInt to number
        } catch (error) {
            console.error('❌ Error getting auction state:', error.message);
            return null;
        }
    }

    // Get auction end time from contract
    async getAuctionEndTime() {
        try {
            const endTime = await this.contract.auctionEndTime();
            return Number(endTime);
        } catch (error) {
            console.error('❌ Error getting auction end time:', error.message);
            return null;
        }
    }

    // Get current auction ID
    async getCurrentAuctionId() {
        try {
            const auctionId = await this.contract.currentAuctionId();
            return Number(auctionId);
        } catch (error) {
            console.error('❌ Error getting current auction ID:', error.message);
            return null;
        }
    }

    // Get bid count for specific auction
    async getBidCount(auctionId) {
        try {
            const count = await this.contract.getBidCount(auctionId);
            return Number(count);
        } catch (error) {
            console.error('❌ Error getting bid count:', error.message);
            return null;
        }
    }

    // Check if auction has been extended for no bids
    async hasBeenExtendedForNoBids(auctionId) {
        try {
            const extended = await this.contract.hasAuctionBeenExtendedForNoBids(auctionId);
            return extended;
        } catch (error) {
            console.error('❌ Error checking extension status:', error.message);
            return false;
        }
    }

    // Start the auction
    async startAuction() {
        try {
            console.log('🚀 Starting auction...');
            
            // Debug contract state first
            await this.debugContractState();
            
            const tx = await this.contract.startAuction({
                gasLimit: CONFIG.GAS_LIMIT
            });
            
            console.log(`📝 Transaction sent: ${tx.hash}`);
            console.log(`⏳ Waiting for confirmation...`);
            
            const receipt = await tx.wait();
            console.log(`✅ Auction started successfully!`);
            console.log(`📦 Block: ${receipt.blockNumber}`);
            console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
            
        } catch (error) {
            console.error('❌ Error starting auction:', error.message);
            if (error.reason) {
                console.error('💡 Reason:', error.reason);
            }
            if (error.code) {
                console.error('🔢 Error code:', error.code);
            }
            
            if (error.code === 'CALL_EXCEPTION') {
                console.log('🔍 Transaction was reverted by contract');
                console.log('💡 Possible reasons:');
                console.log('   - Bot address not authorized (check botAddress in contract)');
                console.log('   - Auction state not INACTIVE');
                console.log('   - Contract paused or has other restrictions');
                await this.debugContractState();
            }
        }
    }

    // Extend auction for no bids (12 hours)
    async extendAuctionForNoBids(auctionId) {
        try {
            console.log(`🔄 Extending auction #${auctionId} for no bids (12 hours)...`);
            
            const tx = await this.contract.extendAuctionForNoBids(auctionId, {
                gasLimit: CONFIG.GAS_LIMIT
            });
            
            console.log(`📝 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Auction extended successfully! Block: ${receipt.blockNumber}`);
            console.log(`⏰ Auction will now run for additional 12 hours`);
            
        } catch (error) {
            console.error('❌ Error extending auction:', error.message);
            if (error.reason) {
                console.error('💡 Reason:', error.reason);
            }
            if (error.code) {
                console.error('🔢 Error code:', error.code);
            }
        }
    }

    // End the auction
    async endAuction() {
        try {
            console.log('🏁 Ending auction...');
            
            const tx = await this.contract.endAuction({
                gasLimit: CONFIG.GAS_LIMIT
            });
            
            console.log(`📝 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Auction ended! Block: ${receipt.blockNumber}`);
            
        } catch (error) {
            console.error('❌ Error ending auction:', error.message);
            if (error.reason) {
                console.error('💡 Reason:', error.reason);
            }
        }
    }

    // Reset for new auction (called next Thursday)
    async resetAuction() {
        try {
            console.log('🔄 Resetting for new auction...');
            
            const tx = await this.contract.resetForNewAuction({
                gasLimit: CONFIG.GAS_LIMIT
            });
            
            console.log(`📝 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Reset complete! Block: ${receipt.blockNumber}`);
            
        } catch (error) {
            console.error('❌ Error resetting auction:', error.message);
            if (error.reason) {
                console.error('💡 Reason:', error.reason);
            }
        }
    }

    // Main bot logic with no-bid extension (ACTIVE CHECK FIRST)
    async runBot() {
        console.log('\n🔍 Checking auction state...');
        
        const currentState = await this.getAuctionState();
        if (currentState === null) {
            console.log('❌ Failed to get auction state, retrying in 5 seconds...');
            return;
        }
        
        const now = Math.floor(Date.now() / 1000);
        const currentTime = new Date();
        
        console.log(`⏰ Current time: ${currentTime.toISOString()} (UTC)`);
        console.log(`📊 Auction state: ${['INACTIVE', 'ACTIVE', 'DISPLAY_PERIOD'][currentState]}`);
        
        // PRIORITY 1: Check if there's an active auction that needs ending
        if (currentState === 1) { // ACTIVE
            console.log('🔥 Found ACTIVE auction - checking end conditions...');
            const endTime = await this.getAuctionEndTime();
            const currentAuctionId = await this.getCurrentAuctionId();
            
            if (endTime && now >= endTime && currentAuctionId !== null) {
                console.log('⏰ Auction time is up! Checking bid status...');
                
                const bidCount = await this.getBidCount(currentAuctionId);
                const hasBeenExtended = await this.hasBeenExtendedForNoBids(currentAuctionId);
                
                console.log(`📊 Auction #${currentAuctionId} stats:`);
                console.log(`   - Total bids: ${bidCount}`);
                console.log(`   - Extended for no bids: ${hasBeenExtended}`);
                
                if (bidCount === 0 && !hasBeenExtended) {
                    console.log('❌ No bids found and not yet extended - extending auction by 12 hours');
                    await this.extendAuctionForNoBids(currentAuctionId);
                } else if (bidCount > 0) {
                    console.log('✅ Found bids - ending auction normally with winner selection');
                    await this.endAuction();
                } else {
                    console.log('❌ No bids found after extension - ending auction with no winner');
                    await this.endAuction();
                }
            } else if (endTime) {
                const timeLeft = endTime - now;
                const hoursLeft = Math.floor(timeLeft / 3600);
                const minutesLeft = Math.floor((timeLeft % 3600) / 60);
                const secondsLeft = Math.floor((timeLeft % 60));
                console.log(`⏳ Auction ends in: ${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`);
                
                if (currentAuctionId !== null) {
                    const bidCount = await this.getBidCount(currentAuctionId);
                    const hasBeenExtended = await this.hasBeenExtendedForNoBids(currentAuctionId);
                    console.log(`📊 Current stats: ${bidCount} bids, extended: ${hasBeenExtended}`);
                }
            } else {
                console.log('❌ Could not get auction end time');
            }
            return; // Exit early - active auction handled
        }
        
        // PRIORITY 2: Regular flow for INACTIVE and DISPLAY_PERIOD states
        switch (currentState) {
            case 0: // INACTIVE
                console.log(`🔍 INACTIVE state - checking if should start auction...`);
                console.log(`🤖 Bot status: ${this.shouldStartAuction() ? 'READY TO START' : 'WAITING'}`);
                
                const shouldStart = this.shouldStartAuction();
                console.log(`🔍 shouldStart result: ${shouldStart}`);
                
                if (shouldStart) {
                    console.log('🚀 CONDITIONS MET! Starting auction now...');
                    await this.startAuction();
                } else {
                    console.log('⏳ Conditions not met. Waiting for next opportunity...');
                    const nextFriday = this.getNextFridayTenFifty();
                    console.log(`⏳ Next auction starts: ${nextFriday.toISOString()} (UTC)`);
                    
                    const minutesUntilNext = Math.floor((nextFriday - currentTime) / 1000 / 60);
                    if (minutesUntilNext > 0) {
                        console.log(`⏰ Time until next auction: ${minutesUntilNext} minutes`);
                    }
                }
                break;
                
            case 2: // DISPLAY_PERIOD
                console.log('📺 In DISPLAY PERIOD - waiting for next Friday...');
                const nextFriday = this.getNextFridayTenFifty();
                const minutesUntilNext = Math.floor((nextFriday - currentTime) / 1000 / 60);
                console.log(`⏳ Next auction starts: ${nextFriday.toISOString()} (UTC)`);
                console.log(`⏰ Time until next auction: ${Math.max(0, minutesUntilNext)} minutes`);
                
                // Only start new auction if it's time for next Friday cycle
                if (now >= nextFriday.getTime() / 1000 && this.shouldStartAuction()) {
                    console.log('🔄 New Friday cycle! Resetting and starting new auction...');
                    await this.resetAuction();
                    console.log('⏳ Waiting 5 seconds before starting new auction...');
                    setTimeout(async () => {
                        await this.startAuction();
                    }, 5000);
                }
                break;
                
            default:
                console.error(`❌ Unknown auction state: ${currentState}`);
        }
    }

    // Check wallet balance
    async checkBalance() {
        try {
            const balance = await this.provider.getBalance(this.wallet.address);
            const balancePepu = ethers.formatEther(balance);
            console.log(`💰 Bot balance: ${balancePepu} PEPU`);
            
            if (balance < ethers.parseEther('0.01')) {
                console.warn('⚠️  LOW BALANCE WARNING! Please add more PEPU to the bot wallet.');
                console.warn(`📍 Bot address: ${this.wallet.address}`);
            }
            
            return balance;
        } catch (error) {
            console.error('❌ Error checking balance:', error.message);
            return null;
        }
    }

    // Debug contract state
    async debugContractState() {
        try {
            console.log('🔍 Debugging contract state...');
            
            const state = await this.contract.currentState();
            console.log(`📊 Current state: ${state} (${['INACTIVE', 'ACTIVE', 'DISPLAY_PERIOD'][state]})`);
            
            const botAddress = await this.contract.botAddress();
            console.log(`🤖 Contract expects bot: ${botAddress}`);
            console.log(`🤖 Our bot address: ${this.wallet.address}`);
            console.log(`✅ Bot address match: ${botAddress.toLowerCase() === this.wallet.address.toLowerCase()}`);
            
            if (botAddress.toLowerCase() !== this.wallet.address.toLowerCase()) {
                console.error('❌ BOT ADDRESS MISMATCH!');
                console.error('💡 Contract expects:', botAddress);
                console.error('💡 You are using:', this.wallet.address);
                console.error('🔧 Solutions:');
                console.error('   1. Update BOT_KEY in .env to match expected address');
                console.error('   2. OR call setBotAddress() on contract to update bot address');
                return false;
            }
            
            const currentAuctionId = await this.contract.currentAuctionId();
            console.log(`🆔 Current auction ID: ${currentAuctionId}`);
            
            const bidRecipient = await this.contract.bidRecipient();
            console.log(`💰 Bid recipient: ${bidRecipient}`);
            
            const biddingToken = await this.contract.biddingToken();
            console.log(`🪙 Bidding token: ${biddingToken}`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error debugging contract:', error.message);
            console.error('💡 Check your CONTRACT_ADDRESS and RPC_URL');
            return false;
        }
    }

    // Start the bot
    async start() {
        console.log('🤖 Auction Bot is now running...\n');
        
        console.log('🌐 Bot Network Info:');
        const network = await this.provider.getNetwork();
        console.log('📊 Chain ID:', network.chainId);
        console.log('🔗 RPC URL:', CONFIG.RPC_URL);
        console.log('');
        
        // Check if BOT_KEY is set
        if (!CONFIG.BOT_PRIVATE_KEY) {
            console.error('❌ BOT_KEY not found in .env file!');
            console.error('💡 Please add BOT_KEY=your_bot_private_key to your .env file');
            process.exit(1);
        }
        
        // Test connection first
        const connectionOk = await this.debugContractState();
        if (!connectionOk) {
            console.error('❌ Cannot start bot - contract connection failed');
            process.exit(1);
        }
        
        // Check balance on startup
        const balance = await this.checkBalance();
        if (!balance) {
            console.error('❌ Cannot check wallet balance');
            process.exit(1);
        }
        
        console.log('\n🎯 Bot initialized successfully!');
        console.log('🔄 Starting monitoring loop...\n');
        
        // Run immediately
        await this.runBot();
        
        // Then run on interval
        setInterval(async () => {
            try {
                await this.runBot();
                
                // Check balance every ~20 checks (every ~100 seconds)
                if (Math.random() < 0.05) {
                    await this.checkBalance();
                }
            } catch (error) {
                console.error('❌ Unexpected error in main loop:', error.message);
                console.error('🔄 Continuing monitoring...');
            }
        }, CONFIG.CHECK_INTERVAL);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Received shutdown signal...');
    console.log('🛑 Shutting down bot gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Received termination signal...');
    console.log('🛑 Shutting down bot gracefully...');
    process.exit(0);
});

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    console.log('🔄 Bot continuing to run...');
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.log('🛑 Bot shutting down due to critical error...');
    process.exit(1);
});

// Start the bot
console.log('🚀 Initializing Auction Bot...\n');

const bot = new AuctionBot();
bot.start().catch((error) => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);

});