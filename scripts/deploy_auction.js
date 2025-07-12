const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying TileAuction contract...");

  const TileAuction = await ethers.getContractFactory("TileAuction");
  const tileAuction = await TileAuction.deploy();

  await tileAuction.waitForDeployment();
  const address = await tileAuction.getAddress();

  console.log("TileAuction deployed to:", address);
  console.log("Auction duration: 5 minutes");
  console.log("Payout address: 0x95C46439bD9559e10c4fF49bfF3e20720d93B66E");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 