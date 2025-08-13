# Marketplace Contract Integration

This document explains the marketplace contract integration that has been added to the Springfield project

## Overview

The marketplace integration provides a complete interface for buying, selling, and renting tiles in the Springfield ecosystem. It includes:

- **Contract ABIs**: Complete ABIs for TileMarketplace and TileCore contracts
- **Custom Hook**: `useMarketplace` hook for easy contract interactions
- **UI Components**: React components for displaying listings and user interactions
- **Configuration**: Centralized contract addresses and configuration

## Files Added

### 1. Contract Configuration (`src/config/contracts.ts`)
- Centralized contract addresses
- Complete ABIs for all contracts
- Type-safe contract interfaces

### 2. Marketplace Hook (`src/hooks/useMarketplace.ts`)
- Custom React hook for marketplace functionality
- Balance checking (SPRFD and native tokens)
- Contract interaction functions
- State management for listings and user tiles

### 3. Marketplace Page (`src/app/marketplace/page.tsx`)
- Complete marketplace UI
- Balance display
- Sale and rental listings
- User tile management
- Action buttons for all marketplace functions

### 4. Listing Component (`src/components/ListingCard.tsx`)
- Reusable component for displaying listings
- Support for both sale and rental listings
- Action buttons with proper state handling

## Contract Functions Available

### Listing Functions
- `listTileForSale(tileId, price, isNativePayment)` - List a tile for sale
- `listTileForRent(tileId, pricePerDay, isNativePayment)` - List a tile for rent
- `cancelSaleListing(tileId)` - Cancel a sale listing
- `cancelRentalListing(tileId)` - Cancel a rental listing

### Purchase/Rental Functions
- `buyListedTile(tileId, price, isNativePayment)` - Buy a listed tile
- `rentTile(tileId, duration, totalPrice, isNativePayment)` - Rent a tile

### Data Functions
- `fetchMarketplaceData()` - Fetch all active listings
- `fetchUserTiles()` - Fetch user's owned tiles

## Usage Example

```typescript
import { useMarketplace } from '../hooks/useMarketplace';

function MyComponent() {
  const {
    activeSaleListings,
    activeRentalListings,
    userTiles,
    loading,
    sprfdBalance,
    nativeBalance,
    listTileForSaleAction,
    buyListedTileAction,
    rentTileAction,
  } = useMarketplace();

  // List a tile for sale
  const handleListForSale = () => {
    listTileForSaleAction(123, '0.1', false); // Tile ID, price in SPRFD, not native
  };

  // Buy a listed tile
  const handleBuyTile = () => {
    buyListedTileAction(123, '0.1', false); // Tile ID, price, not native
  };

  return (
    <div>
      <p>SPRFD Balance: {sprfdBalance}</p>
      <p>Native Balance: {nativeBalance}</p>
      
      {/* Display listings */}
      {activeSaleListings.map(listing => (
        <div key={Number(listing.tileId)}>
          Tile #{Number(listing.tileId)} - {formatEther(listing.price)} SPRFD
          <button onClick={() => buyListedTileAction(Number(listing.tileId), formatEther(listing.price), listing.isNativePayment)}>
            Buy
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Setup Requirements

### 1. Set Environment Variables
Create a `.env` file in your project root and add your deployed contract addresses:

```bash
# Contract Addresses
NEXT_PUBLIC_TILE_CORE=0x... # Your deployed TileCore address
NEXT_PUBLIC_TILE_CONTRACT=0x... # Your deployed TileMarketplace address
```

The contract addresses are automatically loaded from these environment variables in `src/config/contracts.ts`.

### 2. Deploy Contracts
Make sure you have deployed the TileMarketplace and TileCore contracts using the deployment script:

```bash
npx hardhat run scripts/deploy_modular.js --network <your-network>
```

### 3. Verify Contracts
After deployment, verify your contracts on the blockchain explorer:

```bash
npx hardhat run scripts/verify_contracts.js --network <your-network>
```

## Features

### ✅ Implemented
- Contract ABIs and configuration
- Basic marketplace hook structure
- UI components for listings
- Balance display
- Action button placeholders

### 🔄 Next Steps
- Implement actual contract calls using wagmi/viem
- Add transaction status handling
- Implement event listening for real-time updates
- Add error handling and user feedback
- Create listing management modals
- Add price input validation

## Contract Events

The marketplace contract emits the following events that can be listened to:

- `TileListedForSale` - When a tile is listed for sale
- `TileListedForRent` - When a tile is listed for rent
- `TileSold` - When a tile is sold
- `TileRented` - When a tile is rented
- `TilePurchased` - When a new tile is purchased

## Error Handling

The current implementation includes basic error handling with try-catch blocks and loading states. Future improvements should include:

- Transaction error messages
- Gas estimation
- Network error handling
- User-friendly error messages

## Testing

To test the marketplace functionality:

1. Deploy contracts to a test network
2. Update contract addresses in configuration
3. Connect a wallet with test tokens
4. Try listing, buying, and renting tiles
5. Verify all transactions on the blockchain explorer

## Security Considerations

- Always validate user inputs
- Check user permissions before allowing actions
- Verify contract addresses before interactions
- Handle failed transactions gracefully
- Implement proper error boundaries in React components 