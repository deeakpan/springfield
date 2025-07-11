import React, { useState, useEffect, useRef } from 'react';
import { X, Wallet, User, Users, Globe, Send, ArrowRight, ArrowLeft, Loader2, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { TOKENS } from '../../supportedTokens';
import { ethers } from 'ethers';
import Image from 'next/image';
import lighthouse from '@lighthouse-web3/sdk';

// Modal Props
interface BuyModalProps {
  open: boolean;
  onClose: () => void;
  tile: any;
}

type UserType = 'project' | 'user' | null;

type Step = 'choose' | 'form' | 'price' | 'success';

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
  let content;
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
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showFinalSuccess, setShowFinalSuccess] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY;
  const DEPLOYER_ADDRESS = "0x95C46439bD9559e10c4fF49bfF3e20720d93B66E";
  const TILE_PURCHASE_ADDRESS = "0x346a672059a1a81105660B6B3a2Fc98b607B4ce7";

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
      setConnectedAddress(null);
      setUploading(false);
      setErrorMsg(null);
      setSuccessMsg(null);
      setShowFinalSuccess(false);
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
      const priceKey = selectedToken.address ? selectedToken.address : 'PEPU';
      fetch('/api/token-price')
        .then(res => res.json())
        .then(data => {
          const priceValue = data[priceKey];
          setPrice(priceValue && !isNaN(priceValue) ? priceValue : '');
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
          if (selectedToken.isNative) {
            const balance = await provider.getBalance(userAddress);
            setSprfdBalance(ethers.formatUnits(balance, 18)); // Assuming 18 decimals for native
          } else {
            if (!selectedToken.address) throw new Error('No address for ERC20 token');
            try {
              // For PENK: call everything on the implementation contract
              const implementationContract = new ethers.Contract(
                "0xE8a859a25249c8A5b9F44059937145FC67d65eD4", // PENK implementation
                ["function balanceOf(address owner) view returns (uint256)", "function decimals() view returns (uint8)"],
                provider
              );
              
              const [balance, decimals] = await Promise.all([
                implementationContract.balanceOf(userAddress),
                implementationContract.decimals()
              ]);
              
              // Validate the balance response
              if (!balance || balance.toString() === "0" || balance.toString().includes("-")) {
                console.log("Invalid balance from implementation, trying proxy...");
                // Try proxy as fallback
                const proxyContract = new ethers.Contract(
                  selectedToken.address,
                  ["function balanceOf(address owner) view returns (uint256)"],
                  provider
                );
                const proxyBalance = await proxyContract.balanceOf(userAddress);
                setSprfdBalance(ethers.formatUnits(proxyBalance, 18)); // Hardcode decimals
              } else {
                setSprfdBalance(ethers.formatUnits(balance, decimals));
              }
            } catch (err) {
              console.error("Failed to fetch PENK balance:", err, {
                address: selectedToken.address,
                userAddress
              });
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
        // Prevent closing modal on Escape during success step
        e.stopPropagation();
        e.preventDefault();
      }
    }
    if (open) {
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [open, step]);

  // Prevent modal from closing on backdrop click during success step
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

  // Lighthouse upload logic
  const handleBuy = async () => {
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
    setUploading(true);
    try {
      // 1. Send token transfer
      if (!window.ethereum) throw new Error("Wallet not found");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      let erc20;
      let decimals;
      let amount;
      let balance;

      if (selectedToken.isNative) {
        // Native token transfer via contract
        const nativeAmount = ethers.parseUnits(String(price), 18); // Assuming 18 decimals for native
        balance = await provider.getBalance(userAddress);
        if (balance < nativeAmount) {
          setErrorMsg(`Insufficient ${selectedToken.name} balance for this purchase.`);
          setUploading(false);
          return;
        }
        // Call contract's buyTileNative function
        const tilePurchase = new ethers.Contract(
          TILE_PURCHASE_ADDRESS,
          ["function buyTileNative(uint256 tileId) external payable"],
          signer
        );
        const tx = await tilePurchase.buyTileNative(parseInt(tile?.id) || 0, { value: nativeAmount });
        await tx.wait();
      } else {
        // ERC20 token transfer via contract
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
        amount = ethers.parseUnits(String(price), decimals);
        balance = await erc20.balanceOf(userAddress);
        console.log('Token:', selectedToken.address, 'Decimals:', decimals, 'Amount:', amount.toString(), 'User balance:', balance.toString());
        if (balance < amount) {
          setErrorMsg(`Insufficient ${selectedToken.name} balance for this purchase.`);
          setUploading(false);
          return;
        }
        // First approve the contract to spend tokens
        const approveTx = await erc20.approve(TILE_PURCHASE_ADDRESS, amount);
        await approveTx.wait();
        // Then call contract's buyTile function
        const tilePurchase = new ethers.Contract(
          TILE_PURCHASE_ADDRESS,
          ["function buyTile(address token, uint256 amount, uint256 tileId) external"],
          signer
        );
        const tx = await tilePurchase.buyTile(selectedToken.address, amount, parseInt(tile?.id) || 0);
        await tx.wait();
      }

      // 2. Upload image
      const imageRes = await lighthouse.upload([imageFile], apiKey);
      const imageCID = imageRes.data.Hash;
      // 3. Prepare details JSON
      const details = {
        tile: tile?.id || null,
        name: form.name,
        socials: userType === 'user'
          ? { [userSocialPlatform]: userSocialValue }
          : {
              primary: { [projectPrimaryPlatform]: projectPrimaryValue },
              additional: projectAdditionalLinks,
            },
        website: form.website,
        address: connectedAddress,
        imageCID,
      };
      const detailsText = JSON.stringify(details, null, 2);
      // 4. Upload details JSON
      const textRes = await lighthouse.uploadText(detailsText, apiKey, form.name || "details");
      const textCID = textRes.data.Hash;
      // 5. Log CIDs
      console.log("Image CID:", imageCID);
      console.log("Details CID:", textCID);
      // 6. Success: clear form, close modal, show message
      setSuccessMsg("Upload successful!");
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

  // Success step as a regular modal step
  if (step === 'success') {
    content = (
      <div className="flex flex-col items-center justify-center w-full p-8">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <div className={`text-xl font-bold text-yellow-300 mb-1 w-full text-center`}>Welcome to Our Springfield!</div>
        <div className={`text-md text-black mb-3 w-full text-center italic`}>Where every tile tells a story—yours is now part of the grid.</div>
        <div className="text-2xl font-bold text-green-600 mb-2 text-center">Tile purchase complete!</div>
        <div className="text-lg text-gray-700 text-center mb-2">
          Your tile (ID: {tile?.id}) is now live!<br />
          You can see your uploaded image on the <span className="font-semibold text-green-700">Springfield Grid</span>.
        </div>
      </div>
    );
  }

  // Modal content by step
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
          if (!imageFile) {
            errs.imageFile = 'Image is required.';
          }
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
        {/* Error and Success Messages */}
        {errorMsg && <div className="text-red-600 font-bold text-center mb-2">{errorMsg}</div>}
        {successMsg && <div className="text-green-600 font-bold text-center mb-2">{successMsg}</div>}
        {/* Action Button (smaller, green, with cart icon) */}
          <button
          className="w-full py-2 mt-2 rounded-lg bg-green-500 text-black font-bold text-lg border-2 border-green-700 hover:bg-green-400 transition shadow flex items-center justify-center gap-2"
          disabled={loadingPrice || uploading}
          onClick={handleBuy}
          >
          {uploading ? <Loader2 className="animate-spin w-5 h-5 mr-1" /> : <ShoppingCart className="w-5 h-5 mr-1" />}
          {uploading ? 'Uploading...' : (loadingPrice ? 'Loading...' : 'Buy Tile')}
          </button>
      </div>
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