"use client";

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useMarketplace } from '../../hooks/useMarketplace';
import BuyModal from '../components/BuyModal';
import TileDetailsModal from '../components/TileDetailsModal';
import OwnedTileCard from '../../components/OwnedTileCard';
import MarketplaceListingCard from '../../components/MarketplaceListingCard';
import { motion } from 'framer-motion';
import { RefreshCw, Plus, ShoppingCart, Home, Users, Map, Grid3X3, Wallet, Tag, Clock, DollarSign, Package, User, Settings, Info, Grid, Calendar, Coins, Eye, X, Store, ShoppingBag, Users as UsersIcon, Coins as CoinsIcon, Calendar as CalendarIcon } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther } from 'viem';

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<'browse' | 'my-tiles' | 'my-listings'>('browse');
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showRentModal, setShowRentModal] = useState(false);
  const [showTileModal, setShowTileModal] = useState(false);
  const [selectedTileForAction, setSelectedTileForAction] = useState<any>(null);
  const [selectedTile, setSelectedTile] = useState<any>(null);
  const [salePrice, setSalePrice] = useState('');
  const [rentPrice, setRentPrice] = useState('');
  const [rentDuration, setRentDuration] = useState('1');
  const [isNativePayment, setIsNativePayment] = useState(true);
  const [showComingSoon, setShowComingSoon] = useState(true);
  
  const {
    activeSaleListings,
    activeRentalListings,
    userSaleListings,
    userRentalListings,
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
    fetchUserTiles,
    fetchUserListings,
    fetchMarketplaceData,
  } = useMarketplace();

  // Debug logging
  console.log('Marketplace page state:', {
    activeTab,
    activeSaleListings: activeSaleListings.length,
    activeRentalListings: activeRentalListings.length,
    userSaleListings: userSaleListings.length,
    userRentalListings: userRentalListings.length,
    userTiles: userTiles.length,
    loading
  });

  // Effect to fetch appropriate data based on active tab
  useEffect(() => {
    console.log('Tab changed to:', activeTab);
    if (activeTab === 'browse') {
      console.log('Fetching marketplace data...');
      fetchMarketplaceData();
    } else if (activeTab === 'my-listings') {
      console.log('Fetching user listings...');
      fetchUserListings();
    }
  }, [activeTab, fetchMarketplaceData, fetchUserListings]);

  return (
    <div className="min-h-screen bg-blue-900 text-white">
      {/* Coming Soon Modal */}
      {showComingSoon && (
        <>
                     {/* Transparent overlay with light blur that blocks interactions */}
           <div 
             className="fixed top-16 inset-x-0 bottom-0 z-[9998] bg-transparent backdrop-blur-sm pointer-events-auto" 
             onMouseDown={(e) => e.preventDefault()}
             onClick={(e) => e.preventDefault()}
             onTouchStart={(e) => e.preventDefault()}
             onWheel={(e) => e.preventDefault()}
             onScroll={(e) => e.preventDefault()}
           ></div>
          
          {/* Modal positioned above */}
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-auto">
            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative bg-gradient-to-br from-blue-800 to-blue-900 border-2 border-yellow-400 rounded-2xl p-6 w-80 shadow-2xl"
            >
              {/* Header */}
              <div className="text-center mb-4">
                <div className="flex justify-center mb-2">
                  <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                    <Store className="w-6 h-6 text-blue-900" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-yellow-400 mb-1">
                  Springfield Marketplace
                </h1>
                <p className="text-lg text-yellow-300 font-semibold">
                  Coming Soon
                </p>
              </div>

              {/* Features list */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-white text-center mb-3">
                  What you'll be able to do:
                </h2>
                
                <div className="space-y-2">
                  {/* Buy Tiles */}
                  <div className="flex items-center space-x-3 p-2 bg-blue-700 bg-opacity-50 rounded-lg border border-blue-600">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <ShoppingBag className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-yellow-300 text-sm">Buy Tiles</h3>
                      <p className="text-xs text-gray-300">Purchase tiles with PEPU or SPRFD tokens</p>
                    </div>
                  </div>

                  {/* Rent Tiles */}
                  <div className="flex items-center space-x-3 p-2 bg-blue-700 bg-opacity-50 rounded-lg border border-blue-600">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <CalendarIcon className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-yellow-300 text-sm">Rent Tiles</h3>
                      <p className="text-xs text-gray-300">Rent tiles for temporary use</p>
                    </div>
                  </div>

                  {/* List for Sale */}
                  <div className="flex items-center space-x-3 p-2 bg-blue-700 bg-opacity-50 rounded-lg border border-blue-600">
                    <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <Tag className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-yellow-300 text-sm">List for Sale</h3>
                      <p className="text-xs text-gray-300">Sell your tiles to other users</p>
                    </div>
                  </div>

                  {/* List for Rent */}
                  <div className="flex items-center space-x-3 p-2 bg-blue-700 bg-opacity-50 rounded-lg border border-blue-600">
                    <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                      <Clock className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-yellow-300 text-sm">List for Rent</h3>
                      <p className="text-xs text-gray-300">Rent out tiles for passive income</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center mt-4 pt-3 border-t border-blue-600">
                <p className="text-xs text-gray-400">
                  Get ready to trade and explore!
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}

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
              <a href="/refund" className="text-white hover:text-green-400 font-medium transition-colors flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Refunds
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

           {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap gap-2 sm:gap-4 mb-8"
          >
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex items-center gap-1 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-300 text-xs sm:text-sm ${
                activeTab === 'browse'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg scale-105'
                  : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'
              }`}
            >
              <Package className="w-3 h-3 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Browse Marketplace</span>
              <span className="sm:hidden">Browse</span>
            </button>
            <button
              onClick={() => setActiveTab('my-tiles')}
              className={`flex items-center gap-1 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-300 text-xs sm:text-sm ${
                activeTab === 'my-tiles'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg scale-105'
                  : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'
              }`}
            >
              <Map className="w-3 h-3 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">My Tiles</span>
              <span className="sm:hidden">Tiles</span>
            </button>
            <button
              onClick={() => setActiveTab('my-listings')}
              className={`flex items-center gap-1 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-300 text-xs sm:text-sm ${
                activeTab === 'my-listings'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg scale-105'
                  : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'
              }`}
            >
              <Settings className="w-3 h-3 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">My Listings</span>
              <span className="sm:hidden">Listings</span>
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
                  <div className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-400/20 rounded-xl p-4 sm:p-6 lg:p-8 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-8 gap-4">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <div className="bg-green-500/20 p-2 sm:p-3 rounded-lg">
                          <Tag className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-2xl font-bold text-white">Tiles for Sale</h3>
                          <p className="text-gray-300 text-sm sm:text-base">Purchase tiles directly from other users</p>
                        </div>
                      </div>
                      <button
                        onClick={fetchMarketplaceData}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-semibold rounded-lg transition-colors text-sm"
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                        <span className="sm:hidden">↻</span>
                      </button>
                    </div>
                    
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
                        <p className="text-gray-300 mt-4 text-lg">Loading marketplace listings...</p>
                      </div>
                    ) : activeSaleListings.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {activeSaleListings.map((listing) => (
                            <MarketplaceListingCard
                              key={Number(listing.tileId)}
                              listing={listing}
                              type="sale"
                              onBuy={(tileId, price, isNativePayment) => {
                                buyListedTileAction(tileId, price, isNativePayment);
                              }}
                            />
                          ))}
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
                  <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-400/20 rounded-xl p-4 sm:p-6 lg:p-8 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-8 gap-4">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <div className="bg-blue-500/20 p-2 sm:p-3 rounded-lg">
                          <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-2xl font-bold text-white">Tiles for Rent</h3>
                          <p className="text-gray-300 text-sm sm:text-base">Rent tiles for temporary use</p>
                        </div>
                      </div>
                      <button
                        onClick={fetchMarketplaceData}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white font-semibold rounded-lg transition-colors text-sm"
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                        <span className="sm:hidden">↻</span>
                      </button>
                    </div>
                    
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
                        <p className="text-gray-300 mt-4 text-lg">Loading rental listings...</p>
                      </div>
                    ) : activeRentalListings.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {activeRentalListings.map((listing) => (
                            <MarketplaceListingCard
                              key={Number(listing.tileId)}
                              listing={listing}
                              type="rental"
                              onRent={(tileId, duration) => {
                                rentTileAction(tileId, duration);
                              }}
                            />
                          ))}
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
                 <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3">
                     <Map className="w-6 h-6 text-yellow-300" />
                     <h3 className="text-xl font-bold text-white">My Tiles</h3>
                   </div>
                   <button
                     onClick={fetchUserTiles}
                     disabled={loading}
                     className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-500 text-black font-semibold rounded-lg transition-colors"
                   >
                     <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                     Refresh
                   </button>
                 </div>
                 
                 {loading ? (
                   <div className="text-center py-8">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-300 mx-auto"></div>
                     <p className="text-gray-300 mt-2">Loading your tiles...</p>
                   </div>
                 ) : userTiles.length > 0 ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {userTiles.map((tile) => {
                       return (
                         <OwnedTileCard
                           key={Number(tile.tileId)}
                           tile={tile}
                           onListForSale={(tileId) => {
                             setSelectedTileForAction(tile);
                             setShowSaleModal(true);
                           }}
                           onListForRent={(tileId) => {
                             setSelectedTileForAction(tile);
                             setShowRentModal(true);
                           }}
                           onCancelSale={(tileId) => {
                             cancelSaleListingAction(tileId);
                           }}
                           onCancelRent={(tileId) => {
                             cancelRentalListingAction(tileId);
                           }}
                         />
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
                   <div className="flex items-center justify-between mb-6">
                     <div className="flex items-center gap-3">
                       <Tag className="w-6 h-6 text-yellow-300" />
                       <h3 className="text-xl font-bold text-white">My Sale Listings</h3>
                     </div>
                     <button
                       onClick={fetchUserListings}
                       disabled={loading}
                       className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-500 text-black font-semibold rounded-lg transition-colors"
                     >
                       <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                       Refresh
                     </button>
                   </div>
                   
                   {loading ? (
                     <div className="text-center py-8">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-300 mx-auto"></div>
                       <p className="text-gray-300 mt-2">Loading your sale listings...</p>
                     </div>
                                       ) : userSaleListings.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userSaleListings.map((listing) => (
                         <MarketplaceListingCard
                           key={Number(listing.tileId)}
                           listing={listing}
                           type="sale"
                           onCancel={cancelSaleListingAction}
                           isOwnListing={true}
                         />
                       ))}
                     </div>
                   ) : (
                     <div className="text-center py-8">
                       <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                       <p className="text-gray-300">No active sale listings</p>
                       <p className="text-gray-400 text-sm mt-1">List your tiles for sale to see them here</p>
                     </div>
                   )}
                 </div>

                 {/* My Rental Listings */}
                 <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 shadow-xl">
                   <div className="flex items-center justify-between mb-6">
                     <div className="flex items-center gap-3">
                       <Clock className="w-6 h-6 text-yellow-300" />
                       <h3 className="text-xl font-bold text-white">My Rental Listings</h3>
                     </div>
                     <button
                       onClick={fetchUserListings}
                       disabled={loading}
                       className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-500 text-black font-semibold rounded-lg transition-colors"
                     >
                       <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                       Refresh
                     </button>
                   </div>
                   
                   {loading ? (
                     <div className="text-center py-8">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-300 mx-auto"></div>
                       <p className="text-gray-300 mt-2">Loading your rental listings...</p>
                     </div>
                                       ) : userRentalListings.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userRentalListings.map((listing) => (
                         <MarketplaceListingCard
                           key={Number(listing.tileId)}
                           listing={listing}
                           type="rental"
                           onCancel={cancelRentalListingAction}
                           isOwnListing={true}
                         />
                       ))}
                     </div>
                   ) : (
                     <div className="text-center py-8">
                       <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                       <p className="text-gray-300">No active rental listings</p>
                       <p className="text-gray-400 text-sm mt-1">List your tiles for rent to see them here</p>
                     </div>
                   )}
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
                  {selectedTile && (
                    <div className="bg-white/5 rounded-xl p-6 text-center">
                      <h3 className="text-2xl font-bold text-white">
                        Tile #{Number(selectedTile.tileId)}
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