const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying TileAuction contract...");

  const payoutAddress = "0x95c46439bd9559e10c4ff49bff3e20720d93b66e";
  const TileAuction = await ethers.getContractFactory("TileAuction");
  const tileAuction = await TileAuction.deploy(payoutAddress);

  await tileAuction.waitForDeployment();
  const address = await tileAuction.getAddress();

  console.log("TileAuction deployed to:", address);
  console.log("Verified contract: https://explorer-pepu-v2-mainnet-0.t.conduit.xyz:443/address/0x3B4Be35688BF620d8c808678D5CF22494FFD2c9B#code");
  console.log("Auction duration: 20 minutes");
  console.log("Payout address: 0x95C46439bD9559e10c4fF49bfF3e20720d93B66E");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 