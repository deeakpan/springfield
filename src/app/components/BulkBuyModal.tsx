'use client';
import React, { useEffect, useRef, useState } from 'react';
import { X, User, Users, ArrowLeft, ArrowRight, Loader2, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { ethers } from 'ethers';

interface BulkBuyModalProps {
  open: boolean;
  onClose: () => void;
  tileIds: number[];
}

type Step = 'choose' | 'form' | 'price' | 'success';
type UserType = 'project' | 'user' | null;

const initialFormState = {
  name: '',
  telegram: '',
  discord: '',
  x: '',
  website: '',
};

// Pricing model constants (same as pricing page)
const TOTAL_TILES = 765;
const TIER_SIZE = 40; // every 40 sold
const BASE_PRICE = 12000; // PEPU starting price
const TIER_INCREMENT = 600; // +600 PEPU per tier

// Function to calculate current tile price based on tiles sold
const calculateCurrentPrice = (tilesSold: number): number => {
  const tier = Math.floor(tilesSold / TIER_SIZE);
  return BASE_PRICE + (tier * TIER_INCREMENT);
};

export default function BulkBuyModal({ open, onClose, tileIds }: BulkBuyModalProps) {
  const [step, setStep] = useState<Step>('choose');
  const [userType, setUserType] = useState<UserType>(null);
  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pricePerTile, setPricePerTile] = useState<string>('0');
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<FileList | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userSocialPlatform, setUserSocialPlatform] = useState<'telegram' | 'discord' | 'x'>('telegram');
  const [userSocialValue, setUserSocialValue] = useState('');
  const [projectPrimaryPlatform, setProjectPrimaryPlatform] = useState<'telegram' | 'discord' | 'x'>('telegram');
  const [projectPrimaryValue, setProjectPrimaryValue] = useState('');
  const [projectAdditionalLinks, setProjectAdditionalLinks] = useState(['', '']);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const TILE_PURCHASE_ADDRESS = process.env.NEXT_PUBLIC_TILE_CONTRACT;

  // Function to fetch current tile price from contract
  const fetchCurrentPrice = async () => {
    if (!process.env.NEXT_PUBLIC_RPC_URL || !process.env.NEXT_PUBLIC_TILE_CORE_ADDRESS) {
      console.error('Missing RPC URL or TileCore address');
      return;
    }

    try {
      setLoadingPrice(true);
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const tileCore = new ethers.Contract(
        process.env.NEXT_PUBLIC_TILE_CORE_ADDRESS,
        ["function totalTilesCount() external view returns (uint256)"],
        provider
      );
      
      const totalTilesCount = await tileCore.totalTilesCount();
      const tilesSold = Number(totalTilesCount);
      const currentPrice = calculateCurrentPrice(tilesSold);
      
      console.log(`Total tiles sold: ${tilesSold}, Current price: ${currentPrice} PEPU`);
      setPricePerTile(currentPrice.toString());
    } catch (error) {
      console.error('Error fetching current price:', error);
      // Fallback to base price if contract call fails
      setPricePerTile(BASE_PRICE.toString());
    } finally {
      setLoadingPrice(false);
    }
  };

  useEffect(() => {
    if (open) {
      setStep('choose');
      setUserType(null);
      setForm(initialFormState);
      setErrors({});
      setLoadingPrice(false);
      setUploading(false);
      setSuccessMsg(null);
      setErrorMsg(null);
      setUserSocialPlatform('telegram');
      setUserSocialValue('');
      setProjectPrimaryPlatform('telegram');
      setProjectPrimaryValue('');
      setProjectAdditionalLinks(['', '']);
      setImageFile(null);
      setImagePreview(null);
    }
  }, [open]);

  useEffect(() => {
    async function fetchAddress() {
      if (open && (window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const signer = await provider.getSigner();
          const addr = await signer.getAddress();
          setConnectedAddress(addr);
        } catch {
          setConnectedAddress(null);
        }
      }
    }
    fetchAddress();
  }, [open]);

  useEffect(() => {
    if (step === 'price' && open) {
      fetchCurrentPrice();
    }
  }, [step, open]);

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
  const fetchWithTimeout = async (input: RequestInfo, init: RequestInit & { timeoutMs?: number } = {}) => {
    const { timeoutMs = 15000, ...rest } = init;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...rest, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  };
  const withRetry = async <T,>(fn: () => Promise<T>, retries = 2, backoffMs = 400): Promise<T> => {
    let attempt = 0;
    while (true) {
      try { return await fn(); } catch (e) {
        attempt += 1; if (attempt > retries) throw e; await delay(backoffMs * attempt);
      }
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!userType) errs.type = 'Please select a type';
    if (!form.name.trim()) errs.name = 'Name is required';
    const file = imageFile && imageFile[0];
    if (!file) errs.imageFile = 'Image is required';
    if (file) {
      if (!file.type.startsWith('image/')) errs.imageFile = 'File must be an image';
      else if (file.size > 600 * 1024) errs.imageFile = 'Image must be less than 600KB';
    }
    if (userType === 'user') {
      if (!userSocialValue.trim()) errs.userSocialValue = 'Username/ID is required';
    } else if (userType === 'project') {
      if (!projectPrimaryValue.trim()) errs.projectPrimaryValue = 'Primary social link is required';
      if (!projectAdditionalLinks[0].trim() && !projectAdditionalLinks[1].trim()) {
        errs.projectAdditionalLinks0 = 'At least one additional social link is required';
        errs.projectAdditionalLinks1 = 'At least one additional social link is required';
      }
    }
    return errs;
  };

  const handleBulkBuy = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (!tileIds || tileIds.length === 0) { setErrorMsg('No tiles selected'); return; }
    if (!TILE_PURCHASE_ADDRESS) { setErrorMsg('Contract address not configured'); return; }

    const file = imageFile![0];
    setUploading(true);
    try {
      // 1) Upload image once
      const imageCID = await withRetry(async () => {
        const fd = new FormData();
        fd.append('file', file);
        const resp = await fetchWithTimeout('/api/upload/image', { method: 'POST', body: fd, timeoutMs: 15000 });
        if (!resp.ok) { let msg = 'Image upload failed'; try { const j = await resp.json(); msg = j.error || msg; } catch {} throw new Error(msg); }
        const j = await resp.json();
        return j.cid as string;
      });

      // 2) Prepare and upload metadata once
      const metadata = {
        tile: 'bulk',
        name: form.name,
        socials: userType === 'user' ? { [userSocialPlatform]: userSocialValue } : {
          primary: { [projectPrimaryPlatform]: projectPrimaryValue },
          additional: projectAdditionalLinks.filter(Boolean),
        },
        website: form.website || null,
        address: connectedAddress,
        imageCID: imageCID,
        timestamp: Date.now(),
        userType: userType,
      };
      const mdText = JSON.stringify(metadata, null, 2);
      const metadataCID = await withRetry(async () => {
        const resp = await fetchWithTimeout('/api/upload/metadata', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: mdText, timeoutMs: 15000 });
        if (!resp.ok) { let msg = 'Metadata upload failed'; try { const j = await resp.json(); msg = j.error || msg; } catch {} throw new Error(msg); }
        const j = await resp.json();
        return j.cid as string;
      });
      const metadataUri = `ipfs://${metadataCID}`;

      // 3) Loop purchases (one tx per tile)
      if (!(window as any).ethereum) throw new Error('Wallet not found');
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(
        TILE_PURCHASE_ADDRESS!,
        ["function buyTileWithNative(uint256 tileId, string memory metadataUri) external payable"],
        signer
      );

      const perTile = ethers.parseUnits(String(pricePerTile), 18);
      const addr = await signer.getAddress();
      const balance = await provider.getBalance(addr);
      const needed = perTile * BigInt(tileIds.length);
      if (balance < needed) {
        setErrorMsg(`Insufficient PEPU for ${tileIds.length} tiles`);
        setUploading(false);
        return;
      }

      let successCount = 0;
      for (const id of tileIds) {
        try {
          const tx = await marketplace.buyTileWithNative(id, metadataUri, { 
            value: perTile,
            gasLimit: 300000 // Add gas limit to prevent excessive fees
          });
          await tx.wait();
          successCount += 1;
        } catch (e) {
          // continue to next tile
        }
      }

      setSuccessMsg(`Purchased ${successCount}/${tileIds.length} tiles`);
      setStep('success');
      setTimeout(() => { onClose(); }, 8000);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Bulk purchase failed');
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={modalRef} className="relative w-full max-w-md mx-2 sm:mx-4 bg-blue-500 border-4 border-black rounded-2xl shadow-2xl p-3 sm:p-5 overflow-auto" style={{ maxHeight: '90vh' }}>
        <button className="absolute top-3 right-3 bg-red-600 text-white rounded-full p-2 hover:bg-red-700" onClick={onClose} aria-label="Close">
          <X className="w-5 h-5" />
        </button>

        {step === 'choose' && (
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-xl font-bold text-yellow-300">Who are you claiming as?</h2>
            <div className="flex gap-4">
              <button className={`rounded-md px-5 py-2 text-lg font-bold border-2 border-black ${userType === 'user' ? 'bg-green-500' : 'bg-gray-200'}`} onClick={() => setUserType('user')}>
                <User className="inline w-5 h-5 mr-2" /> User
              </button>
              <button className={`rounded-md px-5 py-2 text-lg font-bold border-2 border-black ${userType === 'project' ? 'bg-green-500' : 'bg-gray-200'}`} onClick={() => setUserType('project')}>
                <Users className="inline w-5 h-5 mr-2" /> Project
              </button>
            </div>
            {errors.type && <div className="text-red-500 text-sm">{errors.type}</div>}
            <div className="flex justify-between w-full mt-2">
              <span />
              <button className="rounded-md px-5 py-2 text-lg font-bold border-2 border-black bg-yellow-300" onClick={() => setStep('form')}>
                Continue <ArrowRight className="inline w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {step === 'form' && (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); const errs = validate(); setErrors(errs); if (Object.keys(errs).length === 0) setStep('price'); }}>
            <h2 className="text-xl font-bold text-yellow-300 text-center">Enter your details</h2>
            <div>
              <label className="mb-1 font-semibold text-black">Name</label>
              <input className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-bold w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
            </div>
            <div>
              <label className="mb-1 font-semibold text-black">Image (max 600KB)</label>
              <input type="file" accept="image/*" className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full" onChange={(e) => { setImageFile(e.target.files); const f = e.target.files?.[0]; if (f) { if (!f.type.startsWith('image/') || f.size > 600 * 1024) { setImagePreview(null); } else { const r = new FileReader(); r.onload = ev => setImagePreview(ev.target?.result as string); r.readAsDataURL(f); } } }} />
              {errors.imageFile && <div className="text-red-500 text-sm mt-1">{errors.imageFile}</div>}
              {imagePreview && (<img src={imagePreview} alt="Preview" className="mt-2 rounded-md border-2 border-black max-h-32 object-contain bg-white" />)}
            </div>
            {userType === 'user' ? (
              <div className="flex flex-col w-full text-left">
                <label className="mb-1 font-semibold text-black">Social Platform</label>
                <select
                  className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full"
                  value={userSocialPlatform}
                  onChange={(e) => setUserSocialPlatform(e.target.value as 'telegram' | 'discord' | 'x')}
                >
                  <option value="telegram">Telegram</option>
                  <option value="discord">Discord</option>
                  <option value="x">X (Twitter)</option>
                </select>
                <input
                  className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full mt-2"
                  placeholder={
                    userSocialPlatform === 'telegram' ? 'Telegram username' :
                    userSocialPlatform === 'discord' ? 'Discord user ID' :
                    'X (Twitter) username'
                  }
                  value={userSocialValue}
                  onChange={(e) => setUserSocialValue(e.target.value)}
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
                    onChange={(e) => setProjectPrimaryPlatform(e.target.value as 'telegram' | 'discord' | 'x')}
                  >
                    <option value="telegram">Telegram</option>
                    <option value="discord">Discord</option>
                    <option value="x">X (Twitter)</option>
                  </select>
                  <input
                    className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full mt-2"
                    placeholder={
                      projectPrimaryPlatform === 'telegram' ? 'Telegram group/channel link' :
                      projectPrimaryPlatform === 'discord' ? 'Discord server invite' :
                      'X (Twitter) profile link'
                    }
                    value={projectPrimaryValue}
                    onChange={(e) => setProjectPrimaryValue(e.target.value)}
                  />
                  {errors.projectPrimaryValue && <div className="text-red-500 text-sm mt-1">{errors.projectPrimaryValue}</div>}
                </div>
                {[0,1].map(i => (
                  <div key={i}>
                    <label className="mb-1 font-semibold text-black">Additional Social Link {i+1}</label>
                    <input className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full" placeholder="https://..." value={projectAdditionalLinks[i]} onChange={(e) => { const arr = [...projectAdditionalLinks]; arr[i] = e.target.value; setProjectAdditionalLinks(arr); }} />
                    {errors[`projectAdditionalLinks${i}`] && <div className="text-red-500 text-sm mt-1">{errors[`projectAdditionalLinks${i}`]}</div>}
                  </div>
                ))}
              </>
            )}
            <div>
              <label className="mb-1 font-semibold text-black">Website (optional)</label>
              <input className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full" placeholder="https://..." value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="flex justify-between">
              <button type="button" className="rounded-md px-5 py-2 text-lg font-bold border-2 border-black bg-gray-200" onClick={() => setStep('choose')}>
                <ArrowLeft className="inline w-4 h-4 mr-1" /> Back
              </button>
              <button type="submit" className="rounded-md px-5 py-2 text-lg font-bold border-2 border-black bg-yellow-300">
                Continue <ArrowRight className="inline w-4 h-4 ml-1" />
              </button>
            </div>
          </form>
        )}

        {step === 'price' && (
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-yellow-300 text-center">Confirm Bulk Purchase</h2>
            <div className="text-white text-center">Selected tiles: <span className="font-bold">{tileIds.length}</span></div>
            <div className="text-white text-center">
              Price per tile: 
              {loadingPrice ? (
                <span className="font-bold flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin w-4 h-4" />
                  Loading...
                </span>
              ) : (
                <span className="font-bold">{pricePerTile} PEPU</span>
              )}
            </div>
            <div className="text-white text-center">
              Total: 
              {loadingPrice ? (
                <span className="font-bold">Calculating...</span>
              ) : (
                <span className="font-bold">{Number(pricePerTile) * tileIds.length} PEPU</span>
              )}
            </div>
            {errorMsg && <div className="text-red-500 text-center font-bold">{errorMsg}</div>}
            {successMsg && <div className="text-green-500 text-center font-bold">{successMsg}</div>}
            <div className="flex justify-between">
              <button type="button" className="rounded-md px-5 py-2 text-lg font-bold border-2 border-black bg-gray-200" onClick={() => setStep('form')}>
                <ArrowLeft className="inline w-4 h-4 mr-1" /> Back
              </button>
              <button className="rounded-md px-5 py-2 text-lg font-bold border-2 border-black bg-green-500 text-black flex items-center" onClick={handleBulkBuy} disabled={uploading || loadingPrice}>
                {uploading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <ShoppingCart className="w-5 h-5 mr-2" />} {uploading ? 'Processing...' : 'Confirm Bulk Buy'}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center w-full p-6">
            <CheckCircle2 className="w-14 h-14 text-green-500 mb-3" />
            <div className="text-lg font-bold text-yellow-300 mb-1 w-full text-center">Bulk Purchase Complete</div>
            <div className="text-md text-black mb-2 w-full text-center">Your selected tiles have been processed.</div>
          </div>
        )}
      </div>
    </div>
  );
}


