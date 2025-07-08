const { ethers } = require("hardhat");

async function main() {
  const SpringfieldDollar = await ethers.getContractFactory("SpringfieldDollar");
  const contract = await SpringfieldDollar.deploy();
  await contract.waitForDeployment();
  console.log("SpringfieldDollar deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 