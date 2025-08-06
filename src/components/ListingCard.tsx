import { motion } from 'framer-motion';
import { Tag, Clock, DollarSign, User } from 'lucide-react';
import { formatEther } from 'viem';

interface ListingCardProps {
  type: 'sale' | 'rental';
  tileId: number;
  owner: string;
  price: bigint;
  isNativePayment: boolean;
  isRented?: boolean;
  onAction: () => void;
  actionLabel: string;
  actionDisabled?: boolean;
}

export function ListingCard({
  type,
  tileId,
  owner,
  price,
  isNativePayment,
  isRented = false,
  onAction,
  actionLabel,
  actionDisabled = false,
}: ListingCardProps) {
  const Icon = type === 'sale' ? Tag : Clock;
  const currency = isNativePayment ? 'PEPU' : 'SPRFD';
  const priceDisplay = type === 'sale' 
    ? `${formatEther(price)} ${currency}`
    : `${formatEther(price)} ${currency}/day`;

  return (
    <motion.div
      className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-4 h-4 text-yellow-300" />
            <p className="font-bold text-white">Tile #{tileId}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <User className="w-3 h-3" />
              <span>{owner.slice(0, 6)}...{owner.slice(-4)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <DollarSign className="w-3 h-3 text-green-400" />
              <p className="text-green-400 font-bold">{priceDisplay}</p>
            </div>
            
            {isRented && (
              <p className="text-red-400 text-sm font-medium">Currently Rented</p>
            )}
          </div>
        </div>
        
        <button
          onClick={onAction}
          disabled={actionDisabled || isRented}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            actionDisabled || isRented
              ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
              : type === 'sale'
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {actionLabel}
        </button>
      </div>
    </motion.div>
  );
} 