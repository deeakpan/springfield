const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // Hardcoded payout address
  const payoutAddress = "0x95c46439bd9559e10c4ff49bff3e20720d93b66e";
  const TileAuction = await ethers.getContractFactory("TileAuction");
  const contract = await TileAuction.deploy(payoutAddress);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("TileAuction deployed to:", address);
  console.log("Payout address:", payoutAddress);

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