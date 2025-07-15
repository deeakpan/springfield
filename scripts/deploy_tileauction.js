const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const TileAuction = await ethers.getContractFactory("TileAuction");
  const contract = await TileAuction.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("TileAuction deployed to:", address);

  // Update README.md with new address
  const readmePath = "README.md";
  let readme = fs.readFileSync(readmePath, "utf8");
  readme = readme.replace(
    /(### TileAuction Contract[\s\S]*?\*\*Address:\*\* `)(0x[a-fA-F0-9]{40})`/,
    `$1${address}`
  );
  fs.writeFileSync(readmePath, readme);
  console.log("README.md updated with new TileAuction contract address.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 