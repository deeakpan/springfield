'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Edit3, CheckCircle2, Users, User, ArrowLeft, ArrowRight, Loader2, Hash, Image as ImageIcon, Globe, MessageCircle, AlertCircle, CheckCircle, User as UserIcon, Users as UsersIcon } from 'lucide-react';
import { ethers } from 'ethers';
import { Tile } from '../../hooks/useMarketplace';

interface BulkEditModalProps {
  open: boolean;
  onClose: () => void;
  tiles: Tile[];
  selectedTiles: Set<number>;
  onEdit: (tile: Tile) => void;
}

type UserType = 'project' | 'user' | null;
type Step = 'selection' | 'form' | 'progress' | 'success';

const initialFormState = {
  name: '',
  telegram: '',
  discord: '',
  x: '',
  website: '',
};

export default function BulkEditModal({ open, onClose, tiles, selectedTiles, onEdit }: BulkEditModalProps) {
  const [step, setStep] = useState<Step>('selection');
  const [form, setForm] = useState(initialFormState);
  const [userType, setUserType] = useState<UserType>(null);
  const [userSocialPlatform, setUserSocialPlatform] = useState<'telegram' | 'discord' | 'x'>('telegram');
  const [userSocialValue, setUserSocialValue] = useState('');
  const [projectPrimaryPlatform, setProjectPrimaryPlatform] = useState<'telegram' | 'discord' | 'x'>('telegram');
  const [projectPrimaryValue, setProjectPrimaryValue] = useState('');
  const [projectAdditionalLinks, setProjectAdditionalLinks] = useState(['', '']);
  const [imageFile, setImageFile] = useState<FileList | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [results, setResults] = useState<Array<{ tileId: number; success: boolean; message: string }>>([]);
  const [localSelectedTiles, setLocalSelectedTiles] = useState<Set<number>>(new Set());
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const TILE_PURCHASE_ADDRESS = process.env.NEXT_PUBLIC_TILE_CONTRACT;
  
  if (!TILE_PURCHASE_ADDRESS) {
    console.error("NEXT_PUBLIC_TILE_CONTRACT environment variable not set!");
  }

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep('selection');
      setForm(initialFormState);
      setErrors({});
      setProcessing(false);
      setProgress({ current: 0, total: 0, success: 0, failed: 0 });
      setResults([]);
      setLocalSelectedTiles(new Set(selectedTiles));
      setUserType(null);
      setUserSocialPlatform('telegram');
      setUserSocialValue('');
      setProjectPrimaryPlatform('telegram');
      setProjectPrimaryValue('');
      setProjectAdditionalLinks(['', '']);
      setImageFile(null);
      setImagePreview(null);
      setErrorMsg(null);
    }
  }, [open, selectedTiles]);

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

  // Get available tiles (including rented ones if user is the renter)
  const availableTiles = tiles.filter(tile => {
    // Always allow owned tiles
    if (!tile.isCurrentlyRented) return true;
    // Allow rented tiles if user is the renter
    if (tile.isRentedByUser) return true;
    // Don't allow tiles rented by others
    return false;
  });

  // Handle checkbox changes
  const handleTileSelection = (tileId: number, checked: boolean) => {
    const newSelection = new Set(localSelectedTiles);
    if (checked) {
      newSelection.add(tileId);
    } else {
      newSelection.delete(tileId);
    }
    setLocalSelectedTiles(newSelection);
  };

  // Select all available tiles
  const selectAllTiles = () => {
    setLocalSelectedTiles(new Set(availableTiles.map(tile => Number(tile.tileId))));
  };

  // Deselect all tiles
  const deselectAllTiles = () => {
    setLocalSelectedTiles(new Set());
  };

  // Validation function (same as EditTileModal)
  const validateSocialLinks = (userType: UserType, form: typeof initialFormState, userSocialPlatform?: 'telegram' | 'discord' | 'x', userSocialValue?: string, projectPrimaryPlatform?: 'telegram' | 'discord' | 'x', projectPrimaryValue?: string, projectAdditionalLinks?: string[], imageFile?: FileList | null) => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Name is required.';
    
    // Image validation
    const file = imageFile && imageFile.length > 0 ? imageFile[0] : undefined;
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
  };

  // Utility helpers (same as EditTileModal)
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

  // Handle bulk edit submission
  const handleBulkEdit = async () => {
    const errs = validateSocialLinks(userType, form, userSocialPlatform, userSocialValue, projectPrimaryPlatform, projectPrimaryValue, projectAdditionalLinks, imageFile);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    
    setStep('progress');
    setProcessing(true);
    setErrorMsg(null);
    
    const selectedTilesArray = availableTiles.filter(tile => 
      localSelectedTiles.has(Number(tile.tileId))
    );
    
    setProgress({ current: 0, total: selectedTilesArray.length, success: 0, failed: 0 });
    setResults([]);
    
    try {
      // 1. Upload new image if provided (same as EditTileModal)
      let imageCID: string | null = null;
      if (imageFile && imageFile.length > 0) {
        const file = imageFile[0];
        if (!file.type.startsWith('image/')) {
          throw new Error("File must be an image.");
        }
        if (file.size > 600 * 1024) {
          throw new Error("Image must be less than 600KB.");
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

      // 2. Process each tile individually
      for (let i = 0; i < selectedTilesArray.length; i++) {
        const tile = selectedTilesArray[i];
        setProgress(prev => ({ ...prev, current: i + 1 }));
        
        try {
          // Check if tile can be edited
          if (tile.isCurrentlyRented && !tile.isRentedByUser) {
            const result = { 
              tileId: Number(tile.tileId), 
              success: false, 
              message: 'Cannot edit tile rented by someone else' 
            };
            setResults(prev => [...prev, result]);
            setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
            continue;
          }
          
          // 3. Prepare metadata JSON (same as EditTileModal)
          const metadata = {
            tile: String(tile.tileId),
            name: String(form.name || ''),
            socials: userType === 'user'
              ? { [String(userSocialPlatform || '')]: String(userSocialValue || '') }
              : {
                  primary: { [String(projectPrimaryPlatform || '')]: String(projectPrimaryValue || '') },
                  additional: projectAdditionalLinks.filter(Boolean).map(link => String(link || '')),
                },
            website: form.website ? String(form.website) : null,
            address: connectedAddress ? String(connectedAddress) : null,
            imageCID: imageCID ? String(imageCID) : null,
            timestamp: Number(Date.now()),
            userType: userType ? String(userType) : null,
          };
          
          const metadataText = JSON.stringify(metadata, null, 2);
          console.log(`Metadata for Tile ${tile.tileId}:`, metadataText);

          // 4. Upload metadata via server API (same as EditTileModal)
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
          console.log(`Metadata CID for Tile ${tile.tileId}:`, metadataCID);

          // 5. Call contract to update tile metadata (same as EditTileModal)
          if (!window.ethereum) throw new Error("Wallet not found");
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          
          const tileMarketplace = new ethers.Contract(
            TILE_PURCHASE_ADDRESS!,
            ["function updateTileMetadata(uint256 tileId, string memory newMetadataUri) external"],
            signer
          );
          
          const tx = await tileMarketplace.updateTileMetadata(Number(tile.tileId), metadataUri);
          await tx.wait();

          // 6. Edit completed successfully
          console.log(`✅ Tile ${tile.tileId} edit completed successfully`);

          // Success
          const result = { tileId: Number(tile.tileId), success: true, message: 'Updated successfully' };
          setResults(prev => [...prev, result]);
          setProgress(prev => ({ ...prev, success: prev.success + 1 }));
          
        } catch (error) {
          const result = { 
            tileId: Number(tile.tileId), 
            success: false, 
            message: error instanceof Error ? error.message : 'Update failed' 
          };
          setResults(prev => [...prev, result]);
          setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
      }
      
      setStep('success');
    } catch (error) {
      console.error('Bulk edit error:', error);
      setErrorMsg(error instanceof Error ? error.message : 'Bulk edit failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl mx-4 bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-400 rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'selection' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-yellow-300 text-center">Select Tiles to Edit</h2>
            
            {/* Selection Controls */}
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

            {/* Compact Tiles Grid with Images */}
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {availableTiles.map((tile) => {
                const isSelected = localSelectedTiles.has(Number(tile.tileId));
                return (
                  <div
                    key={tile.tileId.toString()}
                    onClick={() => handleTileSelection(Number(tile.tileId), !isSelected)}
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
                      {isSelected && <CheckCircle2 className="w-2.5 h-2.5 text-slate-900" />}
                    </div>

                    {/* Compact Tile Display with Image */}
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
                      <div className="text-slate-200 text-xs font-medium truncate px-1" title={tile.name || `Tile ${tile.tileId}`}>
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
                onClick={() => setStep('form')}
                disabled={localSelectedTiles.size === 0}
                className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:bg-slate-500 text-slate-900 font-bold transition-all disabled:cursor-not-allowed rounded-lg border-2 border-slate-700"
              >
                Continue with {localSelectedTiles.size} tiles →
              </button>
            </div>
          </div>
        )}

        {step === 'form' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-emerald-400 mb-2">
                Bulk Edit {localSelectedTiles.size} Tile{localSelectedTiles.size !== 1 ? 's' : ''}
              </h2>
              <p className="text-slate-300 text-sm">Configure the changes you want to apply to all selected tiles.</p>
            </div>
            
            {/* Error Messages */}
            {errorMsg && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4 text-center">
                <div className="text-red-400 font-medium">{errorMsg}</div>
              </div>
            )}
            
            {/* Form - Exact same fields as EditTileModal */}
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleBulkEdit(); }}>
              {/* Name field */}
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                <h3 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                  <Edit3 className="w-5 h-5" />
                  Basic Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="name">Name</label>
                    <input
                      id="name"
                      type="text"
                      className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                      placeholder="Tile name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    />
                    {errors.name && <div className="text-red-400 text-xs mt-1">{errors.name}</div>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="website">Website</label>
                    <input
                      id="website"
                      type="url"
                      className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                      placeholder="https://example.com"
                      value={form.website}
                      onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                    />
                    {errors.website && <div className="text-red-400 text-xs mt-1">{errors.website}</div>}
                  </div>
                </div>
              </div>
              
              {/* Image upload field */}
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                <h3 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Image Upload
                </h3>
                
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setImageFile(e.target.files);
                      setErrors(prev => ({ ...prev, imageFile: '' }));
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
                    className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-slate-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30"
                  />
                  {errors.imageFile && <div className="text-red-400 text-xs">{errors.imageFile}</div>}
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-slate-500" />
                  )}
                  <p className="text-slate-400 text-xs">Upload an image to apply to all selected tiles (max 600KB).</p>
            </div>
          </div>
              
              {/* Account Type Selection */}
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                <h3 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Account Type
                </h3>
                
          <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Account Type</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setUserType('user')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          userType === 'user'
                            ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                            : 'bg-slate-600/50 border border-slate-500 text-slate-300 hover:bg-slate-600/70'
                        }`}
                      >
                        <UserIcon className="w-4 h-4 inline mr-1" />
                        Personal
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserType('project')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          userType === 'project'
                            ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                            : 'bg-slate-600/50 border border-slate-500 text-slate-300 hover:bg-slate-600/70'
                        }`}
                      >
                        <UsersIcon className="w-4 h-4 inline mr-1" />
                        Project
                      </button>
                    </div>
                  </div>
                  
                  {/* Social Links based on user type */}
                  {userType === 'user' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Social Platform</label>
                        <select
                          value={userSocialPlatform}
                          onChange={(e) => setUserSocialPlatform(e.target.value as 'telegram' | 'discord' | 'x')}
                          className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                        >
                          <option value="telegram">Telegram</option>
                          <option value="discord">Discord</option>
                          <option value="x">X (Twitter)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Username / ID</label>
                        <input
                          type="text"
                          value={userSocialValue}
                          onChange={(e) => setUserSocialValue(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                          placeholder={
                            userSocialPlatform === 'telegram'
                              ? 'Telegram username (e.g. simpsonsfan)'
                              : userSocialPlatform === 'discord'
                              ? 'Discord user ID (e.g. 1234567890)'
                              : 'X username (e.g. simpsonsfan)'
                          }
                        />
                        {errors.userSocialValue && <div className="text-red-400 text-xs mt-1">{errors.userSocialValue}</div>}
                      </div>
                    </div>
                  )}
                  
                  {userType === 'project' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Primary Social Platform</label>
                        <select
                          value={projectPrimaryPlatform}
                          onChange={(e) => setProjectPrimaryPlatform(e.target.value as 'telegram' | 'discord' | 'x')}
                          className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                        >
                          <option value="telegram">Telegram</option>
                          <option value="discord">Discord</option>
                          <option value="x">X (Twitter)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Primary Social Link</label>
                        <input
                          type="url"
                          value={projectPrimaryValue}
                          onChange={(e) => setProjectPrimaryValue(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                          placeholder={
                            projectPrimaryPlatform === 'telegram'
                              ? 'Telegram group/channel link'
                              : projectPrimaryPlatform === 'discord'
                              ? 'Discord server invite'
                              : 'X (Twitter) profile link'
                          }
                        />
                        {errors.projectPrimaryValue && <div className="text-red-400 text-xs mt-1">{errors.projectPrimaryValue}</div>}
                      </div>
                      {[0, 1].map(i => (
                        <div key={i}>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Additional Social Link {i + 1}</label>
                          <input
                            type="url"
                            value={projectAdditionalLinks[i]}
                            onChange={(e) => setProjectAdditionalLinks(links => {
                              const newLinks = [...links];
                              newLinks[i] = e.target.value;
                              return newLinks;
                            })}
                            className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                            placeholder="Any valid social or website link"
                          />
                          {errors[`projectAdditionalLinks${i}`] && <div className="text-red-400 text-xs mt-1">{errors[`projectAdditionalLinks${i}`]}</div>}
                        </div>
                      ))}
                      {errors.projectAdditionalLinks && <div className="text-red-400 text-xs mt-1">{errors.projectAdditionalLinks}</div>}
                    </div>
                  )}
                </div>
            </div>
            
              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-600/50">
              <button
                  type="button"
                  className="px-6 py-2.5 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg font-medium transition-colors border border-slate-500"
                onClick={() => setStep('selection')}
              >
                  <ArrowLeft className="w-4 h-4 inline mr-2" />
                Back to Selection
              </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-900 rounded-lg font-medium transition-all border-2 border-slate-700"
                >
                  <Edit3 className="w-4 h-4 inline mr-2" />
                  Start Bulk Edit
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'progress' && (
          <div className="space-y-6 text-center">
            <h2 className="text-2xl font-bold text-emerald-400">Processing Bulk Edit</h2>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div 
                className="bg-emerald-400 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            
            {/* Progress Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                <div className="text-2xl font-bold text-emerald-400">{progress.current}</div>
                <div className="text-slate-400 text-sm">Processing</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                <div className="text-2xl font-bold text-green-400">{progress.success}</div>
                <div className="text-slate-400 text-sm">Success</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                <div className="text-2xl font-bold text-red-400">{progress.failed}</div>
                <div className="text-slate-400 text-sm">Failed</div>
              </div>
            </div>
            
            <div className="text-slate-300">
              Processing tile {progress.current} of {progress.total}...
            </div>
            
            {processing && (
              <div className="flex items-center justify-center gap-2 text-emerald-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing transactions...</span>
              </div>
            )}
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
            <h2 className="text-2xl font-bold text-emerald-400">Bulk Edit Complete!</h2>
            
            {/* Results Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-500/20 rounded-lg p-4 border border-green-400/30">
                <div className="text-2xl font-bold text-green-400">{progress.success}</div>
                <div className="text-green-300 text-sm">Successfully Updated</div>
              </div>
              <div className="bg-red-500/20 rounded-lg p-4 border border-red-400/30">
                <div className="text-2xl font-bold text-red-400">{progress.failed}</div>
                <div className="text-red-300 text-sm">Failed to Update</div>
              </div>
            </div>
            
            {/* Detailed Results */}
            {results.length > 0 && (
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50 text-left">
                <h3 className="text-lg font-semibold text-emerald-400 mb-3">Detailed Results</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {results.map((result, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-slate-300">Tile {result.tileId}:</span>
                      <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                        {result.message}
                      </span>
                    </div>
                  ))}
            </div>
              </div>
            )}
            
            <button
              className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-900 rounded-lg font-medium transition-colors border-2 border-slate-700"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
