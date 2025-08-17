const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 Deploying SpringfieldAuctionV2 Contract...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Deploying with account: ${deployer.address}`);
    
    // Check deployer balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH\n`);

    // ========== CONFIGURATION ==========
    const CONFIG = {
        // Bot wallet address (create a new wallet for this)
        BOT_ADDRESS: "0x73af5be3db46ce3b7c50fd833b9c60180f339449", // REPLACE WITH ACTUAL BOT ADDRESS
        
        // Where winning auction bids go
        BID_RECIPIENT: "0x95C46439bD9559e10c4fF49bfF3e20720d93B66E", // Your payout address
        
        // ERC20 token address for bidding (SPRING token) - from .env
        BIDDING_TOKEN: process.env.NEXT_PUBLIC_SPRING_ADDRESS || "0x82144C93bd531E46F31033FE22D1055Af17A514c"
    };

    // Validate configuration
    if (CONFIG.BOT_ADDRESS === "0x0000000000000000000000000000000000000000") {
        console.error("❌ Please set BOT_ADDRESS in the script!");
        console.log("💡 Create a new wallet specifically for the bot and use its address");
        return;
    }

    if (!CONFIG.BIDDING_TOKEN || CONFIG.BIDDING_TOKEN === "0x0000000000000000000000000000000000000000") {
        console.error("❌ Please set NEXT_PUBLIC_SPRING_ADDRESS in .env file!");
        console.log("💡 Use your deployed ERC20 token address (SPRING)");
        return;
    }

    console.log("📋 Configuration:");
    console.log(`   Bot Address: ${CONFIG.BOT_ADDRESS}`);
    console.log(`   Bid Recipient: ${CONFIG.BID_RECIPIENT}`);
    console.log(`   Bidding Token: ${CONFIG.BIDDING_TOKEN}\n`);

    // ========== DEPLOY CONTRACT ==========
    console.log("⚙️  Getting contract factory...");
    const SpringfieldAuctionV2 = await ethers.getContractFactory("WeeklyAuction");

    console.log("🚀 Deploying SpringfieldAuctionV2 contract...");
    const auction = await SpringfieldAuctionV2.deploy(
        CONFIG.BOT_ADDRESS,
        CONFIG.BID_RECIPIENT,
        CONFIG.BIDDING_TOKEN
    );

    console.log("⏳ Waiting for deployment...");
    await auction.waitForDeployment();

    console.log("\n✅ SPRINGFIELD AUCTION V2 CONTRACT DEPLOYED SUCCESSFULLY!");
    console.log("=========================================================");
    console.log(`📍 Contract Address: ${await auction.getAddress()}`);
    console.log(`🔗 Transaction Hash: ${auction.deploymentTransaction().hash}`);
    console.log(`⛽ Gas Used: ${auction.deploymentTransaction().gasLimit.toString()}`);

    // ========== VERIFY DEPLOYMENT ==========
    console.log("\n🔍 Verifying deployment...");
    
    try {
        const botAddress = await auction.botAddress();
        const bidRecipient = await auction.bidRecipient();
        const biddingToken = await auction.biddingToken();
        const currentState = await auction.currentState();
        
        console.log("✅ Contract verification:");
        console.log(`   Bot Address: ${botAddress}`);
        console.log(`   Bid Recipient: ${bidRecipient}`);
        console.log(`   Bidding Token: ${biddingToken}`);
        console.log(`   Current State: ${currentState} (0=INACTIVE)`);
        
        if (botAddress !== CONFIG.BOT_ADDRESS) {
            console.warn("⚠️  Bot address mismatch!");
        }
        if (bidRecipient !== CONFIG.BID_RECIPIENT) {
            console.warn("⚠️  Bid recipient mismatch!");
        }
        if (biddingToken !== CONFIG.BIDDING_TOKEN) {
            console.warn("⚠️  Bidding token mismatch!");
        }
        
    } catch (error) {
        console.error("❌ Verification failed:", error.message);
    }

    // ========== NEXT STEPS ==========
    console.log("\n📝 NEXT STEPS:");
    console.log("================");
    console.log("1. 💰 Fund the bot wallet with gas tokens");
    console.log(`   Send ETH to: ${CONFIG.BOT_ADDRESS}`);
    console.log("");
    console.log("2. 🤖 Update bot configuration:");
    console.log(`   CONTRACT_ADDRESS=${await auction.getAddress()}`);
    console.log("");
    console.log("3. 🔄 Start the bot:");
    console.log("   npm start");
    console.log("");
    console.log("4. 🎯 Bot will automatically:");
    console.log("   - Start auctions every Monday 12:00 PM UTC");
    console.log("   - End auctions after 24 hours + extensions");
    console.log("   - Forward winning bids to recipient");
    console.log("");

    // ========== SAVE DEPLOYMENT INFO ==========
    const deploymentInfo = {
        network: (await ethers.provider.getNetwork()).name,
        contractAddress: await auction.getAddress(),
        deployerAddress: deployer.address,
        botAddress: CONFIG.BOT_ADDRESS,
        bidRecipient: CONFIG.BID_RECIPIENT,
        biddingToken: CONFIG.BIDDING_TOKEN,
        deploymentHash: auction.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        gasUsed: auction.deploymentTransaction().gasLimit.toString()
    };

    console.log("\n💾 Deployment info saved to memory. Copy this for your records:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    // ========== OPTIONAL: VERIFY ON EXPLORER ==========
    const network = await ethers.provider.getNetwork();
    if (network.name !== "hardhat" && network.name !== "localhost") {
        console.log("\n🔍 To verify on block explorer, run:");
        console.log(`npx hardhat verify --network pepe_unchained_v2 ${await auction.getAddress()} "${CONFIG.BOT_ADDRESS}" "${CONFIG.BID_RECIPIENT}" "${CONFIG.BIDDING_TOKEN}"`);
    }

    console.log("\n🎉 SpringfieldAuctionV2 deployment completed successfully!");
}

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });