// scripts/deploy_tilepurchase.js
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying TilePurchase with account:", deployer.address);

  // Import token addresses from supportedTokens.ts or hardcode for now
  const SPRFD = "0x278b706CB87A913c2AB94431879881E847c2a357"; // update if needed
  const PEPU = "0x5E9128De029d72C946d2E508C5d58F75C4486958"; // update if needed
  const PENK = "0xD6d35F284b35131A2114AAad838D9b4cfF142aEa"; // update if needed

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