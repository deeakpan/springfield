// scripts/deploy_penk.js
require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying PENK with account:", deployer.address);

  const initialSupply = hre.ethers.parseEther("1000000"); // 1,000,000 PENK
  const PENK = await hre.ethers.getContractFactory("PENK");
  const penk = await PENK.deploy(initialSupply);
  await penk.waitForDeployment();
  const penkAddress = await penk.getAddress();

  console.log("PENK deployed to:", penkAddress);

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
  if (!supportedTokens.includes(penkAddress)) {
    supportedTokens.push(penkAddress);
  }
  fs.writeFileSync(filePath, JSON.stringify(supportedTokens, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 