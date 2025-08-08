"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { X, Upload, ArrowRight, ArrowLeft, Loader2, ShoppingCart, CheckCircle2, User, Users } from 'lucide-react';
import lighthouse from '@lighthouse-web3/sdk';

// FIXED: Use actual deployed contract ABI
const AUCTION_ABI = [
  "function currentState() external view returns (uint8)",
  "function currentAuctionId() external view returns (uint256)",
  "function auctionEndTime() external view returns (uint256)",
  "function getBidCount(uint256 _auctionId) external view returns (uint256)",
  "function hasAuctionBeenExtendedForNoBids(uint256 _auctionId) external view returns (bool)",
  "function placeBid(uint256 _amount, string _name, string _description, string _metadataUrl) external",
  "function bidderRefunds(address bidder, uint256 auctionId) external view returns (uint256)",
  "function biddingToken() external view returns (address)",
  "function getCurrentAuctionInfo() external view returns (tuple(uint256 auctionId, uint256 startTime, uint256 endTime, uint256 totalBids, uint256 totalAmount, uint256 uniqueBidders, address highestBidder, uint256 highestBidAmount, bool isActive, bool hasWinner, bool hasBeenExtendedForNoBids, tuple(address bidder, string name, string description, uint256 amount, address tokenAddress, string metadataUrl, uint256 timestamp, uint256 auctionId) winningBid))"
];

// FIXED: ERC20 ABI for token operations
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function symbol() external view returns (string)"
];

const AUCTION_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AUCTION_CONTRACT;
const SPRFD_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_SPRFD_ADDRESS;

interface AuctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tileData: {
    id: string;
    name: string;
    price: string;
    image: string;
    description: string;
    location: string;
    size: string;
    type: string;
  };
}

export default function AuctionModal({ isOpen, onClose, tileData }: AuctionModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [userType, setUserType] = useState<'user' | 'project' | ''>('');
  const [form, setForm] = useState({
    name: '',
    bidAmount: '',
    website: '',
  });
  const [userSocialPlatform, setUserSocialPlatform] = useState<'telegram' | 'discord' | 'x'>('telegram');
  const [userSocialValue, setUserSocialValue] = useState('');
  const [projectPrimaryPlatform, setProjectPrimaryPlatform] = useState<'telegram' | 'discord' | 'x'>('telegram');
  const [projectPrimaryValue, setProjectPrimaryValue] = useState('');
  const [projectAdditionalLinks, setProjectAdditionalLinks] = useState(['', '']);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<FileList | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Auction state tracking
  const [auctionInfo, setAuctionInfo] = useState({
    auctionId: 0,
    endTime: 0,
    totalBids: 0,
    hasBeenExtendedForNoBids: false,
    highestBid: '0',
    highestBidder: ''
  });
  const [userBalance, setUserBalance] = useState('0');
  const [auctionState, setAuctionState] = useState<0 | 1 | 2>(0); // 0=INACTIVE, 1=ACTIVE, 2=DISPLAY_PERIOD
  const [timeLeft, setTimeLeft] = useState(0);

  // Fetch auction state
  useEffect(() => {
    if (isOpen && AUCTION_CONTRACT_ADDRESS) {
      fetchAuctionState();
      const interval = setInterval(fetchAuctionState, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Update countdown timer
  useEffect(() => {
    if (auctionState === 1 && auctionInfo.endTime > 0) {
      const timer = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        const remaining = auctionInfo.endTime - now;
        setTimeLeft(Math.max(0, remaining));
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [auctionState, auctionInfo.endTime]);

  // Update balance when wallet changes
  useEffect(() => {
    const checkBalance = async () => {
      try {
        if (!SPRFD_TOKEN_ADDRESS) {
          console.error("❌ NEXT_PUBLIC_SPRFD_ADDRESS not set!");
          return;
        }

        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          console.log("🔑 Connected wallet:", signer.address);
          console.log("🪙 SPRFD token address:", SPRFD_TOKEN_ADDRESS);

          const sprfdContract = new ethers.Contract(
            SPRFD_TOKEN_ADDRESS,
            ["function balanceOf(address) view returns (uint256)"],
            provider
          );

          const balance = await sprfdContract.balanceOf(signer.address);
          const formattedBalance = ethers.formatEther(balance);
          console.log("💰 Raw balance:", balance.toString());
          console.log("💰 Formatted balance:", formattedBalance, "SPRFD");
          setUserBalance(formattedBalance);
        }
      } catch (error: any) {
        console.error("❌ Error fetching balance:", error);
        setUserBalance('0');
      }
    };

    if (isOpen) {
      checkBalance();
      // Listen for account changes
      if (window.ethereum) {
        window.ethereum.on('accountsChanged', checkBalance);
        return () => {
          window.ethereum.removeListener('accountsChanged', checkBalance);
        };
      }
    }
  }, [isOpen]);

  // Handle bid submission
  const handleBid = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!imageFile || imageFile.length === 0) {
      setErrorMsg("No image selected!");
      return;
    }

    const file = imageFile[0];
    if (!file.type.startsWith('image/')) {
      setErrorMsg("File must be an image.");
      return;
    }
    if (file.size > 600 * 1024) {
      setErrorMsg("Image must be less than 600KB.");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload image to Lighthouse
      const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY;
      if (!apiKey) {
        setErrorMsg("Lighthouse API key not set");
        setUploading(false);
        return;
      }

      const imageRes = await lighthouse.upload(imageFile as any, apiKey);
      const imageCID = imageRes.data.Hash;
      console.log("Image CID:", imageCID);

      // 2. Prepare metadata JSON
      const metadata = {
        name: form.name,
        userType: userType,
        bidAmount: form.bidAmount,
        imageCID,
        timestamp: Date.now(),
        auctionId: auctionInfo.auctionId
      };
      const metadataText = JSON.stringify(metadata, null, 2);
      console.log("Metadata JSON:", metadataText);

      // 3. Upload metadata JSON
      const metadataRes = await lighthouse.uploadText(metadataText, apiKey, `auction-${auctionInfo.auctionId}-bid`);
      const metadataUri = `ipfs://${metadataRes.data.Hash}`;
      console.log("Metadata URI:", metadataUri);

      // 4. Approve tokens and place bid
      if (!window.ethereum) throw new Error("Wallet not found");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // First approve SPRFD tokens
      const sprfdContract = new ethers.Contract(
        SPRFD_TOKEN_ADDRESS!,
        ["function approve(address spender, uint256 amount) returns (bool)"],
        signer
      );

      const amount = ethers.parseEther(form.bidAmount);
      const approveTx = await sprfdContract.approve(AUCTION_CONTRACT_ADDRESS!, amount);
      await approveTx.wait();

      // Then place bid
      const auctionContract = new ethers.Contract(
        AUCTION_CONTRACT_ADDRESS!,
        AUCTION_ABI,
        signer
      );

      const tx = await auctionContract.placeBid(amount, form.name, userType, metadataUri);
      await tx.wait();

      // 5. Success
      setSuccessMsg("Bid placed successfully!");
      setStep('success');
    } catch (error: any) {
      console.error("Bid error:", error);
      setErrorMsg(error.message || "Failed to place bid");
    } finally {
      setUploading(false);
    }
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle keyboard events
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const fetchAuctionState = async () => {
    if (!AUCTION_CONTRACT_ADDRESS) {
      console.error("❌ NEXT_PUBLIC_AUCTION_CONTRACT environment variable not set!");
      return;
    }
    
    try {
      console.log("🔍 AuctionModal: Connecting to contract:", AUCTION_CONTRACT_ADDRESS);
      
      // FIXED: Use direct RPC like the bot does instead of wallet provider
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
      if (!rpcUrl) {
        console.error("❌ NEXT_PUBLIC_RPC_URL not set!");
        return;
      }
      
      console.log("🔗 Using direct RPC:", rpcUrl);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Check network
      const network = await provider.getNetwork();
      console.log("🌐 RPC Network:", network.chainId, "Pepe Unchained V2 Testnet");
      
      // Check if contract has code
      const code = await provider.getCode(AUCTION_CONTRACT_ADDRESS);
      console.log("📄 Contract code length:", code.length, "characters");
      
      if (code === "0x") {
        console.error("❌ NO CONTRACT FOUND at address:", AUCTION_CONTRACT_ADDRESS);
        console.error("💡 Contract not deployed on network:", network.chainId);
        return;
      }
      
      console.log("✅ Contract found! Proceeding with function calls...");
      
      const contract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, provider);
      
      console.log("🔍 AuctionModal: Fetching auction state...");
      
      // Test currentState call
      console.log("🧪 Testing currentState() call...");
      const state = await contract.currentState();
      const stateNumber = Number(state);
      console.log("📊 Raw state response:", state);
      console.log("📊 Current auction state:", stateNumber, ["INACTIVE", "ACTIVE", "DISPLAY_PERIOD"][stateNumber]);
      
      setAuctionState(stateNumber as 0 | 1 | 2);

      if (stateNumber === 1) { // ACTIVE
        console.log("🔥 Auction is ACTIVE - fetching detailed info...");
        
        // Get all auction info in one call
        const info = await contract.getCurrentAuctionInfo();
        console.log("📊 Current auction info:", {
          auctionId: Number(info.auctionId),
          startTime: Number(info.startTime),
          endTime: Number(info.endTime),
          totalBids: Number(info.totalBids),
          totalAmount: ethers.formatEther(info.totalAmount),
          uniqueBidders: Number(info.uniqueBidders),
          highestBidder: info.highestBidder,
          highestBidAmount: ethers.formatEther(info.highestBidAmount),
          isActive: info.isActive,
          hasWinner: info.hasWinner,
          hasBeenExtendedForNoBids: info.hasBeenExtendedForNoBids
        });

        // Get user's SPRFD balance
        try {
          if (!SPRFD_TOKEN_ADDRESS) {
            console.error("❌ NEXT_PUBLIC_SPRFD_ADDRESS not set!");
            return;
          }

          if (window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            console.log("🔑 Connected wallet:", signer.address);
            console.log("🪙 SPRFD token address:", SPRFD_TOKEN_ADDRESS);

            const sprfdContract = new ethers.Contract(
              SPRFD_TOKEN_ADDRESS,
              ["function balanceOf(address) view returns (uint256)"],
              provider
            );

            const balance = await sprfdContract.balanceOf(signer.address);
            const formattedBalance = ethers.formatEther(balance);
            console.log("💰 Raw balance:", balance.toString());
            console.log("💰 Formatted balance:", formattedBalance, "SPRFD");
            setUserBalance(formattedBalance);
          } else {
            console.error("❌ No wallet connected!");
          }
        } catch (error: any) {
          console.error("❌ Error fetching balance:", error);
          console.error("📍 Token address:", SPRFD_TOKEN_ADDRESS);
          console.error("🔧 Error details:", {
            name: error.name,
            message: error.message,
            code: error.code,
            reason: error.reason
          });
        }

        const parsedInfo = {
          auctionId: Number(info.auctionId),
          endTime: Number(info.endTime),
          totalBids: Number(info.totalBids),
          hasBeenExtendedForNoBids: info.hasBeenExtendedForNoBids,
          highestBid: ethers.formatEther(info.highestBidAmount),
          highestBidder: info.highestBidder
        };
        
        console.log("✅ Parsed auction info:", parsedInfo);
        setAuctionInfo(parsedInfo);
        
        // Calculate time remaining
        const now = Math.floor(Date.now() / 1000);
        const remaining = Math.max(0, Number(info.endTime) - now);
        setTimeLeft(remaining);
        
      } else {
        console.log("⏸️ Auction not active, state:", stateNumber);
        // Reset auction info for inactive states
                  setAuctionInfo({
            auctionId: 0,
            endTime: 0,
            totalBids: 0,
            hasBeenExtendedForNoBids: false,
            highestBid: '0',
            highestBidder: ''
          });
        setTimeLeft(0);
      }
    } catch (error: any) {
      console.error('❌ AuctionModal: Error fetching auction state:', error);
      console.error('📍 Contract address:', AUCTION_CONTRACT_ADDRESS);
      console.error('🔧 Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        reason: error.reason
      });
    }
  };

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Ended';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };



  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setUserType('');
      setForm({ name: '', bidAmount: '', website: '' });
      setUserSocialValue('');
      setProjectPrimaryValue('');
      setProjectAdditionalLinks(['', '']);
      setErrors({});
      setImageFile(null);
      setImagePreview(null);
      setUploading(false);
      setErrorMsg(null);
      setSuccessMsg(null);
      setShowSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      style={{ pointerEvents: 'auto' }}
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onFocus={(e) => e.preventDefault()}
    >
      <div
        className="relative w-full max-w-md mx-2 sm:mx-4 bg-blue-500 border-4 border-black rounded-2xl shadow-2xl p-2 sm:p-4 md:p-6 flex flex-col items-start animate-fadeIn overflow-auto"
        style={{ pointerEvents: 'auto', maxHeight: '90vh', wordBreak: 'break-word' }}
        onClick={e => e.stopPropagation()}
        onFocus={(e) => e.preventDefault()}
      >
        <button
          className="absolute top-4 right-4 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          onClick={onClose}
          aria-label="Close modal"
          tabIndex={0}
        >
          <X className="w-6 h-6" />
        </button>

        {/* Tile Info */}
        <div className="mb-6 w-full">
          <div className="bg-white rounded-md p-4 border-2 border-black text-black text-left mb-4 shadow-sm">
            <div className="mb-1"><span className="font-bold text-yellow-500">Location:</span> <span className="font-bold text-black">{tileData.location}</span></div>
            <div className="mb-1"><span className="font-bold text-yellow-500">Size:</span> <span className="font-bold text-black">{tileData.size}</span></div>
            <div className="mb-1"><span className="font-bold text-yellow-500">Type:</span> <span className="font-bold text-black">{tileData.type}</span></div>
          </div>
        </div>

        {/* ENHANCED: Auction State Display */}
        <div className="mb-6 w-full">
          <div className="bg-white rounded-md p-4 border-2 border-black text-black text-left mb-4 shadow-sm">
            <h4 className="font-bold text-yellow-500 mb-3">🎯 Auction Status</h4>
            
            {auctionState === 0 && (
              <div>
                <p className="text-orange-600 font-bold mb-2">⏳ Auction Inactive</p>
                <p className="text-sm text-gray-600">Waiting for next auction to start...</p>
              </div>
            )}
            
            {auctionState === 1 && (
                             <div>
                 <div className="flex items-center justify-between mb-2">
                   <p className="text-green-600 font-bold">🟢 Auction #{auctionInfo.auctionId}</p>
                   <p className="text-sm font-bold text-black">⏰ {formatTimeRemaining(timeLeft)}</p>
                 </div>
                 
                 <div className="bg-gray-50 rounded-lg p-2 mb-2">
                   {auctionInfo.totalBids === 0 ? (
                     <p className="text-sm font-bold text-blue-800">🎯 No bids yet - be the first!</p>
                   ) : (
                     <>
                       <p className="text-sm font-bold text-yellow-800">💰 {auctionInfo.totalBids} bid(s) placed</p>
                       <p className="text-xs text-gray-600 mt-1">
                         Highest bid: {auctionInfo.highestBid} SPRFD
                       </p>
                       <p className="text-xs text-gray-600 mt-1">
                         Highest bidder: {auctionInfo.highestBidder || 'No bids yet'}
                       </p>
                     </>
                   )}
                   {auctionInfo.hasBeenExtendedForNoBids && (
                     <p className="text-xs text-orange-800 mt-1">⏰ Extended for no bids</p>
                   )}
                 </div>
               </div>
            )}
            
                         {auctionState === 2 && (
               <div>
                 <p className="text-blue-600 font-bold mb-2">📺 Display Period</p>
                 <p className="text-sm text-gray-600">Auction #{auctionInfo.auctionId} has ended</p>
                 <p className="text-sm text-gray-600">Total bids: {auctionInfo.totalBids}</p>
               </div>
             )}
          </div>
        </div>



        {/* Step Content - Same as before but with better error handling */}
        {auctionState === 1 && (
          <div className="space-y-4 w-full">
             {step === 'form' && (
               <form
                 className="flex flex-col gap-4 w-full max-w-md mx-auto"
                 onSubmit={e => {
                   e.preventDefault();
                   const errs: Record<string, string> = {};
                   if (!userType) errs.type = 'Please select a type';
                   if (!form.name.trim()) errs.name = 'Name is required';
                   if (!form.bidAmount.trim()) errs.bidAmount = 'Bid amount is required';
                   if (!imageFile) errs.imageFile = 'Image is required';

                   // Social validation
                   if (userType === 'user') {
                     if (!userSocialValue.trim()) {
                       errs.userSocialValue = 'Username/ID is required';
                     } else {
                       let url = '';
                       if (userSocialPlatform === 'telegram') {
                         url = `https://t.me/${userSocialValue}`;
                         if (!/^https:\/\/t\.me\/[a-zA-Z0-9_]{5,}$/.test(url)) {
                           errs.userSocialValue = 'Must be a valid Telegram username (min 5 chars)';
                         }
                       } else if (userSocialPlatform === 'discord') {
                         url = `https://discord.com/users/${userSocialValue}`;
                         if (!/^https:\/\/discord\.com\/users\/[0-9]{5,}$/.test(url)) {
                           errs.userSocialValue = 'Must be a valid Discord user ID (5+ digits)';
                         }
                       } else if (userSocialPlatform === 'x') {
                         url = `https://x.com/${userSocialValue}`;
                         if (!/^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}$/.test(url)) {
                           errs.userSocialValue = 'Must be a valid X (Twitter) username (1-15 chars)';
                         }
                       }
                     }
                   } else if (userType === 'project') {
                     if (!projectPrimaryValue.trim()) {
                       errs.projectPrimaryValue = 'Primary social link is required';
                     } else {
                       if (projectPrimaryPlatform === 'telegram') {
                         if (!/^https:\/\/t\.me\/(\+|c\/|[a-zA-Z0-9_]{5,})/.test(projectPrimaryValue)) {
                           errs.projectPrimaryValue = 'Must be a valid Telegram group/channel link';
                         }
                       } else if (projectPrimaryPlatform === 'discord') {
                         if (!/^https:\/\/(discord\.gg|discord\.com\/invite)\/[\w-]+$/.test(projectPrimaryValue)) {
                           errs.projectPrimaryValue = 'Must be a valid Discord server invite link';
                         }
                       } else if (projectPrimaryPlatform === 'x') {
                         if (!/^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}$/.test(projectPrimaryValue)) {
                           errs.projectPrimaryValue = 'Must be a valid X (Twitter) profile link';
                         }
                       }
                     }
                     // At least one additional social link required
                     if (!projectAdditionalLinks[0].trim() && !projectAdditionalLinks[1].trim()) {
                       errs.projectAdditionalLinks0 = 'At least one additional social link is required';
                       errs.projectAdditionalLinks1 = 'At least one additional social link is required';
                     } else {
                       projectAdditionalLinks.forEach((link, i) => {
                         if (link && !/^https?:\/\/.+\..+/.test(link)) {
                           errs[`projectAdditionalLinks${i}`] = 'Must be a valid URL';
                         }
                       });
                     }
                   }

                   // Optional website validation
                   if (form.website) {
                     if (!/^https?:\/\/.+\..+/.test(form.website)) {
                       errs.website = 'Must be a valid website URL';
                     }
                   }
                   setErrors(errs);
                   if (Object.keys(errs).length === 0) {
                     handleBid();
                   }
                 }}
               >
                 <h2 className="text-xl font-bold text-yellow-300 mb-4 w-full text-center">Enter your details</h2>
                 
                 {/* Type Selection */}
                 <div className="flex justify-center gap-4 mb-4">
                   <button
                     type="button"
                     className={`rounded-md px-6 py-2 text-lg font-bold border-2 border-black transition-all duration-200 ${
                       userType === 'user' ? 'bg-green-500 text-black' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                     }`}
                     onClick={() => setUserType('user')}
                   >
                     <User className="inline w-5 h-5 mr-2" /> User
                   </button>
                   <button
                     type="button"
                     className={`rounded-md px-6 py-2 text-lg font-bold border-2 border-black transition-all duration-200 ${
                       userType === 'project' ? 'bg-green-500 text-black' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                     }`}
                     onClick={() => setUserType('project')}
                   >
                     <Users className="inline w-5 h-5 mr-2" /> Project
                   </button>
                 </div>
                 {errors.type && <div className="text-red-500 text-sm text-center mb-4">{errors.type}</div>}

                 {userType ? (
                   <>
                     <div className="flex flex-col w-full text-left space-y-4">
                       <div>
                         <label className="mb-1 font-semibold text-black">Name</label>
                         <input
                           className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                           placeholder={userType === 'project' ? 'Project name' : 'Your name'}
                           value={form.name}
                           onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                         />
                         {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
                       </div>

                       {/* Social Links */}
                       {userType === 'user' ? (
                         <div className="flex flex-col w-full text-left">
                           <label className="mb-1 font-semibold text-black">Social Platform</label>
                           <select
                             className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full"
                             value={userSocialPlatform}
                             onChange={e => setUserSocialPlatform(e.target.value as 'telegram' | 'discord' | 'x')}
                           >
                             <option value="telegram">Telegram</option>
                             <option value="discord">Discord</option>
                             <option value="x">X (Twitter)</option>
                           </select>
                           <input
                             className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full mt-2"
                             placeholder={
                               userSocialPlatform === 'telegram'
                                 ? 'Telegram username'
                                 : userSocialPlatform === 'discord'
                                 ? 'Discord user ID'
                                 : 'X (Twitter) username'
                             }
                             value={userSocialValue}
                             onChange={e => setUserSocialValue(e.target.value)}
                           />
                           {errors.userSocialValue && <div className="text-red-500 text-sm mt-1">{errors.userSocialValue}</div>}
                         </div>
                       ) : (
                         <>
                           <div className="flex flex-col w-full text-left">
                             <label className="mb-1 font-semibold text-black">Primary Social Link</label>
                             <select
                               className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full"
                               value={projectPrimaryPlatform}
                               onChange={e => setProjectPrimaryPlatform(e.target.value as 'telegram' | 'discord' | 'x')}
                             >
                               <option value="telegram">Telegram</option>
                               <option value="discord">Discord</option>
                               <option value="x">X (Twitter)</option>
                             </select>
                             <input
                               className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full mt-2"
                               placeholder={
                                 projectPrimaryPlatform === 'telegram'
                                   ? 'Telegram group/channel link'
                                   : projectPrimaryPlatform === 'discord'
                                   ? 'Discord server invite'
                                   : 'X (Twitter) profile link'
                               }
                               value={projectPrimaryValue}
                               onChange={e => setProjectPrimaryValue(e.target.value)}
                             />
                             {errors.projectPrimaryValue && <div className="text-red-500 text-sm mt-1">{errors.projectPrimaryValue}</div>}
                           </div>

                           {/* Additional Social Links */}
                           {[0, 1].map(i => (
                             <div key={i} className="flex flex-col w-full text-left">
                               <label className="mb-1 font-semibold text-black">Additional Social Link {i + 1}</label>
                               <input
                                 className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full"
                                 placeholder="https://..."
                                 value={projectAdditionalLinks[i]}
                                 onChange={e => {
                                   const newLinks = [...projectAdditionalLinks];
                                   newLinks[i] = e.target.value;
                                   setProjectAdditionalLinks(newLinks);
                                 }}
                               />
                               {errors[`projectAdditionalLinks${i}`] && (
                                 <div className="text-red-500 text-sm mt-1">{errors[`projectAdditionalLinks${i}`]}</div>
                               )}
                             </div>
                           ))}
                         </>
                       )}

                       {/* Optional Website */}
                       <div className="flex flex-col w-full text-left">
                         <label className="mb-1 font-semibold text-black">Website (optional)</label>
                         <input
                           className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full"
                           placeholder="https://..."
                           value={form.website}
                           onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                         />
                         {errors.website && <div className="text-red-500 text-sm mt-1">{errors.website}</div>}
                       </div>
                     </div>
                   </>
                 ) : (
                   <div className="text-center text-yellow-300 font-bold mb-4">Please select a type to continue</div>
                 )}

                 <div className="flex flex-col w-full text-left">
                   <label className="mb-1 font-semibold text-black">Bid Amount (SPRFD)</label>
                   <div className="space-y-1">
                     <input
                       type="number"
                       className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
                       placeholder={`Min bid: ${Number(auctionInfo.highestBid) > 0 ? (Number(auctionInfo.highestBid) + 1000).toFixed(2) : '1000.00'} SPRFD`}
                       value={form.bidAmount}
                       onChange={e => {
                         const value = e.target.value;
                         setForm(f => ({ ...f, bidAmount: value }));
                         
                         // Clear any existing bid amount error
                         setErrors(errs => ({ ...errs, bidAmount: '' }));
                         
                         if (value) {
                           const bidAmount = Number(value);
                           const minBid = Number(auctionInfo.highestBid) > 0 ? Number(auctionInfo.highestBid) + 1000 : 1000;
                           const balance = Number(userBalance);
                           
                           if (bidAmount < minBid) {
                             setErrors(errs => ({ ...errs, bidAmount: `Bid must be at least ${minBid.toFixed(2)} SPRFD (current highest + 1000)` }));
                           } else if (bidAmount > balance) {
                             setErrors(errs => ({ ...errs, bidAmount: `Insufficient balance. You have ${balance.toFixed(2)} SPRFD` }));
                           }
                         }
                       }}
                       min={Number(auctionInfo.highestBid) > 0 ? (Number(auctionInfo.highestBid) + 1000).toFixed(2) : '1000.00'}
                       step="0.01"
                     />
                     <div className="text-sm text-gray-600">
                       Your balance: {Number(userBalance).toFixed(2)} SPRFD
                     </div>
                     {errors.bidAmount && <div className="text-red-500 text-sm">{errors.bidAmount}</div>}
                   </div>
                 </div>

                 <div className="flex flex-col w-full text-left">
                   <label className="mb-1 font-semibold text-black">Image (max 600KB)</label>
                   <div 
                     className="border-2 border-dashed border-black rounded-lg p-6 text-center bg-white cursor-pointer hover:bg-gray-50 transition"
                     onClick={() => document.getElementById('auction-image-upload')?.click()}
                   >
                     {imagePreview ? (
                       <>
                         <p className="text-sm font-bold text-green-600 mb-1">✓ Image Selected</p>
                         <img src={imagePreview} alt="Preview" className="mt-2 rounded-md max-h-32 object-contain mx-auto" />
                         <p className="text-xs text-gray-500 mt-2">(Click to change)</p>
                       </>
                     ) : (
                       <>
                         <Upload className="mx-auto h-12 w-12 text-black mb-2" />
                         <p className="text-sm font-bold text-gray-700">Click to select an image</p>
                         <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 600KB</p>
                       </>
                     )}
                     <input
                       id="auction-image-upload"
                       type="file"
                       accept="image/*"
                       onChange={e => {
                         setImageFile(e.target.files);
                         const file = e.target.files?.[0];
                         if (file) {
                           if (!file.type.startsWith('image/') || file.size > 600 * 1024) {
                             setErrors(errs => ({ ...errs, imageFile: 'File must be an image under 600KB' }));
                             setImagePreview(null);
                           } else {
                             setErrors(errs => ({ ...errs, imageFile: '' }));
                             const reader = new FileReader();
                             reader.onload = ev => setImagePreview(ev.target?.result as string);
                             reader.readAsDataURL(file);
                           }
                         }
                       }}
                       className="hidden"
                     />
                   </div>
                   {errors.imageFile && <div className="text-red-500 text-sm mt-1">{errors.imageFile}</div>}
                 </div>

                 <div className="flex justify-between mt-4">
                   <button
                     type="button"
                     className="rounded-md px-6 py-2 text-lg font-bold border-2 border-black bg-gray-200 text-black hover:bg-gray-300 transition-all duration-200"
                     onClick={() => setUserType('')}
                   >
                     <ArrowLeft className="inline w-4 h-4 mr-1" /> Back
                   </button>
                   <button
                     type="submit"
                     className="rounded-md px-6 py-2 text-lg font-bold border-2 border-black bg-green-500 text-black hover:bg-green-400 transition-all duration-200 flex items-center"
                     disabled={uploading}
                   >
                     {uploading ? (
                       <>
                         <Loader2 className="animate-spin w-5 h-5 mr-2" />
                         Placing Bid...
                       </>
                     ) : (
                       <>
                         <ShoppingCart className="w-5 h-5 mr-2" />
                         Place Bid
                       </>
                     )}
                   </button>
                 </div>
               </form>
             )}



            {step === 'success' && (
              <div className="flex flex-col items-center justify-center w-full p-8">
                <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                <div className="text-xl font-bold text-yellow-300 mb-1 w-full text-center">Bid Placed Successfully!</div>
                <div className="text-md text-black mb-3 w-full text-center italic">Your bid is now live on the blockchain.</div>
                <div className="text-lg text-gray-700 text-center mb-2">
                  Amount: {form.bidAmount} SPRFD<br />
                  Auction ID: #{auctionInfo.auctionId}
                </div>
              </div>
            )}
          </div>
        )}

        {auctionState === 0 && (
          <p className="text-center font-bold text-yellow-300">Auction will start soon. Check back later!</p>
        )}

        {auctionState === 2 && (
          <p className="text-center font-bold text-yellow-300">This auction has ended. Check for the next one!</p>
        )}
      </div>
    </div>
  );
}