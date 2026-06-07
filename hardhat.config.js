require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Forked-Sepolia configuration. When FORK_SEPOLIA is set (see the
// test:sepolia-fork / node:sepolia-fork npm scripts), the in-process `hardhat`
// network forks REAL Sepolia state at a pinned block, giving deterministic,
// reproducible measurements against live testnet state -- with a read-only RPC,
// no private key, and no testnet funding required.
//
// Pinned block: 10,930,000  (2026-05-27 01:33:36 UTC). Pinning makes gas/state
// measurements reproducible across runs and machines; see CHANGELOG.md.
const SEPOLIA_FORK_BLOCK = 10_930_000;
const sepoliaForking =
  process.env.FORK_SEPOLIA && process.env.SEPOLIA_RPC_URL
    ? { url: process.env.SEPOLIA_RPC_URL, blockNumber: SEPOLIA_FORK_BLOCK }
    : undefined;

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
      // With the optimizer off, Main/Decision exceed EIP-170 after P5 (see
      // SECURITY.md §4.6). Test-only flag; doesn't affect bytecode or gas.
      allowUnlimitedContractSize: true,
      // Only forks when FORK_SEPOLIA is set, so default `npm test` and the
      // benchmark suite stay fast, offline, and key-free.
      ...(sepoliaForking ? { forking: sepoliaForking } : {}),
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // In-process network used by scripts/benchmark.js to make latency
    // measurements representative of Sepolia: 12-second block interval and
    // Sepolia's ~30M block gas limit. Gas numbers are identical across all
    // networks (EVM-deterministic) so other benchmarks use the default
    // instant-mine `hardhat` network for speed.
    sepoliaSim: {
      url: "http://127.0.0.1:8545",
      chainId: 11155111,
      blockGasLimit: 30_000_000,
      mining: {
        auto: false,
        // Exact interval average on 23rd May 2026
        interval: 12242,
      },
    },
  },
  mocha: {
    timeout: 60000,
  },
};
