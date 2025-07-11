// scripts/deploy_tilepurchase.js
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying TilePurchase with account:", deployer.address);

  // Import token addresses from supportedTokens.ts
  const { SPRFD_ADDRESS, PEPU_ADDRESS, PENK_ADDRESS } = require('../src/supportedTokens');
  const SPRFD = SPRFD_ADDRESS;
  const PEPU = PEPU_ADDRESS;
  const PENK = PENK_ADDRESS;

  const TilePurchase = await hre.ethers.getContractFactory("TilePurchase");
  const tilePurchase = await TilePurchase.deploy([SPRFD, PEPU, PENK]);
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