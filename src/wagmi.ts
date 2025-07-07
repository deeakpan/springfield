import { http } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { Chain } from 'wagmi/chains';

export const pepeUnchainedV2: Chain = {
  id: 97741,
  name: 'Pepe Unchained V2',
  nativeCurrency: {
    name: 'Pepe Unchained',
    symbol: 'PEPU',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc-pepu-v2-mainnet-0.t.conduit.xyz'] },
    public: { http: ['https://rpc-pepu-v2-mainnet-0.t.conduit.xyz'] },
  },
  blockExplorers: {
    default: { name: 'PEPU Scan', url: 'https://pepuscan.com/' },
  },
  testnet: false,
};

export const config = getDefaultConfig({
  appName: 'Springfield',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [pepeUnchainedV2],
  ssr: true,
  transports: {
    [pepeUnchainedV2.id]: http(),
  },
}); 