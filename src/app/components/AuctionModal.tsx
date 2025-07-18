import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  connectedAddress: string;
  contract: any;
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

// Add validation for project form fields and image, matching BuyModal
function validateAuctionProjectForm(form: typeof initialFormState, projectPrimaryPlatform: 'telegram' | 'discord' | 'x', projectPrimaryValue: string, projectAdditionalLinks: string[], imageFile: File | null) {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = 'Name is required.';
  if (imageFile == null) errors.imageFile = 'Image is required.';
  else if (!imageFile.type.startsWith('image/')) errors.imageFile = 'File must be an image.';
  else if (imageFile.size > 600 * 1024) errors.imageFile = 'Image must be less than 600KB.';
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

interface AuctionState {
  state: 'pending' | 'active' | 'ended';
  highestBid: string;
  highestBidder: string | null;
}

function AuctionModal({ open, onClose, connectedAddress, contract, tile }: AuctionModalProps) {
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false); // NEW: loading state for fetch
  const [fetchError, setFetchError] = useState(''); // NEW: error state for fetch
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refundEligible, setRefundEligible] = useState(false);
  const [refundAmount, setRefundAmount] = useState('0');
  const [isPayoutWallet, setIsPayoutWallet] = useState(false);
  const [winner, setWinner] = useState<{ address: string | null, amount: string } | null>(null);
  // Add form and imageFile state
  const [form, setForm] = useState({ name: '', telegram: '', discord: '', x: '', website: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Add state for project form fields
  const [projectPrimaryPlatform, setProjectPrimaryPlatform] = useState<'telegram' | 'discord' | 'x'>('telegram');
  const [projectPrimaryValue, setProjectPrimaryValue] = useState('');
  const [projectAdditionalLinks, setProjectAdditionalLinks] = useState(['', '']);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY;
  const DEPLOYER_ADDRESS = "0x95C46439bD9559e10c4fF49bfF3e20720d93B66E";
  const TILE_AUCTION_ADDRESS = "0x97453A4763b573B91b71392ba75961de9485a21d";
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  useEffect(() => {
    async function fetchState() {
      setFetching(true);
      setFetchError('');
      try {
        const res = await fetch(`${BACKEND_URL}/api/auction-state`);
        if (!res.ok) throw new Error('Failed to fetch auction state');
        const data = await res.json();
        setAuctionState(data);
        if (data.state === 'ended') setWinner({ address: data.highestBidder, amount: data.highestBid });
      } catch (e: any) {
        setAuctionState(null);
        setFetchError(e.message || 'Error fetching auction state');
      }
      setFetching(false);
    }
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!connectedAddress) return;
    fetch(`${BACKEND_URL}/api/refund-eligibility?address=${connectedAddress}`)
      .then(res => res.json())
      .then(data => {
        setRefundEligible(data.eligible);
        setRefundAmount(String(data.amount ?? '0'));
      });
  }, [connectedAddress, auctionState]);

  useEffect(() => {
    if (!connectedAddress) return;
    fetch(`${BACKEND_URL}/api/is-payout-wallet?address=${connectedAddress}`)
      .then(res => res.json())
      .then(data => setIsPayoutWallet(data.isPayoutWallet));
  }, [connectedAddress, auctionState]);

  // Only clear the file input and imageFile when the modal is closed or after a successful bid
  useEffect(() => {
    if (!open) {
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open]);

  async function handleBid() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Validate again for safety
      const errs = validateAuctionProjectForm(form, projectPrimaryPlatform, projectPrimaryValue, projectAdditionalLinks, imageFile);
      setErrors(errs);
      if (Object.keys(errs).length > 0) throw new Error('Please fill all required fields.');
      // 1. Upload image to IPFS (required)
      const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY!;
      const imageUpload = await lighthouse.upload([imageFile], apiKey);
      const imageCID = imageUpload.data.Hash;
      // 2. Prepare metadata
      const metadata: any = {
        name: form.name,
        primaryPlatform: projectPrimaryPlatform,
        primaryValue: projectPrimaryValue,
        additionalLinks: projectAdditionalLinks,
        website: form.website,
        imageCID,
        tile: tile?.id || null,
      };
      // 3. Upload metadata to IPFS
      const uploadRes = await lighthouse.uploadText(JSON.stringify(metadata), apiKey);
      const cid = uploadRes.data.Hash;
      // 4. Send CID to backend with bid
      const res = await fetch(`${BACKEND_URL}/api/place-bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: connectedAddress, amount: bidAmount, metadataCID: cid })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Bid validation failed');
      // 5. Send transaction to contract as before
      const tx = await contract.placeBid({ value: ethers.parseEther(bidAmount) });
        await tx.wait();
      setSuccess('Bid placed successfully!');
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      setError(e.message || String(e));
    }
    setLoading(false);
    }

  async function handleClaimRefund() {
    setLoading(true);
    setError('');
    try {
      const tx = await contract.claimRefund();
      await tx.wait();
      setSuccess('Refund claimed!');
    } catch (e: any) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }

  async function handlePayout() {
    setLoading(true);
    setError('');
    try {
      const tx = await contract.payout();
      await tx.wait();
      setSuccess('Payout successful!');
    } catch (e: any) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }

  // Ensure handleBackdropClick is defined before use
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Show a message if auctionState is null or auction is not active/ended
  const showNoAuction = !auctionState || (auctionState.state !== 'active' && auctionState.state !== 'ended');

  // Fix useMemo for formSection and use as a component
  const formSection = useMemo(() => {
    if (auctionState?.state !== 'active') return null;
    return (
      <form
        className="flex flex-col gap-4 w-full max-w-md mx-auto bg-blue-100 rounded-xl p-6 shadow-inner overflow-auto"
        style={{ maxHeight: '60vh' }}
        onSubmit={async e => {
          e.preventDefault();
          const errs = validateAuctionProjectForm(form, projectPrimaryPlatform, projectPrimaryValue, projectAdditionalLinks, imageFile);
          setErrors(errs);
          if (Object.keys(errs).length > 0) return;
          await handleBid();
        }}
        autoComplete="off"
      >
        <label className="font-semibold text-black">Project Name</label>
        <input
          className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full"
          placeholder="Name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        {errors.name && <div className="text-red-500 text-sm w-full mt-1">{errors.name}</div>}
        <label className="font-semibold text-black">Project Image (max 600KB)</label>
        <input
          type="file"
          accept="image/*"
          className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full"
          ref={fileInputRef}
          onChange={e => {
            const file = e.target.files?.[0] || null;
            setImageFile(file);
            setErrors(errs => ({ ...errs, imageFile: '' }));
            console.log('Selected file:', file);
          }}
        />
        {errors.imageFile && <div className="text-red-500 text-sm w-full mt-1">{errors.imageFile}</div>}
        <label className="font-semibold text-black">Primary Social Platform</label>
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
        {errors.projectPrimaryValue && <div className="text-red-500 text-sm w-full mt-1">{errors.projectPrimaryValue}</div>}
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
            {errors[`projectAdditionalLinks${i}`] && <div className="text-red-500 text-sm w-full mt-1">{errors[`projectAdditionalLinks${i}`]}</div>}
          </div>
        ))}
        <label className="font-semibold text-black">Website (optional)</label>
        <input
          className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full"
          placeholder="Website (optional)"
          value={form.website}
          onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
        />
        {errors.website && <div className="text-red-500 text-sm w-full mt-1">{errors.website}</div>}
        <label className="font-semibold text-black">Bid Amount (PEPU)</label>
        <input
          type="number"
          className="border rounded p-2 w-full my-2"
          value={bidAmount}
          onChange={e => setBidAmount(e.target.value)}
          placeholder="Bid amount in PEPU"
        />
        <button type="submit" disabled={loading} className="w-full bg-blue-600 border-2 border-black text-white py-2 rounded my-2 font-bold transition-all duration-200">
          {loading ? 'Placing Bid...' : 'Place Bid'}
        </button>
      </form>
    );
  }, [open, form, projectPrimaryPlatform, projectPrimaryValue, projectAdditionalLinks, imageFile, errors, bidAmount, loading, auctionState?.state]);

  if (!open) return null;

  // Modal backdrop click handler (close on outside click)
  // Remove any stray 'if' prop or <HTMLDivElement> usage
  // Show a message if auctionState is null or auction is not active/ended
  // In the return, replace the form section with {formSection}
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      style={{ pointerEvents: 'auto' }}
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-md mx-2 sm:mx-4 bg-blue-700 border-4 border-black rounded-2xl shadow-2xl p-6 flex flex-col items-start animate-fadeIn overflow-auto"
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
        <h2 className="text-2xl font-bold mb-4 w-full text-center text-yellow-500">Auction</h2>
        {fetching ? (
          <div className="flex flex-col items-center justify-center w-full py-8">
            <Loader2 className="animate-spin w-8 h-8 mb-2 text-blue-500" />
            <div className="text-lg font-semibold text-blue-600">Loading auction state...</div>
          </div>
        ) : fetchError || !auctionState || (auctionState.state !== 'active' && auctionState.state !== 'ended') ? (
          <div className="text-center text-lg font-semibold text-red-600 py-8 w-full">
            No auction is currently running.
            {error && <div className="error mt-2">{error}</div>}
          </div>
        ) : (
          <>
            <div className="w-full mb-4">
              <div className="bg-white/90 border-2 border-black rounded-lg p-4 flex flex-col gap-2 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 text-lg">Status:</span>
                  <span className="font-semibold text-blue-700 capitalize">{auctionState?.state}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 text-lg">Highest Bid:</span>
                  <span className="font-semibold text-green-700">{auctionState ? ethers.formatEther(auctionState.highestBid || '0') : '0'} PEPU</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 text-lg">Highest Bidder:</span>
                  <span className="font-mono text-gray-700 text-sm break-all">{auctionState?.highestBidder || '—'}</span>
                </div>
              </div>
            </div>
            {formSection}
            {refundEligible && (
              <button onClick={handleClaimRefund} disabled={loading} className="w-full bg-yellow-500 text-white py-2 rounded my-2">
                {loading ? 'Claiming...' : `Claim Refund (${ethers.formatEther(refundAmount || '0')} PEPU)`}
          </button>
            )}
            {auctionState?.state === 'ended' && isPayoutWallet && (
              <button onClick={handlePayout} disabled={loading} className="w-full bg-green-600 text-white py-2 rounded my-2">
                {loading ? 'Paying out...' : 'Payout to Wallet'}
          </button>
            )}
            {auctionState?.state === 'ended' && winner && (
              <div className="my-4 text-center">
                <h3 className="font-bold">Winner</h3>
                <div>Address: {winner.address}</div>
                <div>Amount: {ethers.formatEther(winner.amount || '0')} PEPU</div>
              </div>
        )}
            {error && <div className="error text-red-600">{error}</div>}
            {success && <div className="success text-green-600">{success}</div>}
          </>
        )}
      </div>
    </div>
  );
}

// Add types to areEqual function
function areEqual(prevProps: AuctionModalProps, nextProps: AuctionModalProps) {
  return (
    prevProps.open === nextProps.open &&
    prevProps.tile?.id === nextProps.tile?.id
  );
}

export default React.memo(AuctionModal, areEqual); 