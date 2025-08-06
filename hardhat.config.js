require('dotenv').config();
require('@nomicfoundation/hardhat-toolbox');

module.exports = {
  solidity: '0.8.20',
  networks: {
    base_sepolia: {
      url: 'https://sepolia.base.org',
      accounts: [process.env.PRIVATE_KEY],
    },
    pepe_unchained_v2_testnet: {
      url: 'https://rpc-pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz',
      chainId: 97740,
      accounts: [process.env.PRIVATE_KEY],
    },
    pepe_unchained_v2: {
      url: 'https://rpc-pepu-v2-mainnet-0.t.conduit.xyz',
      chainId: 97741,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      'pepe-unchained-mainnet': 'empty',
       'pepe_unchained_v2_testnet': 'empty'
    },
    customChains: [
      {
        network: "pepe-unchained-mainnet",
        chainId: 97741,
        urls: {
          apiURL: "https://explorer-pepu-v2-mainnet-0.t.conduit.xyz/api",
          browserURL: "https://explorer-pepu-v2-mainnet-0.t.conduit.xyz:443"
        }
      },
      {
        network: "pepe_unchained_v2_testnet",
        chainId: 97740,
        urls: {
          apiURL: "https://explorer-pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz/api",
          browserURL: "https://explorer-pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz"
        }
      }
    ]
  }
};