import React, { useState, useEffect, useRef } from 'react';
import { X, Wallet, User, Users, Globe, Send, ArrowRight, ArrowLeft, Loader2, ShoppingCart } from 'lucide-react';
import { SPRFD } from '../../supportedTokens';
import { ethers } from 'ethers';
import Image from 'next/image';

// Modal Props
interface BuyModalProps {
  open: boolean;
  onClose: () => void;
  tile: any;
}

type UserType = 'project' | 'user' | null;

type Step = 'choose' | 'form' | 'price';

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

const TOKENS = [
  {
    address: "0x615d19AD0103652d012d886fA12a521485a3fbBD",
    name: "SPRFD",
    logo: "/cool_bart-removebg-preview.png"
  },
  {
    address: "0x5E9128De029d72C946d2E508C5d58F75C4486958",
    name: "PEPU",
    logo: "/peuchain-logo.jpg"
  },
  {
    address: "0xD6d35F284b35131A2114AAad838D9b4cfF142aEa",
    name: "PENK",
    logo: "/6012603865783978322.jpg"
  }
];

function validateSocialLinks(userType: UserType, form: typeof initialFormState, userSocialPlatform?: 'telegram' | 'discord' | 'x', userSocialValue?: string, projectPrimaryPlatform?: 'telegram' | 'discord' | 'x', projectPrimaryValue?: string, projectAdditionalLinks?: string[], imageFile?: File | null) {
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

export default function BuyModal({ open, onClose, tile }: BuyModalProps) {
  const [step, setStep] = useState<Step>('choose');
  const [userType, setUserType] = useState<UserType>(null);
  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [price, setPrice] = useState<string>('');
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [userSocialPlatform, setUserSocialPlatform] = useState<'telegram' | 'discord' | 'x'>('telegram');
  const [userSocialValue, setUserSocialValue] = useState('');
  const [projectPrimaryPlatform, setProjectPrimaryPlatform] = useState<'telegram' | 'discord' | 'x'>('telegram');
  const [projectPrimaryValue, setProjectPrimaryValue] = useState('');
  const [projectAdditionalLinks, setProjectAdditionalLinks] = useState(['', '']);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // Remove tokenName state and API usage
  const [tokenName, setTokenName] = useState<string>('');
  const [sprfdBalance, setSprfdBalance] = useState<string>('');
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);

  // Reset modal state only when opened
  useEffect(() => {
    if (open) {
      setStep('choose');
      setUserType(null);
      setForm(initialFormState);
      setErrors({});
      setPrice('');
      setLoadingPrice(false);
      setSubmitting(false);
      setShowSuccess(false);
      setUserSocialPlatform('telegram');
      setUserSocialValue('');
      setProjectPrimaryPlatform('telegram');
      setProjectPrimaryValue('');
      setProjectAdditionalLinks(['', '']);
      setImageFile(null);
      setImagePreview(null);
      setTokenName('');
      setSprfdBalance('');
      setSelectedToken(TOKENS[0]);
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

  // Fetch price from API for selected token
  useEffect(() => {
    if (step === 'price' && open) {
      setLoadingPrice(true);
      setPrice('');
      fetch('/api/token-price')
        .then(res => res.json())
        .then(data => {
          const val = data[selectedToken.address];
          setPrice(val && !isNaN(val) ? val : '');
        })
        .catch(() => setPrice(''))
        .finally(() => setLoadingPrice(false));
    }
  }, [step, open, selectedToken]);

  // Fetch selected token wallet balance in price step
  useEffect(() => {
    async function fetchBalance() {
      if (step === 'price' && open && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const userAddress = await signer.getAddress();
          const erc20 = new ethers.Contract(
            selectedToken.address,
            ["function balanceOf(address owner) view returns (uint256)", "function decimals() view returns (uint8)"],
            provider
          );
          const [bal, dec] = await Promise.all([
            erc20.balanceOf(userAddress),
            erc20.decimals()
          ]);
          setSprfdBalance(ethers.formatUnits(bal, dec));
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
      if (e.key === 'Escape') {
        // Do nothing (modal should not close on Escape)
        e.stopPropagation();
      }
    }
    if (open) {
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [open]);

  if (!open) return null;

  // Modal content by step
  let content;
  if (step === 'choose') {
    content = (
      <div className="flex flex-col items-center gap-6">
        <h2 className={`text-2xl ${springfieldFont} text-yellow-300 mb-2 w-full text-center`}>Who are you claiming as?</h2>
        <div className="flex gap-6">
          <button
            className={`${springfieldButton} ${springfieldBlue} text-black hover:bg-blue-400`}
            onClick={() => { setUserType('user'); setStep('form'); }}
            data-testid="choose-user"
          >
            <User className="inline w-5 h-5 mr-2" /> User
          </button>
          <button
            className={`${springfieldButton} bg-green-500 text-black hover:bg-green-400`}
            onClick={() => { setUserType('project'); setStep('form'); }}
            data-testid="choose-project"
          >
            <Users className="inline w-5 h-5 mr-2" /> Project
          </button>
        </div>
      </div>
    );
  } else if (step === 'form') {
    content = (
      <form
        className="flex flex-col gap-4 w-full max-w-md mx-auto overflow-visible"
        onSubmit={e => {
          e.preventDefault();
          const errs = validateSocialLinks(userType, form, userSocialPlatform, userSocialValue, projectPrimaryPlatform, projectPrimaryValue, projectAdditionalLinks, imageFile);
          setErrors(errs);
          if (Object.keys(errs).length === 0) {
            setStep('price');
          }
        }}
        autoComplete="off"
      >
        <h2 className={`text-xl ${springfieldFont} text-yellow-300 mb-4 w-full text-center`}>Enter your details</h2>
        {/* Token info section */}
        <div className="flex flex-col w-full text-left">
          <label className="mb-1 font-semibold text-black" htmlFor="name">Name</label>
          <input
            id="name"
            className="rounded-md border-2 border-black px-4 py-2 ${springfieldFont} bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-400 w-full text-left"
            placeholder="Name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          {errors.name && <div className="text-red-500 text-sm text-left w-full mt-1">{errors.name}</div>}
        </div>
        {/* Image upload field */}
        <div className="flex flex-col w-full text-left">
          <label className="mb-1 font-semibold text-black" htmlFor="imageFile">Image (max 600KB)</label>
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
              } else {
                setImagePreview(null);
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
            onClick={() => setStep('choose')}
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" /> Back
          </button>
          <button
            type="submit"
            className={`${springfieldButton} bg-yellow-300 text-black hover:bg-yellow-200`}
            data-testid="claim-btn"
          >
            Claim <ArrowRight className="inline w-4 h-4 ml-1" />
          </button>
        </div>
      </form>
    );
  } else if (step === 'price') {
    content = (
      <div className="flex flex-col items-center gap-4 w-full p-4">
        <h2 className={`text-2xl ${springfieldFont} text-yellow-300 mb-2 w-full text-center`}>Confirm Purchase</h2>
        {/* Token selector as a dropdown */}
        <div className="w-full max-w-xs mb-2">
          <select
            className="w-32 px-2 py-1 rounded-md border-2 border-black bg-green-500 text-black font-bold text-sm outline-none"
            value={selectedToken.address}
            onChange={e => {
              const token = TOKENS.find(t => t.address === e.target.value);
              if (token) setSelectedToken(token);
            }}
          >
            {TOKENS.map(token => (
              <option key={token.address} value={token.address} className="text-black">
                {token.name}
              </option>
            ))}
          </select>
        </div>
        {/* You Send section (compact, wrapped, fixed) */}
        <div className="w-full max-w-xs flex flex-col items-stretch mb-2">
          <label className="block text-sm font-semibold text-black mb-1 ml-1">You Send</label>
          <div className="flex items-center border-2 border-black rounded-lg px-3 py-2 bg-white min-w-0">
            <div className="flex flex-nowrap items-center mr-2">
              <div className="rounded-full bg-white border-2 border-black w-7 h-7 flex items-center justify-center overflow-hidden">
                <Image src={selectedToken.logo} alt={selectedToken.name + ' Logo'} width={28} height={28} className="object-cover w-full h-full" />
              </div>
              <span className="ml-2 text-xs font-bold text-yellow-500 whitespace-nowrap">{selectedToken.name}</span>
            </div>
            <input
              type="text"
              className="bg-transparent text-base font-extrabold font-mono text-black flex-1 outline-none border-none text-right max-w-full min-w-0 truncate"
              value={loadingPrice ? '' : (price !== '' ? price : '0')}
              readOnly
              style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}
            />
          </div>
          <div className="text-xs text-black mt-1 text-right pr-1">
            {sprfdBalance} available
          </div>
        </div>
        {/* Details Section (compact, black border) */}
        <div className="bg-white rounded-md p-4 border-2 border-black w-full max-w-xs text-black text-left mb-2 shadow-sm flex flex-col gap-1">
          <div className="mb-1"><span className="font-bold text-yellow-500">Tile:</span> <span className="font-bold text-black">{tile?.id || 'N/A'}</span></div>
          <div className="mb-1"><span className="font-bold text-yellow-500">Name:</span> <span className="font-bold text-black">{form.name}</span></div>
          {userType === 'user' && (
            <div className="mb-1"><span className="font-bold text-yellow-500">Social:</span> <span className="font-bold text-black">{userSocialPlatform}: {userSocialValue}</span></div>
          )}
          {userType === 'project' && (
            <>
              <div className="mb-1"><span className="font-bold text-yellow-500">Primary:</span> <span className="font-bold text-black">{projectPrimaryPlatform}: {projectPrimaryValue}</span></div>
              <div className="mb-1"><span className="font-bold text-yellow-500">Additional:</span> <span className="font-bold text-black">{projectAdditionalLinks.filter(Boolean).join(', ')}</span></div>
            </>
          )}
          {form.website && <div className="mb-1"><span className="font-bold text-yellow-500">Website:</span> <span className="font-bold text-black">{form.website}</span></div>}
        </div>
        {/* Image preview below details */}
        {imagePreview && (
          <div className="flex justify-center mb-2">
            <img
              src={imagePreview}
              alt="Selected"
              className="rounded-md border-2 border-yellow-500 max-h-32 max-w-full object-contain"
            />
          </div>
        )}
        {/* Action Button (smaller, green, with cart icon) */}
        <button
          className="w-full py-2 mt-2 rounded-lg bg-green-500 text-black font-bold text-lg border-2 border-green-700 hover:bg-green-400 transition shadow flex items-center justify-center gap-2"
          disabled={loadingPrice}
        >
          <ShoppingCart className="w-5 h-5 mr-1" />
          {loadingPrice ? 'Loading...' : 'Buy Tile'}
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      style={{ pointerEvents: 'auto' }}
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
      onClick={e => {
        // Prevent closing on background click
        if (e.target === e.currentTarget) {
          e.stopPropagation();
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