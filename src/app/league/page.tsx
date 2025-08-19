'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Map as MapIcon, ShoppingCart, Home, Grid3X3, Wallet, RefreshCw, Coins, Menu, X, TrendingUp, Users, Clock, Trophy } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { TILE_MARKETPLACE_ABI } from '@/config/contracts';

interface LeaderboardEntry {
  address: string;
  tileCount: number;
  tiles: number[];
  rank: number;
  totalSpent?: number;
  firstPurchaseDate?: Date;
  lastActivity?: Date;
  avgTileValue?: number;
  sampleTileMetadata?: {
    name: string;
    image: string;
    description?: string;
  };
}

interface LeaderboardStats {
  totalTiles: number;
  totalPlayers: number;
  totalVolume: number;
  topHolder: string;
  avgTilesPerPlayer: number;
  recentActivity: number;
}

export default function LeaguePage() {
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats>({
    totalTiles: 0,
    totalPlayers: 0,
    totalVolume: 0,
    topHolder: '',
    avgTilesPerPlayer: 0,
    recentActivity: 0
  });
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async (tableOnly = false) => {
    try {
      if (tableOnly) {
        setTableLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setProgress({ current: 0, total: 0 });

      const { ethers } = await import('ethers');
      const { CONTRACT_ADDRESSES, TILE_MARKETPLACE_ABI } = await import('@/config/contracts');
      
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const marketplace = new ethers.Contract(CONTRACT_ADDRESSES.MARKETPLACE, TILE_MARKETPLACE_ABI, provider);

      // Get all created tiles
      const allTileIds = await marketplace.getAllCreatedTiles();
      
      if (!allTileIds || allTileIds.length === 0) {
        setLeaderboard([]);
        setStats({
          totalTiles: 0,
          totalPlayers: 0,
          totalVolume: 0,
          topHolder: '',
          avgTilesPerPlayer: 0,
          recentActivity: 0
        });
        if (tableOnly) setTableLoading(false);
        else setLoading(false);
        return;
      }

      setProgress({ current: 0, total: allTileIds.length });
      
      // Create maps for user data
      const userTileCounts = new Map<string, number[]>();
      const userFirstPurchase = new Map<string, Date>();
      const userLastActivity = new Map<string, Date>();
      const recentActivityCount = new Map<string, number>();
      
      // Process tiles in batches
      const batchSize = 10;
      const totalBatches = Math.ceil(allTileIds.length / batchSize);
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, allTileIds.length);
        const batchTileIds = allTileIds.slice(startIndex, endIndex);
        
        const batchPromises = batchTileIds.map(async (tileId: any) => {
          let retries = 3;
          while (retries > 0) {
            try {
              const tileDetails = await marketplace.getTileDetails(tileId);
              const createdAt = new Date(Number(tileDetails.createdAt) * 1000);
              
              return { 
                tileId: Number(tileId), 
                owner: tileDetails.owner,
                createdAt,
                originalBuyer: tileDetails.originalBuyer
              };
            } catch (err) {
              retries--;
              if (retries === 0) {
                console.warn(`Failed to get details for tile ${tileId} after 3 attempts:`, err);
                return null;
              }
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach((result) => {
          if (result) {
            const { tileId, owner, createdAt, originalBuyer } = result;
            
            // Count tiles per user
            if (!userTileCounts.has(owner)) {
              userTileCounts.set(owner, []);
            }
            userTileCounts.get(owner)!.push(tileId);
            
            // Track first purchase date (use original buyer for this)
            if (!userFirstPurchase.has(originalBuyer)) {
              userFirstPurchase.set(originalBuyer, createdAt);
            } else {
              const existing = userFirstPurchase.get(originalBuyer)!;
              if (createdAt < existing) {
                userFirstPurchase.set(originalBuyer, createdAt);
              }
            }
            
            // Track last activity (use current owner)
            if (!userLastActivity.has(owner)) {
              userLastActivity.set(owner, createdAt);
            } else {
              const existing = userLastActivity.get(owner)!;
              if (createdAt > existing) {
                userLastActivity.set(owner, createdAt);
              }
            }
            
            // Count recent activity (last 24h)
            if (createdAt.getTime() > oneDayAgo) {
              recentActivityCount.set(owner, (recentActivityCount.get(owner) || 0) + 1);
            }
          }
        });
        
        setProgress({ current: endIndex, total: allTileIds.length });
        
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // Calculate statistics
      const totalPlayers = userTileCounts.size;
      const totalTiles = allTileIds.length;
      const avgTilesPerPlayer = totalPlayers > 0 ? totalTiles / totalPlayers : 0;
      const recentActivity = Array.from(recentActivityCount.values()).reduce((sum, count) => sum + count, 0);
      
      // Find top holder
      let topHolder = '';
      let maxTiles = 0;
      userTileCounts.forEach((tiles, user) => {
        if (tiles.length > maxTiles) {
          maxTiles = tiles.length;
          topHolder = user;
        }
      });

      // Create leaderboard
      const leaderboardData: LeaderboardEntry[] = Array.from(userTileCounts.entries())
        .map((entry) => {
          const [userAddress, tiles] = entry as [string, number[]];
          const firstPurchase = userFirstPurchase.get(userAddress);
          const lastActivity = userLastActivity.get(userAddress);
          
          return {
            address: userAddress,
            tileCount: tiles.length,
            tiles: tiles.sort((a: number, b: number) => a - b),
            rank: 0,
            firstPurchaseDate: firstPurchase,
            lastActivity: lastActivity,
            avgTileValue: 0 // Could be calculated if we had price data
          };
        })
        .sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.tileCount - a.tileCount)
        .slice(0, 5) // Top 5 instead of 20
        .map((entry: LeaderboardEntry, index: number) => ({
          ...entry,
          rank: index + 1
        }));

      // Fetch sample tile metadata for each user
      for (const entry of leaderboardData) {
        if (entry.tiles.length > 0) {
          // Get the first tile's metadata URI
          const sampleTileId = entry.tiles[0];
          try {
            const tileDetails = await marketplace.getTileDetails(sampleTileId);
            if (tileDetails.metadataUri) {
              // Add timeout to metadata fetching
              const metadataPromise = fetchTileMetadata(tileDetails.metadataUri);
              const timeoutPromise = new Promise<null>((_, reject) => 
                setTimeout(() => reject(new Error('Metadata fetch timeout')), 5000)
              );
              
              try {
                const metadata = await Promise.race([metadataPromise, timeoutPromise]);
                if (metadata) {
                  entry.sampleTileMetadata = metadata;
                }
              } catch (timeoutError) {
                console.warn(`Metadata fetch timeout for tile ${sampleTileId}`);
              }
            }
          } catch (error) {
            console.warn(`Failed to get metadata for sample tile ${sampleTileId}:`, error);
          }
        }
      }

      setLeaderboard(leaderboardData);
      setStats({
        totalTiles,
        totalPlayers,
        totalVolume: 0, // Would need transaction data to calculate
        topHolder: topHolder ? `${topHolder.slice(0, 6)}...${topHolder.slice(-4)}` : '',
        avgTilesPerPlayer: Math.round(avgTilesPerPlayer * 100) / 100,
        recentActivity
      });

    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to fetch leaderboard data');
    } finally {
      if (tableOnly) {
        console.log('Clearing tableLoading state');
        setTableLoading(false);
      } else {
        console.log('Clearing main loading state');
        setLoading(false);
      }
      setProgress({ current: 0, total: 0 });
    }
  };

  const refreshTable = () => {
    console.log('Refreshing table...');
    fetchLeaderboard(true);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      // You could add a toast notification here if you want
      console.log('Address copied to clipboard:', address);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Unknown';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const fetchTileMetadata = async (metadataUri: string) => {
    try {
      if (!metadataUri || metadataUri === '') return null;
      
      // Handle IPFS URIs
      let url = metadataUri;
      if (metadataUri.startsWith('ipfs://')) {
        url = `https://gateway.lighthouse.storage/ipfs/${metadataUri.replace('ipfs://', '')}`;
      } else if (metadataUri.startsWith('http')) {
        url = metadataUri;
      } else {
        // Assume it's a relative path or needs base URL
        url = metadataUri.startsWith('/') ? metadataUri : `/${metadataUri}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const metadata = await response.json();
      
      // Extract imageCID from metadata (same as grid page)
      let imageUrl = '';
      if (metadata.imageCID) {
        imageUrl = `https://gateway.lighthouse.storage/ipfs/${metadata.imageCID}`;
      } else if (metadata.image) {
        // Check if image is already a full URL or needs IPFS gateway
        if (metadata.image.startsWith('ipfs://')) {
          imageUrl = `https://gateway.lighthouse.storage/ipfs/${metadata.image.replace('ipfs://', '')}`;
        } else if (metadata.image.startsWith('http')) {
          imageUrl = metadata.image;
        } else {
          // Assume it's a CID and construct IPFS URL
          imageUrl = `https://gateway.lighthouse.storage/ipfs/${metadata.image}`;
        }
      }
      
      return {
        name: metadata.name || 'Unnamed Tile',
        image: imageUrl,
        description: metadata.description || ''
      };
    } catch (error) {
      console.warn('Failed to fetch tile metadata:', error);
      return null;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500 text-black';
    if (rank === 2) return 'bg-gray-400 text-black';
    if (rank === 3) return 'bg-amber-600 text-white';
    if (rank <= 10) return 'bg-blue-500 text-white';
    return 'bg-slate-500 text-white';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-900 text-white">
        {/* Navigation - Same as original */}
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
                    <MapIcon className="w-3 h-3 sm:w-6 sm:h-6 text-black" />
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
                <a href="/grid" className="text-white hover:text-green-400 font-medium transition-colors flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4" />
                  Grid
                </a>
                <a href="/marketplace" className="text-white hover:text-green-400 font-medium transition-colors flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Marketplace
                </a>
                <a href="/league" className="text-green-400 font-medium transition-colors flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  League
                </a>
                <a href="/refund" className="text-white hover:text-green-400 font-medium transition-colors flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Refunds
                </a>
              </motion.div>

              <div className="flex items-center space-x-2 sm:space-x-4">
                <motion.button
                  className="md:hidden p-2 rounded-md text-white hover:text-green-400 transition-colors"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {mobileMenuOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </motion.button>

                <ConnectButton.Custom>
                  {({ account, chain, openConnectModal, openAccountModal, authenticationStatus, mounted }) => {
                    const ready = mounted && authenticationStatus !== 'loading';
                    const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');
                    if (!connected) {
                      return (
                        <button onClick={openConnectModal} type="button" className="px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-md bg-green-500 text-black font-bold border-2 border-black hover:bg-green-400 transition-all duration-200 flex items-center gap-1 sm:gap-2">
                          <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>Connect Wallet</span>
                        </button>
                      );
                    }
                    return (
                      <button onClick={openAccountModal} type="button" className="px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-md bg-green-500 text-black font-bold border-2 border-black hover:bg-green-400 transition-all duration-200 flex items-center gap-1 sm:gap-2">
                        <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="sm:hidden">Connected</span>
                        <span className="hidden sm:inline">{account.displayName}</span>
                      </button>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            </div>

            {/* Mobile Navigation Menu */}
            <motion.div
              className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ 
                opacity: mobileMenuOpen ? 1 : 0, 
                height: mobileMenuOpen ? 'auto' : 0 
              }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-2 pt-2 pb-3 space-y-1 bg-blue-600 border-t-2 border-black">
                <a href="/" className="block px-3 py-2 text-white hover:text-green-400 font-medium transition-colors border-b border-blue-500 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <Home className="w-4 h-4" />
                  Home
                </a>
                <a href="/grid" className="block px-3 py-2 text-white hover:text-green-400 font-medium transition-colors border-b border-blue-500 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <Grid3X3 className="w-4 h-4" />
                  Grid
                </a>
                <a href="/marketplace" className="block px-3 py-2 text-white hover:text-green-400 font-medium transition-colors border-b border-blue-500 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <ShoppingCart className="w-4 h-4" />
                  Marketplace
                </a>
                <a href="/league" className="block px-3 py-2 text-green-400 font-medium transition-colors border-b border-blue-500 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <Trophy className="w-4 h-4" />
                  League
                </a>
                <a href="/refund" className="block px-3 py-2 text-white hover:text-green-400 font-medium transition-colors flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <Coins className="w-4 h-4" />
                  Refunds
                </a>
              </div>
            </motion.div>
          </div>
        </nav>

        {/* Loading content */}
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Loading League Data</h2>
            <p className="text-slate-300 mb-4">Analyzing tile ownership and statistics...</p>
            {progress.total > 0 && (
              <div className="w-80 max-w-full">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>Processing tiles</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full">
                  <div 
                    className="h-2 bg-yellow-400 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blue-900 text-white pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button 
            onClick={() => fetchLeaderboard()}
            className="px-6 py-2 bg-yellow-400 hover:bg-yellow-300 text-black rounded-lg transition-colors font-bold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-900 text-white">
      {/* Navigation - Same as above */}
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
                  <MapIcon className="w-3 h-3 sm:w-6 sm:h-6 text-black" />
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
              <a href="/grid" className="text-white hover:text-green-400 font-medium transition-colors flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                Grid
              </a>
              <a href="/marketplace" className="text-white hover:text-green-400 font-medium transition-colors flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Marketplace
              </a>
              <a href="/league" className="text-green-400 font-medium transition-colors flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                League
              </a>
              <a href="/refund" className="text-white hover:text-green-400 font-medium transition-colors flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Refunds
              </a>
            </motion.div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <motion.button
                className="md:hidden p-2 rounded-md text-white hover:text-green-400 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </motion.button>

              <ConnectButton.Custom>
                {({ account, chain, openConnectModal, openAccountModal, authenticationStatus, mounted }) => {
                  const ready = mounted && authenticationStatus !== 'loading';
                  const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');
                  if (!connected) {
                    return (
                      <button onClick={openConnectModal} type="button" className="px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-md bg-green-500 text-black font-bold border-2 border-black hover:bg-green-400 transition-all duration-200 flex items-center gap-1 sm:gap-2">
                        <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Connect Wallet</span>
                      </button>
                    );
                  }
                  return (
                    <button onClick={openAccountModal} type="button" className="px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-md bg-green-500 text-black font-bold border-2 border-black hover:bg-green-400 transition-all duration-200 flex items-center gap-1 sm:gap-2">
                      <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="sm:hidden">Connected</span>
                      <span className="hidden sm:inline">{account.displayName}</span>
                    </button>
                  );
                }}
              </ConnectButton.Custom>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          <motion.div
            className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ 
              opacity: mobileMenuOpen ? 1 : 0, 
              height: mobileMenuOpen ? 'auto' : 0 
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1 bg-blue-600 border-t-2 border-black">
              <a href="/" className="block px-3 py-2 text-white hover:text-green-400 font-medium transition-colors border-b border-blue-500 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Home className="w-4 h-4" />
                Home
              </a>
              <a href="/grid" className="block px-3 py-2 text-white hover:text-green-400 font-medium transition-colors border-b border-blue-500 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Grid3X3 className="w-4 h-4" />
                Grid
              </a>
              <a href="/marketplace" className="block px-3 py-2 text-white hover:text-green-400 font-medium transition-colors border-b border-blue-500 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <ShoppingCart className="w-4 h-4" />
                Marketplace
              </a>
              <a href="/league" className="block px-3 py-2 text-green-400 font-medium transition-colors border-b border-blue-500 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Trophy className="w-4 h-4" />
                League
              </a>
              <a href="/refund" className="block px-3 py-2 text-white hover:text-green-400 font-medium transition-colors flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Coins className="w-4 h-4" />
                Refunds
              </a>
            </div>
          </motion.div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-20 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <motion.div
              className="text-center mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Tile Ownership League
              </h1>
              <p className="text-lg text-slate-300">
                Springfield's top tile collectors and marketplace activity
              </p>
            </motion.div>

            {/* Statistics Grid */}
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-6 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-slate-400 uppercase tracking-wide">Top Holder</span>
                </div>
                <div className="text-lg font-bold text-white truncate">{stats.topHolder || 'None'}</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-slate-400 uppercase tracking-wide">24h Activity</span>
                </div>
                <div className="text-xl font-bold text-white">{stats.recentActivity}</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-slate-400 uppercase tracking-wide">Your Rank</span>
                </div>
                <div className="text-xl font-bold text-white">
                  {address ? 
                    (leaderboard.find(entry => entry.address === address)?.rank || 'Unranked') : 
                    'Connect'
                  }
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <Grid3X3 className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-slate-400 uppercase tracking-wide">Total Tiles</span>
                </div>
                <div className="text-xl font-bold text-white">{stats.totalTiles.toLocaleString()}</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-slate-400 uppercase tracking-wide">Players</span>
                </div>
                <div className="text-xl font-bold text-white">{stats.totalPlayers.toLocaleString()}</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-slate-400 uppercase tracking-wide">Average</span>
                </div>
                <div className="text-xl font-bold text-white">{stats.avgTilesPerPlayer}</div>
              </div>
            </motion.div>
          </div>

          {/* Leaderboard Table */}
          <motion.div
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Top 5 Players</h2>
                <button 
                  onClick={refreshTable}
                  disabled={tableLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${tableLoading ? 'animate-spin' : ''}`} />
                  {tableLoading ? 'Updating...' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="relative">
              {tableLoading && (
                <div className="absolute inset-0 bg-blue-900/80 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-2"></div>
                    <p className="text-white text-sm">Updating leaderboard...</p>
                    {progress.total > 0 && (
                      <div className="w-48 mt-2">
                        <div className="text-xs text-slate-400 mb-1">
                          {progress.current} / {progress.total} tiles
                        </div>
                        <div className="w-full h-1 bg-slate-700 rounded-full">
                          <div 
                            className="h-1 bg-yellow-400 rounded-full transition-all duration-300"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {leaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <Grid3X3 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">No tiles found yet</p>
                  <p className="text-slate-500 text-sm">Be the first to purchase a tile!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Player</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Sample Tile</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Tiles Owned</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">First Purchase</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider hidden lg:table-cell">Last Activity</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider hidden xl:table-cell">Tile IDs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {leaderboard.map((entry, index) => (
                        <tr 
                          key={entry.address}
                          className={`hover:bg-white/5 transition-colors ${
                            entry.address === address ? 'bg-yellow-400/10 border-l-4 border-yellow-400' : ''
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getRankBadgeColor(entry.rank)}`}>
                              {entry.rank}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {entry.address.slice(2, 4).toUpperCase()}
                                </div>
                              </div>
                              <div className="ml-4">
                                <div 
                                  className="text-white font-medium cursor-pointer hover:text-yellow-300 transition-colors"
                                  onClick={() => copyAddress(entry.address)}
                                  title="Click to copy address"
                                >
                                  {entry.address === address ? 'You' : formatAddress(entry.address)}
                                </div>
                                <div className="text-slate-400 text-sm">
                                  {entry.address === address ? (
                                    <span 
                                      className="cursor-pointer hover:text-yellow-300 transition-colors"
                                      onClick={() => copyAddress(entry.address)}
                                      title="Click to copy address"
                                    >
                                      {formatAddress(entry.address)}
                                    </span>
                                  ) : (
                                    <span 
                                      className="cursor-pointer hover:text-yellow-300 transition-colors"
                                      onClick={() => copyAddress(entry.address)}
                                      title="Click to copy address"
                                    >
                                      {formatAddress(entry.address)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            {entry.sampleTileMetadata ? (
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <img 
                                    src={entry.sampleTileMetadata.image} 
                                    alt={entry.sampleTileMetadata.name} 
                                    className="w-12 h-12 object-cover rounded-lg border border-white/20"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                  <div className="hidden w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg border border-white/20 flex items-center justify-center text-white text-xs font-bold">
                                    {entry.tiles[0]}
                                  </div>
                                </div>
                                <div className="min-w-0">
                                  <div className="text-white font-medium text-sm truncate max-w-[120px]" title={entry.sampleTileMetadata.name}>
                                    {entry.sampleTileMetadata.name}
                                  </div>
                                  <div className="text-slate-400 text-xs">Tile #{entry.tiles[0]}</div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg border border-white/20 flex items-center justify-center text-white text-xs font-bold">
                                  ?
                                </div>
                                <div className="text-slate-400 text-sm">Loading...</div>
                              </div>
                            )}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-2xl font-bold text-white mr-2">{entry.tileCount}</span>
                              <span className="text-slate-400 text-sm">
                                tile{entry.tileCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-slate-300 text-sm hidden md:table-cell">
                            {formatDate(entry.firstPurchaseDate)}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-slate-300 text-sm hidden lg:table-cell">
                            {formatDate(entry.lastActivity)}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                            <div className="max-w-xs overflow-hidden">
                              <span className="text-slate-400 text-xs font-mono">
                                {entry.tiles.slice(0, 10).join(', ')}
                                {entry.tiles.length > 10 && ` +${entry.tiles.length - 10} more`}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {leaderboard.length > 0 && (
              <div className="px-6 py-4 bg-white/5 border-t border-white/20">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>Showing top {leaderboard.length} players</span>
                  <span>Total tiles tracked: {stats.totalTiles.toLocaleString()}</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Additional Info Section */}
          <motion.div
            className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {/* How Rankings Work */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                How Rankings Work
              </h3>
              <div className="space-y-3 text-sm text-slate-300">
                <p>Players are ranked by total number of tiles owned.</p>
                <p>Rankings update in real-time as tiles are bought and sold.</p>
                <p>Historical data shows first purchase and recent activity.</p>
                <p>Connect your wallet to see your current ranking.</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-400" />
                Activity Summary
              </h3>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Total registered players:</span>
                  <span className="text-white font-medium">{stats.totalPlayers}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average tiles per player:</span>
                  <span className="text-white font-medium">{stats.avgTilesPerPlayer}</span>
                </div>
                <div className="flex justify-between">
                  <span>New tiles (24h):</span>
                  <span className="text-white font-medium">{stats.recentActivity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current leader:</span>
                  <span className="text-white font-medium">{stats.topHolder || 'None'}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}