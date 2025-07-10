import React, { useState, ChangeEvent } from 'react';
import { X, Image as ImageIcon, Star } from 'lucide-react';
import { FaTelegramPlane, FaDiscord, FaTwitter, FaGlobe } from 'react-icons/fa';

interface BuyModalProps {
  open: boolean;
  onClose: () => void;
  tile: any;
  userType: 'project' | 'user' | null;
  setUserType: (type: 'project' | 'user') => void;
}

const socialIcons = {
  telegram: <FaTelegramPlane className="inline w-5 h-5 text-blue-400" />,
  discord: <FaDiscord className="inline w-5 h-5 text-indigo-400" />,
  x: <FaTwitter className="inline w-5 h-5 text-black dark:text-white" />,
  website: <FaGlobe className="inline w-5 h-5 text-green-400" />,
};

const initialProject = {
  name: '',
  description: '',
  logo: null as File | null,
  logoUrl: '',
  primaryType: 'website',
  primaryLink: '',
  primarySocial: '',
  secondaryLinks: [{ type: 'telegram', value: '' }, { type: 'discord', value: '' }],
  displayType: 'file' as 'file' | 'nft',
};

const initialUser = {
  name: '',
  description: '',
  logo: null as File | null,
  logoUrl: '',
  socialType: 'telegram',
  socialValue: '',
  displayType: 'file' as 'file' | 'nft',
};

const BuyModal: React.FC<BuyModalProps> = ({ open, onClose, tile, userType, setUserType }) => {
  const [project, setProject] = useState(initialProject);
  const [user, setUser] = useState(initialUser);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'choose' | 'form'>('choose');
  const [selectedType, setSelectedType] = useState<'project' | 'user' | null>(null);

  React.useEffect(() => {
    if (open) {
      setStep('choose');
      setError('');
      setProject(initialProject);
      setUser(initialUser);
      setSelectedType(null);
    }
  }, [open]);

  if (!open) return null;

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>, isProject: boolean) => {
    const file = e.target.files?.[0];
    if (file && file.size > 600 * 1024) {
      setError('Logo must be less than 600KB');
      return;
    }
    const url = file ? URL.createObjectURL(file) : '';
    if (isProject) setProject((p) => ({ ...p, logo: file ?? null, logoUrl: url }));
    else setUser((u) => ({ ...u, logo: file ?? null, logoUrl: url }));
    setError('');
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProject((p) => ({ ...p, [name]: value }));
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUser((u) => ({ ...u, [name]: value }));
  };

  const handleSecondaryLinkChange = (idx: number, value: string) => {
    setProject((p) => {
      const links = [...p.secondaryLinks];
      links[idx].value = value;
      return { ...p, secondaryLinks: links };
    });
  };

  const handlePrimaryTypeChange = (type: string) => {
    setProject((p) => ({ ...p, primaryType: type, primaryLink: '', primarySocial: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userType === 'project') {
      if (!project.name || !project.description || !project.logo) {
        setError('Please fill all required fields.');
        return;
      }
      if (project.primaryType === 'website' && !project.primaryLink) {
        setError('Primary website link required.');
        return;
      }
      if (project.primaryType === 'website' && project.primaryLink) {
        // Validate website URL
        try {
          new URL(project.primaryLink);
        } catch {
          setError('Primary website link must be a valid URL.');
          return;
        }
      }
      if (project.primaryType !== 'website' && !project.primarySocial) {
        setError('Primary social handle required.');
        return;
      }
      setError('');
      console.log('Project Submission:', project);
      onClose();
    } else {
      if (!user.name || !user.description || !user.logo || !user.socialValue) {
        setError('Please fill all required fields.');
        return;
      }
      if (user.socialType === 'website') {
        try {
          new URL(user.socialValue);
        } catch {
          setError('Website must be a valid URL.');
          return;
        }
      }
      setError('');
      console.log('User Submission:', user);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="relative w-full max-w-md mx-1 sm:mx-0 bg-blue-100 border-2 border-black rounded-2xl shadow-2xl p-2 sm:p-3 flex flex-col text-black overflow-y-auto scrollbar-hide"
        style={{ minHeight: 180, fontSize: '0.95rem', maxHeight: '90vh', scrollbarWidth: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 text-black hover:text-red-500"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </button>
        {step === 'choose' && (
          <>
            <h2 className="text-xl font-bold mb-4 text-center">Choose Type</h2>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                className={`w-full py-1.5 rounded border-2 border-black font-semibold text-sm flex items-center justify-center gap-1 ${selectedType === 'project' ? 'bg-green-400' : 'bg-white'} transition-colors`}
                onClick={() => setSelectedType('project')}
              >
                <FaGlobe className="w-4 h-4 text-green-500" /> Project
              </button>
              <button
                type="button"
                className={`w-full py-1.5 rounded border-2 border-black font-semibold text-sm flex items-center justify-center gap-1 ${selectedType === 'user' ? 'bg-green-400' : 'bg-white'} transition-colors`}
                onClick={() => setSelectedType('user')}
              >
                <Star className="w-4 h-4 text-yellow-500" /> User
              </button>
            </div>
            <button
              type="button"
              className={`mt-2 w-full py-1.5 rounded border-2 border-black font-bold text-sm bg-blue-300 hover:bg-blue-400 transition-colors ${!selectedType ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!selectedType}
              onClick={() => {
                if (selectedType) {
                  setUserType(selectedType);
                  setStep('form');
                }
              }}
            >
              Next
            </button>
          </>
        )}
        {step === 'form' && userType === 'project' && (
          <form className="flex flex-col gap-3 mt-1" onSubmit={handleSubmit}>
            <h2 className="text-lg font-bold text-center">Project Details</h2>
            <input
              className="rounded border border-black px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Project Name"
              name="name"
              value={project.name}
              onChange={handleProjectChange}
              required
            />
            <textarea
              className="rounded border border-black px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Description"
              name="description"
              value={project.description}
              onChange={handleProjectChange}
              required
              rows={2}
            />
            <div className="flex flex-col gap-1">
              <label className="font-semibold">Select Display Image</label>
              <div className="flex gap-2 items-center mb-1">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="projectDisplayType"
                    checked={project.displayType !== 'nft'}
                    onChange={() => setProject(p => ({ ...p, displayType: 'file' }))}
                  />
                  Upload File
                </label>
                <label className="flex items-center gap-1 opacity-60 cursor-not-allowed">
                  <input
                    type="radio"
                    name="projectDisplayType"
                    checked={project.displayType === 'nft'}
                    disabled
                    readOnly
                  />
                  NFT (Coming Soon)
                </label>
              </div>
              {(!project.displayType || project.displayType === 'file') && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoChange(e, true)}
                    className="file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required
                  />
                  {project.logoUrl && (
                    <img src={project.logoUrl} alt="Logo preview" className="w-12 h-12 rounded-full border border-black object-cover mt-1" />
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 py-2 rounded-lg border-2 border-black font-semibold ${project.primaryType === 'website' ? 'bg-blue-200' : 'bg-white'}`}
                onClick={() => handlePrimaryTypeChange('website')}
              >
                {socialIcons.website} Website
              </button>
              <button
                type="button"
                className={`flex-1 py-2 rounded-lg border-2 border-black font-semibold ${project.primaryType === 'telegram' ? 'bg-blue-200' : 'bg-white'}`}
                onClick={() => handlePrimaryTypeChange('telegram')}
              >
                {socialIcons.telegram} Telegram
              </button>
              <button
                type="button"
                className={`flex-1 py-2 rounded-lg border-2 border-black font-semibold ${project.primaryType === 'discord' ? 'bg-blue-200' : 'bg-white'}`}
                onClick={() => handlePrimaryTypeChange('discord')}
              >
                {socialIcons.discord} Discord
              </button>
              <button
                type="button"
                className={`flex-1 py-2 rounded-lg border-2 border-black font-semibold ${project.primaryType === 'x' ? 'bg-blue-200' : 'bg-white'}`}
                onClick={() => handlePrimaryTypeChange('x')}
              >
                {socialIcons.x} X
              </button>
            </div>
            {project.primaryType === 'website' ? (
              <input
                className="rounded-md border border-black px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Primary Website Link"
                name="primaryLink"
                value={project.primaryLink}
                onChange={handleProjectChange}
                required
              />
            ) : (
              <input
                className="rounded-md border border-black px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder={`Primary ${project.primaryType.charAt(0).toUpperCase() + project.primaryType.slice(1)} Handle`}
                name="primarySocial"
                value={project.primarySocial}
                onChange={handleProjectChange}
                required
              />
            )}
            <div className="flex flex-col gap-2">
              <label className="font-semibold">Secondary Links</label>
              {project.secondaryLinks.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {socialIcons[link.type as keyof typeof socialIcons]}
                  <input
                    className="flex-1 rounded-md border border-black px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder={`${link.type.charAt(0).toUpperCase() + link.type.slice(1)} Link`}
                    value={link.value}
                    onChange={e => handleSecondaryLinkChange(idx, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-semibold">NFT (Coming Soon)</label>
              <button type="button" className="py-2 rounded-lg border-2 border-black bg-gray-200 text-gray-500 font-semibold cursor-not-allowed" disabled>
                Mint as NFT (Coming Soon)
              </button>
            </div>
            {error && <div className="text-red-500 text-sm font-semibold text-center">{error}</div>}
            <button
              type="submit"
              className="w-full py-3 rounded-lg border-2 border-black bg-green-400 hover:bg-green-500 font-bold text-lg mt-2"
            >
              Claim
            </button>
          </form>
        )}
        {step === 'form' && userType === 'user' && (
          <form className="flex flex-col gap-3 mt-1" onSubmit={handleSubmit}>
            <h2 className="text-lg font-bold text-center">User Details</h2>
            <input
              className="rounded border border-black px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Name"
              name="name"
              value={user.name}
              onChange={handleUserChange}
              required
            />
            <textarea
              className="rounded border border-black px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Description"
              name="description"
              value={user.description}
              onChange={handleUserChange}
              required
              rows={2}
            />
            <div className="flex flex-col gap-1">
              <label className="font-semibold">Select Display Image</label>
              <div className="flex gap-2 items-center mb-1">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="userDisplayType"
                    checked={user.displayType !== 'nft'}
                    onChange={() => setUser(u => ({ ...u, displayType: 'file' }))}
                  />
                  Upload File
                </label>
                <label className="flex items-center gap-1 opacity-60 cursor-not-allowed">
                  <input
                    type="radio"
                    name="userDisplayType"
                    checked={user.displayType === 'nft'}
                    disabled
                    readOnly
                  />
                  NFT (Coming Soon)
                </label>
              </div>
              {(!user.displayType || user.displayType === 'file') && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoChange(e, false)}
                    className="file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required
                  />
                  {user.logoUrl && (
                    <img src={user.logoUrl} alt="Logo preview" className="w-12 h-12 rounded-full border border-black object-cover mt-1" />
                  )}
                </>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold">Social Handle</label>
              <div className="flex gap-2 items-center">
                <select
                  className="rounded border border-black px-2 py-1 bg-white focus:outline-none"
                  value={user.socialType || 'telegram'}
                  onChange={e => setUser(u => ({ ...u, socialType: e.target.value }))}
                  style={{ minWidth: 90 }}
                >
                  <option value="telegram">Telegram</option>
                  <option value="discord">Discord</option>
                  <option value="x">X</option>
                  <option value="website">Website</option>
                </select>
                <input
                  className="flex-1 rounded border border-black px-2 py-1 bg-white focus:outline-none"
                  placeholder="Handle or Link"
                  value={user.socialValue || ''}
                  onChange={e => setUser(u => ({ ...u, socialValue: e.target.value }))}
                  required
                />
                {socialIcons[(user.socialType as keyof typeof socialIcons) || 'telegram']}
              </div>
            </div>
            {error && <div className="text-red-500 text-xs font-semibold text-center">{error}</div>}
            <button
              type="submit"
              className="w-full py-2 rounded border-2 border-black bg-green-400 hover:bg-green-500 font-bold text-base mt-1"
            >
              Claim
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default BuyModal; 