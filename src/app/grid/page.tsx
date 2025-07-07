"use client";

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Map, ShoppingCart, Star, Home, Grid3X3, Wallet } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

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
      
      tiles.push({
        id: `${x}-${y}`,
        x: x + 1, // Human readable coordinates
        y: y + 1,
        owner: null,
        price: Math.floor(Math.random() * 100) + 10,
        color: '#E5E7EB',
        isForSale: true,
      });
    }
  }
  
  // Add one big center tile
  tiles.push({
    id: 'center-area',
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
  // Show all tiles
  const filteredTiles = tiles;

  const handleTileClick = (tile: Tile) => {
    setSelectedTile(tile);
  };

  const handleBuyTile = (tile: Tile) => {
    // Simulate ownership, no wallet logic
    const updatedTiles = tiles.map(t => 
      t.id === tile.id 
        ? { ...t, owner: 'You', isForSale: false, color: '#7ED321' }
        : t
    );
    setTiles(updatedTiles);
    setSelectedTile(null);
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
                        className="px-4 py-2 rounded-md bg-green-500 text-black font-bold border-2 border-black hover:bg-green-400 transition-all duration-200 flex items-center gap-2"
                      >
                        <Wallet className="w-4 h-4" />
                        Connect Wallet
                      </button>
                    );
                  }
                  return (
                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="px-4 py-2 rounded-md bg-green-500 text-black font-bold border-2 border-black hover:bg-green-400 transition-all duration-200 flex items-center gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      {account.displayName}
                    </button>
                  );
                }}
              </ConnectButton.Custom>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-20 pb-8 px-4">
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
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-8 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-xl p-4">
                <div className="text-emerald-300 text-sm font-medium mb-1">Market Cap</div>
                <div className="text-2xl font-semibold text-white">$30,034,120</div>
                <div className="text-emerald-400/70 text-xs mt-1">$SPRFD</div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-4">
                <div className="text-blue-300 text-sm font-medium mb-1">Sold Tiles</div>
                <div className="text-2xl font-semibold text-white">
                  {tiles.filter(tile => tile.owner && !tile.isCenterArea).length}
                </div>
                <div className="text-blue-400/70 text-xs mt-1">Owned</div>
              </div>

              <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-xl p-4">
                <div className="text-amber-300 text-sm font-medium mb-1">Available</div>
                <div className="text-2xl font-semibold text-white">
                  {tiles.filter(tile => !tile.owner && !tile.isCenterArea).length}
                </div>
                <div className="text-amber-400/70 text-xs mt-1">of {tiles.filter(tile => !tile.isCenterArea).length} total</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-4">
                <div className="text-purple-300 text-sm font-medium mb-1">Attention Layer</div>
                <div className="text-2xl font-semibold text-white">
                  {tiles.find(tile => tile.isCenterArea)?.owner ? 'SOLD' : 'ACTIVE'}
                </div>
                <div className="text-purple-400/70 text-xs mt-1">
                  {tiles.find(tile => tile.isCenterArea)?.owner ? 'Ended' : 'Bidding Open'}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Grid Container */}
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="p-8" style={{ width: '80vw', margin: '0 auto' }}>
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(40, 1fr)',
                gridTemplateRows: 'repeat(20, 1fr)',
                width: '100%',
                height: '600px',
                gap: '0px'
              }}>
                {filteredTiles.map((tile) => (
                  <motion.div
                    key={tile.id}
                    className="cursor-pointer"
                    style={{ 
                      backgroundColor: tile.color,
                      gridColumn: tile.isCenterArea ? `${tile.x} / span ${tile.width}` : tile.x,
                      gridRow: tile.isCenterArea ? `${tile.y} / span ${tile.height}` : tile.y,
                      border: '0.5px solid #374151'
                    }}
                    whileHover={{ scale: 1.02, zIndex: 10 }}
                    onClick={() => handleTileClick(tile)}
                    onMouseEnter={() => setHoveredTile(tile)}
                    onMouseLeave={() => setHoveredTile(null)}
                  >
                    {tile.isCenterArea ? (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-black">
                        ATTENTION LAYER
                      </div>
                    ) : tile.owner ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Star className="w-2 h-2 text-black" />
                      </div>
                    ) : null}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Tile Info Panel */}
          {selectedTile && (
            <motion.div
              className="fixed inset-0 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTile(null)}
            >
              <motion.div
                className="bg-gray-800 text-white p-6 rounded-lg max-w-md w-full mx-4 border-2 border-black"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">
                    {selectedTile.isCenterArea ? 'Attention Layer' : `Tile (${selectedTile.x}, ${selectedTile.y})`}
                  </h3>
                  <button
                    onClick={() => setSelectedTile(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Owner:</span>
                    <span className="text-gray-300">
                      {selectedTile.owner ? selectedTile.owner : 'Unclaimed'}
                    </span>
                  </div>

                  {!selectedTile.isCenterArea && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Price:</span>
                      <span className="text-green-400 font-bold">{selectedTile.price} $SPRFD</span>
                    </div>
                  )}

                  {selectedTile.isCenterArea ? (
                    <div className="space-y-3">
                      <div className="text-center">
                        <span className="text-yellow-400 font-bold text-lg">Auction Active</span>
                      </div>
                      <button
                        onClick={() => handleBuyTile(selectedTile)}
                        className="w-full bg-green-500 text-black font-bold py-2 px-4 rounded-md hover:bg-green-400 transition-colors flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Place Bid
                      </button>
                    </div>
                  ) : selectedTile.isForSale && !selectedTile.owner && (
                    <button
                      onClick={() => handleBuyTile(selectedTile)}
                      className="w-full bg-green-500 text-black font-bold py-2 px-4 rounded-md hover:bg-green-400 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Buy for {selectedTile.price} $SPRFD
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Hover Info */}
          {hoveredTile && !selectedTile && (
            <motion.div
              className="fixed bg-black text-white p-3 rounded-lg shadow-lg z-40 pointer-events-none border border-gray-600"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                left: hoveredTile.x * 16 + 100,
                top: hoveredTile.y * 16 + 200,
              }}
            >
              <div className="text-sm">
                <div className="font-bold">
                  {hoveredTile.isCenterArea ? 'Attention Layer' : `Tile (${hoveredTile.x}, ${hoveredTile.y})`}
                </div>
                {hoveredTile.isCenterArea ? (
                  <div className="text-yellow-400 font-bold">Auction Active</div>
                ) : (
                  <div>Price: {hoveredTile.price} $SPRFD</div>
                )}
                <div>Owner: {hoveredTile.owner ? 'Claimed' : 'Unclaimed'}</div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
} 