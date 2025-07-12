const { ethers } = require("hardhat");

async function main() {
  const TileAuction = await ethers.getContractFactory("TileAuction");
  const auction = TileAuction.attach("0x03C3e737F56ec7bd812918060A1422FDA50D8505");
  
  console.log("Checking auction for tile 665...");
  
  try {
    const data = await auction.getAuction(665);
    console.log("Auction data:", {
      highestBidder: data[0],
      highestBid: data[1].toString(),
      endTime: data[2].toString(),
      ended: data[3],
      token: data[4],
      isNative: data[5],
      metadataCID: data[6]
    });
    
    if (data[0] === "0x0000000000000000000000000000000000000000") {
      console.log("No auction exists for this tile");
    } else {
      console.log("Auction exists with bidder:", data[0]);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 