# Springfield Grid

A blockchain-powered digital tile grid where users can own, customize, and showcase their tiles on a 40x20 grid. Built on Pepe Unchained V2 network.

## Features

- **40x20 Digital Grid** - Own your piece of the digital world
- **Dual Token Payments** - Buy tiles with $SPRFD or $PEPU tokens
- **Customizable Tiles** - Add images, links, social media, and project details
- **Automatic Auction System** - Daily auctions at 8:53 UTC with 3-minute duration and winner display
- **IPFS Integration** - All metadata stored on IPFS for decentralization
- **Real-time Updates** - Instant blockchain updates across the grid

## Smart Contracts

### SpringfieldDollar (SPRFD Token)
- **Network:** Pepe Unchained V2
- **Address:** `0x9EFef8d401658ABbE906aDcdC1e737502C693813`
- **Purpose:** Native token for the Springfield ecosystem

### TilePurchase Contract
- **Network:** Pepe Unchained V2
- **Address:** `0x346a672059a1a81105660B6B3a2Fc98b607B4ce7`
- **Purpose:** Handles all tile purchase transactions

### TileAuction Contract
- **Network:** Pepe Unchained V2
- **Address:** `0x60F7cD6513812a6ef7A871C4EBFFd3cCE1c2c2E0
- **Auction Duration:** 5 minutes
- **Winner Display Duration:** 5 minutes
- **Auto-Auction Time:** 16:34 UTC (4:34 PM UTC) Tuesdays
- **Payout Address:** `0x95C46439bD9559e10c4fF49bfF3e20720d93B66E`
- **Purpose:** Manages automatic auctions for the center attention layer

## Architecture

### Contract Design
- **Simplified Storage** - Contract only stores metadata CID, not individual fields
- **IPFS Integration** - All project details stored on IPFS
- **Gas Efficient** - Minimal on-chain storage for cost optimization
- **Automatic Flow** - Auctions start automatically at scheduled time

### Frontend Integration
The contract addresses are configured in:
- `src/app/components/AuctionModal.tsx`
- `src/app/grid/page.tsx`

### Data Flow
1. **User places bid** → Frontend uploads metadata to IPFS → gets `metadataCID`
2. **Frontend calls contract** → `placeBid(tileId, amount, metadataCID)`
3. **Contract stores** → Only the `metadataCID`
4. **Frontend reads contract** → Gets `metadataCID`
5. **Frontend fetches from IPFS** → Gets full project details
6. **Tile displays** → Project image, name, links, etc.

## Auction System

### Center Attention Layer
- **Location:** Tiles 17-23, rows 8-12 (7x5 block)
- **Duration:** 5 minutes auctions
- **Winner Display:** 5 minutes after auction ends
- **Bidding:** PENK or PEPU tokens
- **Auto-Schedule:** 16:34 UTC (4:34 PM UTC) Tuesdays

### Automatic Auction Flow
1. **Auto-Start** - Auction starts automatically at 16:34 UTC (4:34 PM UTC) (Tuesdays)
2. **Bidding Period** - 5 minutes of active bidding
3. **Auction Ends** - Highest bidder wins, winner display begins
4. **Winner Display** - Winner's project shown for 5 minutes
5. **Complete** - Funds transferred, auction fully ended

### Deployer Controls
- **Claim Accumulated Funds** - Only deployer can claim contract balance
- **Toggle Auto-Auction** - Enable/disable automatic scheduling
- **Emergency Withdraw** - Recover stuck tokens
- **Contract Balance View** - Only deployer can view contract balance

## Development

### Prerequisites
- Node.js 18+
- Hardhat
- Pepe Unchained V2 network access

### Setup
```bash
npm install
cp .env.example .env
# Add your private key and Lighthouse API key
```

### Deploy Contracts
```bash
npx hardhat run scripts/deploy.js --network pepe_unchained_v2
npx hardhat run scripts/deploy_tileauction.js --network pepe_unchained_v2
```

### Run Frontend
```bash
npm run dev
```

## Token Integration

### Supported Tokens
- **$SPRFD** - Springfield Dollar (native token)
- **$PEPU** - Pepe Unchained (native token)
- **$PENK** - Pepe Unchained (ERC20)

### Token Addresses
- PENK: `0xE8a859a25249c8A5b9F44059937145FC67d65eD4`

## IPFS Integration

### Lighthouse Storage
- **API Key:** Required for uploads
- **Gateway:** `https://gateway.lighthouse.storage/ipfs/`
- **Metadata Format:** JSON with project details, social links, and image CID

### Metadata Structure
```json
{
  "name": "Project Name",
  "imageCID": "Qm...",
  "website": "https://...",
  "socials": {
    "primary": { "telegram": "https://t.me/..." },
    "additional": ["https://...", "https://..."]
  },
  "address": "0x...",
  "isAuction": true,
  "bidAmount": "1000",
  "bidToken": "PENK"
}
```

## Features

### Tile Customization
- **Images** - Upload and display project logos/images
- **Links** - Website and social media integration
- **Metadata** - Rich project information storage
- **Real-time Updates** - Instant blockchain updates

### Auction Features
- **5-minute Duration** - Fast-paced bidding with winner display
- **Automatic Scheduling** - Auctions at 16:34 UTC (4:34 PM UTC) every Tuesday
- **Winner Display Period** - 5 minutes to showcase winner
- **Dual Token Support** - PENK and PEPU bidding
- **Automatic Refunds** - Losing bidders get refunds
- **Project Display** - Winner's project shown on center tiles
- **Deployer Fund Management** - Claim accumulated auction funds

### Grid Features
- **40x20 Layout** - 800 total tiles
- **Center Attention Layer** - Premium auction area
- **Hover Tooltips** - Real-time tile information
- **Modal System** - Buy, auction, and details modals
- **Status Indicators** - Visual auction state indicators

## Network Configuration

### Pepe Unchained V2
- **Chain ID:** 97741
- **RPC URL:** https://rpc.pepeunchained.com
- **Explorer:** https://explorer.pepeunchained.com
- **Native Token:** PEPU

## License

MIT License - See LICENSE file for details.

