// Contract addresses - Load from environment variables
export const CONTRACT_ADDRESSES = {
  // Load from .env file
  MARKETPLACE: process.env.NEXT_PUBLIC_TILE_CONTRACT || "0x...", // TileMarketplace contract address
  TILE_CORE: process.env.NEXT_PUBLIC_TILE_CORE || "0x...", // TileCore contract address
  SPRING_TOKEN: process.env.NEXT_PUBLIC_SPRING_ADDRESS || "0x...", // Load from environment
  AUCTION: process.env.NEXT_PUBLIC_AUCTION_CONTRACT || "0xE9C88bE11C1605e1Db4A198E64c5B118E9a0bD3f", // Auction contract address
} as const;

// Validate that contract addresses are set (in development)
if (process.env.NODE_ENV === 'development') {
  if (!process.env.NEXT_PUBLIC_TILE_CONTRACT || process.env.NEXT_PUBLIC_TILE_CONTRACT === "0x...") {
    console.warn('⚠️  NEXT_PUBLIC_TILE_CONTRACT not set in .env file');
  }
  if (!process.env.NEXT_PUBLIC_TILE_CORE || process.env.NEXT_PUBLIC_TILE_CORE === "0x...") {
    console.warn('⚠️  NEXT_PUBLIC_TILE_CORE not set in .env file');
  }
}

// Contract ABIs
export const TILE_MARKETPLACE_ABI = [
  // Events
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "tileId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "pricePerDay", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "duration", "type": "uint256" },
      { "indexed": false, "internalType": "bool", "name": "isNativePayment", "type": "bool" }
    ],
    "name": "TileListedForRent",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "tileId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "seller", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "price", "type": "uint256" },
      { "indexed": false, "internalType": "bool", "name": "isNativePayment", "type": "bool" }
    ],
    "name": "TileListedForSale",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "tileId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "bool", "name": "isNativePayment", "type": "bool" }
    ],
    "name": "TilePurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "tileId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "renter", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "duration", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "totalPrice", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "endTime", "type": "uint256" }
    ],
    "name": "TileRented",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "tileId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "seller", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "price", "type": "uint256" },
      { "indexed": false, "internalType": "bool", "name": "isNativePayment", "type": "bool" }
    ],
    "name": "TileSold",
    "type": "event"
  },
  // Functions
  {
    "inputs": [{ "internalType": "uint256", "name": "tileId", "type": "uint256" }],
    "name": "buyListedTile",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "uint256", "name": "tileId", "type": "uint256" },
      { "internalType": "string", "name": "metadataUri", "type": "string" }
    ],
    "name": "buyTile",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tileId", "type": "uint256" },
      { "internalType": "string", "name": "metadataUri", "type": "string" }
    ],
    "name": "buyTileWithNative",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tileId", "type": "uint256" }],
    "name": "cancelRentalListing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tileId", "type": "uint256" }],
    "name": "cancelSaleListing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tileId", "type": "uint256" },
      { "internalType": "uint256", "name": "pricePerDay", "type": "uint256" },
      { "internalType": "uint256", "name": "duration", "type": "uint256" },
      { "internalType": "bool", "name": "isNativePayment", "type": "bool" }
    ],
    "name": "listTileForRent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tileId", "type": "uint256" },
      { "internalType": "uint256", "name": "price", "type": "uint256" },
      { "internalType": "bool", "name": "isNativePayment", "type": "bool" }
    ],
    "name": "listTileForSale",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tileId", "type": "uint256" }
    ],
    "name": "rentTile",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "rentalListings",
    "outputs": [
      { "internalType": "uint256", "name": "tileId", "type": "uint256" },
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "uint256", "name": "pricePerDay", "type": "uint256" },
      { "internalType": "uint256", "name": "duration", "type": "uint256" },
      { "internalType": "bool", "name": "isActive", "type": "bool" },
      { "internalType": "bool", "name": "isNativePayment", "type": "bool" },
      { "internalType": "address", "name": "currentRenter", "type": "address" },
      { "internalType": "uint256", "name": "rentalStart", "type": "uint256" },
      { "internalType": "uint256", "name": "rentalEnd", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "saleListings",
    "outputs": [
      { "internalType": "uint256", "name": "tileId", "type": "uint256" },
      { "internalType": "address", "name": "seller", "type": "address" },
      { "internalType": "uint256", "name": "price", "type": "uint256" },
      { "internalType": "bool", "name": "isActive", "type": "bool" },
      { "internalType": "bool", "name": "isNativePayment", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_RENTAL_DURATION",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "sprfdToken",
    "outputs": [{ "internalType": "contract IERC20", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  // New query functions from updated contracts
  {
    "inputs": [],
    "name": "getAllCreatedTiles",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tileId", "type": "uint256" }],
    "name": "getTileDetails",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "tileId", "type": "uint256" },
          { "internalType": "address", "name": "owner", "type": "address" },
          { "internalType": "string", "name": "metadataUri", "type": "string" },
          { "internalType": "bool", "name": "isNativePayment", "type": "bool" },
          { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
          { "internalType": "address", "name": "originalBuyer", "type": "address" },
          { "internalType": "bool", "name": "isForSale", "type": "bool" },
          { "internalType": "bool", "name": "isForRent", "type": "bool" },
          { "internalType": "bool", "name": "isCurrentlyRented", "type": "bool" },
          { "internalType": "uint256", "name": "salePrice", "type": "uint256" },
          { "internalType": "uint256", "name": "rentPricePerDay", "type": "uint256" },
          { "internalType": "address", "name": "currentRenter", "type": "address" },
          { "internalType": "uint256", "name": "rentalEnd", "type": "uint256" }
        ],
        "internalType": "struct TileMarketplace.TileDetails",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserTilesWithDetails",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "tileId", "type": "uint256" },
          { "internalType": "address", "name": "owner", "type": "address" },
          { "internalType": "string", "name": "metadataUri", "type": "string" },
          { "internalType": "bool", "name": "isNativePayment", "type": "bool" },
          { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
          { "internalType": "address", "name": "originalBuyer", "type": "address" },
          { "internalType": "bool", "name": "isForSale", "type": "bool" },
          { "internalType": "bool", "name": "isForRent", "type": "bool" },
          { "internalType": "bool", "name": "isCurrentlyRented", "type": "bool" },
          { "internalType": "uint256", "name": "salePrice", "type": "uint256" },
          { "internalType": "uint256", "name": "rentPricePerDay", "type": "uint256" },
          { "internalType": "address", "name": "currentRenter", "type": "address" },
          { "internalType": "uint256", "name": "rentalEnd", "type": "uint256" }
        ],
        "internalType": "struct TileMarketplace.TileDetails[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllSaleListings",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllRentalListings",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserSaleListings",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "tileId", "type": "uint256" },
          { "internalType": "address", "name": "seller", "type": "address" },
          { "internalType": "uint256", "name": "price", "type": "uint256" },
          { "internalType": "bool", "name": "isActive", "type": "bool" },
          { "internalType": "bool", "name": "isNativePayment", "type": "bool" },
          { "internalType": "uint256", "name": "listedAt", "type": "uint256" }
        ],
        "internalType": "struct TileMarketplace.SaleListing[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserRentalListings",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "tileId", "type": "uint256" },
          { "internalType": "address", "name": "owner", "type": "address" },
          { "internalType": "uint256", "name": "pricePerDay", "type": "uint256" },
          { "internalType": "bool", "name": "isActive", "type": "bool" },
          { "internalType": "bool", "name": "isNativePayment", "type": "bool" },
          { "internalType": "address", "name": "currentRenter", "type": "address" },
          { "internalType": "uint256", "name": "rentalStart", "type": "uint256" },
          { "internalType": "uint256", "name": "rentalEnd", "type": "uint256" },
          { "internalType": "uint256", "name": "listedAt", "type": "uint256" }
        ],
        "internalType": "struct TileMarketplace.RentalListing[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const TILE_CORE_ABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "tileId", "type": "uint256" }],
    "name": "checkTileExists",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tileId", "type": "uint256" }],
    "name": "getTile",
    "outputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "string", "name": "metadataUri", "type": "string" },
      { "internalType": "bool", "name": "isNativePayment", "type": "bool" },
      { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
      { "internalType": "address", "name": "originalBuyer", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserOwnedTiles",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserBoughtTiles",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllCreatedTiles",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ERC20 ABI for SPRFD token
export const ERC20_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "transferFrom",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const; 