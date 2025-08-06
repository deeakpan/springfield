const { ethers } = require("hardhat");

async function main() {
  const initialSupply = ethers.parseUnits("1000000", 18); // 1 million SPRFD
  const SPRFDToken = await ethers.getContractFactory("SPRFDToken");
  const sprfd = await SPRFDToken.deploy(initialSupply);
  await sprfd.waitForDeployment();
  console.log("SPRFDToken deployed to:", await sprfd.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});