"use client";

import { useState, useCallback } from 'react';
import { X, Check, ShoppingCart, Home, Coins, DollarSign } from 'lucide-react';
import { useMarketplace } from '../../hooks/useMarketplace';

interface BulkListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userTiles: any[];
}

export default function BulkListModal({ isOpen, onClose, userTiles }: BulkListModalProps) {
  const [step, setStep] = useState<'selection' | 'form' | 'progress' | 'success'>('selection');
  const [localSelectedTiles, setLocalSelectedTiles] = useState<Set<number>>(new Set());
  const [listingType, setListingType] = useState<'sale' | 'rent'>('sale');
  const [salePrice, setSalePrice] = useState('');
  const [rentPricePerDay, setRentPricePerDay] = useState('');
  const [rentDuration, setRentDuration] = useState('1');
  const [isNativePayment, setIsNativePayment] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedTiles, setProcessedTiles] = useState<{ tileId: number; success: boolean; error?: string }[]>([]);
  const [currentTileIndex, setCurrentTileIndex] = useState(0);

  const { listTileForSaleAction, listTileForRentAction } = useMarketplace();

  // Filter tiles that can be listed (owned by user or rented by user, not already listed)
  const availableTiles = userTiles.filter(tile => {
    const isOwned = tile.owner === tile.address || tile.isRentedByUser;
    const isNotListed = !tile.isForSale && !tile.isForRent;
    return isOwned && isNotListed;
  });

  const handleTileSelection = (tileId: number) => {
    const newSelected = new Set(localSelectedTiles);
    if (newSelected.has(tileId)) {
      newSelected.delete(tileId);
    } else {
      newSelected.add(tileId);
    }
    setLocalSelectedTiles(newSelected);
  };

  const selectAllTiles = () => {
    setLocalSelectedTiles(new Set(availableTiles.map(tile => Number(tile.tileId))));
  };

  const deselectAllTiles = () => {
    setLocalSelectedTiles(new Set());
  };

  const handleNext = () => {
    if (localSelectedTiles.size === 0) {
      alert('Please select at least one tile to list');
      return;
    }
    setStep('form');
  };

  const handleBack = () => {
    setStep('selection');
  };

  const handleBulkList = async () => {
    if (localSelectedTiles.size === 0) return;

    setIsProcessing(true);
    setStep('progress');
    setCurrentTileIndex(0);
    setProcessedTiles([]);

    const selectedTilesArray = Array.from(localSelectedTiles);
    const results: { tileId: number; success: boolean; error?: string }[] = [];

    for (let i = 0; i < selectedTilesArray.length; i++) {
      const tileId = selectedTilesArray[i];
      setCurrentTileIndex(i + 1);

      try {
        if (listingType === 'sale') {
          await listTileForSaleAction(tileId, salePrice, isNativePayment);
          results.push({ tileId, success: true });
        } else {
          await listTileForRentAction(tileId, rentPricePerDay, isNativePayment, parseInt(rentDuration));
          results.push({ tileId, success: true });
        }
      } catch (error) {
        console.error(`Error listing tile ${tileId}:`, error);
        results.push({ 
          tileId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }

      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setProcessedTiles(results);
    setStep('success');
    setIsProcessing(false);
  };

  const handleClose = () => {
    setStep('selection');
    setLocalSelectedTiles(new Set());
    setSalePrice('');
    setRentPricePerDay('');
    setRentDuration('1');
    setIsNativePayment(true);
    setProcessedTiles([]);
    setCurrentTileIndex(0);
    onClose();
  };

  const successCount = processedTiles.filter(r => r.success).length;
  const errorCount = processedTiles.filter(r => !r.success).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-400 rounded-xl p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-400/20 rounded-lg">
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-emerald-400">Bulk List Tiles</h2>
              <p className="text-slate-400 text-xs">{localSelectedTiles.size} tiles selected</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-300 hover:text-emerald-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {step === 'selection' && (
            <div className="space-y-4">
              {/* Quick Selection */}
              <div className="flex gap-2">
                <button
                  onClick={selectAllTiles}
                  className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors text-sm font-medium"
                >
                  Select All ({availableTiles.length})
                </button>
                <button
                  onClick={deselectAllTiles}
                  className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors text-sm font-medium"
                >
                  Clear
                </button>
              </div>

              {/* Compact Tiles Grid */}
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {availableTiles.map((tile) => {
                  const isSelected = localSelectedTiles.has(Number(tile.tileId));
                  return (
                    <div
                      key={tile.tileId.toString()}
                      onClick={() => handleTileSelection(Number(tile.tileId))}
                      className={`
                        relative cursor-pointer rounded-lg border-2 transition-all duration-200 p-2
                        ${isSelected 
                          ? 'border-emerald-400 bg-emerald-400/10' 
                          : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
                        }
                      `}
                    >
                      {/* Selection Indicator */}
                      <div className={`
                        absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center
                        ${isSelected ? 'bg-emerald-400' : 'bg-slate-600'}
                      `}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-slate-900" />}
                      </div>

                      {/* Compact Tile Display */}
                      <div className="text-center">
                        <div className="w-8 h-8 mx-auto mb-1 bg-slate-600 rounded flex items-center justify-center">
                          {tile.imageCID ? (
                            <img
                              src={`https://gateway.lighthouse.storage/ipfs/${tile.imageCID}`}
                              alt={tile.name || `Tile ${tile.tileId}`}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <span className="text-slate-400 text-sm">🏠</span>
                          )}
                        </div>
                        <div className="text-slate-200 text-xs font-medium">
                          {tile.name || `Tile ${tile.tileId}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Next Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNext}
                  disabled={localSelectedTiles.size === 0}
                  className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:bg-slate-500 text-slate-900 font-bold transition-all disabled:cursor-not-allowed rounded-lg border-2 border-slate-700"
                >
                  Continue with {localSelectedTiles.size} tiles →
                </button>
              </div>
            </div>
          )}

          {step === 'form' && (
            <div className="space-y-4">
              {/* Listing Type Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Listing Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setListingType('sale')}
                    className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${
                      listingType === 'sale'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-700/50 border-emerald-400/50 text-slate-300 hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      For Sale
                    </div>
                  </button>
                  <button
                    onClick={() => setListingType('rent')}
                    className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${
                      listingType === 'rent'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-700/50 border-emerald-400/50 text-slate-300 hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      For Rent
                    </div>
                  </button>
                </div>
              </div>

              {/* Price and Payment Fields */}
              <div className="space-y-3">
                {listingType === 'sale' ? (
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Price</label>
                    <input
                      type="number"
                      step="0.001"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      placeholder="0.1"
                      className="w-full px-3 py-2 bg-slate-700/50 border-2 border-emerald-400/50 rounded-lg text-white placeholder-slate-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Price per Day</label>
                      <input
                        type="number"
                        step="0.001"
                        value={rentPricePerDay}
                        onChange={(e) => setRentPricePerDay(e.target.value)}
                        placeholder="0.1"
                        className="w-full px-3 py-2 bg-slate-700/50 border-2 border-emerald-400/50 rounded-lg text-white placeholder-slate-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Duration (days)</label>
                      <input
                        type="number"
                        value={rentDuration}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value > 7) {
                            e.target.value = '7';
                            setRentDuration('7');
                          } else if (value < 1) {
                            e.target.value = '1';
                            setRentDuration('1');
                          } else {
                            setRentDuration(e.target.value);
                          }
                        }}
                        onBlur={(e) => {
                          const value = parseInt(e.target.value);
                          if (value > 7) {
                            e.target.value = '7';
                            setRentDuration('7');
                          } else if (value < 1 || isNaN(value)) {
                            e.target.value = '1';
                            setRentDuration('1');
                          }
                        }}
                        placeholder="1"
                        min="1"
                        max="7"
                        className="w-full px-3 py-2 bg-slate-700/50 border-2 border-emerald-400/50 rounded-lg text-white placeholder-slate-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                      />
                      <p className="text-xs text-emerald-200 mt-1 font-medium">Maximum 7 days (contract limit)</p>
                    </div>
                  </>
                )}

                {/* Payment Type */}
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setIsNativePayment(false)}
                      className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${
                        !isNativePayment
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
                      onClick={() => setIsNativePayment(true)}
                      className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${
                        isNativePayment
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
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleBulkList}
                  disabled={
                    (listingType === 'sale' && !salePrice) ||
                    (listingType === 'rent' && (!rentPricePerDay || !rentDuration))
                  }
                  className="flex-1 bg-emerald-400 hover:bg-emerald-300 disabled:bg-slate-500 text-slate-900 py-2.5 px-4 rounded-lg font-bold transition-all disabled:cursor-not-allowed border-2 border-slate-700"
                >
                  List {localSelectedTiles.size} Tiles
                </button>
                <button
                  onClick={handleBack}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-bold transition-colors border-2 border-emerald-400"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {step === 'progress' && (
            <div className="text-center space-y-4">
              <div className="animate-spin w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full mx-auto"></div>
              <div>
                <h3 className="text-lg font-bold text-emerald-400">Processing Listings</h3>
                <p className="text-slate-300 text-sm">
                  Processing tile {currentTileIndex} of {localSelectedTiles.size}
                </p>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-emerald-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentTileIndex / localSelectedTiles.size) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

                    {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-400/20 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-400">Bulk Listing Complete!</h3>
                <p className="text-slate-300 text-sm">
                  Successfully processed {localSelectedTiles.size} tiles
                </p>
              </div>
               
              {/* Results Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">{successCount}</div>
                  <div className="text-sm text-emerald-300 font-medium">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{errorCount}</div>
                  <div className="text-sm text-red-300 font-medium">Failed</div>
                </div>
              </div>

              {/* Error Details */}
              {errorCount > 0 && (
                <div className="text-left bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                  <h4 className="font-medium text-red-400 mb-2 text-sm">Failed Listings:</h4>
                  <div className="space-y-1 text-xs">
                    {processedTiles
                      .filter(r => !r.success)
                      .map((result, index) => (
                        <div key={index}>
                          <span className="text-red-400 font-medium">Tile {result.tileId}:</span>
                          <span className="text-slate-300 ml-2">{result.error}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-bold transition-all rounded-lg border-2 border-slate-700"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
