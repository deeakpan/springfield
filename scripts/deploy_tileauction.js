const { ethers } = require("hardhat");

async function main() {
  const TileAuction = await ethers.getContractFactory("TileAuction");
  const contract = await TileAuction.deploy();
  await contract.waitForDeployment();
  console.log("TileAuction deployed to:", await contract.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 