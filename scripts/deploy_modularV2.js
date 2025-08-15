const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("🏠 Deploying Modular Tile System...\n");

    // Use private key from .env
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("PRIVATE_KEY not found in .env file");
    }
    
    const provider = ethers.provider;
    const deployer = new ethers.Wallet(privateKey, provider);
    
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

    // Step 1: Deploy TileCoreV2 (or TileCore)
    console.log("🔧 Step 1: Deploying TileCore...");
    const TileCore = await ethers.getContractFactory("TileCoreV2", deployer); // Use V2 if upgrading
    const tileCore = await TileCore.deploy();
    await tileCore.waitForDeployment();
    
    console.log(`   ✅ TileCore deployed at: ${await tileCore.getAddress()}`);

    // Step 2: Deploy TileMarketplace
    console.log("\n🔧 Step 2: Deploying TileMarketplace...");
    const TileMarketplace = await ethers.getContractFactory("contracts/TileMarketplaceV2.sol:TileMarketplace", deployer);
    const tileMarketplace = await TileMarketplace.deploy(
        await tileCore.getAddress(),
        SPRING_TOKEN,
        PLATFORM_FEE
    );
    await tileMarketplace.waitForDeployment();
    
    console.log(`   ✅ TileMarketplace deployed at: ${await tileMarketplace.getAddress()}`);

    // Step 3: Set up permissions
    console.log("\n🔧 Step 3: Setting up permissions...");
    
    // For TileCoreV2, use setMarketplace instead of transferOwnership
    const setMarketplaceRole = await tileCore.setMarketplace(await tileMarketplace.getAddress());
    await setMarketplaceRole.wait();
    console.log("   ✅ Marketplace address set in TileCore");

    // If using TileCoreV2, complete migration (skip if not migrating)
    if (process.env.MIGRATION_MODE !== 'true') {
        const completeMigration = await tileCore.completeMigration();
        await completeMigration.wait();
        console.log("   ✅ Migration completed - ready for normal operations");
    } else {
        console.log("   ⚠️  Migration mode enabled - remember to complete migration manually");
    }

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

    console.log("\n🆕 FIXED FEATURES:");
    console.log("==================");
    console.log("• ✅ Owner sets rental duration, not renter");
    console.log("• ✅ Renter can edit metadata during rental");
    console.log("• ✅ TileCore address is updateable by owner");
    console.log("• ✅ Proper migration support (if using V2)");

    console.log("\n💡 MAIN CONTRACT FOR FRONTEND:");
    console.log(`   ${await tileMarketplace.getAddress()}`);

    console.log("\n🚀 RENTAL CHANGES:");
    console.log("==================");
    console.log("• listTileForRent(tileId, pricePerDay, duration, isNative) - Owner sets duration");
    console.log("• rentTile(tileId) - Renter pays for owner-set duration");
    console.log("• updateTileMetadata() - Both owner and renter can edit");

    console.log("\n🎉 Deployment completed successfully!");
    console.log("🚀 Your modular tile system is ready for users!");

    // Save addresses to .env format
    console.log("\n📝 Add these to your .env file:");
    console.log(`NEXT_PUBLIC_TILE_CORE_ADDRESS=${await tileCore.getAddress()}`);
    console.log(`NEXT_PUBLIC_TILE_MARKETPLACE_ADDRESS=${await tileMarketplace.getAddress()}`);
}

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });