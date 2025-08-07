"use client";

import { motion } from 'framer-motion';
import { useState, Suspense } from 'react';
import { Map, ShoppingCart, Star, Home, Grid3X3, Wallet, RefreshCw } from 'lucide-react';
import { ConnectButton, darkTheme } from '@rainbow-me/rainbowkit';
import QRCode from 'react-qr-code';
import BuyModal from '../components/BuyModal';
import { useEffect } from 'react';
import TileDetailsModal from '../components/TileDetailsModal';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { CONTRACT_ADDRESSES, TILE_MARKETPLACE_ABI } from '../../config/contracts';

// Simple fallback component for the center tile
const CenterTileFallback = () => (
  <div className="w-full h-full flex items-center justify-center bg-yellow-400 border-2 border-black">
    <div className="bg-white rounded-lg flex items-center justify-center w-[95%] h-[95%]">
      <QRCode value="https://x.com/pepe_unchained" bgColor="#fff" fgColor="#111" style={{ width: '100%', height: '100%' }} />
    </div>
  </div>
);

// Simple tile interface
interface Tile {
  id: string;
  x: number;
  y: number;
  owner: string | null;
  price: number;
  color: string;
  isForSale: boolean;
  isCenterArea?: boolean;
  width?: number;
  height?: number;
}

// Convert coordinates to numeric tile ID
const coordinatesToTileId = (x: number, y: number): number => {
  return x + (y - 1) * 40; // 40 columns per row
};

// Convert numeric tile ID back to coordinates
const tileIdToCoordinates = (tileId: number): { x: number, y: number } => {
  const y = Math.floor((tileId - 1) / 40) + 1;
  const x = ((tileId - 1) % 40) + 1;
  return { x, y };
};

// Generate fresh 40x20 grid with center area
const generateGrid = (): Tile[] => {
  const tiles: Tile[] = [];
  const width = 40;
  const height = 20;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Check if this is in the center area (17-23 horizontal, 8-12 vertical)
      const isInCenter = x >= 16 && x <= 22 && y >= 7 && y <= 11;
      
      // Skip individual tiles in center area - we'll add one big center tile
      if (isInCenter) continue;
      
      const displayX = x + 1;
      const displayY = y + 1;
      
      tiles.push({
        id: coordinatesToTileId(displayX, displayY).toString(),
        x: displayX, // Human readable coordinates
        y: displayY,
        owner: null,
        price: 5,
        color: '#E5E7EB',
        isForSale: true,
      });
    }
  }
  
  // Add one big center tile
  tiles.push({
    id: coordinatesToTileId(17, 8).toString(),
    x: 17,
    y: 8,
    owner: null,
    price: 5000,
    color: '#FFD700',
    isForSale: true,
    isCenterArea: true,
    width: 7,
    height: 5,
  });
  
  return tiles;
};

const yellowTheme = darkTheme({
  accentColor: '#facc15', // Tailwind yellow-400
  accentColorForeground: '#000',
  borderRadius: 'medium',
});

export default function GridPage() {
  const [tiles, setTiles] = useState<Tile[]>(generateGrid());
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [hoveredTile, setHoveredTile] = useState<Tile | null>(null);
  const [tileDetails, setTileDetails] = useState<any>({}); // { tileId: details }
  const [modalDetails, setModalDetails] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [marketData, setMarketData] = useState<any>({ marketCapFormatted: '$0' });
  const [soldTilesCount, setSoldTilesCount] = useState(0);
  const [userOwnedTilesCount, setUserOwnedTilesCount] = useState(0);

  const { address: userAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  // const signer = walletClient ? new JsonRpcSigner(walletClient) : null;
  const TILE_AUCTION_ADDRESS = '0x3B4Be35688BF620d8c808678D5CF22494FFD2c9B';
  // const auctionContract = signer ? new Contract(TILE_AUCTION_ADDRESS, TileAuctionABI, signer) : null;

  // Convert old coordinate format to new numeric ID
  const convertOldTileId = (oldId: string): string => {
    if (!oldId || typeof oldId !== 'string') return oldId;
    const parts = oldId.split('-');
    if (parts.length === 2) {
      const x = parseInt(parts[0]);
      const y = parseInt(parts[1]);
      if (!isNaN(x) && !isNaN(y)) {
        return coordinatesToTileId(x, y).toString();
      }
    }
    return oldId;
  };

  // Fetch market data
  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/market-data');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMarketData(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  // Fetch contract stats (total tiles count and user's owned tiles)
  const fetchContractStats = async () => {
    try {
      const url = userAddress 
        ? `/api/contract-stats?userAddress=${userAddress}`
        : '/api/contract-stats';
      
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSoldTilesCount(result.data.totalTilesCount);
          setUserOwnedTilesCount(result.data.userOwnedTilesCount);
          console.log('Contract stats:', result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching contract stats:', error);
    }
  };

  // NEW: Fetch all tile details using contract functions instead of events
  const fetchTileDetails = async () => {
    try {
      setIsRefreshing(true);
      
      // Check if we have the required environment variables
      if (!process.env.NEXT_PUBLIC_RPC_URL || !CONTRACT_ADDRESSES.MARKETPLACE) {
        console.error('Missing RPC URL or contract address');
        return;
      }
      
      // Create provider and contract instance
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const marketplace = new ethers.Contract(CONTRACT_ADDRESSES.MARKETPLACE, TILE_MARKETPLACE_ABI, provider);

      // Step 1: Get all tile IDs
      console.log('Fetching all created tiles...');
      const allTileIds = await marketplace.getAllCreatedTiles();
      console.log('All tile IDs:', allTileIds);

      // Step 2: Get details for each tile
      console.log('Fetching details for each tile...');
      const allTilesDetails = await Promise.all(
        allTileIds.map(async (id: bigint) => {
          try {
            const details = await marketplace.getTileDetails(id);
            return {
              tileId: id.toString(),
              details: {
                tileId: details.tileId.toString(),
                owner: details.owner,
                metadataUri: details.metadataUri,
                isNativePayment: details.isNativePayment,
                createdAt: details.createdAt.toString(),
                originalBuyer: details.originalBuyer,
                isForSale: details.isForSale,
                isForRent: details.isForRent,
                isCurrentlyRented: details.isCurrentlyRented,
                salePrice: details.salePrice.toString(),
                rentPricePerDay: details.rentPricePerDay.toString(),
                currentRenter: details.currentRenter,
                rentalEnd: details.rentalEnd.toString()
              }
            };
          } catch (error) {
            console.error(`Error fetching details for tile ${id}:`, error);
            return null;
          }
        })
      );

      // Step 3: Build the tileDetails mapping
      const newTileDetails: any = {};
      let validTilesCount = 0;

      // Process each tile and fetch its metadata
      for (const tileData of allTilesDetails) {
        if (tileData) {
          const { tileId, details } = tileData;
          
          // Fetch metadata from IPFS if metadataUri exists
          let metadata = null;
          let imageCID = null;
          
          if (details.metadataUri) {
            try {
              console.log(`Fetching metadata for tile ${tileId} from: ${details.metadataUri}`);
              const metadataResponse = await fetch(details.metadataUri);
              if (metadataResponse.ok) {
                metadata = await metadataResponse.json();
                console.log(`Metadata for tile ${tileId}:`, metadata);
                
                // Extract image CID directly from metadata (not nested in image field)
                if (metadata.imageCID) {
                  imageCID = metadata.imageCID;
                  console.log(`Image CID for tile ${tileId}:`, imageCID);
                }
              }
            } catch (error) {
              console.error(`Error fetching metadata for tile ${tileId}:`, error);
            }
          }
          
          newTileDetails[tileId] = {
            ...details,
            name: metadata?.name || `Tile ${tileId}`,
            description: metadata?.description || '',
            imageCID: imageCID,
            metadata: metadata,
            // Add social and website info from metadata
            socials: metadata?.socials || {},
            website: metadata?.website || null,
            userType: metadata?.userType || 'user',
            address: metadata?.address || details.owner
          };
          validTilesCount++;
        }
      }

      setTileDetails(newTileDetails);
      setSoldTilesCount(validTilesCount);
      console.log('Loaded contract tiles:', Object.keys(newTileDetails), 'Count:', validTilesCount);
      
    } catch (error) {
      console.error('Error fetching tile details from contract:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      await Promise.all([
        fetchTileDetails(),
        fetchMarketData(),
        fetchContractStats() // Call fetchContractStats here
      ]);
    };
    
    loadData();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    console.log('Sold tiles count updated:', soldTilesCount);
  }, [soldTilesCount]);

  useEffect(() => {
    console.log('Market data updated:', marketData);
  }, [marketData]);

  // Show all tiles
  const filteredTiles = tiles;

  // Add state for modal visibility and user type
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalUserType, setModalUserType] = useState<'project' | 'user' | null>(null);

  // Add useState for connection status
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  let connectButtonProps = null;

  const handleTileClick = (tile: Tile) => {
    setSelectedTile(tile);
  };

  // Update handleBuyTile to open modal
  const handleBuyTile = (tile: Tile) => {
    setSelectedTile(tile);
    setIsModalOpen(true);
    setModalUserType(null); // Reset user type selection
  };

  // Handle refresh button click
  const handleRefresh = () => {
    Promise.all([
      fetchTileDetails(),
      fetchMarketData(),
      fetchContractStats()
    ]);
  };

  // Refetch contract stats when user address changes
  useEffect(() => {
    if (userAddress) {
      fetchContractStats();
    }
  }, [userAddress]);

  return (
    <div className="min-h-screen bg-blue-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-blue-500 border-b-2 border-black shadow-lg">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-12 sm:h-16">
            <motion.div
              className="flex items-center space-x-2 sm:space-x-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <a href="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity">
                <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-green-500 border-2 border-black flex items-center justify-center shadow-lg">
                  <Map className="w-3 h-3 sm:w-6 sm:h-6 text-black" />
                </div>
                <span className="text-lg sm:text-2xl font-bold text-yellow-300 hidden sm:block">
                  Springfield Grid
                </span>
                <span className="text-sm font-bold text-yellow-300 sm:hidden">
                  Grid
                </span>
              </a>
            </motion.div>
            
            <motion.div
              className="hidden md:flex space-x-8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <a href="/" className="text-white hover:text-green-400 font-medium transition-colors flex items-center gap-2">
                <Home className="w-4 h-4" />
                Home
              </a>
              <a href="#grid" className="text-white hover:text-green-400 font-medium transition-colors flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                Grid
              </a>
              <a href="/marketplace" className="text-white hover:text-green-400 font-medium transition-colors flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Marketplace
              </a>
            </motion.div>

            <motion.div
              className="flex items-center space-x-2 sm:space-x-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 bg-yellow-400 text-black rounded-md font-bold hover:bg-yellow-300 transition-colors disabled:opacity-50 text-xs sm:text-sm"
              >
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh Grid'}</span>
                <span className="sm:hidden">{isRefreshing ? '...' : 'Refresh'}</span>
              </button>
              <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className={`pt-20 pb-8 px-4${isModalOpen ? ' pointer-events-none overflow-hidden' : ''}`}
        style={isModalOpen ? { maxHeight: '100vh' } : {}}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.h1
              className="text-4xl md:text-6xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="text-yellow-300">Springfield</span> Grid
            </motion.h1>
            <motion.p
              className="text-xl text-white mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Own your piece of the digital world! 40x20 tiles of endless possibilities.
            </motion.p>
          </div>

          {/* Dashboard */}
          <motion.div
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-3 sm:p-4 md:p-8 mb-6 sm:mb-8 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-xl p-2 sm:p-4">
                <div className="text-emerald-300 text-xs sm:text-sm font-medium mb-1">Market Cap</div>
                <div className="text-lg sm:text-2xl font-semibold text-white">
                  {marketData.marketCapFormatted}
                  {/* Debug: {JSON.stringify(marketData)} */}
                </div>
                <div className="text-emerald-400/70 text-[10px] sm:text-xs mt-1">$SPRFD</div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-2 sm:p-4">
                <div className="text-blue-300 text-xs sm:text-sm font-medium mb-1">Sold Tiles</div>
                <div className="text-lg sm:text-2xl font-semibold text-white">
                  {soldTilesCount}
                  {/* Debug: {soldTilesCount} */}
                </div>
                <div className="text-blue-400/70 text-[10px] sm:text-xs mt-1">Total</div>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-2 sm:p-4">
                <div className="text-green-300 text-xs sm:text-sm font-medium mb-1">Your Tiles</div>
                <div className="text-lg sm:text-2xl font-semibold text-white">
                  {userAddress ? userOwnedTilesCount : '—'}
                </div>
                <div className="text-green-400/70 text-[10px] sm:text-xs mt-1">
                  {userAddress ? 'Owned' : 'Connect Wallet'}
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-xl p-2 sm:p-4">
                <div className="text-amber-300 text-xs sm:text-sm font-medium mb-1">Available</div>
                <div className="text-lg sm:text-2xl font-semibold text-white">
                  {765 - soldTilesCount}
                </div>
                <div className="text-amber-400/70 text-[10px] sm:text-xs mt-1">of 765 total</div>
              </div>
            </div>
          </motion.div>

          {/* Grid Container */}
          <motion.div
            className="flex justify-center overflow-x-auto relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div
              className="p-2 sm:p-4 md:p-8"
              style={{
                width: 'max-content',
                minWidth: '640px', // 16px * 40 columns
                maxWidth: '100vw',
                margin: '0 auto',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(40, minmax(12px, 1fr))',
                  gridTemplateRows: 'repeat(20, minmax(12px, 1fr))',
                  width: 'max-content',
                  height: 'min(70vw, 70vh, 700px)',
                  minWidth: '640px',
                  minHeight: '320px',
                  maxWidth: '100vw',
                  maxHeight: '80vh',
                  gap: '0px',
                }}
              >
                {filteredTiles.map((tile) => {
                  let details = tileDetails[tile.id];
                  let bgColor = '#E5E7EB';
                  let tooltip = 'Available for purchase';
                  
                  // Check if this tile has been purchased (has an owner)
                  if (details && details.owner) {
                    // Tile has been purchased
                    bgColor = '#22c55e'; // Green for purchased tiles
                    tooltip = 'Owned';
                    
                    // If tile has metadata/image, show it
                    if (details.imageCID) {
                      bgColor = 'transparent'; // Let background image show
                      console.log(`Tile ${tile.id} has image: ${details.imageCID}`);
                    }
                  } else if (tile.isCenterArea) {
                    // Center tile
                    bgColor = '#FFD700';
                    tooltip = 'Center Area';
                  } else {
                    // Available tile
                      bgColor = '#E5E7EB';
                    tooltip = 'Available for purchase';
                  }
                  
                  return (
                  <motion.div
                    key={tile.id}
                    className="cursor-pointer"
                    style={{
                      backgroundColor: bgColor,
                      gridColumn: tile.isCenterArea ? `${tile.x} / span ${tile.width}` : tile.x,
                      gridRow: tile.isCenterArea ? `${tile.y} / span ${tile.height}` : tile.y,
                      border: '0.5px solid #374151',
                        backgroundImage: details && details.imageCID ? `url(https://gateway.lighthouse.storage/ipfs/${details.imageCID})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        padding: 0,
                        margin: 0,
                        transform: tile.isCenterArea ? 'perspective(1000px) rotateX(0deg) rotateY(0deg)' : 'none',
                        transformStyle: tile.isCenterArea ? 'preserve-3d' : 'flat',
                        transition: tile.isCenterArea ? 'all 0.3s ease' : 'all 0.2s ease',
                      boxShadow: details && details.owner ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                    }}
                      whileHover={tile.isCenterArea ? {
                        scale: 1.05,
                        zIndex: 20,
                        rotateX: 15,
                        rotateY: 15,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 0 20px rgba(255,215,0,0.5)',
                        filter: 'brightness(1.1)',
                      } : { 
                        scale: 1.1, 
                        zIndex: 15,
                        boxShadow: '0 8px 16px rgba(0,0,0,0.3), 0 0 8px rgba(59,130,246,0.5)',
                        filter: 'brightness(1.2)',
                      }}
                      onClick={() => {
                        if (tile.isCenterArea) {
                          // Center auction tile - do nothing, cannot be purchased
                          return;
                        } else if (details && details.owner) {
                          // Tile is owned - show details
                          setModalDetails(details);
                        } else {
                          // Tile is available - open buy modal
                          handleBuyTile(tile);
                        }
                      }}
                    onMouseEnter={() => setHoveredTile(tile)}
                    onMouseLeave={() => setHoveredTile(null)}
                  >
                    {tile.isCenterArea ? (
                        <CenterTileFallback />
                      ) : details && details.owner ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Star className="w-2 h-2 text-black" />
                      </div>
                    ) : null}
                  </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Refresh Overlay */}
            {isRefreshing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-10">
                <div className="bg-blue-500 p-6 rounded-lg border-2 border-black flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-yellow-300" />
                  <div className="text-white font-bold text-lg">Refreshing Grid...</div>
                  <div className="text-white/80 text-sm">Please wait while we fetch the latest tiles</div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Hover Info */}
          {hoveredTile && !selectedTile && (
            <motion.div
              className="fixed bg-black/90 backdrop-blur-sm text-white p-4 rounded-xl shadow-2xl z-50 pointer-events-none border border-white/20"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                left: Math.min(window.innerWidth - 250, Math.max(20, hoveredTile.x * 16 + 50)),
                top: Math.min(window.innerHeight - 120, Math.max(20, hoveredTile.y * 16 + 50)),
              }}
            >
              <div className="text-sm space-y-2">
                <div className="font-bold text-lg">
                  {hoveredTile.isCenterArea ? '🎯 Attention Layer' : `📍 Tile (${hoveredTile.x}, ${hoveredTile.y})`}
                </div>
                <div className="text-xs text-gray-300">ID: {hoveredTile.id}</div>
                {hoveredTile.isCenterArea ? (
                  (() => {
                    // const contractDetails = auctionContractDetails;
                    // if (contractDetails.auctionActive) {
                    //   return <div className="text-green-400 font-bold text-base">✅ Auction Active</div>;
                    // } else {
                      return <div className="text-gray-400 font-bold text-base">⏳ No Auction</div>;
                    // }
                  })()
                ) : (
                  (() => {
                    const details = tileDetails[hoveredTile.id];
                    if (details) {
                      return <>
                        <div className="font-bold text-green-300 text-base">✅ {details.name}</div>
                        <div className="text-green-400 font-semibold">Status: Claimed</div>
                        <div className="text-yellow-200">Owner: {details.name}</div>
                      </>;
                    } else {
                      return <>
                        <div className="text-red-400 font-semibold text-base">❌ Status: Unclaimed</div>
                        <div className="text-xs text-gray-400">Click to purchase</div>
                      </>;
                    }
                  })()
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modal for buying tile */}
      <BuyModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tile={selectedTile || {}}
      />

      {/* Modal for purchased tile details */}
      <TileDetailsModal open={!!modalDetails} onClose={() => setModalDetails(null)} details={modalDetails} />
      
      {/* Auction Status Component */}
      {/* Removed AuctionStatus component */}
    </div>
  );
} 