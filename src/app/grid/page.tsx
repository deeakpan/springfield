"use client";

import { motion } from 'framer-motion';
import { useState, Suspense } from 'react';
import { Map, ShoppingCart, Star, Home, Grid3X3, Wallet } from 'lucide-react';
import { ConnectButton, darkTheme } from '@rainbow-me/rainbowkit';
import QRCode from 'react-qr-code';
import BuyModal from '../components/BuyModal';
import AuctionModal from '../components/AuctionModal';
import AuctionStatus from '../components/AuctionStatus';
import lighthouse from '@lighthouse-web3/sdk';
import { useEffect } from 'react';
import TileDetailsModal from '../components/TileDetailsModal';
import { ethers } from 'ethers';
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
  const [auctionDetails, setAuctionDetails] = useState<any>(null);

  // Add state for auction contract details
  const [auctionContractDetails, setAuctionContractDetails] = useState<any>({});

  const TILE_AUCTION_ADDRESS = "0x60F7cD6513812a6ef7A871C4EBFFd3cCE1c2c2E0";

  // Add state for next auction time
  const [nextAuctionTime, setNextAuctionTime] = useState<string>("");

  // Fetch auction metadata from IPFS when contract has metadata CID
  useEffect(() => {
    const fetchAuctionMetadata = async () => {
      if (!window.ethereum) return;
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const tileAuction = new ethers.Contract(
          TILE_AUCTION_ADDRESS,
          [
            "function getAuction(uint256) view returns (address,uint256,address,bool,string,bool,bool)",
            "function getNextTuesdayAuctionStart(uint256) pure returns (uint256)",
            "function placeBid(uint256,uint256,string)",
            "function placeBidNative(uint256,string) payable",
            "function settleAuction(uint256)",
            "function claimRefund(uint256)"
          ],
          provider
        );

        // Fetch auction details for center tile (tile 665)
        const centerTileId = 665;
        const auctionData = await tileAuction.getAuction(centerTileId);
        
        const [
          highestBidder,
          highestBid,
          token,
          isNative,
          metadataCID,
          auctionActive,
          winnerDisplayActive
        ] = auctionData;

        // If there's a metadata CID, fetch the details from IPFS
        if (metadataCID && metadataCID !== "") {
          try {
            const url = `https://gateway.lighthouse.storage/ipfs/${metadataCID}`;
            const res = await fetch(url);
            const metadata = await res.json();
            
            // Add the metadata to tileDetails for the center tile
            setTileDetails((prev: any) => ({
              ...prev,
              [centerTileId.toString()]: {
                ...metadata,
                cid: metadataCID,
                isAuction: auctionActive,
                bidAmount: highestBid.toString(),
                bidToken: isNative ? 'PEPU' : 'PENK',
                address: highestBidder
              }
            }));
            
            console.log('Fetched auction metadata from IPFS:', metadata);
          } catch (ipfsError) {
            console.error('Error fetching metadata from IPFS:', ipfsError);
          }
        }

        setAuctionContractDetails({
          highestBidder,
          highestBid: highestBid.toString(),
          token,
          isNative,
          metadataCID,
          auctionActive,
          winnerDisplayActive
        });

        // Fetch next auction time
        const now = Math.floor(Date.now() / 1000);
        const nextAuctionTs = await tileAuction.getNextTuesdayAuctionStart(now);
        setNextAuctionTime(new Date(Number(nextAuctionTs) * 1000).toLocaleString());

      } catch (error) {
        console.error('Error fetching auction details:', error);
      }
    };

    fetchAuctionMetadata();
  }, []);

  const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY;

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

  // Fetch all details files from Lighthouse and build tileId -> details mapping
  useEffect(() => {
    if (!apiKey) return;
    let isMounted = true;
    const fetchAllUploads = async () => {
      let lastKey = null;
      let allFiles: any[] = [];
      while (true) {
        const resp = await lighthouse.getUploads(apiKey, lastKey);
        console.log('Lighthouse getUploads raw response:', resp);
        const files = resp?.data?.fileList || [];
        console.log('Lighthouse file names:', files.map(f => ({ name: f.fileName, mime: f.mimeType })));
        allFiles = allFiles.concat(files);
        if (files.length === 0 || files.length < 2000) break;
        lastKey = files[files.length - 1].id;
      }
      // Only process JSON details files or octet-streams (raw details blobs)
      const jsonFiles = allFiles.filter(f => f.fileName.endsWith('.json') || f.mimeType === 'application/octet-stream');
      console.log('Lighthouse: Found', jsonFiles.length, 'details files');
      const detailsMap: any = {};
      await Promise.all(jsonFiles.map(async (file) => {
        try {
          const url = `https://gateway.lighthouse.storage/ipfs/${file.cid}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.tile) {
            // Always map details, regardless of isAuction
            const newTileId = convertOldTileId(data.tile);
            detailsMap[newTileId] = { ...data, cid: file.cid, originalTileId: data.tile };
          }
        } catch (e) {
          console.error('Error parsing details file:', file, e);
        }
      }));
      console.log('Mapped tile IDs:', Object.keys(detailsMap));
      if (isMounted) setTileDetails(detailsMap);
    };
    fetchAllUploads();
    return () => { isMounted = false; };
  }, [apiKey]);

  // Show all tiles
  const filteredTiles = tiles;

  // Add state for modal visibility and user type
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuctionModalOpen, setIsAuctionModalOpen] = useState(false);
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
    if (tile.isCenterArea) {
      setIsAuctionModalOpen(true);
    } else {
    setIsModalOpen(true);
    }
    setModalUserType(null); // Reset user type selection
  };

  return (
    <div className="min-h-screen bg-blue-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-blue-500 border-b-2 border-black shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div
              className="flex items-center space-x-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <a href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-full bg-green-500 border-2 border-black flex items-center justify-center shadow-lg">
                  <Map className="w-6 h-6 text-black" />
                </div>
                <span className="text-2xl font-bold text-yellow-300">
                  Springfield Grid
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
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
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
                <div className="text-lg sm:text-2xl font-semibold text-white">$30,034,120</div>
                <div className="text-emerald-400/70 text-[10px] sm:text-xs mt-1">$SPRFD</div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-2 sm:p-4">
                <div className="text-blue-300 text-xs sm:text-sm font-medium mb-1">Sold Tiles</div>
                <div className="text-lg sm:text-2xl font-semibold text-white">
                  {tiles.filter(tile => tile.owner && !tile.isCenterArea).length}
                </div>
                <div className="text-blue-400/70 text-[10px] sm:text-xs mt-1">Owned</div>
              </div>

              <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-xl p-2 sm:p-4">
                <div className="text-amber-300 text-xs sm:text-sm font-medium mb-1">Available</div>
                <div className="text-lg sm:text-2xl font-semibold text-white">
                  {tiles.filter(tile => !tile.owner && !tile.isCenterArea).length}
                </div>
                <div className="text-amber-400/70 text-[10px] sm:text-xs mt-1">of {tiles.filter(tile => !tile.isCenterArea).length} total</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-2 sm:p-4">
                <div className="text-purple-300 text-xs sm:text-sm font-medium mb-1">Attention Layer</div>
                <div className="text-lg sm:text-2xl font-semibold text-white">
                  {(() => {
                    const contractDetails = auctionContractDetails;
                    if (contractDetails.auctionActive) {
                      return 'ACTIVE';
                    } else {
                      return 'WAITING';
                    }
                  })()}
                </div>
                <div className="text-purple-400/70 text-[10px] sm:text-xs mt-1">
                  {(() => {
                    const contractDetails = auctionContractDetails;
                    if (contractDetails.auctionActive) {
                      return 'Auction Active';
                    } else {
                      return 'No Auction';
                    }
                  })()}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Grid Container */}
          <motion.div
            className="flex justify-center overflow-x-auto"
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
                  let tooltip = 'No auction';
                  
                  if (details && !details.isAuction) {
                    tooltip = 'Auction ended';
                    // Optionally set a special color or border for purchased tiles
                  } else if (details && details.isAuction) {
                    // Use auction state for auction tiles
                    const auctionState = auctionDetails || {};
                    if (auctionState.state === 'active') {
                      bgColor = '#fde047';
                      tooltip = 'Auction active';
                    } else if (auctionState.state === 'ended') {
                      bgColor = '#22c55e';
                      tooltip = 'Auction ended';
                    }
                  } else if (tile.isCenterArea) {
                    // Center tile auction state
                    const contractDetails = auctionContractDetails;
                    if (contractDetails.auctionActive) {
                      bgColor = '#fde047';
                      tooltip = 'Auction active';
                    } else {
                      bgColor = '#E5E7EB';
                      tooltip = 'No auction';
                    }
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
                        boxShadow: details ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
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
                          // Always open auction modal for center tile
                          setSelectedTile(tile);
                          setIsAuctionModalOpen(true);
                        } else if (details && !details.isAuction) {
                          // Open project details modal
                          setModalDetails(details);
                        } else if (details && details.isAuction) {
                          // Open auction modal for other auction tiles
                          setAuctionDetails(details);
                        } else {
                          // Open buy modal
                          handleBuyTile(tile);
                        }
                      }}
                    onMouseEnter={() => setHoveredTile(tile)}
                    onMouseLeave={() => setHoveredTile(null)}
                  >
                    {tile.isCenterArea ? (
                        <CenterTileFallback />
                      ) : details ? null : tile.owner ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Star className="w-2 h-2 text-black" />
                      </div>
                    ) : null}
                  </motion.div>
                  );
                })}
              </div>
            </div>
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
                    const contractDetails = auctionContractDetails;
                    if (contractDetails.auctionActive) {
                      return <div className="text-green-400 font-bold text-base">✅ Auction Active</div>;
                    } else {
                      return <div className="text-gray-400 font-bold text-base">⏳ No Auction</div>;
                    }
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

      {/* Modal for auction */}
      {selectedTile && (
        <AuctionModal
          open={isAuctionModalOpen}
          onClose={() => setIsAuctionModalOpen(false)}
          tile={selectedTile}
        />
      )}

      {/* Modal for purchased tile details */}
      <TileDetailsModal open={!!modalDetails} onClose={() => setModalDetails(null)} details={modalDetails} />
      
      {/* Auction Status Component */}
      {auctionDetails && (
        <div className="fixed bottom-4 right-4 z-40">
          <AuctionStatus 
            auctionDetails={auctionDetails}
            auctionActive={auctionContractDetails.auctionActive}
            nextAuctionTime={nextAuctionTime}
            onAuctionEnd={() => {
              // Handle auction end - update QR code to point to project primary link
              console.log('Auction ended, updating QR code...');
            }}
          />
        </div>
      )}
    </div>
  );
} 