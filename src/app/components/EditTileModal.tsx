'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, User, Users, ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { ethers } from 'ethers';
import Image from 'next/image';

// Modal Props
interface EditTileModalProps {
  open: boolean;
  onClose: () => void;
  tile: any;
}

type UserType = 'project' | 'user' | null;

type Step = 'form' | 'success';

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

function validateSocialLinks(userType: UserType, form: typeof initialFormState, userSocialPlatform?: 'telegram' | 'discord' | 'x', userSocialValue?: string, projectPrimaryPlatform?: 'telegram' | 'discord' | 'x', projectPrimaryValue?: string, projectAdditionalLinks?: string[], imageFile?: FileList | null) {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = 'Name is required.';
  // Image validation
  const file = imageFile && imageFile[0];
  if (file) {
    if (!file.type.startsWith('image/')) {
      errors.imageFile = 'File must be an image.';
    } else if (file.size > 600 * 1024) {
      errors.imageFile = 'Image must be less than 600KB.';
    }
  }
  if (userType === 'user') {
    if (!userSocialValue || !userSocialValue.trim()) {
      errors.userSocialValue = 'Username/ID is required.';
    } else {
      let url = '';
      if (userSocialPlatform === 'telegram') {
        url = `https://t.me/${userSocialValue}`;
        if (!/^https:\/\/t\.me\/[a-zA-Z0-9_]{5,}$/.test(url)) {
          errors.userSocialValue = 'Must be a valid Telegram username (min 5 chars).';
        }
      } else if (userSocialPlatform === 'discord') {
        url = `https://discord.com/users/${userSocialValue}`;
        if (!/^https:\/\/discord\.com\/users\/[0-9]{5,}$/.test(url)) {
          errors.userSocialValue = 'Must be a valid Discord user ID (5+ digits).';
        }
      } else if (userSocialPlatform === 'x') {
        url = `https://x.com/${userSocialValue}`;
        if (!/^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}$/.test(url)) {
          errors.userSocialValue = 'Must be a valid X (Twitter) username.';
        }
      }
    }
  } else {
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
  }
  if (form.website) {
    if (!/^https?:\/\/.+\..+/.test(form.website)) {
      errors.website = 'Must be a valid website URL.';
    }
  }
  return errors;
}

export default function EditTileModal({ open, onClose, tile }: EditTileModalProps) {
  let content;
  const [step, setStep] = useState<Step>('form');
  const [userType, setUserType] = useState<UserType>(null);
  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [userSocialPlatform, setUserSocialPlatform] = useState<'telegram' | 'discord' | 'x'>('telegram');
  const [userSocialValue, setUserSocialValue] = useState('');
  const [projectPrimaryPlatform, setProjectPrimaryPlatform] = useState<'telegram' | 'discord' | 'x'>('telegram');
  const [projectPrimaryValue, setProjectPrimaryValue] = useState('');
  const [projectAdditionalLinks, setProjectAdditionalLinks] = useState(['', '']);
  const [imageFile, setImageFile] = useState<FileList | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const TILE_PURCHASE_ADDRESS = process.env.NEXT_PUBLIC_TILE_CONTRACT;
  
  if (!TILE_PURCHASE_ADDRESS) {
    console.error("NEXT_PUBLIC_TILE_CONTRACT environment variable not set!");
  }

  // Reset modal state only when opened
  useEffect(() => {
    if (open) {
      console.log('EditTileModal opened with tile data:', tile);
      setStep('form');
      setErrors({});
      setSubmitting(false);
      setShowSuccess(false);
      setImageFile(null);
      setImagePreview(null);
      setUploading(false);
      setErrorMsg(null);
      setSuccessMsg(null);
      
      // Pre-populate form with existing data
      if (tile) {
        setForm({
          name: tile.name || '',
          telegram: '',
          discord: '',
          x: '',
          website: tile.website || '',
        });
        
        // Determine user type and pre-populate social fields
        if (tile.socials) {
          if (tile.socials.primary) {
            // Project type
            setUserType('project');
            const primaryPlatform = Object.keys(tile.socials.primary)[0];
            const primaryValue = tile.socials.primary[primaryPlatform];
            setProjectPrimaryPlatform(primaryPlatform as 'telegram' | 'discord' | 'x');
            setProjectPrimaryValue(primaryValue);
            
            if (tile.socials.additional) {
              setProjectAdditionalLinks([
                tile.socials.additional[0] || '',
                tile.socials.additional[1] || ''
              ]);
            }
          } else {
            // User type
            setUserType('user');
            const platform = Object.keys(tile.socials)[0];
            const value = tile.socials[platform];
            setUserSocialPlatform(platform as 'telegram' | 'discord' | 'x');
            setUserSocialValue(value);
          }
        }
        
        // Set image preview if exists
        if (tile.imageCID) {
          setImagePreview(`https://gateway.lighthouse.storage/ipfs/${tile.imageCID}`);
        }
      }
    }
  }, [open, tile]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { 
      document.body.style.overflow = '';
    };
  }, [open]);

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

  // Utility helpers
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
      try {
        return await fn();
      } catch (e) {
        attempt += 1;
        if (attempt > retries) throw e;
        await delay(backoffMs * attempt);
      }
    }
  };

  // Update tile logic
  const handleUpdate = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    
    // Handle both tile.id and tile.tileId for compatibility
    const tileIdValue = tile?.id || tile?.tileId;
    if (!tileIdValue) {
      setErrorMsg("Invalid tile ID!");
      return;
    }
    
    const tileId = parseInt(tileIdValue);
    if (isNaN(tileId) || tileId < 0) {
      setErrorMsg("Invalid tile ID format!");
      return;
    }
    
    if (!TILE_PURCHASE_ADDRESS) {
      setErrorMsg("Contract address not configured!");
      return;
    }
    
    setUploading(true);
    try {
      let imageCID = tile.imageCID; // Keep existing image if no new one uploaded
      
      // 1. Upload new image if provided
      if (imageFile && imageFile.length > 0) {
        const file = imageFile[0];
        if (!file.type.startsWith('image/')) {
          setErrorMsg("File must be an image.");
          return;
        }
        if (file.size > 600 * 1024) {
          setErrorMsg("Image must be less than 600KB.");
          return;
        }
        
        imageCID = await withRetry(async () => {
          const fd = new FormData();
          fd.append('file', file);
          const resp = await fetchWithTimeout('/api/upload/image', { method: 'POST', body: fd, timeoutMs: 15000 });
          if (!resp.ok) {
            let msg = 'Image upload failed';
            try { const j = await resp.json(); msg = j.error || msg; } catch {}
            throw new Error(msg);
          }
          const j = await resp.json();
          return j.cid as string;
        }, 2, 500);
        console.log("New image CID:", imageCID);
      }

      // 2. Prepare metadata JSON with the image CID
      const metadata = {
        tile: tileIdValue || null,
        name: form.name,
        socials: userType === 'user'
          ? { [userSocialPlatform]: userSocialValue }
          : {
              primary: { [projectPrimaryPlatform]: projectPrimaryValue },
              additional: projectAdditionalLinks.filter(Boolean),
            },
        website: form.website || null,
        address: connectedAddress,
        imageCID,
        timestamp: Date.now(),
        userType: userType,
      };
      const metadataText = JSON.stringify(metadata, null, 2);
      console.log("Updated metadata JSON:", metadataText);

      // 3. Upload metadata via server API (timeout + retry)
      const metadataCID = await withRetry(async () => {
        const resp = await fetchWithTimeout('/api/upload/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: metadataText,
          timeoutMs: 15000,
        });
        if (!resp.ok) {
          let msg = 'Metadata upload failed';
          try { const j = await resp.json(); msg = j.error || msg; } catch {}
          throw new Error(msg);
        }
        const j = await resp.json();
        return j.cid as string;
      }, 2, 500);
      const metadataUri = `ipfs://${metadataCID}`;
      console.log("Updated metadata CID:", metadataCID);
      console.log("Updated metadata URI:", metadataUri);

      // 4. Call contract to update tile metadata
      if (!window.ethereum) throw new Error("Wallet not found");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Call Marketplace contract's updateTileMetadata function
      const tileMarketplace = new ethers.Contract(
        TILE_PURCHASE_ADDRESS!,
        ["function updateTileMetadata(uint256 tileId, string memory newMetadataUri) external"],
        signer
      );
      const tx = await tileMarketplace.updateTileMetadata(tileId, metadataUri);
      await tx.wait();

      // 5. Success: show success message
      setSuccessMsg("Tile updated successfully!");
      setStep('success');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 5000);
    } catch (e: any) {
      console.error("Update error:", e);
      setErrorMsg(e.message || "Tile update failed");
    } finally {
      setUploading(false);
    }
  };

  // Success step
  if (step === 'success') {
    content = (
      <div className="flex flex-col items-center justify-center w-full p-8">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <div className={`text-xl font-bold text-yellow-300 mb-1 w-full text-center`}>Tile Updated!</div>
        <div className={`text-md text-black mb-3 w-full text-center italic`}>Your tile has been successfully updated.</div>
        <div className="text-2xl font-bold text-green-600 mb-2 text-center">Update complete!</div>
        <div className="text-lg text-gray-700 text-center mb-2">
          Your tile (ID: {tile?.id}) has been updated!<br />
          The changes will be reflected on the <span className="font-semibold text-green-700">Springfield Grid</span>.
        </div>
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
          const errs = validateSocialLinks(userType, form, userSocialPlatform, userSocialValue, projectPrimaryPlatform, projectPrimaryValue, projectAdditionalLinks, imageFile as any);
          setErrors(errs);
          if (Object.keys(errs).length === 0) {
            handleUpdate();
          }
        }}
        autoComplete="off"
      >
        <h2 className={`text-xl ${springfieldFont} text-yellow-300 mb-4 w-full text-center`}>Edit Tile Details</h2>
        
        {/* Name field */}
        <div className="flex flex-col w-full text-left">
          <label className="mb-1 font-semibold text-black" htmlFor="name">Name</label>
          <input
            id="name"
            className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full text-left"
            placeholder="Name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          {errors.name && <div className="text-red-500 text-sm text-left w-full mt-1">{errors.name}</div>}
        </div>
        
        {/* Image upload field */}
        <div className="flex flex-col w-full text-left">
          <label className="mb-1 font-semibold text-black" htmlFor="imageFile">Image (max 600KB) - Optional</label>
          <input
            id="imageFile"
            type="file"
            accept="image/*"
            className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full"
            onChange={e => {
              setImageFile(e.target.files);
              setErrors(errs => ({ ...errs, imageFile: '' }));
              const file = e.target.files && e.target.files[0];
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
        
        {userType === 'user' ? (
          <>
            <div className="flex flex-col w-full text-left">
              <label className="mb-1 font-semibold text-black" htmlFor="userSocialPlatform">Social Platform</label>
              <select
                id="userSocialPlatform"
                className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full"
                value={userSocialPlatform}
                onChange={e => setUserSocialPlatform(e.target.value as 'telegram' | 'discord' | 'x')}
              >
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
                <option value="x">X (Twitter)</option>
              </select>
            </div>
            <div className="flex flex-col w-full text-left">
              <label className="mb-1 font-semibold text-black" htmlFor="userSocialValue">Username / ID</label>
              <input
                id="userSocialValue"
                className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full"
                placeholder={
                  userSocialPlatform === 'telegram'
                    ? 'Telegram username (e.g. simpsonsfan)'
                    : userSocialPlatform === 'discord'
                    ? 'Discord user ID (e.g. 1234567890)'
                    : 'X username (e.g. simpsonsfan)'
                }
                value={userSocialValue}
                onChange={e => setUserSocialValue(e.target.value)}
              />
              {errors.userSocialValue && <div className="text-red-500 text-sm text-left w-full mt-1">{errors.userSocialValue}</div>}
            </div>
          </>
        ) : (
          <>
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
            {/* Project: Additional Social Links */}
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
          </>
        )}
        
        <div className="flex flex-col w-full text-left">
          <label className="mb-1 font-semibold text-black" htmlFor="website">Website</label>
          <input
            id="website"
            className="rounded-md border-2 border-black px-4 py-2 bg-white text-black font-semibold w-full text-left"
            placeholder="Website (optional)"
            value={form.website}
            onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
          />
          {errors.website && <div className="text-red-500 text-sm text-left w-full mt-1">{errors.website}</div>}
        </div>
        
        {/* Error and Success Messages */}
        {errorMsg && <div className="text-red-600 font-bold text-center mb-2">{errorMsg}</div>}
        {successMsg && <div className="text-green-600 font-bold text-center mb-2">{successMsg}</div>}
        
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
            disabled={uploading}
          >
            {uploading ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
            {uploading ? 'Updating...' : 'Update Tile'}
          </button>
        </div>
      </form>
    );
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      style={{ pointerEvents: 'auto' }}
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
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
