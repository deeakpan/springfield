import React, { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { ExternalLink, Hash, DollarSign, Clock, User, Tag, Calendar } from 'lucide-react';

interface MarketplaceListingCardProps {
  listing: {
    tileId: bigint;
    seller?: string;
    owner?: string;
    price?: bigint;
    pricePerDay?: bigint;
    duration?: bigint;
    isActive: boolean;
    isNativePayment: boolean;
    currentRenter?: string;
    rentalStart?: bigint;
    rentalEnd?: bigint;
  };
  type: 'sale' | 'rental';
  onBuy?: (tileId: number, price: string, isNativePayment: boolean) => void;
  onRent?: (tileId: number) => void;
  onCancel?: (tileId: number) => void;
  isOwnListing?: boolean;
  isCanceling?: boolean;
  isBuying?: boolean;
  isRenting?: boolean;
}

export default function MarketplaceListingCard({ 
  listing, 
  type, 
  onBuy, 
  onRent,
  onCancel,
  isOwnListing = false,
  isCanceling = false,
  isBuying = false,
  isRenting = false
}: MarketplaceListingCardProps) {
  const { address } = useAccount();
  const [metadata, setMetadata] = useState<any>(null);
  const [imageCID, setImageCID] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRentModal, setShowRentModal] = useState(false);

  const isOwnTile = address && (listing.owner === address || listing.seller === address);
  const currency = listing.isNativePayment ? 'PEPU' : 'SPRING';
  
  // Check if tile is currently rented (for rental listings)
  const [isCurrentlyRented, setIsCurrentlyRented] = useState(false);
  
  // Fetch rental status from contract
  useEffect(() => {
    const checkRentalStatus = async () => {
      if (type === 'rental' && isOwnListing) {
        try {
          const { ethers } = await import('ethers');
          const { CONTRACT_ADDRESSES, TILE_MARKETPLACE_ABI } = await import('../config/contracts');
          
          const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
          const marketplace = new ethers.Contract(CONTRACT_ADDRESSES.MARKETPLACE, TILE_MARKETPLACE_ABI, provider);
          
          // Get the actual rental listing to check current status
          const rentalListing = await marketplace.rentalListings(listing.tileId);
          const hasActiveRenter = rentalListing.currentRenter && 
            rentalListing.currentRenter !== '0x0000000000000000000000000000000000000000';
          
          setIsCurrentlyRented(hasActiveRenter);
        } catch (error) {
          console.error('Error checking rental status:', error);
          setIsCurrentlyRented(false);
        }
      }
    };
    
    checkRentalStatus();
  }, [listing.tileId, type, isOwnListing]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        
        const { ethers } = await import('ethers');
        const { CONTRACT_ADDRESSES, TILE_MARKETPLACE_ABI } = await import('../config/contracts');
        
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const marketplace = new ethers.Contract(CONTRACT_ADDRESSES.MARKETPLACE, TILE_MARKETPLACE_ABI, provider);
        
        const details = await marketplace.getTileDetails(listing.tileId);
        
        if (details.metadataUri) {
          let metadataUrl = details.metadataUri;
          if (metadataUrl.startsWith('ipfs://')) {
            metadataUrl = `https://gateway.lighthouse.storage/ipfs/${metadataUrl.replace('ipfs://', '')}`;
          }
          const response = await fetch(metadataUrl);
          if (response.ok) {
            const metadata = await response.json();
            setMetadata(metadata);
            setImageCID(metadata.imageCID);
          }
        }
      } catch (error) {
        console.error('Error fetching metadata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [listing.tileId]);

  const renderSocialLinks = () => {
    if (!metadata?.socials || Object.keys(metadata.socials).length === 0) return null;

    const { primary, additional } = metadata.socials;
    const links = [];

    if (primary) {
      const platform = Object.keys(primary)[0];
      const url = primary[platform];
      links.push({ platform, url });
    }

    if (additional) {
      Object.entries(additional).forEach(([platform, url]) => {
        links.push({ platform, url: url as string });
      });
    }

    return (
      <div className="flex gap-1 flex-wrap">
        {links.slice(0, 2).map(({ platform, url }) => (
          <a
            key={platform}
            href={url.startsWith('http') ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded text-blue-400 text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            {platform}
          </a>
        ))}
      </div>
    );
  };

  const handleAction = () => {
    if (isOwnListing && onCancel) {
      // Prevent cancellation of currently rented tiles
      if (type === 'rental' && isCurrentlyRented) {
        console.log('Cannot cancel rental listing - tile is currently rented');
        return;
      }
      onCancel(Number(listing.tileId));
    } else if (isOwnTile) {
      return;
    } else if (type === 'sale' && onBuy && listing.price) {
      onBuy(Number(listing.tileId), formatEther(listing.price), listing.isNativePayment);
    } else if (type === 'rental' && onRent) {
      setShowRentModal(true);
    }
  };

  const getPriceDisplay = () => {
    if (type === 'sale' && listing.price) {
      return {
        amount: formatEther(listing.price),
        label: currency
      };
    } else if (type === 'rental' && listing.pricePerDay) {
      return {
        amount: formatEther(listing.pricePerDay),
        label: `${currency}/day`
      };
    }
    return null;
  };

  const getActionButton = () => {
    const baseClasses = "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs transition-all";
    
    // Basic disabled states (not rental status)
    const disabled = isOwnTile || (isOwnListing && isCanceling) || (type === 'sale' && isBuying) || (type === 'rental' && isRenting);

    if (isOwnListing) {
      // Check if this is a rental that's currently active
      if (type === 'rental' && isCurrentlyRented) {
        return {
          className: `${baseClasses} bg-slate-600/40 border border-slate-600/40 text-slate-400 cursor-not-allowed`,
          text: 'Currently Rented - Cannot Cancel',
          loading: false
        };
      }
      
      return {
        className: `${baseClasses} bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 disabled:opacity-50 disabled:cursor-not-allowed`,
        text: isCanceling ? 'Processing...' : `Cancel ${type === 'sale' ? 'Sale' : 'Rent'}`,
        loading: isCanceling
      };
    } else if (isOwnTile) {
      return {
        className: `${baseClasses} bg-slate-600/40 border border-slate-600/40 text-slate-400 cursor-not-allowed`,
        text: 'Your Tile',
        loading: false
      };
    } else if (type === 'sale') {
      return {
        className: `${baseClasses} bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed`,
        text: isBuying ? 'Processing...' : 'Buy Now',
        loading: isBuying
      };
    } else {
      return {
        className: `${baseClasses} bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed`,
        text: isRenting ? 'Processing...' : 'Rent Now',
        loading: isRenting
      };
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <div className="animate-pulse">
          <div className="bg-slate-700/60 h-4 rounded mb-2"></div>
          <div className="bg-slate-700/60 h-16 rounded mb-3"></div>
          <div className="bg-slate-700/60 h-3 rounded mb-1"></div>
          <div className="bg-slate-700/60 h-3 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const priceInfo = getPriceDisplay();
  const actionButton = getActionButton();
  const typeIcon = type === 'sale' ? Tag : Clock;

  return (
    <>
      <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/60 hover:bg-slate-800/70 transition-all duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/60 rounded-lg">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-white font-semibold text-sm">{Number(listing.tileId)}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-600/40 rounded text-slate-300">
              {React.createElement(typeIcon, { className: "w-3 h-3" })}
              <span className="text-xs font-medium capitalize">{type}</span>
            </div>
          </div>

          {/* Price */}
          {priceInfo && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <div className="text-right">
                <div className="text-emerald-300 font-semibold text-sm">{priceInfo.amount}</div>
                <div className="text-emerald-400/70 text-xs font-medium">{priceInfo.label}</div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex gap-3 mb-3">
          {/* Image */}
          <div className="w-16 h-16 flex-shrink-0">
            {imageCID ? (
              <img
                src={`https://gateway.lighthouse.storage/ipfs/${imageCID}`}
                alt={metadata?.name || `Tile ${Number(listing.tileId)}`}
                className="w-full h-full object-cover rounded-lg border border-slate-600/40"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-slate-700/40 rounded-lg border border-slate-600/40 flex items-center justify-center">
                <Tag className="w-5 h-5 text-slate-500" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <h4 className="text-white font-semibold text-sm mb-1 truncate">
                {metadata?.name || `Tile ${Number(listing.tileId)}`}
              </h4>
              {!isOwnListing && (
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <User className="w-3 h-3" />
                  <span className="font-medium">{(listing.owner || listing.seller)?.slice(0, 6)}...{(listing.owner || listing.seller)?.slice(-4)}</span>
                </div>
              )}
            </div>

            {/* Duration for rentals */}
            {type === 'rental' && listing.duration && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded mb-2">
                <Calendar className="w-3 h-3 text-blue-400" />
                <span className="text-blue-300 text-xs font-medium">
                  {listing.duration.toString()} day{listing.duration.toString() === '1' ? '' : 's'}
                </span>
              </div>
            )}
            
            {/* Rental Status Warning */}
            {type === 'rental' && isCurrentlyRented && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded mb-2">
                <Clock className="w-3 h-3 text-orange-400" />
                <span className="text-orange-300 text-xs font-medium">Currently Rented</span>
              </div>
            )}

            {/* Links */}
            <div className="space-y-1">
              {metadata?.website && (
                <a
                  href={metadata.website.startsWith('http') ? metadata.website : `https://${metadata.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded text-emerald-400 text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  Website
                </a>
              )}
              {renderSocialLinks()}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleAction}
          disabled={false}
          className={actionButton.className}
        >
          {actionButton.loading ? (
            <>
              <div className="animate-spin rounded-full h-3.5 w-3.5 border border-current border-t-transparent"></div>
              {actionButton.text}
            </>
          ) : (
            actionButton.text
          )}
        </button>
      </div>

      {/* Rent Confirmation Modal */}
      {showRentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/60 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Rental</h3>
            
            <div className="space-y-3 mb-6">
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Price per day:</span>
                    <span className="text-white font-medium">
                      {formatEther(listing.pricePerDay || BigInt(0))} {currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration:</span>
                    <span className="text-white font-medium">
                      {listing.duration ? listing.duration.toString() : '1'} day{listing.duration && listing.duration.toString() !== '1' ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700/50">
                    <span className="text-emerald-400 font-medium">Total:</span>
                    <span className="text-emerald-300 font-semibold">
                      {formatEther((listing.pricePerDay || BigInt(0)) * (listing.duration || BigInt(1)))} {currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  onRent?.(Number(listing.tileId));
                  setShowRentModal(false);
                }}
                disabled={isRenting}
                className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 py-2.5 px-4 rounded-lg font-medium text-sm transition-all disabled:opacity-50"
              >
                {isRenting ? 'Processing...' : 'Confirm Rental'}
              </button>
              <button
                onClick={() => setShowRentModal(false)}
                className="flex-1 bg-slate-600/40 hover:bg-slate-600/60 border border-slate-600/40 text-slate-300 py-2.5 px-4 rounded-lg font-medium text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}