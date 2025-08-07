const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const CONFIG = {
    RPC_URL: process.env.RPC_URL, // Your blockchain RPC endpoint
    PRIVATE_KEY: process.env.BOT_KEY, // Bot wallet private key
    CONTRACT_ADDRESS: process.env.AUCTION_ADDRESS, // Deployed contract address
    CHECK_INTERVAL: 30000, // Check every 30 seconds
    GAS_LIMIT: 500000,
    MAX_GAS_PRICE: ethers.utils.parseUnits('20', 'gwei') // Adjust for your chain
};

// Contract ABI (only functions we need)
const CONTRACT_ABI = [
    "function startAuction() external",
    "function endAuction() external", 
    "function resetForNewAuction() external",
    "function currentState() external view returns (uint8)",
    "function auctionEndTime() external view returns (uint256)",
    "event AuctionStarted(uint256 startTime, uint256 endTime)",
    "event AuctionEnded(address winner, string name, string description, uint256 amount, address tokenAddress, string metadataUrl)"
];

class AuctionBot {
    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
        this.wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, this.provider);
        this.contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, this.wallet);
        
        console.log(`🤖 Auction Bot started`);
        console.log(`📍 Contract: ${CONFIG.CONTRACT_ADDRESS}`);
        console.log(`👛 Bot address: ${this.wallet.address}`);
    }

    // Get next Thursday 21:10 UTC timestamp
    getNextThursdayTenPastTen() {
        const now = new Date();
        const thursday = new Date(now);
        
        // Get days until next Thursday (4 = Thursday)
        const daysUntilThursday = (11 - now.getDay()) % 7;
        thursday.setDate(now.getDate() + (daysUntilThursday === 0 ? 7 : daysUntilThursday));
        
        // Set to 21:10 UTC
        thursday.setUTCHours(21, 10, 0, 0);
        
        return thursday;
    }

    // Check if it's time to start auction (Thursday 21:10 UTC)
    shouldStartAuction() {
        const now = new Date();
        const isThursday = now.getUTCDay() === 4; // Thursday = 4
        const isTenPastTen = now.getUTCHours() === 21 && now.getUTCMinutes() >= 10;
        
        // Allow starting within first 5 minutes of the hour to handle delays
        const withinStartWindow = now.getUTCHours() === 21 && now.getUTCMinutes() <= 15;
        
        return isThursday && withinStartWindow;
    }

    // Get current auction state from contract
    async getAuctionState() {
        try {
            const state = await this.contract.currentState();
            return state; // 0 = INACTIVE, 1 = ACTIVE, 2 = DISPLAY_PERIOD
        } catch (error) {
            console.error('❌ Error getting auction state:', error.message);
            return null;
        }
    }

    // Get auction end time from contract
    async getAuctionEndTime() {
        try {
            const endTime = await this.contract.auctionEndTime();
            return endTime.toNumber();
        } catch (error) {
            console.error('❌ Error getting auction end time:', error.message);
            return null;
        }
    }

    // Start the auction
    async startAuction() {
        try {
            console.log('🚀 Starting auction...');
            
            const gasPrice = await this.provider.getGasPrice();
            const adjustedGasPrice = gasPrice.gt(CONFIG.MAX_GAS_PRICE) ? CONFIG.MAX_GAS_PRICE : gasPrice;
            
            const tx = await this.contract.startAuction({
                gasLimit: CONFIG.GAS_LIMIT,
                gasPrice: adjustedGasPrice
            });
            
            console.log(`📝 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Auction started! Block: ${receipt.blockNumber}`);
            
        } catch (error) {
            console.error('❌ Error starting auction:', error.message);
        }
    }

    // End the auction
    async endAuction() {
        try {
            console.log('🏁 Ending auction...');
            
            const gasPrice = await this.provider.getGasPrice();
            const adjustedGasPrice = gasPrice.gt(CONFIG.MAX_GAS_PRICE) ? CONFIG.MAX_GAS_PRICE : gasPrice;
            
            const tx = await this.contract.endAuction({
                gasLimit: CONFIG.GAS_LIMIT,
                gasPrice: adjustedGasPrice
            });
            
            console.log(`📝 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Auction ended! Block: ${receipt.blockNumber}`);
            
        } catch (error) {
            console.error('❌ Error ending auction:', error.message);
        }
    }

    // Reset for new auction (called next Monday)
    async resetAuction() {
        try {
            console.log('🔄 Resetting for new auction...');
            
            const gasPrice = await this.provider.getGasPrice();
            const adjustedGasPrice = gasPrice.gt(CONFIG.MAX_GAS_PRICE) ? CONFIG.MAX_GAS_PRICE : gasPrice;
            
            const tx = await this.contract.resetForNewAuction({
                gasLimit: CONFIG.GAS_LIMIT,
                gasPrice: adjustedGasPrice
            });
            
            console.log(`📝 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Reset complete! Block: ${receipt.blockNumber}`);
            
        } catch (error) {
            console.error('❌ Error resetting auction:', error.message);
        }
    }

    // Main bot logic
    async runBot() {
        console.log('🔍 Checking auction state...');
        
        const currentState = await this.getAuctionState();
        if (currentState === null) return;
        
        const now = Math.floor(Date.now() / 1000);
        const currentTime = new Date();
        
        console.log(`⏰ Current time: ${currentTime.toUTCString()}`);
        console.log(`📊 Auction state: ${['INACTIVE', 'ACTIVE', 'DISPLAY_PERIOD'][currentState]}`);
        
        switch (currentState) {
            case 0: // INACTIVE
                if (this.shouldStartAuction()) {
                    await this.startAuction();
                } else {
                    const nextThursday = this.getNextThursdayTenPastTen();
                    console.log(`⏳ Next auction starts: ${nextThursday.toUTCString()}`);
                }
                break;
                
            case 1: // ACTIVE
                const endTime = await this.getAuctionEndTime();
                if (endTime && now >= endTime) {
                    await this.endAuction();
                } else if (endTime) {
                    const timeLeft = endTime - now;
                    const hoursLeft = Math.floor(timeLeft / 3600);
                    const minutesLeft = Math.floor((timeLeft % 3600) / 60);
                    console.log(`⏳ Auction ends in: ${hoursLeft}h ${minutesLeft}m`);
                }
                break;
                
            case 2: // DISPLAY_PERIOD
                if (this.shouldStartAuction()) {
                    // It's Thursday again, reset and start new auction
                    await this.resetAuction();
                    // Wait a bit then start new auction
                    setTimeout(() => this.startAuction(), 5000);
                } else {
                    console.log('📺 In display period, waiting for next Thursday...');
                }
                break;
        }
    }

    // Check wallet balance
    async checkBalance() {
        try {
            const balance = await this.wallet.getBalance();
            const balanceEth = ethers.utils.formatEther(balance);
            console.log(`💰 Bot balance: ${balanceEth} ETH`);
            
            if (balance.lt(ethers.utils.parseEther('0.01'))) {
                console.warn('⚠️  LOW BALANCE WARNING! Please add more ETH to the bot wallet.');
            }
        } catch (error) {
            console.error('❌ Error checking balance:', error.message);
        }
    }

    // Start the bot
    async start() {
        console.log('🤖 Auction Bot is now running...\n');
        
        // Check balance on startup
        await this.checkBalance();
        
        // Run immediately
        await this.runBot();
        
        // Then run on interval
        setInterval(async () => {
            try {
                await this.runBot();
                
                // Check balance every hour
                if (Math.random() < 0.1) { // ~10% chance each check
                    await this.checkBalance();
                }
            } catch (error) {
                console.error('❌ Unexpected error:', error.message);
            }
        }, CONFIG.CHECK_INTERVAL);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down bot gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down bot gracefully...');
    process.exit(0);
});

// Start the bot
const bot = new AuctionBot();
bot.start().catch(console.error);