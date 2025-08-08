import { http } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import type { Chain } from 'wagmi/chains';

export const pepeUnchainedMainnet: Chain = {
  id: 97741,
  name: 'Pepe Unchained Mainnet',
  nativeCurrency: {
    name: 'PEPU',
    symbol: 'PEPU',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc-pepu-v2-mainnet-0.t.conduit.xyz'] },
    public: { http: ['https://rpc-pepu-v2-mainnet-0.t.conduit.xyz'] },
  },
  blockExplorers: {
    default: { 
      name: 'PepeScan Mainnet', 
      url: 'https://explorer-pepu-v2-mainnet-0.t.conduit.xyz'
    },
  },
  testnet: false,
};

export const config = getDefaultConfig({
  appName: 'Springfield',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [pepeUnchainedMainnet],
  ssr: true,
  transports: {
    [pepeUnchainedMainnet.id]: http(),
  },
}); 