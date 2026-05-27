# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased] — revision 2026

### Changed
- **P4 — Realistic Sepolia measurements now use a Hardhat fork instead of a
  live deployment.** `hardhat.config.js` gains an opt-in forked-Sepolia mode:
  when `FORK_SEPOLIA` is set, the in-process `hardhat` network forks real
  Sepolia state at a **pinned block — 10,930,000 (2026-05-27 01:33:36 UTC)** —
  via a read-only `SEPOLIA_RPC_URL`. Pinning makes gas/state measurements
  reproducible. New scripts: `npm run test:sepolia-fork`, `npm run
  node:sepolia-fork`.
  - *Rationale:* during setup for the live-deployment step, an EIP-7702 sweeper
    contract compromised the development wallet, and fresh-wallet + faucet
    retries hit cascading friction. Forking preserves the real-Sepolia-state
    evidence point with **no private key and no testnet funding**, removing the
    key-custody risk. Live deployment is proposed as immediate future work.

### Removed
- **Live Sepolia deployment** and the associated on-chain verification flow
  (was the prior P4 plan): the live `sepolia` deploy network, `hardhat-verify`
  / Etherscan and Sourcify verification config, the committed
  `deployments/sepolia.json` manifest, and the `DEPLOYER_PRIVATE_KEY` /
  `ETHERSCAN_API_KEY` environment variables. None are needed for the fork-based
  approach.

### Fixed
- **P2 follow-up — `auth.sol` reaches 100% branch coverage.** The two
  previously-uncovered `require` revert arms in `addOrRequestMember` (the
  request-path `memberExist` guard, line 94; the direct-add "You need to
  Request First" guard, line 102) are now exercised by tests. Project-wide
  contract coverage is 100% statements/branches/functions/lines.

### Notes
- The Phase-1 ABI-preserving gas optimizations, the performance benchmark
  suite, and the security-analysis tooling (Slither / Solhint / Echidna /
  Mythril / coverage, with the OWASP Smart Contract Top 10 mapping in
  `benchmarks/SECURITY_ANALYSIS.md`) landed in earlier commits on the revision
  line and are unaffected by this scope change.
