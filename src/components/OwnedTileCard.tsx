import React from 'react';
import { Tile } from '../hooks/useMarketplace';

interface OwnedTileCardProps {
  tile: Tile;
  onListForSale: (tileId: number) => void;
  onListForRent: (tileId: number) => void;
  onCancelSale: (tileId: number) => void;
  onCancelRent: (tileId: number) => void;
}

const springfieldButton = 'rounded-md px-4 py-1 text-sm font-bold border-2 border-black transition-all duration-200 bg-yellow-300 text-black hover:bg-yellow-200';

const OwnedTileCard: React.FC<OwnedTileCardProps> = ({ 
  tile, 
  onListForSale, 
  onListForRent, 
  onCancelSale, 
  onCancelRent 
}) => {
  const renderSocialLinks = (socials: any) => {
    if (!socials || Object.keys(socials).length === 0) return null;
    
    // Project: { primary: { telegram: 'link' }, additional: [] }
    if (socials.primary) {
      const primaryPlatform = Object.keys(socials.primary)[0];
      const primaryValue = socials.primary[primaryPlatform];
      const additionalLinks: string[] = Array.isArray(socials.additional) ? socials.additional.filter((v: any) => Boolean(v)) : [];
      
      return (
        <div className="flex flex-col gap-2 w-full">
          <a
            href={primaryValue}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-xs font-medium break-all hover:underline transition-colors"
          >
            {primaryPlatform.charAt(0).toUpperCase() + primaryPlatform.slice(1)}
          </a>
          {additionalLinks.length > 0 && (
            <div className="flex flex-col gap-1">
              {additionalLinks.map((value: string, idx: number) => (
                <a
                  key={idx}
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-xs font-medium break-all hover:underline transition-colors"
                >
                  Link {idx + 1}
                </a>
              ))}
            </div>
          )}
        </div>
      );
    } else {
      // User: { telegram: 'user' } etc.
      return (
        <div className="flex flex-col gap-1">
          {Object.entries(socials).map(([platform, value]) => {
            const valStr = String(value);
            let url: string = valStr;
            if (platform === 'telegram') url = `https://t.me/${valStr}`;
            else if (platform === 'discord') url = `https://discord.com/users/${valStr}`;
            else if (platform === 'x') url = `https://x.com/${valStr}`;
            return (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs font-medium break-all hover:underline transition-colors"
              >
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </a>
            );
          })}
        </div>
      );
    }
  };

  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10 hover:border-white/20 transition-all duration-300 group">
      {/* Header with Tile ID and Status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="bg-green-500 px-2 py-1 rounded">
            <span className="text-white font-bold text-xs">#{tile.tileId.toString()}</span>
          </div>
          <div className="flex gap-1">
            {tile.isForSale && (
              <span className="px-2 py-1 text-xs font-bold bg-yellow-500 text-black rounded border border-black">
                For Sale
              </span>
            )}
            {tile.isForRent && (
              <span className="px-2 py-1 text-xs font-bold bg-green-500 text-white rounded border border-black">
                For Rent
              </span>
            )}
            {tile.isCurrentlyRented && (
              <span className="px-2 py-1 text-xs font-bold bg-yellow-500 text-black rounded border border-black">
                Rented
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {/* Left side - Image */}
        <div className="w-1/2">
          {tile.imageCID ? (
            <img 
              src={`https://gateway.lighthouse.storage/ipfs/${tile.imageCID}`} 
              alt={tile.name || `Tile ${tile.tileId}`}
              className="w-full h-24 object-cover rounded-lg border border-white/20"
              onError={(e) => {
                console.error('Failed to load image:', tile.imageCID);
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-24 bg-gray-700 rounded-lg border border-white/20 flex items-center justify-center">
              <div className="text-center">
                <div className="text-white/60 text-xs">No Image</div>
              </div>
            </div>
          )}
        </div>

        {/* Right side - Content */}
        <div className="w-1/2 flex flex-col">
          {/* Tile Name */}
          <div className="text-left mb-2">
            <h3 className="text-sm font-bold text-white mb-1">
              {tile.name || `Tile ${tile.tileId}`}
            </h3>
            {tile.description && (
              <p className="text-gray-300 text-xs leading-relaxed">
                {tile.description}
              </p>
            )}
          </div>

          {/* Website Link */}
          {tile.website && (
            <div className="mb-2">
              <a 
                href={tile.website} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-400 hover:text-blue-300 text-xs font-medium break-all hover:underline transition-colors"
              >
                Website
              </a>
            </div>
          )}

          {/* Social Links */}
          {tile.socials && Object.keys(tile.socials).length > 0 && (
            <div className="mb-2">
              {renderSocialLinks(tile.socials)}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 space-y-2">
        {!tile.isForSale && !tile.isForRent && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onListForSale(Number(tile.tileId))}
              className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-sm rounded border-2 border-black transition-colors"
            >
              List for Sale
            </button>
            <button
              onClick={() => onListForRent(Number(tile.tileId))}
              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded border-2 border-black transition-colors"
            >
              List for Rent
            </button>
          </div>
        )}
        
        {tile.isForSale && (
          <button
            onClick={() => onCancelSale(Number(tile.tileId))}
            className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded border-2 border-black transition-colors"
          >
            Cancel Sale
          </button>
        )}
        
        {tile.isForRent && (
          <button
            onClick={() => onCancelRent(Number(tile.tileId))}
            className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded border-2 border-black transition-colors"
          >
            Cancel Rent
          </button>
        )}
      </div>
    </div>
  );
};

export default OwnedTileCard; 