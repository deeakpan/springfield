import React from 'react';
import { Tile } from '../hooks/useMarketplace';
import { ExternalLink, Hash, Calendar, DollarSign, Settings2, Edit } from 'lucide-react';

interface OwnedTileCardProps {
  tile: Tile;
  onListForSale: (tileId: number) => void;
  onListForRent: (tileId: number) => void;
  onCancelSale: (tileId: number) => void;
  onCancelRent: (tileId: number) => void;
  onEdit: (tile: Tile) => void;
  isCancelingSale?: boolean;
  isCancelingRent?: boolean;
}

const OwnedTileCard: React.FC<OwnedTileCardProps> = ({ 
  tile, 
  onListForSale, 
  onListForRent, 
  onCancelSale, 
  onCancelRent,
  onEdit,
  isCancelingSale = false,
  isCancelingRent = false
}) => {
  const renderSocialLinks = (socials: any) => {
    if (!socials || Object.keys(socials).length === 0) return null;
    
    const getLinks = () => {
      if (socials.primary) {
        const primaryPlatform = Object.keys(socials.primary)[0];
        const primaryValue = socials.primary[primaryPlatform];
        const additionalLinks: string[] = Array.isArray(socials.additional) 
          ? socials.additional.filter((v: any) => Boolean(v)) 
          : [];
        
        return [
          { platform: primaryPlatform, url: primaryValue },
          ...additionalLinks.map((url, idx) => ({ platform: `Link ${idx + 1}`, url }))
        ];
      } else {
        return Object.entries(socials).map(([platform, value]) => {
          const valStr = String(value);
          let url: string = valStr;
          if (platform === 'telegram') url = `https://t.me/${valStr}`;
          else if (platform === 'discord') url = `https://discord.com/users/${valStr}`;
          else if (platform === 'x') url = `https://x.com/${valStr}`;
          return { platform, url };
        });
      }
    };

    return (
      <div className="flex gap-1 flex-wrap">
        {getLinks().slice(0, 2).map(({ platform, url }, idx) => (
          <a
            key={idx}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded text-blue-400 text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            {platform}
          </a>
        ))}
      </div>
    );
  };

  const getStatusBadges = () => {
    const badges = [];
    if (tile.isForSale) badges.push({ text: 'For Sale', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' });
    if (tile.isForRent) badges.push({ text: 'For Rent', color: 'bg-green-500/20 text-green-300 border-green-500/30' });
    if (tile.isCurrentlyRented) badges.push({ text: 'Rented', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' });
    if (tile.isRentedByUser) badges.push({ text: 'Renting', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' });
    return badges;
  };

  return (
    <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/60 hover:bg-slate-800/70 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/60 rounded-lg">
            <Hash className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-white font-semibold text-sm">{tile.tileId.toString()}</span>
          </div>
          <button
            onClick={() => onEdit(tile)}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
            title="Edit Tile"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
        </div>
        
        <div className="flex gap-1">
          {getStatusBadges().map((badge, idx) => (
            <span key={idx} className={`px-2 py-0.5 text-xs font-medium rounded-md border ${badge.color}`}>
              {badge.text}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-3 mb-3">
        {/* Image */}
        <div className="w-16 h-16 flex-shrink-0">
          {tile.imageCID ? (
            <img 
              src={`https://gateway.lighthouse.storage/ipfs/${tile.imageCID}`} 
              alt={tile.name || `Tile ${tile.tileId}`}
              className="w-full h-full object-cover rounded-lg border border-slate-600/40"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-slate-700/40 rounded-lg border border-slate-600/40 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-slate-500" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <h3 className="text-white font-semibold text-sm mb-1 truncate">
              {tile.name || `Tile ${tile.tileId}`}
            </h3>
            {tile.description && (
              <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                {tile.description}
              </p>
            )}
          </div>

          {/* Links */}
          <div className="space-y-1.5">
            {tile.website && (
              <a 
                href={tile.website} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded text-emerald-400 text-xs font-medium transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Website
              </a>
            )}
            {renderSocialLinks(tile.socials)}
          </div>
        </div>
      </div>

      {/* Rental Info */}
      {tile.isRentedByUser && tile.rentalData && (
        <div className="mb-3 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-300 text-xs font-medium">Currently Renting</span>
          </div>
          <div className="flex items-center justify-between text-xs text-blue-200">
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>{Number(tile.rentalData.pricePerDay) / 1e18} {tile.rentalData.isNativePayment ? 'PEPU' : 'SPRING'}/day</span>
            </div>
            <span>Until {new Date(Number(tile.rentalData.rentalEnd) * 1000).toLocaleDateString()}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {!tile.isForSale && !tile.isForRent && !tile.isRentedByUser && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onListForSale(Number(tile.tileId))}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 hover:border-amber-500/40 text-amber-300 font-medium text-xs rounded-lg transition-all"
            >
              <DollarSign className="w-3.5 h-3.5" />
              List Sale
            </button>
            <button
              onClick={() => onListForRent(Number(tile.tileId))}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/40 text-green-300 font-medium text-xs rounded-lg transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              List Rent
            </button>
          </div>
        )}
        
        {/* Remove the "No modifications allowed" message for renters - they can edit */}
        
        {tile.isForSale && !tile.isCurrentlyRented && (
          <button
            onClick={() => onCancelSale(Number(tile.tileId))}
            disabled={isCancelingSale}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/40 text-red-300 font-medium text-xs rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelingSale ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border border-red-400 border-t-transparent"></div>
                Processing...
              </>
            ) : (
              'Cancel Sale'
            )}
          </button>
        )}
        
        {tile.isForRent && !tile.isCurrentlyRented && (
          <button
            onClick={() => onCancelRent(Number(tile.tileId))}
            disabled={isCancelingRent}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/40 text-red-300 font-medium text-xs rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelingRent ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border border-red-400 border-t-transparent"></div>
                Processing...
              </>
            ) : (
              'Cancel Rent'
            )}
          </button>
        )}
        
        {/* Only show "Cannot Cancel" for owners, not for renters */}
        {tile.isForRent && tile.isCurrentlyRented && !tile.isRentedByUser && (
          <div className="text-center py-2 px-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div className="text-orange-300 text-xs font-medium">Rental Active - Cannot Cancel</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnedTileCard;