// scripts/deploy_tilepurchase.js
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying TilePurchase with account:", deployer.address);

  // Only PENK (ERC20) is required for deployment
  // PENK address from src/supportedTokens.ts
  const PENK = "0x82144c93bd531e46f31033fe22d1055af17a514c";

  const TilePurchase = await hre.ethers.getContractFactory("TilePurchase");
  const tilePurchase = await TilePurchase.deploy(PENK);
  await tilePurchase.waitForDeployment();
  const tilePurchaseAddress = await tilePurchase.getAddress();

  console.log("TilePurchase deployed to:", tilePurchaseAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 