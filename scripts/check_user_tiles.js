const { ethers } = require("ethers");
require('dotenv').config();

async function main() {
  // The address to check
  const userAddress = "0xbb9Af47A8578a703884dB15457AC90AaD3EfA44b";
  
  console.log(`Checking tiles for address: ${userAddress}`);
  console.log("=" .repeat(50));

  try {
    // RPC URL
    const rpcUrl = "https://rpc-pepu-v2-mainnet-0.t.conduit.xyz";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log(`Connected to RPC: ${rpcUrl}`);

    // Marketplace contract address from environment variable
    const marketplaceAddress = process.env.NEXT_PUBLIC_TILE_CONTRACT;
    if (!marketplaceAddress) {
      throw new Error("NEXT_PUBLIC_TILE_CONTRACT environment variable not set. Please check your .env file.");
    }
    
    const abi = [
      "function getUserTilesWithDetails(address user) external view returns (tuple(uint256 tileId, address owner, string metadataUri, bool isNativePayment, uint256 createdAt, address originalBuyer, bool isForSale, bool isForRent, bool isCurrentlyRented, uint256 salePrice, uint256 rentPricePerDay, address currentRenter, uint256 rentalEnd)[] memory)"
    ];
    
    console.log(`Marketplace contract: ${marketplaceAddress}`);

    // Create contract instance
    const marketplace = new ethers.Contract(marketplaceAddress, abi, provider);

    // Call getUserTilesWithDetails
    console.log("\nCalling getUserTilesWithDetails...");
    const userTiles = await marketplace.getUserTilesWithDetails(userAddress);
    
    console.log(`\nResult:`);
    console.log(`User ${userAddress} owns ${userTiles.length} tiles`);
    
    if (userTiles.length > 0) {
      console.log("\nTile Details:");
      userTiles.forEach((tile, index) => {
        console.log(`  ${index + 1}. Tile #${tile.tileId}`);
        console.log(`     Owner: ${tile.owner}`);
        console.log(`     For Sale: ${tile.isForSale ? 'Yes' : 'No'}`);
        console.log(`     For Rent: ${tile.isForRent ? 'Yes' : 'No'}`);
        console.log(`     Currently Rented: ${tile.isCurrentlyRented ? 'Yes' : 'No'}`);
        if (tile.isForSale) {
          console.log(`     Sale Price: ${ethers.formatEther(tile.salePrice)} ETH`);
        }
        if (tile.isForRent) {
          console.log(`     Rent Price: ${ethers.formatEther(tile.rentPricePerDay)} ETH/day`);
        }
        console.log("");
      });
      
      // Summary statistics
      const tilesForSale = userTiles.filter(tile => tile.isForSale).length;
      const tilesForRent = userTiles.filter(tile => tile.isForRent).length;
      const tilesCurrentlyRented = userTiles.filter(tile => tile.isCurrentlyRented).length;
      
      console.log("📊 SUMMARY:");
      console.log("=" .repeat(30));
      console.log(`Total Tiles Owned: ${userTiles.length}`);
      console.log(`Tiles Listed for Sale: ${tilesForSale}`);
      console.log(`Tiles Listed for Rent: ${tilesForRent}`);
      console.log(`Tiles Currently Rented: ${tilesCurrentlyRented}`);
      console.log(`Available Tiles: ${userTiles.length - tilesForSale - tilesForRent + tilesCurrentlyRented}`);
    } else {
      console.log("No tiles found for this address.");
    }

  } catch (error) {
    console.error("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
