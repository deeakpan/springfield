"use client";

import { motion } from 'framer-motion';
import { Map, ShoppingCart, Home, Grid3X3, Wallet, Tag, Clock, DollarSign, Package, User, Settings, Info, Grid, Calendar, Coins, Eye } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useMarketplace } from '../../hooks/useMarketplace';
import { formatEther } from 'viem';
import { useState, useEffect } from 'react';

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<'browse' | 'my-tiles' | 'my-listings'>('browse');
  const [selectedTile, setSelectedTile] = useState<any>(null);
  const [showTileModal, setShowTileModal] = useState(false);
  const [tileMetadata, setTileMetadata] = useState<{[key: string]: any}>({});
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showRentModal, setShowRentModal] = useState(false);
  const [selectedTileForAction, setSelectedTileForAction] = useState<any>(null);
  const [salePrice, setSalePrice] = useState('');
  const [rentPrice, setRentPrice] = useState('');
  const [isNativePayment, setIsNativePayment] = useState(false);
  
  const {
    activeSaleListings,
    activeRentalListings,
    userTiles,
    loading,
    sprfdBalance,
    nativeBalance,
    listTileForSaleAction,
    listTileForRentAction,
    buyListedTileAction,
    rentTileAction,
    cancelSaleListingAction,
    cancelRentalListingAction,
  } = useMarketplace();

  // Function to load tile metadata
  const loadTileMetadata = async (tileId: string) => {
    if (tileMetadata[tileId]) return tileMetadata[tileId];
    
    try {
      console.log('Loading metadata for tile:', tileId);
      
      // Find the tile in userTiles to get the metadataUri
      const tile = userTiles.find(t => t.tileId.toString() === tileId);
      
      if (tile && tile.metadataUri) {
        console.log(`Found metadataUri for tile ${tileId}:`, tile.metadataUri);
        
        // Convert IPFS URI to HTTP gateway
        const ipfsHash = tile.metadataUri.replace('ipfs://', '');
        const metadataUrl = `https://gateway.lighthouse.storage/ipfs/${ipfsHash}`;
        
        console.log(`Fetching metadata from: ${metadataUrl}`);
        const response = await fetch(metadataUrl);
        
        if (response.ok) {
          const metadata = await response.json();
          console.log(`Metadata for tile ${tileId}:`, metadata);
          
          // Extract image CID from metadata
          const imageCID = metadata.image ? metadata.image.replace('ipfs://', '') : null;
          
          const data = {
            name: metadata.name || `Tile #${tileId}`,
            imageCID: imageCID,
            description: metadata.description || `Tile ${tileId} metadata`,
            ...metadata
          };
          
          console.log('Metadata loaded for tile', tileId, ':', data);
          setTileMetadata(prev => ({ ...prev, [tileId]: data }));
          return data;
        } else {
          console.error(`Failed to fetch metadata from ${metadataUrl}:`, response.status);
        }
      } else {
        console.log(`No metadataUri found for tile ${tileId}`);
      }
      
      // Fallback metadata
      const fallbackData = {
        name: `Tile #${tileId}`,
        imageCID: null,
        description: `Tile ${tileId} metadata`,
        error: 'No metadata URI found'
      };
      
      setTileMetadata(prev => ({ ...prev, [tileId]: fallbackData }));
      return fallbackData;
    } catch (error) {
      console.error('Error loading tile metadata:', error);
      
      // Fallback metadata on error
      const errorData = {
        name: `Tile #${tileId}`,
        imageCID: null,
        description: `Tile ${tileId} metadata`,
        error: 'Failed to load metadata'
      };
      
      setTileMetadata(prev => ({ ...prev, [tileId]: errorData }));
      return errorData;
    }
  };

  // Load metadata for all tiles when they change
  useEffect(() => {
    const loadAllMetadata = async () => {
      const allTiles = [
        ...activeSaleListings.map((listing: any) => listing.tileId),
        ...activeRentalListings.map((listing: any) => listing.tileId),
        ...userTiles.map((tile: any) => tile.tileId)
      ];
      
      console.log('Loading metadata for tiles:', allTiles);
      
      for (const tileId of allTiles) {
        await loadTileMetadata(tileId.toString());
      }
    };
    
    if (!loading) {
      loadAllMetadata();
    }
  }, [activeSaleListings, activeRentalListings, userTiles, loading]);

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
                  Springfield
                </span>
                <span className="text-sm font-bold text-yellow-300 sm:hidden">
                  Springfield
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
              <a href="/marketplace" className="text-green-400 font-medium flex items-center gap-2">
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
              <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
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
               <span className="text-yellow-300">Springfield</span> Marketplace
             </motion.h1>
             <motion.p
               className="text-xl text-white mb-6"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.2 }}
             >
               Professional tile trading platform for the Springfield ecosystem
             </motion.p>
           </div>

           {/* Info Banner */}
           <motion.div
             className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-400/30 rounded-lg p-4 mb-6"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.3 }}
           >
             <div className="flex items-center gap-3">
               <Info className="w-5 h-5 text-blue-300" />
               <div>
                 <h3 className="font-bold text-white mb-1">Payment Methods</h3>
                 <p className="text-gray-300 text-sm">
                   <span className="text-green-400 font-medium">SPRFD Token:</span> Springfield's native utility token for transactions
                   <br />
                                       <span className="text-yellow-400 font-medium">PEPU (Native):</span> Pepe Unchained Native cryptocurrency for gas and payments
                 </p>
               </div>
             </div>
           </motion.div>

           {/* Balances */}
           <motion.div
             className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.4 }}
           >
             <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-400/30 rounded-lg p-6 shadow-xl">
               <div className="flex items-center gap-3 mb-3">
                 <Coins className="w-6 h-6 text-green-400" />
                 <h3 className="text-lg font-bold text-white">SPRFD Token Balance</h3>
               </div>
                               <p className="text-2xl font-bold text-green-400 mb-2">
                  {Number(sprfdBalance) > 999 ? `${(Number(sprfdBalance) / 1000).toFixed(2)}K` : Number(sprfdBalance).toFixed(4)} SPRFD
                </p>
               <p className="text-gray-300 text-sm">Springfield's utility token for marketplace transactions</p>
             </div>
             
             <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-400/30 rounded-lg p-6 shadow-xl">
               <div className="flex items-center gap-3 mb-3">
                 <DollarSign className="w-6 h-6 text-yellow-400" />
                 <h3 className="text-lg font-bold text-white">PEPU Balance</h3>
               </div>
                               <p className="text-2xl font-bold text-yellow-400 mb-2">
                  {Number(nativeBalance) > 999 ? `${(Number(nativeBalance) / 1000).toFixed(2)}K` : Number(nativeBalance).toFixed(4)} PEPU
                </p>
                               <p className="text-gray-300 text-sm">Pepe Unchained Native cryptocurrency</p>
             </div>
           </motion.div>

           {/* Navigation Tabs */}
           <motion.div
             className="flex flex-wrap gap-3 mb-8"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.5 }}
           >
             <button
               onClick={() => setActiveTab('browse')}
               className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                 activeTab === 'browse'
                   ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg scale-105'
                   : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'
               }`}
             >
               <Package className="w-5 h-5" />
               Browse Marketplace
             </button>
             <button
               onClick={() => setActiveTab('my-tiles')}
               className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                 activeTab === 'my-tiles'
                   ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg scale-105'
                   : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'
               }`}
             >
               <Map className="w-5 h-5" />
               My Tiles
             </button>
             <button
               onClick={() => setActiveTab('my-listings')}
               className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                 activeTab === 'my-listings'
                   ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg scale-105'
                   : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'
               }`}
             >
               <Settings className="w-5 h-5" />
               My Listings
             </button>
           </motion.div>

                       {/* Tab Content */}
            {activeTab === 'browse' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <div className="space-y-8">
                  {/* Sale Listings */}
                  <div className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-400/20 rounded-xl p-8 shadow-xl">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="bg-green-500/20 p-3 rounded-lg">
                        <Tag className="w-8 h-8 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Tiles for Sale</h3>
                        <p className="text-gray-300">Purchase tiles directly from other users</p>
                      </div>
                    </div>
                    
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
                        <p className="text-gray-300 mt-4 text-lg">Loading marketplace listings...</p>
                      </div>
                    ) : activeSaleListings.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                         {activeSaleListings.map((listing) => {
                          const metadata = tileMetadata[listing.tileId.toString()];
                          console.log('Rendering sale listing for tile', listing.tileId, 'with metadata:', metadata);
                          return (
                             <div key={Number(listing.tileId)} className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-green-400/30 transition-all duration-300 hover:scale-105 group">
                               <div className="flex justify-between items-start mb-4">
                                 <div className="bg-green-500/20 p-2 rounded-lg">
                                   <Grid className="w-6 h-6 text-green-400" />
                                 </div>
                                 <button
                                   onClick={() => {
                                     setSelectedTile({ ...listing, type: 'sale' });
                                     setShowTileModal(true);
                                   }}
                                   className="text-gray-400 hover:text-white transition-colors"
                                 >
                                   <Eye className="w-5 h-5" />
                                 </button>
                               </div>
                               
                               {/* Tile Image */}
                               {metadata?.imageCID && (
                                 <div className="flex justify-center mb-4">
                                   <img 
                                     src={`https://gateway.lighthouse.storage/ipfs/${metadata.imageCID}`} 
                                     alt={metadata?.name || `Tile ${listing.tileId}`}
                                     className="w-20 h-20 object-contain rounded-lg border border-white/20 bg-white/10"
                                   />
                                 </div>
                               )}
                               
                               <h4 className="text-xl font-bold text-white mb-2 text-center">
                                 {metadata?.name || `Tile #${Number(listing.tileId)}`}
                               </h4>
                            
                            <div className="space-y-3 mb-6">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-300 text-sm">
                                  Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Coins className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-300 text-sm">
                                  Payment: {listing.isNativePayment ? 'PEPU (Native)' : 'SPRFD Token'}
                                </span>
                              </div>
                              
                              <div className="bg-green-500/20 p-3 rounded-lg">
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-green-400">
                                    {formatEther(listing.price)}
                                  </p>
                                  <p className="text-green-300 text-sm">
                                    {listing.isNativePayment ? 'PEPU' : 'SPRFD'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                                                         <button
                               onClick={() => buyListedTileAction(Number(listing.tileId), formatEther(listing.price), listing.isNativePayment)}
                               className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:scale-105"
                             >
                               Purchase Tile
                             </button>
                           </div>
                         );
                       })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-green-500/20 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                          <Tag className="w-10 h-10 text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Tiles Available</h3>
                        <p className="text-gray-300">No tiles are currently listed for sale</p>
                      </div>
                    )}
                  </div>

                  {/* Rental Listings */}
                  <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-400/20 rounded-xl p-8 shadow-xl">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="bg-blue-500/20 p-3 rounded-lg">
                        <Clock className="w-8 h-8 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Tiles for Rent</h3>
                        <p className="text-gray-300">Rent tiles for temporary use</p>
                      </div>
                    </div>
                    
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
                        <p className="text-gray-300 mt-4 text-lg">Loading rental listings...</p>
                      </div>
                    ) : activeRentalListings.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                 {activeRentalListings.map((listing) => {
                           const metadata = tileMetadata[listing.tileId.toString()];
                           return (
                             <div key={Number(listing.tileId)} className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-blue-400/30 transition-all duration-300 hover:scale-105 group">
                               <div className="flex justify-between items-start mb-4">
                                 <div className="bg-blue-500/20 p-2 rounded-lg">
                                   <Grid className="w-6 h-6 text-blue-400" />
                                 </div>
                                 <button
                                   onClick={() => {
                                     setSelectedTile({ ...listing, type: 'rental' });
                                     setShowTileModal(true);
                                   }}
                                   className="text-gray-400 hover:text-white transition-colors"
                                 >
                                   <Eye className="w-5 h-5" />
                                 </button>
                               </div>
                               
                               {/* Tile Image */}
                               {metadata?.imageCID && (
                                 <div className="flex justify-center mb-4">
                                   <img 
                                     src={`https://gateway.lighthouse.storage/ipfs/${metadata.imageCID}`} 
                                     alt={metadata?.name || `Tile ${listing.tileId}`}
                                     className="w-20 h-20 object-contain rounded-lg border border-white/20 bg-white/10"
                                   />
                                 </div>
                               )}
                               
                               <h4 className="text-xl font-bold text-white mb-2 text-center">
                                 {metadata?.name || `Tile #${Number(listing.tileId)}`}
                               </h4>
                            
                            <div className="space-y-3 mb-6">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-300 text-sm">
                                  Owner: {listing.owner.slice(0, 6)}...{listing.owner.slice(-4)}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Coins className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-300 text-sm">
                                  Payment: {listing.isNativePayment ? 'PEPU (Native)' : 'SPRFD Token'}
                                </span>
                              </div>
                              
                              <div className="bg-blue-500/20 p-3 rounded-lg">
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-blue-400">
                                    {formatEther(listing.pricePerDay)}
                                  </p>
                                  <p className="text-blue-300 text-sm">
                                    {listing.isNativePayment ? 'PEPU' : 'SPRFD'} / day
                                  </p>
                                </div>
                              </div>
                              
                              {listing.currentRenter !== '0x0000000000000000000000000000000000000000' && (
                                <div className="bg-red-500/20 p-2 rounded-lg text-center">
                                  <p className="text-red-400 text-sm font-medium">Currently Rented</p>
                                </div>
                              )}
                            </div>
                            
                            {listing.currentRenter === '0x0000000000000000000000000000000000000000' ? (
                              <button
                                onClick={() => rentTileAction(Number(listing.tileId), 1)}
                                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:scale-105"
                              >
                                Rent Tile
                              </button>
                            ) : (
                              <button disabled className="w-full bg-gray-500 text-gray-300 py-3 px-4 rounded-lg font-semibold cursor-not-allowed">
                                Currently Rented
                              </button>
                                                         )}
                           </div>
                         );
                       })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-blue-500/20 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                          <Clock className="w-10 h-10 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Rentals Available</h3>
                        <p className="text-gray-300">No tiles are currently available for rent</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

           {activeTab === 'my-tiles' && (
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.6 }}
             >
               <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 shadow-xl">
                 <div className="flex items-center gap-3 mb-6">
                   <Map className="w-6 h-6 text-yellow-300" />
                   <h3 className="text-xl font-bold text-white">My Tiles</h3>
                 </div>
                 
                 {loading ? (
                   <div className="text-center py-8">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-300 mx-auto"></div>
                     <p className="text-gray-300 mt-2">Loading your tiles...</p>
                   </div>
                 ) : userTiles.length > 0 ? (
                                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {userTiles.map((tile) => {
                        const metadata = tileMetadata[tile.tileId.toString()];
                        return (
                          <div key={Number(tile.tileId)} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors">
                            {/* Tile Image */}
                            {metadata?.imageCID && (
                              <div className="flex justify-center mb-3">
                                <img 
                                  src={`https://gateway.lighthouse.storage/ipfs/${metadata.imageCID}`} 
                                  alt={metadata?.name || `Tile ${tile.tileId}`}
                                  className="w-16 h-16 object-contain rounded-lg border border-white/20 bg-white/10"
                                />
                              </div>
                            )}
                            
                            <div className="text-center mb-4">
                              <p className="font-bold text-white text-lg">{metadata?.name || `Tile #${Number(tile.tileId)}`}</p>
                              <p className="text-gray-300 text-sm">Payment: {tile.isNativePayment ? 'PEPU' : 'SPRFD'}</p>
                            </div>
                         <div className="space-y-2">
                                                       <button
                              onClick={() => {
                                setSelectedTileForAction(tile);
                                setShowSaleModal(true);
                              }}
                              className="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded font-medium transition-colors"
                            >
                              List for Sale
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTileForAction(tile);
                                setShowRentModal(true);
                              }}
                              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded font-medium transition-colors"
                            >
                              List for Rent
                            </button>
                                                   </div>
                        </div>
                      );
                    })}
                   </div>
                 ) : (
                   <div className="text-center py-8">
                     <Map className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                     <p className="text-gray-300 text-lg">You don't own any tiles yet</p>
                     <p className="text-gray-400 mt-2">Visit the Grid to purchase tiles</p>
                   </div>
                 )}
               </div>
             </motion.div>
           )}

           {activeTab === 'my-listings' && (
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.6 }}
             >
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* My Sale Listings */}
                 <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 shadow-xl">
                   <div className="flex items-center gap-3 mb-6">
                     <Tag className="w-6 h-6 text-yellow-300" />
                     <h3 className="text-xl font-bold text-white">My Sale Listings</h3>
                   </div>
                   
                   <div className="text-center py-8">
                     <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                     <p className="text-gray-300">No active sale listings</p>
                     <p className="text-gray-400 text-sm mt-1">List your tiles for sale to see them here</p>
                   </div>
                 </div>

                 {/* My Rental Listings */}
                 <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 shadow-xl">
                   <div className="flex items-center gap-3 mb-6">
                     <Clock className="w-6 h-6 text-yellow-300" />
                     <h3 className="text-xl font-bold text-white">My Rental Listings</h3>
                   </div>
                   
                   <div className="text-center py-8">
                     <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                     <p className="text-gray-300">No active rental listings</p>
                     <p className="text-gray-400 text-sm mt-1">List your tiles for rent to see them here</p>
                   </div>
                 </div>
               </div>
             </motion.div>
           )}
                 </div>
       </div>

       {/* Tile Detail Modal */}
       {showTileModal && selectedTile && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.9 }}
             className="bg-gradient-to-br from-blue-900/95 to-purple-900/95 border border-white/20 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
           >
             <div className="flex justify-between items-start mb-6">
               <div className="flex items-center gap-4">
                 <div className={`p-3 rounded-xl ${selectedTile.type === 'sale' ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
                   {selectedTile.type === 'sale' ? (
                     <Tag className="w-8 h-8 text-green-400" />
                   ) : (
                     <Clock className="w-8 h-8 text-blue-400" />
                   )}
                 </div>
                 <div>
                   <h2 className="text-3xl font-bold text-white">Tile #{Number(selectedTile.tileId)}</h2>
                   <p className="text-gray-300">
                     {selectedTile.type === 'sale' ? 'For Sale' : 'For Rent'}
                   </p>
                 </div>
               </div>
               <button
                 onClick={() => setShowTileModal(false)}
                 className="text-gray-400 hover:text-white transition-colors p-2"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>

                           <div className="space-y-6">
                {/* Tile Image and Name */}
                {selectedTile && tileMetadata[selectedTile.tileId.toString()]?.imageCID && (
                  <div className="bg-white/5 rounded-xl p-6 text-center">
                    <img 
                      src={`https://gateway.lighthouse.storage/ipfs/${tileMetadata[selectedTile.tileId.toString()].imageCID}`} 
                      alt={tileMetadata[selectedTile.tileId.toString()]?.name || `Tile ${selectedTile.tileId}`}
                      className="w-32 h-32 object-contain rounded-lg border border-white/20 bg-white/10 mx-auto mb-4"
                    />
                    <h3 className="text-2xl font-bold text-white">
                      {tileMetadata[selectedTile.tileId.toString()]?.name || `Tile #${Number(selectedTile.tileId)}`}
                    </h3>
                  </div>
                )}

                {/* Tile Information */}
                <div className="bg-white/5 rounded-xl p-6">
                 <h3 className="text-xl font-bold text-white mb-4">Tile Information</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="flex items-center gap-3">
                     <Grid className="w-5 h-5 text-gray-400" />
                     <div>
                       <p className="text-gray-300 text-sm">Tile ID</p>
                       <p className="text-white font-semibold">#{Number(selectedTile.tileId)}</p>
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-3">
                     <User className="w-5 h-5 text-gray-400" />
                     <div>
                       <p className="text-gray-300 text-sm">
                         {selectedTile.type === 'sale' ? 'Seller' : 'Owner'}
                       </p>
                       <p className="text-white font-semibold">
                         {selectedTile.type === 'sale' ? selectedTile.seller : selectedTile.owner}
                       </p>
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-3">
                     <Coins className="w-5 h-5 text-gray-400" />
                     <div>
                       <p className="text-gray-300 text-sm">Payment Method</p>
                       <p className="text-white font-semibold">
                         {selectedTile.isNativePayment ? 'PEPU (Native)' : 'SPRFD Token'}
                       </p>
                     </div>
                   </div>
                   
                   {selectedTile.type === 'rental' && (
                     <div className="flex items-center gap-3">
                       <Calendar className="w-5 h-5 text-gray-400" />
                       <div>
                         <p className="text-gray-300 text-sm">Status</p>
                         <p className={`font-semibold ${selectedTile.currentRenter !== '0x0000000000000000000000000000000000000000' ? 'text-red-400' : 'text-green-400'}`}>
                           {selectedTile.currentRenter !== '0x0000000000000000000000000000000000000000' ? 'Currently Rented' : 'Available'}
                         </p>
                       </div>
                     </div>
                   )}
                 </div>
               </div>

               {/* Pricing */}
               <div className="bg-white/5 rounded-xl p-6">
                 <h3 className="text-xl font-bold text-white mb-4">Pricing Details</h3>
                 <div className="text-center">
                   <div className={`inline-block p-6 rounded-xl ${selectedTile.type === 'sale' ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
                     <p className="text-4xl font-bold text-white mb-2">
                       {selectedTile.type === 'sale' 
                         ? formatEther(selectedTile.price)
                         : formatEther(selectedTile.pricePerDay)
                       }
                     </p>
                     <p className="text-xl text-gray-300">
                       {selectedTile.isNativePayment ? 'PEPU' : 'SPRFD'}
                       {selectedTile.type === 'rental' && ' / day'}
                     </p>
                   </div>
                 </div>
               </div>

               {/* Payment Method Explanation */}
               <div className="bg-white/5 rounded-xl p-6">
                 <h3 className="text-xl font-bold text-white mb-4">Payment Method</h3>
                 <div className="space-y-3">
                   {selectedTile.isNativePayment ? (
                     <div className="flex items-start gap-3">
                       <DollarSign className="w-5 h-5 text-yellow-400 mt-1" />
                       <div>
                         <p className="text-white font-semibold">PEPU (Native)</p>
                                                   <p className="text-gray-300 text-sm">
                            Pepe Unchained Native cryptocurrency. Used for gas fees and direct payments.
                            This is the blockchain's primary token for transactions.
                          </p>
                       </div>
                     </div>
                   ) : (
                     <div className="flex items-start gap-3">
                       <Coins className="w-5 h-5 text-green-400 mt-1" />
                       <div>
                         <p className="text-white font-semibold">SPRFD Token</p>
                         <p className="text-gray-300 text-sm">
                           Springfield's utility token. Used for marketplace transactions and ecosystem activities.
                           This is the project's dedicated token for trading and services.
                         </p>
                       </div>
                     </div>
                   )}
                 </div>
               </div>

               {/* Action Buttons */}
               <div className="flex gap-4">
                 {selectedTile.type === 'sale' ? (
                   <button
                     onClick={() => {
                       buyListedTileAction(Number(selectedTile.tileId), formatEther(selectedTile.price), selectedTile.isNativePayment);
                       setShowTileModal(false);
                     }}
                     className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
                   >
                     Purchase Tile
                   </button>
                 ) : (
                   selectedTile.currentRenter === '0x0000000000000000000000000000000000000000' && (
                     <button
                       onClick={() => {
                         rentTileAction(Number(selectedTile.tileId), 1);
                         setShowTileModal(false);
                       }}
                       className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
                     >
                       Rent Tile
                     </button>
                   )
                 )}
                 
                 <button
                   onClick={() => setShowTileModal(false)}
                   className="px-6 py-4 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-colors"
                 >
                   Close
                 </button>
               </div>
             </div>
           </motion.div>
         </div>
       )}

       {/* Sale Listing Modal */}
       {showSaleModal && selectedTileForAction && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-gradient-to-br from-blue-900/95 to-purple-900/95 border border-white/20 rounded-2xl p-8 max-w-md w-full"
           >
             <h2 className="text-2xl font-bold text-white mb-6">List Tile for Sale</h2>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-white text-sm font-medium mb-2">Price</label>
                 <input
                   type="number"
                   step="0.001"
                   value={salePrice}
                   onChange={(e) => setSalePrice(e.target.value)}
                   className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                   placeholder="0.1"
                 />
               </div>
               
               <div>
                 <label className="block text-white text-sm font-medium mb-2">Payment Method</label>
                 <div className="flex gap-4">
                   <label className="flex items-center">
                     <input
                       type="radio"
                       checked={!isNativePayment}
                       onChange={() => setIsNativePayment(false)}
                       className="mr-2"
                     />
                     <span className="text-white">SPRFD Token</span>
                   </label>
                   <label className="flex items-center">
                     <span className="text-white">PEPU (Native)</span>
                   </label>
                 </div>
               </div>
               
               <div className="flex gap-4 mt-6">
                 <button
                   onClick={() => {
                     listTileForSaleAction(Number(selectedTileForAction.tileId), salePrice, isNativePayment);
                     setShowSaleModal(false);
                     setSalePrice('');
                   }}
                   className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium"
                 >
                   List for Sale
                 </button>
                 <button
                   onClick={() => {
                     setShowSaleModal(false);
                     setSalePrice('');
                   }}
                   className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           </motion.div>
         </div>
       )}

       {/* Rent Listing Modal */}
       {showRentModal && selectedTileForAction && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-gradient-to-br from-blue-900/95 to-purple-900/95 border border-white/20 rounded-2xl p-8 max-w-md w-full"
           >
             <h2 className="text-2xl font-bold text-white mb-6">List Tile for Rent</h2>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-white text-sm font-medium mb-2">Price per Day</label>
                 <input
                   type="number"
                   step="0.001"
                   value={rentPrice}
                   onChange={(e) => setRentPrice(e.target.value)}
                   className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                   placeholder="0.01"
                 />
               </div>
               
               <div>
                 <label className="block text-white text-sm font-medium mb-2">Payment Method</label>
                 <div className="flex gap-4">
                   <label className="flex items-center">
                     <input
                       type="radio"
                       checked={!isNativePayment}
                       onChange={() => setIsNativePayment(false)}
                       className="mr-2"
                     />
                     <span className="text-white">SPRFD Token</span>
                   </label>
                   <label className="flex items-center">
                     <input
                       type="radio"
                       checked={isNativePayment}
                       onChange={() => setIsNativePayment(true)}
                       className="mr-2"
                     />
                     <span className="text-white">PEPU (Native)</span>
                   </label>
                 </div>
               </div>
               
               <div className="flex gap-4 mt-6">
                 <button
                   onClick={() => {
                     listTileForRentAction(Number(selectedTileForAction.tileId), rentPrice, isNativePayment);
                     setShowRentModal(false);
                     setRentPrice('');
                   }}
                   className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium"
                 >
                   List for Rent
                 </button>
                 <button
                   onClick={() => {
                     setShowRentModal(false);
                     setRentPrice('');
                   }}
                   className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           </motion.div>
         </div>
       )}
     </div>
   );
 } 