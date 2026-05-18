# Blockchain-based Decentralized Research Publishing System (B-DRPS)

Revised codebase accompanying the peer-review response. The published baseline
is preserved at tag `v1.0-paper`; ongoing revision work targets the
`revision-2026` branch.

## Stack

- **Smart contracts** — Solidity 0.8.19 (`Auth`, `Main`, `Decision`)
- **Build / deploy** — Hardhat 2 (replaces Truffle, sunset Sept 2023)
- **Frontend** — React 18 + web3.js 1.x, MetaMask for signing
- **IPFS pinning** — Pinata (replaces Web3.storage, discontinued late 2023)

## Prerequisites

- Node.js 18+ and npm
- Git
- [MetaMask](https://metamask.io/download/) browser extension
- A [Pinata](https://app.pinata.cloud) account (free tier is sufficient for testing)

## Setup

### 1. Clone

```bash
git clone https://github.com/raaj2045/b-drps.git
cd b-drps
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

- `REACT_APP_PINATA_JWT` — create at https://app.pinata.cloud/developers/api-keys
  (give it `pinFileToIPFS` permission, paste the JWT)
- `REACT_APP_PINATA_GATEWAY` — leave as `gateway.pinata.cloud` for testing, or
  create a dedicated gateway at https://app.pinata.cloud/gateway
- `REACT_APP_RPC_URL` — leave as `http://127.0.0.1:8545` for local Hardhat

### 4. Compile contracts

```bash
npm run compile
```

This compiles all three contracts and writes Truffle-shape ABI JSON files into
`src/contract_abi/` for the frontend to import.

### 5. Start the local blockchain (terminal A)

```bash
npm run node
```

Leave this running. It starts a Hardhat node on `http://127.0.0.1:8545` and
prints 20 pre-funded accounts with their private keys — you'll import some of
these into MetaMask in step 7.

### 6. Deploy contracts (terminal B)

```bash
npm run deploy:local
```

This deploys `Auth`, `Main`, `Decision` to the local node and writes their
addresses into `src/contract_abi/<Name>.json` under `networks[31337]`. Re-run
this whenever you restart the node or modify contracts.

### 7. Configure MetaMask

- Add the Hardhat network: RPC URL `http://127.0.0.1:8545`, chain ID `31337`,
  currency `ETH`
- Import at least 8 accounts using the private keys printed by `npm run node`
  (one for Journal, one for EiC, one for AE, several for Reviewers and Authors)

### 8. Run the frontend (terminal B, after step 6 completes)

```bash
npm start
```

The dapp opens at http://localhost:3000.

## Demo accounts and journal pre-registration

The `JOURNAL` role is the only one that signs up without requiring approval
from a higher-power account — it bootstraps the membership tree. The first
account you sign up as `JOURNAL` becomes the root authority and can approve
EiC requests; EiC then approves AE; AE approves Reviewers and Authors.

For testing convenience, register the first MetaMask account as a journal,
then use the remaining imported accounts to test the request → approve flow
for each role.

## Deploy to Sepolia (public testnet)

Required environment variables (add to `.env`):

| Var | Where to get it |
|---|---|
| `SEPOLIA_RPC_URL` | Infura: https://app.infura.io → new key → Sepolia endpoint URL.  Alchemy: https://dashboard.alchemy.com → new app → Sepolia → HTTPS URL. |
| `DEPLOYER_PRIVATE_KEY` | Generate a **fresh** wallet for this — don't reuse a mainnet key. In MetaMask: account menu → Add account → copy the new account's private key (with or without `0x` prefix). |
| `ETHERSCAN_API_KEY` | Free from https://etherscan.io/myapikey. |

Fund the deployer wallet with Sepolia ETH (a successful deploy of all three contracts uses well under 0.05 SepETH at typical gas):

- https://www.alchemy.com/faucets/ethereum-sepolia
- https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- https://www.infura.io/faucet/sepolia

Then:

```bash
npm run compile                 # ensure ABIs match
npx hardhat run scripts/deploy.js --network sepolia
```

This produces:

- `deployments/sepolia.json` — chainId, deployer, timestamp, and the three contract addresses + tx hashes. **Committed** — reviewers reproduce by pointing at the same addresses.
- `src/contract_abi/{Auth,Main,Decision}.json` — `networks[11155111]` populated, so the frontend can talk to the Sepolia deployment after pointing `REACT_APP_RPC_URL` at a public Sepolia endpoint.

### Verify on Etherscan

```bash
npx hardhat verify --network sepolia <Auth_address>
npx hardhat verify --network sepolia <Main_address>
npx hardhat verify --network sepolia <Decision_address>
```

(Source files in this repo, deployed bytecode on Sepolia, and the verification result on Etherscan should all agree.)

### Post-deploy sanity check

After verification, anyone can read the deployed contracts directly from Etherscan's "Read Contract" tab — e.g., call `Auth.memberExistOrNot(0x…)` to confirm the contract is live and responding.

## Running tests

Mocha/chai suite against the three Solidity contracts:

```bash
npm test                # run all contract tests
npx hardhat coverage    # solidity-coverage report (HTML at ./coverage/)
```

The suite covers registration paths, the EIC→AE→Reviewer→AE→EIC publication
pipeline, and one end-to-end integration test that takes a paper from
submission to `Decision.getPublishedpaper`. A handful of tests are marked
`.skip` and tagged "P5" — they target architectural bugs (single shared
`instanceofPaperStruct` in Main/Decision, `pop()` queue corruption,
no-op false-branches in `Reviewerapproval` / `ReviewedByAE`, missing
role-check modifiers) that will be addressed in `feat/security-hardening`.

Current coverage on `revision-2026`:

| Contract       | Statements | Branches | Functions | Lines |
|----------------|-----------:|---------:|----------:|------:|
| `auth.sol`     | 100%       | 92.86%   | 100%      | 100%  |
| `main.sol`     | 100%       | 100%     | 100%      | 100%  |
| `Decision.sol` | 100%       | 100%     | 100%      | 100%  |
| **All**        | **100%**   | **94.74%** | **100%** | **100%** |

## Project layout

```
contracts/         Auth.sol, Main.sol, Decision.sol (no ABI changes in this revision)
scripts/           deploy.js, build-frontend-abis.js
src/               React frontend (App.js + Components/)
src/contract_abi/  Frontend-imported ABI JSONs (rewritten by `npm run compile`)
hardhat.config.js  Solidity 0.8.19; localhost, hardhat, sepolia networks
deployments/       Per-network deployment manifests (sepolia.json committed)
.env.example       Template for required environment variables
```

## License

LGPL — see `LICENSE`.
