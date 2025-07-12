import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Wallet, Users, Globe, Send, ArrowRight, ArrowLeft, Loader2, Gavel, CheckCircle2, Clock } from 'lucide-react';
import { TOKENS } from '../../supportedTokens';
import { ethers } from 'ethers';
import Image from 'next/image';
import lighthouse from '@lighthouse-web3/sdk';

// Utility to format addresses (shorten for display)
function formatAddress(addr: string) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

// Modal Props
interface AuctionModalProps {
  open: boolean;
  onClose: () => void;
  tile: any;
}

type Step = 'status' | 'form' | 'bid' | 'success';

const initialFormState = {
  name: '',
  telegram: '',
  discord: '',
  x: '',
  website: '',
};

const springfieldBlue = 'bg-blue-500';
const springfieldBorder = 'border-4 border-black';
const springfieldFont = 'font-bold';
const springfieldButton = 'rounded-md px-6 py-2 text-lg font-bold border-2 border-black transition-all duration-200';

function validateProjectForm(form: typeof initialFormState, projectPrimaryPlatform: 'telegram' | 'discord' | 'x', projectPrimaryValue: string, projectAdditionalLinks: string[], imageFile: File | null) {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = 'Name is required.';
  
  // Image validation
  if (imageFile) {
    if (!imageFile.type.startsWith('image/')) {
      errors.imageFile = 'File must be an image.';
    } else if (imageFile.size > 600 * 1024) {
      errors.imageFile = 'Image must be less than 600KB.';
    }
  }
  
  // Project validation
  if (!projectPrimaryValue || !projectPrimaryValue.trim()) {
    errors.projectPrimaryValue = 'Primary social link is required.';
  } else {
    if (projectPrimaryPlatform === 'telegram') {
      if (!/^https:\/\/t\.me\/(\+|c\/|[a-zA-Z0-9_]{5,})/.test(projectPrimaryValue)) {
        errors.projectPrimaryValue = 'Must be a valid Telegram group/channel link.';
      }
    } else if (projectPrimaryPlatform === 'discord') {
      if (!/^https:\/\/(discord\.gg|discord\.com\/invite)\/[\w-]+$/.test(projectPrimaryValue)) {
        errors.projectPrimaryValue = 'Must be a valid Discord server invite link.';
      }
    } else if (projectPrimaryPlatform === 'x') {
      if (!/^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}$/.test(projectPrimaryValue)) {
        errors.projectPrimaryValue = 'Must be a valid X (Twitter) profile link.';
      }
    }
  }
  
  // At least one additional social link required
  if (!projectAdditionalLinks || (!projectAdditionalLinks[0].trim() && !projectAdditionalLinks[1].trim())) {
    errors.projectAdditionalLinks0 = 'At least one additional social link is required.';
    errors.projectAdditionalLinks1 = 'At least one additional social link is required.';
  } else {
    projectAdditionalLinks.forEach((link, i) => {
      if (link && !/^https?:\/\/.+\..+/.test(link)) {
        errors[`projectAdditionalLinks${i}`] = 'Must be a valid URL.';
      }
    });
  }
  
  if (form.website) {
    if (!/^https?:\/\/.+\..+/.test(form.website)) {
      errors.website = 'Must be a valid website URL.';
    }
  }
  
  return errors;
}

export default function AuctionModal({ open, onClose, tile }: AuctionModalProps) {
  let content;
  const [step, setStep] = useState<Step>('status');
  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bidAmount, setBidAmount] = useState<string>('');
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [projectPrimaryPlatform, setProjectPrimaryPlatform] = useState<'telegram' | 'discord' | 'x'>('telegram');
  const [projectPrimaryValue, setProjectPrimaryValue] = useState('');
  const [projectAdditionalLinks, setProjectAdditionalLinks] = useState(['', '']);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sprfdBalance, setSprfdBalance] = useState<string>('');
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showFinalSuccess, setShowFinalSuccess] = useState(false);
  const [auctionEndTime, setAuctionEndTime] = useState<Date | null>(null);
  const [auctionState, setAuctionState] = useState<any>(null);
  const [userRefund, setUserRefund] = useState<string>('0');
  const [isAuctionEnded, setIsAuctionEnded] = useState(false);
  const [isCurrentHighestBidder, setIsCurrentHighestBidder] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [winnerDetails, setWinnerDetails] = useState<any>(null);
  const [claimingRefund, setClaimingRefund] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY;
  const DEPLOYER_ADDRESS = "0x95C46439bD9559e10c4fF49bfF3e20720d93B66E";
  const TILE_AUCTION_ADDRESS = "0x03C3e737F56ec7bd812918060A1422FDA50D8505"; // New deployed address with simplified contract

  // Reset modal state only when opened
  useEffect(() => {
    if (open) {
      setStep('status');
      setForm(initialFormState);
      setErrors({});
      setBidAmount('');
      setLoadingPrice(false);
      setSubmitting(false);
      setShowSuccess(false);
      setProjectPrimaryPlatform('telegram');
      setProjectPrimaryValue('');
      setProjectAdditionalLinks(['', '']);
      setImageFile(null);
      setImagePreview(null);
      setSprfdBalance('');
      setSelectedToken(TOKENS[0]);
      setConnectedAddress(null);
      setUploading(false);
      setErrorMsg(null);
      setSuccessMsg(null);
      setShowFinalSuccess(false);
      // Set auction end time to 1 minute from now
      setAuctionEndTime(new Date(Date.now() + 1 * 60 * 1000));
    }
  }, [open]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Fetch selected token wallet balance in bid step
  useEffect(() => {
    async function fetchBalance() {
      if (step === 'bid' && open && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const userAddress = await signer.getAddress();
          if (selectedToken.isNative) {
            const balance = await provider.getBalance(userAddress);
            setSprfdBalance(ethers.formatUnits(balance, 18));
          } else {
            if (!selectedToken.address) throw new Error('No address for ERC20 token');
            try {
              const implementationContract = new ethers.Contract(
                "0xE8a859a25249c8A5b9F44059937145FC67d65eD4",
                ["function balanceOf(address owner) view returns (uint256)", "function decimals() view returns (uint8)"],
                provider
              );
              
              const [balance, decimals] = await Promise.all([
                implementationContract.balanceOf(userAddress),
                implementationContract.decimals()
              ]);
              
              if (!balance || balance.toString() === "0" || balance.toString().includes("-")) {
                console.log("Invalid balance from implementation, trying proxy...");
                const proxyContract = new ethers.Contract(
                  selectedToken.address,
                  ["function balanceOf(address owner) view returns (uint256)"],
                  provider
                );
                const proxyBalance = await proxyContract.balanceOf(userAddress);
                setSprfdBalance(ethers.formatUnits(proxyBalance, 18));
              } else {
                setSprfdBalance(ethers.formatUnits(balance, decimals));
              }
            } catch (err) {
              console.error("Failed to fetch PENK balance:", err);
              setSprfdBalance('');
            }
          }
        } catch (e) {
          setSprfdBalance('');
        }
      }
    }
    fetchBalance();
  }, [step, open, selectedToken]);

  // Prevent modal from closing on background click or event bubbling
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (step === 'success' && e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
      }
    }
    if (open) {
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [open, step]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (step === 'success') {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Fetch and set connected wallet address when modal opens
  useEffect(() => {
    async function fetchAddress() {
      if (open && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const addr = await signer.getAddress();
          setConnectedAddress(addr);
        } catch (e) {
          setConnectedAddress(null);
        }
      }
    }
    fetchAddress();
  }, [open]);

  // Fetch auction state and user refund eligibility on modal open
  useEffect(() => {
    async function fetchAuctionState() {
      if (!open || !tile?.id || !window.ethereum) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        const tileAuction = new ethers.Contract(
          TILE_AUCTION_ADDRESS,
          [
            "function getAuction(uint256) view returns (address,uint256,uint256,bool,address,bool,string)",
            "function getBid(uint256,address) view returns (uint256)"
          ],
          provider
        );
        const [highestBidder, highestBid, endTime, ended, , , metadataCID] = await tileAuction.getAuction(parseInt(tile.id));
        const refund = await tileAuction.getBid(parseInt(tile.id), userAddress);
        
        // Check if auction exists (highestBidder is not zero address)
        const auctionExists = highestBidder !== "0x0000000000000000000000000000000000000000";
        
        if (auctionExists) {
          setAuctionState({ highestBidder, highestBid, endTime, ended, metadataCID });
          setUserRefund(refund.toString());
          setIsAuctionEnded(ended);
          setIsCurrentHighestBidder(userAddress.toLowerCase() === highestBidder.toLowerCase());
          setIsWinner(ended && userAddress.toLowerCase() === highestBidder.toLowerCase());
          
          // If there's metadata CID, fetch the project details from IPFS
          if (metadataCID && metadataCID !== "") {
            try {
              const url = `https://gateway.lighthouse.storage/ipfs/${metadataCID}`;
              const res = await fetch(url);
              const metadata = await res.json();
              setWinnerDetails(metadata);
              console.log('Fetched auction metadata from IPFS:', metadata);
            } catch (ipfsError) {
              console.error('Error fetching metadata from IPFS:', ipfsError);
              setWinnerDetails(null);
            }
          } else {
            setWinnerDetails(null);
          }
        } else {
          // No auction exists
          setAuctionState(null);
          setUserRefund('0');
          setIsAuctionEnded(false);
          setIsCurrentHighestBidder(false);
          setIsWinner(false);
          setWinnerDetails(null);
        }
      } catch (e) {
        setAuctionState(null);
        setUserRefund('0');
        setIsAuctionEnded(false);
        setIsCurrentHighestBidder(false);
        setIsWinner(false);
      }
    }
    fetchAuctionState();
  }, [open, tile?.id]);

  // Lighthouse upload logic
  const handleBid = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!imageFile) {
      setErrorMsg("No image selected!");
      return;
    }
    if (!apiKey) {
      setErrorMsg("Lighthouse API key missing!");
      return;
    }
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setErrorMsg("Please enter a valid bid amount!");
      return;
    }
    
    setUploading(true);
    try {
      // 1. Upload image to IPFS first
      const imageRes = await lighthouse.upload([imageFile], apiKey);
      const imageCID = imageRes.data.Hash;
      
      // 2. Prepare details JSON
      const details = {
        tile: tile?.id || null,
        name: form.name,
        socials: {
          primary: { [projectPrimaryPlatform]: projectPrimaryValue },
          additional: projectAdditionalLinks,
        },
        website: form.website,
        address: connectedAddress,
        imageCID,
        auctionEndTime: auctionEndTime?.toISOString(),
        bidAmount: bidAmount,
        bidToken: selectedToken.name,
        isAuction: true,
      };
      const detailsText = JSON.stringify(details, null, 2);
      
      // 3. Upload details JSON to IPFS
      const textRes = await lighthouse.uploadText(detailsText, apiKey, form.name || "auction_details");
      const detailsCID = textRes.data.Hash;
      
      console.log("Image CID:", imageCID);
      console.log("Details CID:", detailsCID);
      
      // 4. Send token transfer and store details in contract
      if (!window.ethereum) throw new Error("Wallet not found");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      let erc20;
      let decimals;
      let amount;
      let balance;

      if (selectedToken.isNative) {
        const nativeAmount = ethers.parseUnits(String(bidAmount), 18);
        balance = await provider.getBalance(userAddress);
        if (balance < nativeAmount) {
          setErrorMsg(`Insufficient ${selectedToken.name} balance for this bid.`);
          setUploading(false);
          return;
        }
        const tileAuction = new ethers.Contract(
          TILE_AUCTION_ADDRESS,
          ["function placeBidNative(uint256 tileId, string memory metadataCID) external payable"],
          signer
        );
        const tx = await tileAuction.placeBidNative(
          parseInt(tile?.id) || 0,
          detailsCID,
          { value: nativeAmount }
        );
        await tx.wait();
      } else {
        if (!selectedToken.address) throw new Error('No address for ERC20 token');
        erc20 = new ethers.Contract(
          selectedToken.address,
          [
            "function transfer(address to, uint256 amount) returns (bool)",
            "function decimals() view returns (uint8)",
            "function balanceOf(address owner) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)"
          ],
          signer
        );
        decimals = await erc20.decimals();
        amount = ethers.parseUnits(String(bidAmount), decimals);
        balance = await erc20.balanceOf(userAddress);
        if (balance < amount) {
          setErrorMsg(`Insufficient ${selectedToken.name} balance for this bid.`);
          setUploading(false);
          return;
        }
        const approveTx = await erc20.approve(TILE_AUCTION_ADDRESS, amount);
        await approveTx.wait();
        const tileAuction = new ethers.Contract(
          TILE_AUCTION_ADDRESS,
          ["function placeBid(uint256 tileId, uint256 amount, string memory metadataCID) external"],
          signer
        );
        const tx = await tileAuction.placeBid(
          parseInt(tile?.id) || 0,
          amount,
          detailsCID
        );
        await tx.wait();
      }

      setSuccessMsg("Auction bid successful!");
      setStep('success');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 10000);
    } catch (e: any) {
      setErrorMsg(e.message || "Token transfer or upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Helper to format time left
  const getTimeLeft = useCallback(() => {
    if (!auctionState || !auctionState.endTime) return '';
    if (auctionState.ended) return 'Auction Ended';
    const now = Date.now();
    const end = Number(auctionState.endTime) * 1000; // Convert seconds to ms
    const diff = end - now;
    if (diff <= 0) return 'Auction Ended';
    const min = Math.floor(diff / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    return `${min}m ${sec}s`;
  }, [auctionState]);



  // Claim refund logic
  const handleClaimRefund = async () => {
    setClaimingRefund(true);
    setErrorMsg(null);
    try {
      if (!window.ethereum) throw new Error('Wallet not found');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tileAuction = new ethers.Contract(
        TILE_AUCTION_ADDRESS,
        ["function claimRefund(uint256)"],
        signer
      );
      const tx = await tileAuction.claimRefund(parseInt(tile.id));
      await tx.wait();
      setSuccessMsg('Refund claimed!');
      setUserRefund('0');
    } catch (e: any) {
      setErrorMsg(e.message || 'Refund failed');
    } finally {
      setClaimingRefund(false);
    }
  };

  // Status step (default)
  if (step === 'status') {
    content = (
      <div className="flex flex-col items-center gap-4 w-full p-4">
        <h2 className={`text-2xl ${springfieldFont} text-yellow-300 mb-2 w-full text-center`}>Auction Status</h2>
        {auctionState ? (
          <>
            <div className="w-full max-w-xs mb-2">
              <div className="flex flex-col gap-1 text-black bg-white rounded-md p-4 border-2 border-black">
                <div><span className="font-bold text-yellow-500">Current Highest Bid:</span> <span className="font-bold">{ethers.formatUnits(auctionState.highestBid || 0, 18)} PENK/PEPU</span></div>
                <div><span className="font-bold text-yellow-500">Highest Bidder:</span> <span className="font-bold">{formatAddress(auctionState.highestBidder)}</span></div>
                <div><span className="font-bold text-yellow-500">Time Left:</span> <span className="font-bold">{getTimeLeft()}</span></div>
              </div>
            </div>
            {userRefund !== '0' && !isCurrentHighestBidder && (
              <button className="w-full py-2 rounded-lg bg-blue-500 text-white font-bold border-2 border-blue-700 hover:bg-blue-400 transition shadow" onClick={handleClaimRefund} disabled={claimingRefund}>
                {claimingRefund ? 'Claiming...' : 'Claim Refund'}
              </button>
            )}
            {!isAuctionEnded && !isCurrentHighestBidder && (
              <button
                className="w-full py-2 rounded-lg bg-green-500 text-black font-bold border-2 border-green-700 hover:bg-green-400 transition shadow"
                onClick={() => setStep('form')}
              >
                Place Bid
              </button>
            )}
            {isAuctionEnded && winnerDetails && (
              <div className="w-full mt-4 bg-white border-2 border-black rounded-md p-4">
                <h3 className="text-lg font-bold text-green-700 mb-2 text-center">Winner: {winnerDetails.name}</h3>
                <img src={`https://gateway.lighthouse.storage/ipfs/${winnerDetails.imageCID}`} alt="Winner" className="w-32 h-32 object-contain rounded mb-3 border border-black bg-white mx-auto" />
                <div className="mb-1 text-center"><span className="font-semibold text-gray-700">Primary:</span> <a href={winnerDetails.socials?.primary && Object.values(winnerDetails.socials.primary)[0]} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline break-all">{winnerDetails.socials?.primary && Object.values(winnerDetails.socials.primary)[0]}</a></div>
                <div className="mb-1 text-center"><span className="font-semibold text-gray-700">Additional:</span> <span className="text-black">{winnerDetails.socials?.additional?.filter(Boolean).join(', ')}</span></div>
                {winnerDetails.website && <div className="mb-1 text-center"><span className="font-semibold text-gray-700">Website:</span> <a href={winnerDetails.website} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline break-all">{winnerDetails.website}</a></div>}
                <div className="text-xs text-gray-500 text-center mt-2 break-all w-full">Owner: {auctionState.highestBidder}</div>
              </div>
            )}
          </>
        ) : (
          <div className="text-black text-center">
            <div className="mb-4">No auction currently active for this tile.</div>
            <button
              className="w-full py-2 rounded-lg bg-green-500 text-black font-bold border-2 border-green-700 hover:bg-green-400 transition shadow"
              onClick={() => setStep('form')}
            >
              Start Auction
            </button>
          </div>
        )}
      </div>
    );
  }

  // Form step
  if (step === 'form') {
    content = (
      <form
        className="flex flex-col gap-4 w-full max-w-md mx-auto overflow-visible"
        onSubmit={e => {
          e.preventDefault();
          const errs = validateProjectForm(form, projectPrimaryPlatform, projectPrimaryValue, projectAdditionalLinks, imageFile);
          if (!imageFile) {
            errs.imageFile = 'Image is required.';
          }
          setErrors(errs);
          if (Object.keys(errs).length === 0) {
            setStep('bid');
          }
        }}
        autoComplete="off"
      >
        <h2 className={`text-xl ${springfieldFont} text-yellow-300 mb-4 w-full text-center`}>Project Auction Details</h2>
        
        <div className="flex flex-col w-full text-left">
          <label className="mb-1 font-semibold text-black" htmlFor="name">Project Name</label>
          <input
            id="name"
            className="rounded-md border-2 border-black px-4 py-2 ${springfieldFont} bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-400 w-full text-left"
            placeholder="Project Name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          {errors.name && <div className="text-red-500 text-sm text-left w-full mt-1">{errors.name}</div>}
        </div>
        
        <div className="flex flex-col w-full text-left">
          <label className="mb-1 font-semibold text-black" htmlFor="imageFile">Project Image (max 600KB)</label>
          <input
            id="imageFile"
            type="file"
            accept="image/*"
            className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full"
            onChange={e => {
              const file = e.target.files?.[0] || null;
              setImageFile(file);
              setErrors(errs => ({ ...errs, imageFile: '' }));
              if (file) {
                if (!file.type.startsWith('image/') || file.size > 600 * 1024) {
                  setImagePreview(null);
                } else {
                  const reader = new FileReader();
                  reader.onload = ev => setImagePreview(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }
              }
            }}
          />
          {errors.imageFile && <div className="text-red-500 text-sm text-left w-full mt-1">{errors.imageFile}</div>}
          {imagePreview && (
            <img src={imagePreview} alt="Preview" className="mt-2 rounded-md border-2 border-black max-h-32 object-contain bg-white" />
          )}
        </div>
        
        <div className="flex flex-col w-full text-left">
          <label className="mb-1 font-semibold text-black" htmlFor="projectPrimaryPlatform">Primary Social Link</label>
          <select
            id="projectPrimaryPlatform"
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
          {errors.projectPrimaryValue && <div className="text-red-500 text-sm text-left w-full mt-1">{errors.projectPrimaryValue}</div>}
        </div>
        
        {[0, 1].map(i => (
          <div className="flex flex-col w-full text-left" key={i}>
            <label className="mb-1 font-semibold text-black">Additional Social Link {i + 1}</label>
            <input
              className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full"
              placeholder="Any valid social or website link"
              value={projectAdditionalLinks[i]}
              onChange={e => setProjectAdditionalLinks(links => {
                const newLinks = [...links];
                newLinks[i] = e.target.value;
                return newLinks;
              })}
            />
            {errors[`projectAdditionalLinks${i}`] && <div className="text-red-500 text-sm text-left w-full mt-1">{errors[`projectAdditionalLinks${i}`]}</div>}
          </div>
        ))}
        
        <div className="flex flex-col w-full text-left">
          <label className="mb-1 font-semibold text-black" htmlFor="website">Website</label>
          <input
            id="website"
            className="rounded-md border-2 border-black px-4 py-2 ${springfieldFont} bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-400 w-full text-left"
            placeholder="Website (optional)"
            value={form.website}
            onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
          />
          {errors.website && <div className="text-red-500 text-sm text-left w-full mt-1">{errors.website}</div>}
        </div>
        
        <div className="flex justify-between mt-4 w-full">
          <button
            type="button"
            className={`${springfieldButton} bg-gray-200 text-black hover:bg-gray-300`}
            onClick={onClose}
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" /> Cancel
          </button>
          <button
            type="submit"
            className={`${springfieldButton} bg-yellow-300 text-black hover:bg-yellow-200`}
          >
            Next <ArrowRight className="inline w-4 h-4 ml-1" />
          </button>
        </div>
      </form>
    );
  } else if (step === 'bid') {
    content = (
      <div className="flex flex-col items-center gap-4 w-full p-4">
        <h2 className={`text-2xl ${springfieldFont} text-yellow-300 mb-2 w-full text-center`}>Place Your Bid</h2>
        
        <div className="w-full max-w-xs mb-2">
          <select
            className="w-32 px-2 py-1 rounded-md border-2 border-black bg-green-500 text-black font-bold text-sm outline-none"
            value={selectedToken.isNative ? "PEPU_NATIVE" : selectedToken.address}
            onChange={e => {
              const value = e.target.value;
              const token = value === "PEPU_NATIVE"
                ? TOKENS.find(t => t.isNative)
                : TOKENS.find(t => t.address === value);
              if (token) setSelectedToken(token);
            }}
          >
            {TOKENS.map(token => (
              <option
                key={token.address ?? "PEPU_NATIVE"}
                value={token.isNative ? "PEPU_NATIVE" : token.address}
                className="text-black"
              >
                {token.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="w-full max-w-xs flex flex-col items-stretch mb-2">
          <label className="block text-sm font-semibold text-black mb-1 ml-1">Bid Amount</label>
          <div className="flex items-center border-2 border-black rounded-lg px-3 py-2 bg-white min-w-0">
            <div className="flex flex-nowrap items-center mr-2">
              <div className="rounded-full bg-white border-2 border-black w-7 h-7 flex items-center justify-center overflow-hidden">
                <Image src={selectedToken.logo} alt={selectedToken.name + ' Logo'} width={28} height={28} className="object-cover w-full h-full" />
              </div>
              <span className="ml-2 text-xs font-bold text-yellow-500 whitespace-nowrap">{selectedToken.name}</span>
            </div>
            <input
              type="number"
              className="bg-transparent text-base font-extrabold font-mono text-black flex-1 outline-none border-none text-right max-w-full min-w-0 truncate"
              value={bidAmount}
              onChange={e => setBidAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}
            />
          </div>
          <div className="text-xs text-black mt-1 text-right pr-1">
            {sprfdBalance} available
          </div>
        </div>
        
        <div className="bg-white rounded-md p-4 border-2 border-black w-full max-w-xs text-black text-left mb-2 shadow-sm flex flex-col gap-1">
          <div className="mb-1"><span className="font-bold text-yellow-500">Tile:</span> <span className="font-bold text-black">{tile?.id || 'N/A'}</span></div>
          <div className="mb-1"><span className="font-bold text-yellow-500">Project:</span> <span className="font-bold text-black">{form.name}</span></div>
          <div className="mb-1"><span className="font-bold text-yellow-500">Primary:</span> <span className="font-bold text-black">{projectPrimaryPlatform}: {projectPrimaryValue}</span></div>
          <div className="mb-1"><span className="font-bold text-yellow-500">Additional:</span> <span className="font-bold text-black">{projectAdditionalLinks.filter(Boolean).join(', ')}</span></div>
          {form.website && <div className="mb-1"><span className="font-bold text-yellow-500">Website:</span> <span className="font-bold text-black">{form.website}</span></div>}
          <div className="mb-1"><span className="font-bold text-yellow-500">Auction Duration:</span> <span className="font-bold text-black">5 minutes</span></div>
        </div>
        
        {imagePreview && (
          <div className="flex justify-center mb-2">
            <img
              src={imagePreview}
              alt="Selected"
              className="rounded-md border-2 border-yellow-500 max-h-32 max-w-full object-contain"
            />
          </div>
        )}
        
        {errorMsg && <div className="text-red-600 font-bold text-center mb-2">{errorMsg}</div>}
        {successMsg && <div className="text-green-600 font-bold text-center mb-2">{successMsg}</div>}
        
        <button
          className="w-full py-2 mt-2 rounded-lg bg-green-500 text-black font-bold text-lg border-2 border-green-700 hover:bg-green-400 transition shadow flex items-center justify-center gap-2"
          disabled={uploading || !bidAmount || parseFloat(bidAmount) <= 0}
          onClick={handleBid}
        >
          {uploading ? <Loader2 className="animate-spin w-5 h-5 mr-1" /> : <Gavel className="w-5 h-5 mr-1" />}
          {uploading ? 'Placing Bid...' : 'Place Bid'}
        </button>
      </div>
    );
  }

  // Success step
  if (step === 'success') {
    content = (
      <div className="flex flex-col items-center justify-center w-full p-8">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <div className={`text-xl font-bold text-yellow-300 mb-1 w-full text-center`}>Auction Bid Placed!</div>
        <div className={`text-md text-black mb-3 w-full text-center italic`}>Your bid is now active for 5 minutes.</div>
        <div className="text-2xl font-bold text-green-600 mb-2 text-center">Bid: {bidAmount} {selectedToken.name}</div>
        <div className="text-lg text-gray-700 text-center mb-2">
          Auction ends: {auctionEndTime?.toLocaleString()}<br />
          If no higher bid, you'll own the tile!
        </div>
      </div>
    );
  }

  if (!open) return null;

  return (
    <div
      className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ pointerEvents: 'auto' }}
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`relative w-full max-w-md mx-2 sm:mx-4 ${springfieldBlue} ${springfieldBorder} rounded-2xl shadow-2xl p-2 sm:p-4 md:p-6 flex flex-col items-start animate-fadeIn overflow-auto`}
        style={{ pointerEvents: 'auto', maxHeight: '90vh', wordBreak: 'break-word' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          onClick={onClose}
          aria-label="Close modal"
          tabIndex={0}
        >
          <X className="w-6 h-6" />
        </button>
        {content}
      </div>
    </div>
  );
} 