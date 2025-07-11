require('dotenv').config();
require('@nomicfoundation/hardhat-toolbox');

module.exports = {
  solidity: '0.8.20',
  networks: {
    base_sepolia: {
      url: 'https://sepolia.base.org',
      accounts: [process.env.PRIVATE_KEY],
    },
    pepe_unchained_v2: {
      url: 'https://rpc-pepu-v2-mainnet-0.t.conduit.xyz',
      chainId: 97741,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};