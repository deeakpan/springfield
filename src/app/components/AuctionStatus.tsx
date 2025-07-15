import React, { useState, useEffect } from 'react';
import { Clock, Gavel, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuctionStatusProps {
  auctionDetails: any;
  auctionActive: boolean;
  nextAuctionTime: string;
  onAuctionEnd?: () => void;
}

const AuctionStatus: React.FC<AuctionStatusProps> = ({ auctionDetails, auctionActive, nextAuctionTime, onAuctionEnd }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [nextAuctionCountdown, setNextAuctionCountdown] = useState<string>('');

  useEffect(() => {
    if (!auctionDetails?.auctionEndTime) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const endTime = new Date(auctionDetails.auctionEndTime).getTime();
      const difference = endTime - now;

      if (difference <= 0) {
        setTimeLeft('Auction Ended');
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

  useEffect(() => {
    if (!nextAuctionTime) return;
    const updateCountdown = () => {
      const now = new Date().getTime();
      const nextTime = new Date(nextAuctionTime).getTime();
      const diff = nextTime - now;
      if (diff <= 0) {
        setNextAuctionCountdown('Auction starting soon');
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setNextAuctionCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextAuctionTime]);

  if (!auctionDetails) return null;

  return (
    <div className="bg-white rounded-lg p-4 border-2 border-black shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-black">Auction Status</h3>
        {auctionActive ? (
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
          <span className={`font-bold ${auctionActive ? 'text-red-600' : 'text-green-600'}`}>
            {auctionActive ? timeLeft : 'Auction Ended'}
          </span>
        </div>
        {!auctionActive && (
          <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">
                Auction ended. Winner: {auctionDetails.name}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">
                Next auction starts in: {nextAuctionCountdown}
              </span>
            </div>
          </div>
        )}
        {auctionActive && (
          <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
            <div className="flex items-center gap-2">
              <Gavel className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-800">
                Bidding active - 5 minute duration
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuctionStatus; 