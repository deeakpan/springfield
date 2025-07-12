import React, { useState, useEffect } from 'react';
import { Clock, Gavel, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuctionStatusProps {
  auctionDetails: any;
  onAuctionEnd?: () => void;
}

const AuctionStatus: React.FC<AuctionStatusProps> = ({ auctionDetails, onAuctionEnd }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isAuctionActive, setIsAuctionActive] = useState(true);

  useEffect(() => {
    if (!auctionDetails?.auctionEndTime) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const endTime = new Date(auctionDetails.auctionEndTime).getTime();
      const difference = endTime - now;

      if (difference <= 0) {
        setTimeLeft('Auction Ended');
        setIsAuctionActive(false);
        onAuctionEnd?.();
      } else {
        const minutes = Math.floor(difference / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [auctionDetails?.auctionEndTime, onAuctionEnd]);

  if (!auctionDetails) return null;

  return (
    <div className="bg-white rounded-lg p-4 border-2 border-black shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-black">Auction Status</h3>
        {isAuctionActive ? (
          <Clock className="w-5 h-5 text-yellow-500" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="font-semibold text-gray-700">Project:</span>
          <span className="font-bold text-black">{auctionDetails.name}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-semibold text-gray-700">Current Bid:</span>
          <span className="font-bold text-green-600">
            {auctionDetails.bidAmount} {auctionDetails.bidToken}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-semibold text-gray-700">Time Left:</span>
          <span className={`font-bold ${isAuctionActive ? 'text-red-600' : 'text-green-600'}`}>
            {timeLeft}
          </span>
        </div>
        
        {!isAuctionActive && (
          <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">
                Auction ended. Winner: {auctionDetails.name}
              </span>
            </div>
          </div>
        )}
        
        {isAuctionActive && (
          <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
            <div className="flex items-center gap-2">
              <Gavel className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-800">
                Bidding active - 1 minute duration
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuctionStatus; 