// scripts/deploy_sprfd.js
require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying SPRFD with account:", deployer.address);

  const initialSupply = hre.ethers.parseEther("1000000"); // 1,000,000 SPRFD
  const SPRFD = await hre.ethers.getContractFactory("SPRFD");
  const sprfd = await SPRFD.deploy(initialSupply);
  await sprfd.waitForDeployment();
  const sprfdAddress = await sprfd.getAddress();

  console.log("SPRFD deployed to:", sprfdAddress);

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
  if (!supportedTokens.includes(sprfdAddress)) {
    supportedTokens.push(sprfdAddress);
  }
  fs.writeFileSync(filePath, JSON.stringify(supportedTokens, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 