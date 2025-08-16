"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useMarketplace } from '../../hooks/useMarketplace';
import OwnedTileCard from '../../components/OwnedTileCard';
import MarketplaceListingCard from '../../components/MarketplaceListingCard';
import EditTileModal from '../components/EditTileModal';
import BulkEditModal from '../components/BulkEditModal';
import BulkListModal from '../components/BulkListModal';
import { motion } from 'framer-motion';
import { 
  RefreshCw, 
  Store, 
  Grid3X3, 
  Wallet, 
  Tag, 
  Clock, 
  DollarSign, 
  X, 
  Menu, 
  Home, 
  ShoppingCart, 
  Coins, 
  CheckCircle2, 
  Edit3 
} from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// Types
interface LoadingStates {
  [key: string]: boolean;
}

interface TileStats {
  ownedTiles: number;
  rentedTiles: number;
  saleListings: number;
  rentalListings: number;
}

interface ListingModalData {
  price: string;
  duration: string;
  isNativePayment: boolean;
}

type TabType = 'browse' | 'my-tiles' | 'my-listings';
type SubTabType = 'sales' | 'rentals';

export default function MarketplacePage() {
  const { address } = useAccount();
  
  // Tab states
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [subTab, setSubTab] = useState<SubTabType>('sales');
  
  // Modal states
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showRentModal, setShowRentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showBulkListModal, setShowBulkListModal] = useState(false);
  const [selectedTileForAction, setSelectedTileForAction] = useState<any>(null);
  const [selectedTilesForBulkEdit, setSelectedTilesForBulkEdit] = useState<Set<number>>(new Set());
  
  // Form states
  const [listingData, setListingData] = useState<ListingModalData>({
    price: '',
    duration: '1',
    isNativePayment: true
  });
  
  // UI states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({});
  
  const {
    activeSaleListings,
    activeRentalListings,
    userSaleListings,
    userRentalListings,
    userTiles,
    loading,
    springBalance,
    nativeBalance,
    listTileForSaleAction,
    listTileForRentAction,
    buyListedTileAction,
    rentTileAction,
    cancelSaleListingAction,
    cancelRentalListingAction,
    cleanupExpiredRentalAction,
    fetchUserTiles,
    fetchUserListings,
    fetchMarketplaceData,
  } = useMarketplace();

  // Helper functions
  const setButtonLoading = useCallback((action: string, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [action]: isLoading }));
  }, []);

  const showSuccessMessage = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 5000);
  }, []);

  const resetListingData = useCallback(() => {
    setListingData({
      price: '',
      duration: '1',
      isNativePayment: true
    });
  }, []);

  // Calculate stats
  const stats: TileStats = {
    ownedTiles: userTiles.filter(tile => !tile.isRentedByUser).length,
    rentedTiles: userTiles.filter(tile => tile.isRentedByUser).length,
    saleListings: userSaleListings.length,
    rentalListings: userRentalListings.length
  };

  // Effects
  useEffect(() => {
    switch (activeTab) {
      case 'browse':
        fetchMarketplaceData();
        break;
      case 'my-listings':
        fetchUserListings();
        break;
      case 'my-tiles':
        fetchUserTiles();
        break;
    }
  }, [activeTab, fetchMarketplaceData, fetchUserListings, fetchUserTiles]);

  useEffect(() => {
    if (address) {
      fetchUserTiles();
    }
  }, [address, fetchUserTiles]);

  // Action handlers
  const handleBuyTile = useCallback(async (tileId: number, price: string, isNativePayment: boolean) => {
    const actionKey = `buy_${tileId}`;
    try {
      setButtonLoading(actionKey, true);
      await buyListedTileAction(tileId, price, isNativePayment);
      showSuccessMessage(`Successfully purchased Tile ${tileId}!`);
      fetchMarketplaceData();
    } catch (error) {
      console.error('Failed to buy tile:', error);
    } finally {
      setButtonLoading(actionKey, false);
    }
  }, [buyListedTileAction, setButtonLoading, showSuccessMessage, fetchMarketplaceData]);

  const handleRentTile = useCallback(async (tileId: number) => {
    const actionKey = `rent_${tileId}`;
    try {
      setButtonLoading(actionKey, true);
      await rentTileAction(tileId);
      showSuccessMessage(`Successfully rented Tile ${tileId}!`);
      fetchMarketplaceData();
    } catch (error) {
      console.error('Failed to rent tile:', error);
    } finally {
      setButtonLoading(actionKey, false);
    }
  }, [rentTileAction, setButtonLoading, showSuccessMessage, fetchMarketplaceData]);

  const handleCancelSaleListing = useCallback(async (tileId: number) => {
    const actionKey = `cancelSale_${tileId}`;
    try {
      setButtonLoading(actionKey, true);
      await cancelSaleListingAction(tileId);
      showSuccessMessage(`Canceled sale listing for Tile ${tileId}`);
      fetchUserTiles();
      fetchMarketplaceData();
    } catch (error) {
      console.error('Failed to cancel sale listing:', error);
    } finally {
      setButtonLoading(actionKey, false);
    }
  }, [cancelSaleListingAction, setButtonLoading, showSuccessMessage, fetchUserTiles, fetchMarketplaceData]);

  const handleCancelRentalListing = useCallback(async (tileId: number) => {
    const actionKey = `cancelRent_${tileId}`;
    try {
      setButtonLoading(actionKey, true);
      await cancelRentalListingAction(tileId);
      showSuccessMessage(`Canceled rental listing for Tile ${tileId}`);
      fetchUserTiles();
      fetchMarketplaceData();
    } catch (error) {
      console.error('Failed to cancel rental listing:', error);
    } finally {
      setButtonLoading(actionKey, false);
    }
  }, [cancelRentalListingAction, setButtonLoading, showSuccessMessage, fetchUserTiles, fetchMarketplaceData]);

  const handleReclaimExpiredRental = useCallback(async (tileId: number) => {
    const actionKey = `reclaim_${tileId}`;
    try {
      setButtonLoading(actionKey, true);
      await cleanupExpiredRentalAction(tileId);
      showSuccessMessage(`Reclaimed expired rental for Tile ${tileId}`);
      fetchUserTiles();
      fetchMarketplaceData();
    } catch (error) {
      console.error('Failed to reclaim expired rental:', error);
    } finally {
      setButtonLoading(actionKey, false);
    }
  }, [cleanupExpiredRentalAction, setButtonLoading, showSuccessMessage, fetchUserTiles, fetchMarketplaceData]);

  const handleListForSale = useCallback(async () => {
    if (!selectedTileForAction || !listingData.price) return;
    
    try {
      setButtonLoading('sale', true);
      await listTileForSaleAction(
        Number(selectedTileForAction.tileId), 
        listingData.price, 
        listingData.isNativePayment
      );
      setShowSaleModal(false);
      resetListingData();
      showSuccessMessage(`Listed Tile ${selectedTileForAction.tileId} for sale`);
      fetchUserTiles();
      fetchMarketplaceData();
    } catch (error) {
      console.error('Failed to list tile for sale:', error);
    } finally {
      setButtonLoading('sale', false);
    }
  }, [selectedTileForAction, listingData, listTileForSaleAction, setButtonLoading, showSuccessMessage, fetchUserTiles, fetchMarketplaceData, resetListingData]);

  const handleListForRent = useCallback(async () => {
    if (!selectedTileForAction || !listingData.price) return;
    
    try {
      setButtonLoading('rent', true);
      await listTileForRentAction(
        Number(selectedTileForAction.tileId), 
        listingData.price, 
        listingData.isNativePayment, 
        parseInt(listingData.duration)
      );
      setShowRentModal(false);
      resetListingData();
      showSuccessMessage(`Listed Tile ${selectedTileForAction.tileId} for rent`);
      fetchUserTiles();
      fetchMarketplaceData();
    } catch (error) {
      console.error('Failed to list tile for rent:', error);
    } finally {
      setButtonLoading('rent', false);
    }
  }, [selectedTileForAction, listingData, listTileForRentAction, setButtonLoading, showSuccessMessage, fetchUserTiles, fetchMarketplaceData, resetListingData]);

  // Modal handlers
  const openSaleModal = useCallback((tile: any) => {
    setSelectedTileForAction(tile);
    setShowSaleModal(true);
  }, []);

  const openRentModal = useCallback((tile: any) => {
    setSelectedTileForAction(tile);
    setShowRentModal(true);
  }, []);

  const closeSaleModal = useCallback(() => {
    setShowSaleModal(false);
    resetListingData();
  }, [resetListingData]);

  const closeRentModal = useCallback(() => {
    setShowRentModal(false);
    resetListingData();
  }, [resetListingData]);

  const updateListingData = useCallback((field: keyof ListingModalData, value: string | boolean) => {
    setListingData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Render helpers
  const renderNavigation = () => (
    <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b-2 border-slate-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 border-2 border-slate-700 rounded-lg flex items-center justify-center shadow-lg">
              <Store className="w-5 h-5 text-slate-900" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-emerald-400">Springfield</h1>
              <p className="text-xs text-emerald-300 -mt-1">Marketplace</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <a href="/" className="flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:text-emerald-400 transition-colors">
              <Home className="w-4 h-4" />
              <span className="text-sm font-medium">Home</span>
            </a>
            <a href="/grid" className="flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:text-emerald-400 transition-colors">
              <Grid3X3 className="w-4 h-4" />
              <span className="text-sm font-medium">Grid</span>
            </a>
            <div className="flex items-center gap-2 px-3 py-1.5 text-emerald-400 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm font-bold">Marketplace</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="md:hidden p-2 text-slate-300 hover:text-emerald-400 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t-2 border-slate-700 py-2 bg-slate-800">
            <a href="/" className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-emerald-400 transition-colors border-b border-slate-700">
              <Home className="w-4 h-4" />
              Home
            </a>
            <a href="/grid" className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-emerald-400 transition-colors">
              <Grid3X3 className="w-4 h-4" />
              Grid
            </a>
          </div>
        )}
      </div>
    </nav>
  );

  const renderSuccessMessage = () => (
    successMessage && (
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-600/20 to-green-600/20 border-2 border-emerald-400 rounded-lg p-3 flex items-center gap-3"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <p className="text-emerald-300 text-sm flex-1 font-medium">{successMessage}</p>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    )
  );

  const renderHeader = () => (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-emerald-400 mb-1">Springfield Marketplace</h1>
        <p className="text-slate-300 text-sm">Trade tiles with SPRING or PEPU tokens</p>
      </div>
      
      <div className="flex gap-3">
        <div className="bg-gradient-to-r from-emerald-600/20 to-green-600/20 border-2 border-emerald-400 rounded-lg p-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded border border-slate-700 flex items-center justify-center">
              <Coins className="w-3.5 h-3.5 text-slate-900" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-emerald-300 font-medium">SPRING</p>
              <p className="text-sm font-bold text-emerald-400 truncate">
                {Number(springBalance).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-2 border-amber-400 rounded-lg p-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-400 rounded border border-slate-700 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-slate-900" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-amber-300 font-medium">PEPU</p>
              <p className="text-sm font-bold text-amber-400 truncate">
                {Number(nativeBalance).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabs = () => (
    <div className="flex gap-1 p-1 bg-slate-800/60 border-2 border-slate-700 rounded-lg mb-6">
      <button
        onClick={() => setActiveTab('browse')}
        className={`flex-1 sm:flex-initial sm:px-4 py-2 rounded-md text-sm font-bold transition-all ${
          activeTab === 'browse'
            ? 'bg-emerald-400 text-slate-900 border-2 border-slate-700 shadow-lg'
            : 'text-slate-300 hover:text-emerald-400 hover:bg-slate-700/50'
        }`}
      >
        Browse
      </button>
      <button
        onClick={() => setActiveTab('my-tiles')}
        className={`flex-1 sm:flex-initial sm:px-4 py-2 rounded-md text-sm font-bold transition-all ${
          activeTab === 'my-tiles'
            ? 'bg-emerald-400 text-slate-900 border-2 border-slate-700 shadow-lg'
            : 'text-slate-300 hover:text-emerald-400 hover:bg-slate-700/50'
        }`}
      >
        My Tiles {stats.ownedTiles + stats.rentedTiles > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-slate-600 text-white text-xs rounded-full border border-slate-700">
            {stats.ownedTiles + stats.rentedTiles}
          </span>
        )}
      </button>
      <button
        onClick={() => setActiveTab('my-listings')}
        className={`flex-1 sm:flex-initial sm:px-4 py-2 rounded-md text-sm font-bold transition-all ${
          activeTab === 'my-listings'
            ? 'bg-emerald-400 text-slate-900 border-2 border-slate-700 shadow-lg'
            : 'text-slate-300 hover:text-emerald-400 hover:bg-slate-700/50'
        }`}
      >
        Listings {stats.saleListings + stats.rentalListings > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-emerald-500 text-white text-xs rounded-full border border-slate-700">
            {stats.saleListings + stats.rentalListings}
          </span>
        )}
      </button>
    </div>
  );

  const renderBrowseTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab('sales')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border-2 ${
              subTab === 'sales'
                ? 'bg-emerald-400 text-slate-900 border-slate-700 shadow-lg'
                : 'text-emerald-400 border-emerald-400/50 hover:text-emerald-300 hover:bg-emerald-400/10'
            }`}
          >
            <Tag className="w-4 h-4" />
            For Sale
            <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-xs rounded-full border border-slate-700">
              {activeSaleListings.length}
            </span>
          </button>
          
          <button
            onClick={() => setSubTab('rentals')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border-2 ${
              subTab === 'rentals'
                ? 'bg-emerald-400 text-slate-900 border-slate-700 shadow-lg'
                : 'text-emerald-400 border-emerald-400/50 hover:text-emerald-300 hover:bg-emerald-400/10'
            }`}
          >
            <Clock className="w-4 h-4" />
            For Rent
            <span className="px-1.5 py-0.5 bg-slate-600 text-white text-xs rounded-full border border-slate-700">
              {activeRentalListings.length}
            </span>
          </button>
        </div>
        
        <button
          onClick={fetchMarketplaceData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 border-2 border-emerald-400 text-emerald-400 hover:text-emerald-300 rounded-lg text-sm font-bold transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-400 border-t-transparent"></div>
        </div>
      ) : (
        <div>
          {subTab === 'sales' ? (
            activeSaleListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeSaleListings.map((listing: any) => (
                  <MarketplaceListingCard
                    key={Number(listing.tileId)}
                    listing={listing}
                    type="sale"
                    onBuy={handleBuyTile}
                    isBuying={loadingStates[`buy_${Number(listing.tileId)}`]}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-800/60 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Tag className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-emerald-400 mb-2">No tiles for sale</h3>
                <p className="text-slate-300 text-sm">Check back later or list your own tiles!</p>
              </div>
            )
          ) : (
            activeRentalListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeRentalListings.map((listing: any) => (
                  <MarketplaceListingCard
                    key={Number(listing.tileId)}
                    listing={listing}
                    type="rental"
                    onRent={handleRentTile}
                    isRenting={loadingStates[`rent_${Number(listing.tileId)}`]}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-800/60 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-emerald-400 mb-2">No tiles for rent</h3>
                <p className="text-slate-300 text-sm">Check back later or list your own tiles!</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );

  const renderMyTilesTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-gradient-to-r from-emerald-600/20 to-green-600/20 border border-emerald-400/30 rounded-md sm:rounded-lg p-2 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-emerald-400 mb-0.5 sm:mb-1">{stats.ownedTiles}</div>
          <div className="text-xs text-emerald-300 font-medium">Owned</div>
        </div>
        <div className="bg-gradient-to-r from-slate-600/20 to-purple-600/20 border border-slate-400/30 rounded-md sm:rounded-lg p-2 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-slate-400 mb-0.5 sm:mb-1">{stats.rentedTiles}</div>
          <div className="text-xs text-slate-300 font-medium">Rented</div>
        </div>
        <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-400/30 rounded-md sm:rounded-lg p-2 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-amber-400 mb-0.5 sm:mb-1">{stats.saleListings}</div>
          <div className="text-xs text-amber-300 font-medium">For Sale</div>
        </div>
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-400/30 rounded-md sm:rounded-lg p-2 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-purple-400 mb-0.5 sm:mb-1">{stats.rentalListings}</div>
          <div className="text-xs text-purple-300 font-medium">For Rent</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-emerald-400">Your Tiles</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkEditModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/60 hover:bg-purple-600 border border-purple-400/50 text-purple-300 hover:text-purple-200 rounded-lg text-sm font-bold transition-all"
          >
            <Edit3 className="w-4 h-4" />
            Bulk Edit
          </button>
          <button
            onClick={() => setShowBulkListModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/60 hover:bg-emerald-600 border border-emerald-400/50 text-emerald-300 hover:text-emerald-200 rounded-lg text-sm font-bold transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            Bulk List
          </button>
          <button
            onClick={fetchUserTiles}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 border-2 border-emerald-400 text-emerald-400 hover:text-emerald-300 rounded-lg text-sm font-bold transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-400 border-t-transparent"></div>
        </div>
      ) : userTiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {userTiles.map((tile: any) => (
            <OwnedTileCard
              key={Number(tile.tileId)}
              tile={tile}
              onEdit={(tile) => {
                setSelectedTileForAction(tile);
                setShowEditModal(true);
              }}
              onListForSale={() => openSaleModal(tile)}
              onListForRent={() => openRentModal(tile)}
              onCancelSale={() => handleCancelSaleListing(Number(tile.tileId))}
              onCancelRent={() => handleCancelRentalListing(Number(tile.tileId))}
              isCancelingSale={loadingStates[`cancelSale_${Number(tile.tileId)}`]}
              isCancelingRent={loadingStates[`cancelRent_${Number(tile.tileId)}`]}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-800/60 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-emerald-400 mb-2">No tiles owned</h3>
          <p className="text-slate-300 text-sm mb-4">Visit the Grid to purchase tiles</p>
          <a href="/grid" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-900 rounded-lg text-sm font-bold transition-colors border-2 border-slate-700">
            <Grid3X3 className="w-4 h-4" />
            Browse Grid
          </a>
        </div>
      )}
    </div>
  );

  const renderMyListingsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-emerald-400">Your Listings</h2>
        <button
          onClick={fetchUserListings}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 border-2 border-emerald-400 text-emerald-400 hover:text-emerald-300 rounded-lg text-sm font-bold transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-400 border-t-transparent"></div>
        </div>
      ) : (userSaleListings.length > 0 || userRentalListings.length > 0) ? (
        <div className="space-y-6">
          {userSaleListings.length > 0 && (
            <div>
              <h3 className="text-md font-bold text-slate-300 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                Sale Listings ({userSaleListings.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userSaleListings.map((listing: any) => (
                  <MarketplaceListingCard
                    key={Number(listing.tileId)}
                    listing={listing}
                    type="sale"
                    onCancel={() => handleCancelSaleListing(Number(listing.tileId))}
                    isOwnListing={true}
                    isCanceling={loadingStates[`cancelSale_${Number(listing.tileId)}`]}
                  />
                ))}
              </div>
            </div>
          )}

          {userRentalListings.length > 0 && (
            <div>
              <h3 className="text-md font-bold text-slate-300 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Rental Listings ({userRentalListings.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userRentalListings.map((listing: any) => (
                  <MarketplaceListingCard
                    key={Number(listing.tileId)}
                    listing={listing}
                    type="rental"
                    onCancel={() => handleCancelRentalListing(Number(listing.tileId))}
                    onReclaim={() => handleReclaimExpiredRental(Number(listing.tileId))}
                    isOwnListing={true}
                    isCanceling={loadingStates[`cancelRent_${Number(listing.tileId)}`]}
                    isReclaiming={loadingStates[`reclaim_${Number(listing.tileId)}`]}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-800/60 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-emerald-400 mb-2">No active listings</h3>
          <p className="text-slate-300 text-sm">List your tiles for sale or rent to see them here</p>
        </div>
      )}
    </div>
  );

  const renderSaleModal = () => (
    showSaleModal && selectedTileForAction && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-400 rounded-xl p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-emerald-400">List for Sale</h2>
            <button
              onClick={closeSaleModal}
              className="text-slate-300 hover:text-emerald-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Price</label>
              <input
                type="number"
                step="0.001"
                value={listingData.price}
                onChange={(e) => updateListingData('price', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border-2 border-emerald-400/50 rounded-lg text-white placeholder-slate-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                placeholder="0.1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateListingData('isNativePayment', false)}
                  className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${
                    !listingData.isNativePayment
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-700/50 border-emerald-400/50 text-slate-300 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    SPRING
                  </div>
                </button>
                <button
                  onClick={() => updateListingData('isNativePayment', true)}
                  className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${
                    listingData.isNativePayment
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-700/50 border-emerald-400/50 text-slate-300 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    PEPU
                  </div>
                </button>
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleListForSale}
                disabled={loadingStates['sale'] || !listingData.price}
                className="flex-1 bg-emerald-400 hover:bg-emerald-300 disabled:bg-slate-500 text-slate-900 py-2.5 px-4 rounded-lg font-bold transition-all disabled:cursor-not-allowed border-2 border-slate-700"
              >
                {loadingStates['sale'] ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent"></div>
                    Listing...
                  </div>
                ) : (
                  'List for Sale'
                )}
              </button>
              <button
                onClick={closeSaleModal}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-bold transition-colors border-2 border-emerald-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  const renderRentModal = () => (
    showRentModal && selectedTileForAction && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-400 rounded-xl p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-emerald-400">List for Rent</h2>
            <button
              onClick={closeRentModal}
              className="text-slate-300 hover:text-emerald-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Price per Day</label>
              <input
                type="number"
                step="0.001"
                value={listingData.price}
                onChange={(e) => updateListingData('price', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border-2 border-emerald-400/50 rounded-lg text-white placeholder-slate-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                placeholder="0.01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Duration (Days)</label>
              <input
                type="number"
                min="1"
                max="7"
                value={listingData.duration}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value > 7) {
                    e.target.value = '7';
                    updateListingData('duration', '7');
                  } else if (value < 1) {
                    e.target.value = '1';
                    updateListingData('duration', '1');
                  } else {
                    updateListingData('duration', e.target.value);
                  }
                }}
                onBlur={(e) => {
                  const value = parseInt(e.target.value);
                  if (value > 7) {
                    e.target.value = '7';
                    updateListingData('duration', '7');
                  } else if (value < 1 || isNaN(value)) {
                    e.target.value = '1';
                    updateListingData('duration', '1');
                  }
                }}
                className="w-full px-3 py-2 bg-slate-700/50 border-2 border-emerald-400/50 rounded-lg text-white placeholder-slate-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                placeholder="7"
              />
              <p className="text-xs text-emerald-200 mt-1 font-medium">Maximum 7 days (contract limit)</p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateListingData('isNativePayment', false)}
                  className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${
                    !listingData.isNativePayment
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-700/50 border-emerald-400/50 text-slate-300 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    SPRING
                  </div>
                </button>
                <button
                  onClick={() => updateListingData('isNativePayment', true)}
                  className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${
                    listingData.isNativePayment
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-700/50 border-emerald-400/50 text-slate-300 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    PEPU
                  </div>
                </button>
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleListForRent}
                disabled={loadingStates['rent'] || !listingData.price}
                className="flex-1 bg-emerald-400 hover:bg-emerald-300 disabled:bg-slate-500 text-slate-900 py-2.5 px-4 rounded-lg font-bold transition-all disabled:cursor-not-allowed border-2 border-slate-700"
              >
                {loadingStates['rent'] ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent"></div>
                    Listing...
                  </div>
                ) : (
                  'List for Rent'
                )}
              </button>
              <button
                onClick={closeRentModal}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-bold transition-colors border-2 border-emerald-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="min-h-screen bg-slate-900">
      {renderNavigation()}
      {renderSuccessMessage()}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {renderHeader()}
        {renderTabs()}

        {activeTab === 'browse' && renderBrowseTab()}
        {activeTab === 'my-tiles' && renderMyTilesTab()}
        {activeTab === 'my-listings' && renderMyListingsTab()}
      </div>

      {renderSaleModal()}
      {renderRentModal()}

      <EditTileModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        tile={selectedTileForAction}
      />

      <BulkEditModal
        open={showBulkEditModal}
        onClose={() => {
          setShowBulkEditModal(false);
          setSelectedTilesForBulkEdit(new Set());
        }}
        tiles={userTiles}
        selectedTiles={selectedTilesForBulkEdit}
        onEdit={(tile) => {
          setSelectedTileForAction(tile);
          setShowEditModal(true);
          setShowBulkEditModal(false);
        }}
      />

      <BulkListModal
        isOpen={showBulkListModal}
        onClose={() => {
          setShowBulkListModal(false);
          // Refresh data after bulk listing
          setTimeout(() => {
            fetchUserTiles();
            fetchUserListings();
            fetchMarketplaceData();
          }, 3000);
        }}
        userTiles={userTiles}
      />
    </div>
  );
}