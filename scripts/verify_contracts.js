const { run } = require("hardhat");

async function main() {
    console.log("🔍 Verifying contracts on Pepe Unchained V2 Testnet...\n");

    // Contract addresses from your deployment
    const TILECORE_ADDRESS = "0xFCfd48582C45ec6f8daA460B1Db0Bd9102bFFC01";
    const TILEMARKETPLACE_ADDRESS = "0x76Fd2Cd9dD73b90e377873C3AcB217F39576eCFf";
    const SPRFD_TOKEN = "0xaFD224042abbd3c51B82C9f43B681014c12649ca";

    console.log("📋 Contract Addresses:");
    console.log(`   TileCore: ${TILECORE_ADDRESS}`);
    console.log(`   TileMarketplace: ${TILEMARKETPLACE_ADDRESS}`);
    console.log(`   SPRFD Token: ${SPRFD_TOKEN}\n`);

    try {
        // Verify TileCore
        console.log("🔧 Verifying TileCore...");
        await run("verify:verify", {
            address: TILECORE_ADDRESS,
            constructorArguments: [],
            contract: "contracts/TileCore.sol:TileCore"
        });
        console.log("   ✅ TileCore verified successfully!");

        // Verify TileMarketplace
        console.log("\n🔧 Verifying TileMarketplace...");
        await run("verify:verify", {
            address: TILEMARKETPLACE_ADDRESS,
            constructorArguments: [TILECORE_ADDRESS, SPRFD_TOKEN],
            contract: "contracts/TileMarketplace.sol:TileMarketplace"
        });
        console.log("   ✅ TileMarketplace verified successfully!");

        console.log("\n🎉 ALL CONTRACTS VERIFIED SUCCESSFULLY!");
        console.log("==========================================");
        console.log(`📍 TileCore: ${TILECORE_ADDRESS}`);
        console.log(`📍 TileMarketplace: ${TILEMARKETPLACE_ADDRESS}`);
        console.log("\n🔗 Explorer Links:");
        console.log(`   TileCore: https://explorer-pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz/address/${TILECORE_ADDRESS}`);
        console.log(`   TileMarketplace: https://explorer-pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz/address/${TILEMARKETPLACE_ADDRESS}`);

    } catch (error) {
        console.error("\n❌ Verification failed:");
        console.error(error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 