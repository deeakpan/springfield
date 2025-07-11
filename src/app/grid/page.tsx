"use client";

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Map, ShoppingCart, Star, Home, Grid3X3, Wallet } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import QRCode from 'react-qr-code';
import BuyModal from '../components/BuyModal';
import lighthouse from '@lighthouse-web3/sdk';
import { useEffect } from 'react';
import TileDetailsModal from '../components/TileDetailsModal';

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

export default function GridPage() {
  const [tiles, setTiles] = useState<Tile[]>(generateGrid());
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [hoveredTile, setHoveredTile] = useState<Tile | null>(null);
  const [tileDetails, setTileDetails] = useState<any>({}); // { tileId: details }
  const [modalDetails, setModalDetails] = useState<any | null>(null);
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
            // Convert old coordinate format to new numeric ID
            const newTileId = convertOldTileId(data.tile);
            detailsMap[newTileId] = { ...data, cid: file.cid, originalTileId: data.tile };
            if (data.imageCID) {
              const imgUrl = `https://gateway.lighthouse.storage/ipfs/${data.imageCID}`;
              console.log(`Tile ${newTileId} (was ${data.tile}): image URL:`, imgUrl);
            }
          } else {
            console.warn('Details file missing tile field:', file, data);
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
              <ConnectButton.Custom>
                {({ account, chain, openConnectModal, openAccountModal, authenticationStatus, mounted }) => {
                  const ready = mounted && authenticationStatus !== 'loading';
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus || authenticationStatus === 'authenticated');
                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        type="button"
                        className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-base rounded-md bg-green-500 text-black font-bold border-2 border-black hover:bg-green-400 transition-all duration-200 flex items-center gap-1 sm:gap-2 max-w-[100px] sm:max-w-none truncate"
                      >
                        <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="truncate">Connect Wallet</span>
                      </button>
                    );
                  }
                  return (
                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-base rounded-md bg-green-500 text-black font-bold border-2 border-black hover:bg-green-400 transition-all duration-200 flex items-center gap-1 sm:gap-2 max-w-[100px] sm:max-w-none truncate"
                    >
                      <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="truncate">{account.displayName}</span>
                    </button>
                  );
                }}
              </ConnectButton.Custom>
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
                  {tiles.find(tile => tile.isCenterArea)?.owner ? 'SOLD' : 'ACTIVE'}
                </div>
                <div className="text-purple-400/70 text-[10px] sm:text-xs mt-1">
                  {tiles.find(tile => tile.isCenterArea)?.owner ? 'Ended' : 'Bidding Open'}
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
                  const details = tileDetails[tile.id];
                  return (
                    <motion.div
                      key={tile.id}
                      className="cursor-pointer"
                      style={{
                        backgroundColor: tile.isCenterArea ? '#fde047' : tile.color,
                        gridColumn: tile.isCenterArea ? `${tile.x} / span ${tile.width}` : tile.x,
                        gridRow: tile.isCenterArea ? `${tile.y} / span ${tile.height}` : tile.y,
                        border: '0.5px solid #374151',
                        backgroundImage: details && details.imageCID ? `url(https://gateway.lighthouse.storage/ipfs/${details.imageCID})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        padding: 0,
                        margin: 0,
                      }}
                      whileHover={{ scale: 1.02, zIndex: 10 }}
                      onClick={() => {
                        if (details) {
                          setModalDetails(details);
                        } else {
                          handleBuyTile(tile);
                        }
                      }}
                      onMouseEnter={() => setHoveredTile(tile)}
                      onMouseLeave={() => setHoveredTile(null)}
                    >
                      {tile.isCenterArea ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="bg-white rounded-lg flex items-center justify-center w-[95%] h-[95%]">
                            <QRCode value="https://x.com/pepe_unchained" bgColor="#fff" fgColor="#111" style={{ width: '100%', height: '100%' }} />
                          </div>
                        </div>
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
              className="fixed bg-black text-white p-3 rounded-lg shadow-lg z-40 pointer-events-none border border-gray-600"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                left: Math.min(window.innerWidth - 200, Math.max(10, hoveredTile.x * 16 + 100)),
                top: Math.min(window.innerHeight - 100, Math.max(10, hoveredTile.y * 16 + 200)),
              }}
            >
              <div className="text-sm">
                <div className="font-bold">
                  {hoveredTile.isCenterArea ? 'Attention Layer' : `Tile (${hoveredTile.x}, ${hoveredTile.y}) - ID: ${hoveredTile.id}`}
                </div>
                {hoveredTile.isCenterArea ? (
                  <div className="text-yellow-400 font-bold">Auction Active</div>
                ) : (
                  (() => {
                    const details = tileDetails[hoveredTile.id];
                    if (details) {
                      return <>
                        <div className="font-bold text-green-300">{details.name}</div>
                        <div>Status: <span className="text-green-400 font-semibold">Claimed</span></div>
                        <div>Owner: <span className="text-yellow-200">{details.name}</span></div>
                      </>;
                    } else {
                      return <div>Status: <span className="text-red-400 font-semibold">Unclaimed</span></div>;
                    }
                  })()
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modal for buying tile */}
      {/* <BuyModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tile={selectedTile || {}}
        userType={modalUserType}
        setUserType={setModalUserType}
      /> */}
      <BuyModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tile={selectedTile || {}}
      />

      {/* Modal for purchased tile details */}
      <TileDetailsModal open={!!modalDetails} onClose={() => setModalDetails(null)} details={modalDetails} />
    </div>
  );
} 