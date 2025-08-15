const { ethers } = require('hardhat');
require('dotenv').config();

// Contract addresses from .env
const OLD_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TILE_CORE; // Your old contract address
const NEW_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TILE_CORE_V2; // Your new contract address

// Contract ABIs (you'll need to update these with your actual ABIs)
const oldContractABI = [
    "function getAllCreatedTiles() external view returns (uint256[] memory)",
    "function getTile(uint256 tileId) external view returns (tuple(address owner, string metadataUri, bool isNativePayment, uint256 createdAt, address originalBuyer))",
    "function totalTilesCount() external view returns (uint256)",
    "function checkTileExists(uint256 tileId) external view returns (bool)"
];

const newContractABI = [
    "function migrateTiles(uint256[] calldata tileIds, address[] calldata owners, string[] calldata metadataUris, bool[] calldata isNativePayments, uint256[] calldata createdAts, address[] calldata originalBuyers) external",
    "function completeMigration() external",
    "function setMarketplace(address _marketplace) external",
    "function totalTilesCount() external view returns (uint256)",
    "function migrationComplete() external view returns (bool)",
    "function owner() external view returns (address)",
    "function getAllCreatedTiles() external view returns (uint256[] memory)",
    "function getTile(uint256 tileId) external view returns (tuple(address owner, string metadataUri, bool isNativePayment, uint256 createdAt, address originalBuyer))",
    "function checkTileExists(uint256 tileId) external view returns (bool)"
];

async function migrateTiles() {
    // Check required environment variables
    if (!OLD_CONTRACT_ADDRESS || !NEW_CONTRACT_ADDRESS) {
        console.error("❌ Missing required environment variables:");
        if (!OLD_CONTRACT_ADDRESS) console.error("   NEXT_PUBLIC_TILE_CORE not found in .env");
        if (!NEW_CONTRACT_ADDRESS) console.error("   NEXT_PUBLIC_TILE_CORE_V2 not found in .env");
        process.exit(1);
    }
    
    // Use private key and RPC from .env
    const privateKey = process.env.PRIVATE_KEY;
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    
    if (!privateKey) {
        throw new Error("PRIVATE_KEY not found in .env file");
    }
    if (!rpcUrl) {
        throw new Error("NEXT_PUBLIC_RPC_URL not found in .env file");
    }
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const deployer = new ethers.Wallet(privateKey, provider);
    
    console.log("Migration started by:", deployer.address);
    console.log("RPC URL:", rpcUrl);
    console.log("Old contract:", OLD_CONTRACT_ADDRESS);
    console.log("New contract:", NEW_CONTRACT_ADDRESS);
    
    // Connect to contracts
    const oldContract = new ethers.Contract(OLD_CONTRACT_ADDRESS, oldContractABI, deployer);
    const newContract = new ethers.Contract(NEW_CONTRACT_ADDRESS, newContractABI, deployer);
    
    try {
        // First, let's verify the old contract works
        console.log("Verifying old contract...");
        try {
            const totalTiles = await oldContract.totalTilesCount();
            console.log(`Old contract total tiles: ${totalTiles.toString()}`);
            
            if (totalTiles.toString() === "0") {
                console.log("⚠️  Old contract has 0 tiles. Nothing to migrate.");
                return;
            }
        } catch (error) {
            console.error("❌ Failed to read totalTilesCount from old contract:");
            console.error("Contract might not have this function or wrong network/address");
            console.error(error.message);
            return;
        }

        // Check new contract state
        console.log("Checking new contract state...");
        try {
            const newTotalTiles = await newContract.totalTilesCount();
            const migrationComplete = await newContract.migrationComplete();
            const owner = await newContract.owner();
            
            console.log(`New contract total tiles: ${newTotalTiles.toString()}`);
            console.log(`Migration complete: ${migrationComplete}`);
            console.log(`Contract owner: ${owner}`);
            console.log(`Deployer address: ${deployer.address}`);
            
            if (migrationComplete) {
                console.error("❌ Migration is already complete! Cannot migrate more tiles.");
                return;
            }
            
            if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
                console.error("❌ Deployer is not the contract owner!");
                console.error(`Expected: ${deployer.address}`);
                console.error(`Actual: ${owner}`);
                return;
            }
            
            if (newTotalTiles.toString() !== "0") {
                console.log(`⚠️  New contract already has ${newTotalTiles} tiles`);
                console.log("Continuing with migration...");
            }
            
        } catch (error) {
            console.error("❌ Failed to check new contract state:", error.message);
            return;
        }
        
        // Get all tile IDs from old contract
        console.log("Fetching all created tiles...");
        const allTileIds = await oldContract.getAllCreatedTiles();
        console.log(`Found ${allTileIds.length} tiles to migrate`);
        
        // Filter out tiles that already exist in new contract
        console.log("Checking which tiles already exist in new contract...");
        const tilesToMigrate = [];
        
        for (let i = 0; i < allTileIds.length; i++) {
            const tileId = allTileIds[i];
            const exists = await newContract.checkTileExists(tileId);
            
            if (!exists) {
                tilesToMigrate.push(tileId);
            }
            
            // Progress indicator
            if ((i + 1) % 50 === 0 || i === allTileIds.length - 1) {
                console.log(`  Checked ${i + 1}/${allTileIds.length} tiles`);
            }
            
            // Rate limiting
            if (i < allTileIds.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        console.log(`Found ${tilesToMigrate.length} new tiles to migrate (${allTileIds.length - tilesToMigrate.length} already exist)`);
        
        if (tilesToMigrate.length === 0) {
            console.log("✅ All tiles already migrated!");
            return;
        }
        
        // Batch size for migration (reduced to avoid rate limits)
        const BATCH_SIZE = 25; // Reduced from 50 to avoid rate limits
        
        const totalBatches = Math.ceil(tilesToMigrate.length / BATCH_SIZE);
        console.log(`Will process ${totalBatches} batches`);
        
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const startIndex = batchIndex * BATCH_SIZE;
            const endIndex = Math.min(startIndex + BATCH_SIZE, tilesToMigrate.length);
            const batchTileIds = tilesToMigrate.slice(startIndex, endIndex);
            
            console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (${batchTileIds.length} tiles)`);
            
            // Fetch tile details for this batch with rate limiting and retry logic
            const tileDetails = [];
            for (let i = 0; i < batchTileIds.length; i++) {
                const tileId = batchTileIds[i];
                console.log(`  Fetching tile ${i + 1}/${batchTileIds.length} (ID: ${tileId})`);
                
                let retries = 3;
                let tile = null;
                
                while (retries > 0) {
                    try {
                        tile = await oldContract.getTile(tileId);
                        break; // Success, exit retry loop
                    } catch (error) {
                        retries--;
                        if (error.code === 'SERVER_ERROR' && retries > 0) {
                            console.log(`    ⚠️  RPC error, retrying... (${3 - retries}/3)`);
                            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
                        } else {
                            console.error(`Failed to fetch tile ${tileId}:`, error.message);
                            throw error;
                        }
                    }
                }
                
                if (!tile) {
                    throw new Error(`Failed to fetch tile ${tileId} after 3 retries`);
                }
                
                tileDetails.push({
                    tileId: tileId,
                    owner: tile.owner,
                    metadataUri: tile.metadataUri,
                    isNativePayment: tile.isNativePayment,
                    createdAt: tile.createdAt,
                    originalBuyer: tile.originalBuyer
                });
                
                // Rate limiting: wait 200ms between calls (increased from 100ms)
                if (i < batchTileIds.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            
            // Prepare arrays for batch migration
            const tileIds = [];
            const owners = [];
            const metadataUris = [];
            const isNativePayments = [];
            const createdAts = [];
            const originalBuyers = [];
            
            tileDetails.forEach(tile => {
                tileIds.push(tile.tileId);
                owners.push(tile.owner);
                metadataUris.push(tile.metadataUri);
                isNativePayments.push(tile.isNativePayment);
                createdAts.push(tile.createdAt);
                originalBuyers.push(tile.originalBuyer);
            });
            
            // Execute migration for this batch
            console.log(`Migrating batch ${batchIndex + 1}...`);
            const tx = await newContract.migrateTiles(
                tileIds,
                owners,
                metadataUris,
                isNativePayments,
                createdAts,
                originalBuyers,
                {
                    gasLimit: 8000000 // Adjust based on your needs
                }
            );
            
            console.log(`Batch ${batchIndex + 1} transaction hash:`, tx.hash);
            await tx.wait();
            console.log(`Batch ${batchIndex + 1} completed successfully`);
            
            // Add a longer delay between batches to avoid rate limiting
            if (batchIndex < totalBatches - 1) {
                console.log("Waiting 5 seconds before next batch to avoid rate limits...");
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        
        console.log("All tiles migrated successfully!");
        
        // VERIFY MIGRATION BEFORE COMPLETING
        console.log("Verifying migration...");
        const verificationResult = await verifyMigration(oldContract, newContract);
        
        if (!verificationResult.success) {
            console.error("❌ Migration verification failed!");
            console.error("Missing tiles:", verificationResult.missingTiles);
            console.error("Data mismatches:", verificationResult.mismatches);
            throw new Error("Migration verification failed - DO NOT complete migration");
        }
        
        console.log("✅ Migration verification successful!");
        
        console.log("\n🎉 Migration completed successfully!");
        console.log("🚀 TileCore V2 is ready!");
        console.log("\n💡 Next Steps:");
        console.log("1. Deploy new marketplace contract");
        console.log("2. Set marketplace address using setMarketplace()");
        console.log("3. Update frontend to use new contracts");
        
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

// Verification function to ensure migration is complete and accurate
async function verifyMigration(oldContract, newContract) {
    console.log("Starting migration verification...");
    
    try {
        // Get all tiles from old contract
        const oldTileIds = await oldContract.getAllCreatedTiles();
        const newTileIds = await newContract.getAllCreatedTiles();
        
        console.log(`Old contract tiles: ${oldTileIds.length}`);
        console.log(`New contract tiles: ${newTileIds.length}`);
        
        const missingTiles = [];
        const mismatches = [];
        
        // Check if all old tiles exist in new contract
        for (const tileId of oldTileIds) {
            const exists = await newContract.checkTileExists(tileId);
            if (!exists) {
                missingTiles.push(tileId.toString());
                continue;
            }
            
            // Compare tile data
            const oldTile = await oldContract.getTile(tileId);
            const newTile = await newContract.getTile(tileId);
            
            if (
                oldTile.owner !== newTile.owner ||
                oldTile.metadataUri !== newTile.metadataUri ||
                oldTile.isNativePayment !== newTile.isNativePayment ||
                oldTile.createdAt.toString() !== newTile.createdAt.toString() ||
                oldTile.originalBuyer !== newTile.originalBuyer
            ) {
                mismatches.push({
                    tileId: tileId.toString(),
                    old: {
                        owner: oldTile.owner,
                        metadataUri: oldTile.metadataUri,
                        isNativePayment: oldTile.isNativePayment,
                        createdAt: oldTile.createdAt.toString(),
                        originalBuyer: oldTile.originalBuyer
                    },
                    new: {
                        owner: newTile.owner,
                        metadataUri: newTile.metadataUri,
                        isNativePayment: newTile.isNativePayment,
                        createdAt: newTile.createdAt.toString(),
                        originalBuyer: newTile.originalBuyer
                    }
                });
            }
        }
        
        // Check total counts match
        const oldTotalTiles = await oldContract.totalTilesCount();
        const newTotalTiles = await newContract.totalTilesCount();
        
        if (oldTotalTiles.toString() !== newTotalTiles.toString()) {
            mismatches.push({
                type: "totalCount",
                old: oldTotalTiles.toString(),
                new: newTotalTiles.toString()
            });
        }
        
        const success = missingTiles.length === 0 && mismatches.length === 0;
        
        if (success) {
            console.log("✅ All tiles migrated successfully and data matches perfectly!");
        }
        
        return {
            success,
            missingTiles,
            mismatches,
            oldCount: oldTileIds.length,
            newCount: newTileIds.length
        };
        
    } catch (error) {
        console.error("Verification failed with error:", error);
        return {
            success: false,
            error: error.message,
            missingTiles: [],
            mismatches: []
        };
    }
}

// Helper function to check old contract
async function checkOldContract() {
    if (!OLD_CONTRACT_ADDRESS) {
        console.error("❌ NEXT_PUBLIC_TILE_CORE not set in .env");
        process.exit(1);
    }
    
    const privateKey = process.env.PRIVATE_KEY;
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    
    if (!privateKey) {
        throw new Error("PRIVATE_KEY not found in .env file");
    }
    if (!rpcUrl) {
        throw new Error("NEXT_PUBLIC_RPC_URL not found in .env file");
    }
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const deployer = new ethers.Wallet(privateKey, provider);
    
    console.log("🔍 Checking old contract...");
    console.log("Address:", OLD_CONTRACT_ADDRESS);
    console.log("RPC URL:", rpcUrl);
    console.log("Network:", (await provider.getNetwork()).name);
    
    // Check if contract exists
    const code = await provider.getCode(OLD_CONTRACT_ADDRESS);
    if (code === "0x") {
        console.error("❌ No contract found at this address!");
        return;
    }
    
    console.log("✅ Contract exists");
    
    // Try different function calls to see what works
    const oldContract = new ethers.Contract(OLD_CONTRACT_ADDRESS, oldContractABI, deployer);
    
    console.log("\n🧪 Testing contract functions:");
    
    try {
        const totalTiles = await oldContract.totalTilesCount();
        console.log("✅ totalTilesCount():", totalTiles.toString());
    } catch (error) {
        console.log("❌ totalTilesCount() failed:", error.message);
    }
    
    try {
        const allTiles = await oldContract.getAllCreatedTiles();
        console.log("✅ getAllCreatedTiles():", allTiles.length, "tiles");
    } catch (error) {
        console.log("❌ getAllCreatedTiles() failed:", error.message);
    }
}

// Helper function to estimate gas for migration
async function estimateMigrationGas() {
    if (!OLD_CONTRACT_ADDRESS || !NEW_CONTRACT_ADDRESS) {
        console.error("❌ Contract addresses not set in .env file");
        process.exit(1);
    }
    
    const privateKey = process.env.PRIVATE_KEY;
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    
    if (!privateKey) {
        throw new Error("PRIVATE_KEY not found in .env file");
    }
    if (!rpcUrl) {
        throw new Error("NEXT_PUBLIC_RPC_URL not found in .env file");
    }
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const deployer = new ethers.Wallet(privateKey, provider);
    
    const oldContract = new ethers.Contract(OLD_CONTRACT_ADDRESS, oldContractABI, deployer);
    const newContract = new ethers.Contract(NEW_CONTRACT_ADDRESS, newContractABI, deployer);
    
    const allTileIds = await oldContract.getAllCreatedTiles();
    console.log(`Estimating gas for ${allTileIds.length} tiles`);
    
    // Estimate for first tile to get per-tile gas cost
    if (allTileIds.length > 0) {
        const sampleTile = await oldContract.getTile(allTileIds[0]);
        
        try {
            const gasEstimate = await newContract.estimateGas.migrateTiles(
                [allTileIds[0]],
                [sampleTile.owner],
                [sampleTile.metadataUri],
                [sampleTile.isNativePayment],
                [sampleTile.createdAt],
                [sampleTile.originalBuyer]
            );
            
            console.log(`Estimated gas per tile: ${gasEstimate.toString()}`);
            console.log(`Estimated total gas: ${(gasEstimate * BigInt(allTileIds.length)).toString()}`);
            
            // Calculate recommended batch size based on 8M gas limit
            const recommendedBatchSize = Math.floor(8000000 / Number(gasEstimate));
            console.log(`Recommended batch size: ${recommendedBatchSize}`);
            
        } catch (error) {
            console.error("Gas estimation failed:", error);
        }
    }
}

// Main execution
async function main() {
    console.log("🔄 TileCore Migration Script");
    console.log("============================");
    console.log("Old Contract (NEXT_PUBLIC_TILE_CORE):", OLD_CONTRACT_ADDRESS || "❌ Not set");
    console.log("New Contract (NEXT_PUBLIC_TILE_CORE_V2):", NEW_CONTRACT_ADDRESS || "❌ Not set");
    console.log("RPC URL (NEXT_PUBLIC_RPC_URL):", process.env.NEXT_PUBLIC_RPC_URL || "❌ Not set");
    console.log("============================\n");
    
    const args = process.argv.slice(2);
    
    if (args.includes('--estimate-gas')) {
        await estimateMigrationGas();
    } else if (args.includes('--check-old')) {
        await checkOldContract();
    } else {
        await migrateTiles();
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = {
    migrateTiles,
    estimateMigrationGas,
    verifyMigration,
    checkOldContract
};