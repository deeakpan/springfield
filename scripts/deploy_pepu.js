// scripts/deploy_pepu.js
require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying PEPU with account:", deployer.address);

  const initialSupply = hre.ethers.parseEther("1000000"); // 1,000,000 PEPU
  const PEPU = await hre.ethers.getContractFactory("PEPU");
  const pepu = await PEPU.deploy(initialSupply);
  await pepu.waitForDeployment();
  const pepuAddress = await pepu.getAddress();

  console.log("PEPU deployed to:", pepuAddress);

  // Write address to supportedTokens.json as an array
  const filePath = "./src/supportedTokens.json";
  let supportedTokens = [];
  if (fs.existsSync(filePath)) {
    try {
      supportedTokens = JSON.parse(fs.readFileSync(filePath));
    } catch (e) {
      supportedTokens = [];
    }
  }
  if (!supportedTokens.includes(pepuAddress)) {
    supportedTokens.push(pepuAddress);
  }
  fs.writeFileSync(filePath, JSON.stringify(supportedTokens, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 