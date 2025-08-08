const { ethers } = require("hardhat");

async function main() {
    console.log("🏠 Deploying Modular Tile System...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Deploying with account: ${deployer.address}`);
    
    // Check deployer balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log(`💰 Account balance: ${ethers.formatEther(balance)} PEPU\n`);

    // Configuration
    const SPRING_TOKEN = process.env.NEXT_PUBLIC_SPRING_ADDRESS || "0x82144C93bd531E46F31033FE22D1055Af17A514c";
    const PLATFORM_FEE = 500; // 5% fee in basis points
    
    if (!SPRING_TOKEN || SPRING_TOKEN === "0x0000000000000000000000000000000000000000") {
        console.error("❌ Please set NEXT_PUBLIC_SPRING_ADDRESS in .env file!");
        console.log("💡 Use your deployed ERC20 token address (SPRING)");
        return;
    }
    
    console.log("📋 Configuration:");
    console.log(`   SPRING Token: ${SPRING_TOKEN}`);
    console.log(`   Platform Fee: ${PLATFORM_FEE/100}%\n`);

    // Step 1: Deploy TileCore
    console.log("🔧 Step 1: Deploying TileCore...");
    const TileCore = await ethers.getContractFactory("TileCore");
    const tileCore = await TileCore.deploy();
    await tileCore.waitForDeployment();
    
    console.log(`   ✅ TileCore deployed at: ${await tileCore.getAddress()}`);

    // Step 2: Deploy TileMarketplace
    console.log("\n🔧 Step 2: Deploying TileMarketplace...");
    const TileMarketplace = await ethers.getContractFactory("TileMarketplace");
    const tileMarketplace = await TileMarketplace.deploy(
        await tileCore.getAddress(),
        SPRING_TOKEN,
        PLATFORM_FEE
    );
    await tileMarketplace.waitForDeployment();
    
    console.log(`   ✅ TileMarketplace deployed at: ${await tileMarketplace.getAddress()}`);

    // Step 3: Set up permissions
    console.log("\n🔧 Step 3: Setting up permissions...");
    
    // Grant marketplace permission to create tiles
    const setMarketplaceRole = await tileCore.transferOwnership(await tileMarketplace.getAddress());
    await setMarketplaceRole.wait();
    console.log("   ✅ Marketplace can now create and manage tiles");

    console.log("\n✅ MODULAR SYSTEM DEPLOYED SUCCESSFULLY!");
    console.log("==========================================");
    console.log(`📍 TileCore Address: ${await tileCore.getAddress()}`);
    console.log(`📍 TileMarketplace Address: ${await tileMarketplace.getAddress()}`);
    console.log(`🔗 TileCore TX: ${tileCore.deploymentTransaction()?.hash || 'N/A'}`);
    console.log(`🔗 Marketplace TX: ${tileMarketplace.deploymentTransaction()?.hash || 'N/A'}`);

    console.log("\n🎯 INTERACTION GUIDE:");
    console.log("=====================");
    console.log("• Use TileMarketplace address for all frontend interactions");
    console.log("• TileMarketplace handles all buying, selling, and renting");
    console.log("• TileCore manages tile ownership and metadata");
    console.log("• Both contracts work together seamlessly");
    console.log(`• Platform takes ${PLATFORM_FEE/100}% fee on all sales and rentals`);

    console.log("\n💡 MAIN CONTRACT FOR FRONTEND:");
    console.log(`   ${await tileMarketplace.getAddress()}`);

    console.log("\n🎉 Deployment completed successfully!");
    console.log("🚀 Your modular tile system is ready for users!");
}

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });