import { http } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import type { Chain } from 'wagmi/chains';

export const pepeUnchainedV2: Chain = {
  id: 97740,
  name: 'Pepe Unchained V2 Testnet',
  nativeCurrency: {
    name: 'PEPU',
    symbol: 'PEPU',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc-pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz'] },
    public: { http: ['https://rpc-pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz'] },
  },
  blockExplorers: {
    default: { name: 'PepeScan Testnet', url: 'https://testnet.pepuscan.com/' },
  },
  testnet: true,
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