"use client";

import { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, RefreshCw, CheckCircle, XCircle, Coins, Clock, AlertCircle } from "lucide-react";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ethers } from 'ethers';

// Contract addresses and ABI
const AUCTION_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AUCTION_CONTRACT;

const AUCTION_ABI = [
  "function bidderRefunds(address bidder, uint256 auctionId) external view returns (uint256)",
  "function hasRefunded(address bidder, uint256 auctionId) external view returns (bool)",
  "function claimRefund(uint256 auctionId) external",
  "function currentAuctionId() external view returns (uint256)",
  "function getBidCount(uint256 _auctionId) external view returns (uint256)"
];

interface RefundInfo {
  auctionId: number;
  refundAmount: string;
  hasClaimed: boolean;
  bidCount: number;
}

export default function RefundPage() {
  const [refunds, setRefunds] = useState<RefundInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [userAddress, setUserAddress] = useState<string>('');
  const [claiming, setClaiming] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Check if wallet is connected and get user address
  useEffect(() => {
    const checkWallet = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          setUserAddress(signer.address);
        } catch (error) {
          console.log("No wallet connected");
        }
      }
    };
    
    checkWallet();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', checkWallet);
      return () => {
        window.ethereum.removeListener('accountsChanged', checkWallet);
      };
    }
  }, []);

  // Fetch refunds for connected wallet
  const fetchRefunds = async () => {
    if (!userAddress || !AUCTION_CONTRACT_ADDRESS) return;
    
    setLoading(true);
    setError('');
    
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
      if (!rpcUrl) {
        setError("RPC URL not configured");
        return;
      }
      
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, provider);
      
      // Get current auction ID to know how many auctions to check
      const currentAuctionId = await contract.currentAuctionId();
      const maxAuctions = Number(currentAuctionId);
      
      const refundsData: RefundInfo[] = [];
      
      // Check last 10 auctions for refunds
      const startAuction = Math.max(1, maxAuctions - 9);
      
      for (let auctionId = startAuction; auctionId <= maxAuctions; auctionId++) {
        try {
          const refundAmount = await contract.bidderRefunds(userAddress, auctionId);
          const hasClaimed = await contract.hasRefunded(userAddress, auctionId);
          const bidCount = await contract.getBidCount(auctionId);
          
          if (refundAmount > 0) {
            refundsData.push({
              auctionId,
              refundAmount: ethers.formatEther(refundAmount),
              hasClaimed: Boolean(hasClaimed),
              bidCount: Number(bidCount)
            });
          }
        } catch (error) {
          console.log(`Error checking auction ${auctionId}:`, error);
        }
      }
      
      setRefunds(refundsData);
    } catch (error: any) {
      console.error('Error fetching refunds:', error);
      setError(error.message || 'Failed to fetch refunds');
    } finally {
      setLoading(false);
    }
  };

  // Claim refund for specific auction
  const claimRefund = async (auctionId: number) => {
    if (!window.ethereum || !AUCTION_CONTRACT_ADDRESS) {
      setError("Wallet not connected or contract not configured");
      return;
    }
    
    setClaiming(auctionId);
    setError('');
    setSuccess('');
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, signer);
      
      const tx = await contract.claimRefund(auctionId);
      await tx.wait();
      
      setSuccess(`Successfully claimed refund for Auction #${auctionId}!`);
      
      // Refresh refunds list
      setTimeout(() => {
        fetchRefunds();
      }, 2000);
      
    } catch (error: any) {
      console.error('Error claiming refund:', error);
      setError(error.message || 'Failed to claim refund');
    } finally {
      setClaiming(null);
    }
  };

  // Auto-fetch refunds when user address changes
  useEffect(() => {
    if (userAddress) {
      fetchRefunds();
    }
  }, [userAddress]);

  return (
    <div className="min-h-screen bg-blue-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-blue-500 border-b-2 border-black shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div
              className="flex items-center space-x-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <a href="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-green-500 border-2 border-black flex items-center justify-center shadow-lg">
                  <Coins className="w-6 h-6 text-black" />
                </div>
                <span className="text-2xl font-bold text-yellow-300">
                  Springfield
                </span>
              </a>
            </motion.div>
            
            <motion.div
              className="hidden md:flex space-x-8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <a href="/" className="text-white hover:text-green-400 font-medium transition-colors">Home</a>
              <a href="/grid" className="text-white hover:text-green-400 font-medium transition-colors">Grid</a>
              <a href="/marketplace" className="text-white hover:text-green-400 font-medium transition-colors">Marketplace</a>
              <a href="/refund" className="text-green-400 font-medium border-b-2 border-green-400">Refunds</a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <ConnectButton.Custom>
                {({ account, chain, openConnectModal, openAccountModal, authenticationStatus, mounted }) => {
                  const ready = mounted && authenticationStatus !== 'loading';
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus || authenticationStatus === 'authenticated');
                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        type="button"
                        className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-base rounded-md bg-green-500 text-black font-bold border-2 border-black hover:bg-green-400 transition-all duration-200 flex items-center gap-1 sm:gap-2 max-w-[100px] sm:max-w-none truncate"
                      >
                        <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                        Connect Wallet
                      </button>
                    );
                  }
                  return (
                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-base rounded-md bg-green-500 text-black font-bold border-2 border-black hover:bg-green-400 transition-all duration-200 flex items-center gap-1 sm:gap-2 max-w-[100px] sm:max-w-none truncate"
                    >
                      <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                      {account.displayName}
                    </button>
                  );
                }}
              </ConnectButton.Custom>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold text-yellow-300 mb-4">💰 Auction Refunds</h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Claim your refunds from previous auction bids. If you were outbid, you can claim back your tokens here.
            </p>
          </motion.div>

          {/* Wallet Connection Check */}
          {!userAddress ? (
            <motion.div
              className="bg-yellow-500 border-2 border-black rounded-lg p-6 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <AlertCircle className="w-12 h-12 text-black mx-auto mb-4" />
              <h3 className="text-xl font-bold text-black mb-2">Connect Your Wallet</h3>
              <p className="text-black mb-4">Please connect your wallet to view and claim your refunds.</p>
              <ConnectButton />
            </motion.div>
          ) : (
            <>
              {/* User Address Display */}
              <motion.div
                className="bg-blue-500 border-2 border-black rounded-lg p-4 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Connected Wallet:</p>
                    <p className="font-mono text-yellow-300 break-all">{userAddress}</p>
                  </div>
                  <button
                    onClick={fetchRefunds}
                    disabled={loading}
                    className="px-4 py-2 bg-green-500 text-black font-bold border-2 border-black rounded-md hover:bg-green-400 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </motion.div>

              {/* Error/Success Messages */}
              {error && (
                <motion.div
                  className="bg-red-500 border-2 border-black rounded-lg p-4 mb-6 flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <XCircle className="w-6 h-6 text-black" />
                  <p className="text-black font-bold">{error}</p>
                </motion.div>
              )}

              {success && (
                <motion.div
                  className="bg-green-500 border-2 border-black rounded-lg p-4 mb-6 flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <CheckCircle className="w-6 h-6 text-black" />
                  <p className="text-black font-bold">{success}</p>
                </motion.div>
              )}

              {/* Refunds List */}
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {loading ? (
                  <div className="bg-blue-500 border-2 border-black rounded-lg p-8 text-center">
                    <RefreshCw className="w-8 h-8 text-yellow-300 animate-spin mx-auto mb-4" />
                    <p className="text-lg font-bold">Loading refunds...</p>
                  </div>
                ) : refunds.length === 0 ? (
                  <div className="bg-blue-500 border-2 border-black rounded-lg p-8 text-center">
                    <Coins className="w-12 h-12 text-yellow-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-yellow-300 mb-2">No Refunds Available</h3>
                    <p className="text-gray-300">You don't have any refunds to claim from recent auctions.</p>
                  </div>
                ) : (
                  refunds.map((refund, index) => (
                    <motion.div
                      key={refund.auctionId}
                      className="bg-blue-500 border-2 border-black rounded-lg p-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-yellow-300">
                              Auction #{refund.auctionId}
                            </h3>
                            {refund.hasClaimed ? (
                              <span className="px-2 py-1 bg-green-500 text-black text-xs font-bold rounded border border-black">
                                ✓ Claimed
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded border border-black">
                                💰 Available
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-300">Refund Amount:</p>
                              <p className="font-bold text-yellow-300 text-lg">{refund.refundAmount} SPRING</p>
                            </div>
                            <div>
                              <p className="text-gray-300">Total Bids:</p>
                              <p className="font-bold text-white">{refund.bidCount}</p>
                            </div>
                            <div>
                              <p className="text-gray-300">Status:</p>
                              <p className="font-bold text-white">
                                {refund.hasClaimed ? 'Already Claimed' : 'Ready to Claim'}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {!refund.hasClaimed && (
                          <button
                            onClick={() => claimRefund(refund.auctionId)}
                            disabled={claiming === refund.auctionId}
                            className="px-6 py-3 bg-green-500 text-black font-bold border-2 border-black rounded-md hover:bg-green-400 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 ml-4"
                          >
                            {claiming === refund.auctionId ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Claiming...
                              </>
                            ) : (
                              <>
                                <Coins className="w-4 h-4" />
                                Claim Refund
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>

              {/* Info Section */}
              <motion.div
                className="bg-yellow-500 border-2 border-black rounded-lg p-6 mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <h3 className="text-xl font-bold text-black mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  How Refunds Work
                </h3>
                <div className="text-black space-y-2">
                  <p>• When you place a bid in an auction, your tokens are locked</p>
                  <p>• If someone outbids you, you can claim your tokens back</p>
                  <p>• Only unclaimed refunds are shown above</p>
                  <p>• Refunds are available for the last 10 auctions</p>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
