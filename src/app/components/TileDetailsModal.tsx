import React from 'react';

interface TileDetailsModalProps {
  open: boolean;
  onClose: () => void;
  details: any;
}

const springfieldBorder = 'border-4 border-black';
const springfieldButton = 'rounded-md px-4 py-1 text-sm font-bold border-2 border-black transition-all duration-200 bg-yellow-300 text-black hover:bg-yellow-200';

function renderSocialLinks(socials: any) {
  if (!socials) return null;
  // Project: { primary: { telegram: 'link' }, additional: [] }
  if (socials.primary) {
    const primaryPlatform = Object.keys(socials.primary)[0];
    const primaryValue = socials.primary[primaryPlatform];
    const additionalLinks: string[] = Array.isArray(socials.additional) ? socials.additional.filter((v: any) => Boolean(v)) : [];
    return (
      <div className="flex flex-col gap-2 items-center w-full">
        <a
          href={primaryValue}
          target="_blank"
          rel="noopener noreferrer"
          className={`${springfieldButton} mb-1`}
        >
          Explore
        </a>
        {additionalLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center items-center w-full">
            {additionalLinks.map((value: string, idx: number) => (
              <a
                key={idx}
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-300 text-xs font-semibold max-w-full truncate hover:bg-blue-200 transition"
                style={{ wordBreak: 'break-all' }}
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
      <div className="flex flex-wrap gap-2 justify-center items-center w-full">
        {Object.entries(socials).map(([platform, value]) => {
          const valStr = String(value);
          let url: string = valStr;
          let label = 'Contact';
          if (platform === 'telegram') url = `https://t.me/${valStr}`;
          else if (platform === 'discord') url = `https://discord.com/users/${valStr}`;
          else if (platform === 'x') url = `https://x.com/${valStr}`;
          return (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={springfieldButton}
              style={{ wordBreak: 'break-all' }}
            >
              {label} {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </a>
          );
        })}
      </div>
    );
  }
}

const TileDetailsModal: React.FC<TileDetailsModalProps> = ({ open, onClose, details }) => {
  if (!open || !details) return null;
  
  const isAuction = details.isAuction;
  const auctionEnded = isAuction && new Date(details.auctionEndTime) < new Date();
  
  return (
    <div
      className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ pointerEvents: 'auto' }}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl p-4 max-w-md w-80 relative flex flex-col items-center shadow-xl ${springfieldBorder}`}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '90vw', wordBreak: 'break-word' }}
      >
        <button className="absolute top-2 right-2 text-black text-lg font-bold hover:text-red-500 transition-colors" onClick={onClose} aria-label="Close">&times;</button>
        <img src={`https://gateway.lighthouse.storage/ipfs/${details.imageCID}`} alt="Tile" className="w-32 h-32 object-contain rounded mb-3 border border-black bg-white" />
        <div className="text-lg font-bold mb-1 text-green-700 text-center break-words w-full">{details.name}</div>
        
        {isAuction ? (
          <>
            <div className="mb-1 text-center w-full flex flex-wrap justify-center">
              <span className="font-semibold text-gray-700">Status:</span> 
              <span className={`font-semibold ${auctionEnded ? 'text-green-600' : 'text-yellow-600'}`}>
                {auctionEnded ? 'Auction Ended' : 'Auction Active'}
              </span>
            </div>
            <div className="mb-1 text-center w-full">
              <span className="font-semibold text-gray-700">Bid:</span> 
              <span className="font-bold text-green-600"> {details.bidAmount} {details.bidToken}</span>
            </div>
            {auctionEnded && (
              <div className="mb-1 text-center w-full">
                <span className="font-semibold text-gray-700">Winner:</span> 
                <span className="font-bold text-green-600"> {details.name}</span>
              </div>
            )}
          </>
        ) : (
          <div className="mb-1 text-center w-full flex flex-wrap justify-center">
            <span className="font-semibold text-gray-700">Status:</span> <span className="text-green-600 font-semibold">Claimed</span>
          </div>
        )}
        
        {details.socials && (
          <div className="mb-1 w-full text-center">
            <div className="font-semibold text-gray-700 mb-1">Socials:</div>
            {renderSocialLinks(details.socials)}
          </div>
        )}
        {details.website && <div className="mb-1 text-center break-words w-full"><span className="font-semibold text-gray-700">Website:</span> <a href={details.website} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline break-all">{details.website}</a></div>}
        {details.address && <div className="mb-1 text-center break-words w-full"><span className="font-semibold text-gray-700">Owner Address:</span> <span className="text-black break-all">{details.address}</span></div>}
        <div className="text-xs text-gray-500 text-center mt-2 break-all w-full">CID: {details.cid}</div>
      </div>
    </div>
  );
};

export default TileDetailsModal; 