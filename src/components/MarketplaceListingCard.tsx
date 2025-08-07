import React, { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';

interface MarketplaceListingCardProps {
  listing: {
    tileId: bigint;
    seller?: string;
    owner?: string;
    price?: bigint;
    pricePerDay?: bigint;
    isActive: boolean;
    isNativePayment: boolean;
    currentRenter?: string;
    rentalStart?: bigint;
    rentalEnd?: bigint;
  };
  type: 'sale' | 'rental';
  onBuy?: (tileId: number, price: string, isNativePayment: boolean) => void;
  onRent?: (tileId: number, duration: number) => void;
  onCancel?: (tileId: number) => void;
  isOwnListing?: boolean;
}

export default function MarketplaceListingCard({ 
  listing, 
  type, 
  onBuy, 
  onRent,
  onCancel,
  isOwnListing = false
}: MarketplaceListingCardProps) {
  const { address } = useAccount();
  const [metadata, setMetadata] = useState<any>(null);
  const [imageCID, setImageCID] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rentDuration, setRentDuration] = useState(1);
  const [rentDurationInput, setRentDurationInput] = useState('1');
  const [showRentModal, setShowRentModal] = useState(false);

  // Check if current user owns this tile
  const isOwnTile = address && (listing.owner === address || listing.seller === address);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        
        // Get the metadata URI from the marketplace contract
        const { ethers } = await import('ethers');
        const { CONTRACT_ADDRESSES, TILE_MARKETPLACE_ABI } = await import('../config/contracts');
        
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const marketplace = new ethers.Contract(CONTRACT_ADDRESSES.MARKETPLACE, TILE_MARKETPLACE_ABI, provider);
        
        // Get tile details using the tile ID
        const details = await marketplace.getTileDetails(listing.tileId);
        
        console.log('Tile details:', details);
        console.log('Metadata URI:', details.metadataUri);
        
        if (details.metadataUri) {
          // Fetch the metadata directly from the URI (like in fetchUserTiles)
          console.log('Fetching metadata from:', details.metadataUri);
          
          const response = await fetch(details.metadataUri);
          console.log('Metadata response status:', response.status);
          
          if (response.ok) {
            const metadata = await response.json();
            console.log('Fetched metadata:', metadata);
            setMetadata(metadata);
            setImageCID(metadata.imageCID);
          } else {
            console.error('Metadata fetch failed:', response.status, response.statusText);
          }
        } else {
          console.log('No metadata URI found');
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
    if (!metadata?.socials || Object.keys(metadata.socials).length === 0) {
      return null;
    }

    const { primary, additional } = metadata.socials;
    const links = [];

    // Add primary link
    if (primary) {
      const platform = Object.keys(primary)[0];
      const url = primary[platform];
      links.push(
        <a
          key={platform}
          href={url.startsWith('http') ? url : `https://${url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-xs font-medium break-all hover:underline transition-colors"
        >
          {platform}
        </a>
      );
    }

    // Add additional links
    if (additional) {
      Object.entries(additional).forEach(([platform, url]) => {
        const urlString = url as string;
        links.push(
          <a
            key={platform}
            href={urlString.startsWith('http') ? urlString : `https://${urlString}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-xs font-medium break-all hover:underline transition-colors"
          >
            {platform}
          </a>
        );
      });
    }

    return (
      <div className="flex flex-wrap gap-2">
        {links}
      </div>
    );
  };

  const handleAction = () => {
    console.log('handleAction called!');
    console.log('isOwnListing:', isOwnListing);
    console.log('onCancel function:', !!onCancel);
    console.log('type:', type);
    console.log('tileId:', Number(listing.tileId));
    
    if (isOwnListing && onCancel) {
      console.log('Calling onCancel with tileId:', Number(listing.tileId));
      onCancel(Number(listing.tileId));
    } else if (isOwnTile) {
      // User owns this tile, show message
      alert("You cannot buy or rent your own tile!");
      return;
    } else if (type === 'sale' && onBuy && listing.price) {
      onBuy(Number(listing.tileId), formatEther(listing.price), listing.isNativePayment);
    } else if (type === 'rental' && onRent) {
      setRentDurationInput('1');
      setRentDuration(1);
      setShowRentModal(true);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="animate-pulse">
          <div className="bg-gray-600 h-24 rounded mb-3"></div>
          <div className="bg-gray-600 h-4 rounded mb-2"></div>
          <div className="bg-gray-600 h-4 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
             <div className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-yellow-400/30 transition-all duration-300">
         <div className="flex gap-4">
           {/* Image */}
           <div className="w-2/5">
                         {imageCID ? (
               <img
                 src={`https://gateway.lighthouse.storage/ipfs/${imageCID}`}
                 alt={metadata?.name || `Tile ${Number(listing.tileId)}`}
                 className="w-full h-28 object-cover rounded-lg"
                 onError={(e) => {
                   console.error('Failed to load image:', imageCID);
                   e.currentTarget.style.display = 'none';
                 }}
               />
             ) : (
                             <div className="w-full h-28 bg-gray-600 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-xs">No Image</span>
              </div>
            )}
          </div>

                     {/* Content */}
           <div className="flex flex-col gap-3 w-3/5">
                         <div>
               <h4 className="text-base font-bold text-white mb-1">
                 {metadata?.name || `Tile ${Number(listing.tileId)}`}
               </h4>
               <p className="text-sm text-gray-400 mb-1">ID: {Number(listing.tileId)}</p>
               {!isOwnListing && (
                 <p className="text-sm text-gray-400 truncate mb-2">Owner: {listing.owner || listing.seller}</p>
               )}
             </div>

                         <div className="text-yellow-400 font-semibold text-base mb-2">
              {type === 'sale' && listing.price ? (
                <>
                  {formatEther(listing.price)} {listing.isNativePayment ? 'PEPU' : 'SPRFD'}
                </>
              ) : type === 'rental' && listing.pricePerDay ? (
                <>
                  {formatEther(listing.pricePerDay)} {listing.isNativePayment ? 'PEPU' : 'SPRFD'}/day
                </>
              ) : null}
            </div>

            {/* Social Links */}
            {renderSocialLinks()}

            {/* Website */}
            {metadata?.website && (
              <a
                href={metadata.website.startsWith('http') ? metadata.website : `https://${metadata.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs font-medium break-all hover:underline transition-colors"
              >
                {metadata.website}
              </a>
            )}

                         {/* Action Button */}
             <button
               onClick={handleAction}
               className={`w-full px-4 py-3 rounded-lg font-semibold text-sm transition-colors ${
                isOwnListing
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : isOwnTile
                  ? 'bg-gray-500 cursor-not-allowed text-white'
                  : type === 'sale'
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
              disabled={isOwnTile}
            >
              {isOwnListing 
                ? (type === 'sale' ? 'Cancel Sale' : 'Cancel Rent')
                : isOwnTile
                ? 'Your Tile'
                : (type === 'sale' ? 'Buy Now' : 'Rent Now')
              }
            </button>
          </div>
        </div>
      </div>

      {/* Rent Duration Modal */}
      {showRentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-blue-900/95 to-purple-900/95 border border-white/20 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Rent Duration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">Number of Days</label>
                                                                         <input
                       type="number"
                       min="1"
                       max="365"
                       value={rentDurationInput}
                       onChange={(e) => {
                         const value = e.target.value;
                         setRentDurationInput(value);
                         
                         if (value === '') {
                           setRentDuration(1);
                         } else {
                           const numValue = parseInt(value);
                           if (!isNaN(numValue) && numValue >= 1) {
                             setRentDuration(numValue);
                           }
                         }
                       }}
                       className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                     />
              </div>
              
              <div className="text-sm text-gray-300">
                <p>Price per day: {formatEther(listing.pricePerDay || BigInt(0))} {listing.isNativePayment ? 'PEPU' : 'SPRFD'}</p>
                <p>Total: {formatEther((listing.pricePerDay || BigInt(0)) * BigInt(rentDuration))} {listing.isNativePayment ? 'PEPU' : 'SPRFD'}</p>
              </div>
              
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => {
                    onRent?.(Number(listing.tileId), rentDuration);
                    setShowRentModal(false);
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium"
                >
                  Rent Now
                </button>
                <button
                  onClick={() => setShowRentModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 