require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: { enabled: false, runs: 200 },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      // SEPOLIA_RPC_URL: full Infura/Alchemy endpoint, e.g.
      //   https://sepolia.infura.io/v3/<PROJECT_ID>
      url: process.env.SEPOLIA_RPC_URL || "",
      // DEPLOYER_PRIVATE_KEY: hex string with or without 0x prefix. Hardhat
      // accepts both. Empty fallback so `npx hardhat compile` / `npm test`
      // continue to work in environments without a deployer key.
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    // ETHERSCAN_API_KEY: free from https://etherscan.io/myapikey.
    // hardhat-verify reads this and uses it for the Sepolia explorer.
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
  },
  sourcify: {
    // Sourcify verification is the open alternative to Etherscan; running
    // both costs nothing and gives reviewers a non-proprietary path to
    // confirm the deployed bytecode matches this source tree.
    enabled: true,
  },
  mocha: {
    timeout: 60000,
  },
};
