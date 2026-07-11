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

## Realistic measurements via a Sepolia fork

This revision evaluates the contracts against **real Sepolia state by forking
the network locally at a pinned block**, rather than performing a live
deployment.

**Why a fork instead of a live deploy.** During setup for the live-deployment
step, an [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) sweeper contract
compromised the development wallet, and subsequent fresh-wallet + faucet
attempts hit a cascade of friction. Forking preserves the evidence we actually
need — real Sepolia state and deterministic, on-real-network gas costs — while
eliminating the key-custody and funding risk entirely: the fork uses a
**read-only RPC, no private key, and no testnet ETH**. A live Sepolia
deployment is proposed as immediate future work.

**Pinned block.** The fork is pinned to Sepolia block **10,930,000**
(2026-05-27 01:33:36 UTC) in `hardhat.config.js`. Pinning makes gas and state
measurements reproducible across runs and machines. See `CHANGELOG.md`.

### Setup

Add a read-only Sepolia RPC URL to `.env` (any free tier — Alchemy, Infura,
QuickNode). No key, no funding:

```bash
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<API_KEY>
```

> **The RPC must serve archive state at the pinned block.** Forking at block
> 10,930,000 requires the provider to return historical state there. Alchemy,
> Infura, and QuickNode free tiers provide this on Sepolia. Generic pruned
> public endpoints (e.g. `*.publicnode.com`) typically do **not** and will fail
> with `historical state ... is not available`.

### Run against the fork

```bash
npm run test:sepolia-fork      # test suite against forked Sepolia state
npm run node:sepolia-fork      # long-lived forked node on 127.0.0.1:8545
```

Both set `FORK_SEPOLIA=1`, which activates `networks.hardhat.forking` at the
pinned block. Without it, the default `npm test` and the benchmark suite run on
the fast local network — offline and key-free.

### Running benchmarks

```bash
npm run benchmark            # local pass — truncates each CSV and writes local rows
npm run benchmark:fork       # appends the forked-Sepolia rows (FORK_SEPOLIA + BENCH_APPEND)
npm run benchmark:all-networks   # local then fork, in the correct order
npm run benchmark:plot       # regenerate figures/ from the CSVs (no chain needed)
```

> ⚠️ **Run order matters.** `npm run benchmark` (the local pass) **truncates**
> each CSV and rewrites only the `local` rows — it does **not** preserve any
> `sepoliaFork` rows already present. The fork rows are added by
> `npm run benchmark:fork`, which appends (`BENCH_APPEND=1`). So always run the
> local pass *first*, then the fork pass — or just use
> `npm run benchmark:all-networks`, which sequences them correctly. Running a
> bare `npm run benchmark` after a fork pass will silently wipe the fork data.

### Benchmark network coverage

The benchmark CSVs in `benchmarks/` carry a leading `network` column. Three are
**dual-network** (a `local` row-block and a `sepoliaFork` row-block); the rest
are **local-only** by design:

| CSV | Networks | Why |
|---|---|---|
| `gas.csv` | local + sepoliaFork | per-op gas, the parity proof |
| `throughput.csv` | local + sepoliaFork | analytical TPS ceiling |
| `lifecycle.csv` | local + sepoliaFork | end-to-end gas waterfall |
| `latency.csv` | local only | measured execution + simulated (`mainnet-sim`) propagation/inclusion — network-independent by construction |
| `scalability.csv` | local only | see note below |
| `state_growth.csv` | local only | see note below |
| `parallel_scalability.csv` | local only | concurrent-load behaviour of contracts + node, not consensus throughput |

`scalability.csv` and `state_growth.csv` are local-only, and this is sound
cross-network. Their reported metrics (`totalGas`, `meanGasPerPaper`, the
per-op slot-growth columns) are **gas-derived**, and `gas.csv` proves
per-operation gas is **byte-for-byte identical** between `local` and
`sepoliaFork` across all 15 operations. Gas is EVM-deterministic, so a sum of
identical per-op costs is itself identical — the fork would reproduce these
numbers exactly. The only column that *would* differ is wall-clock time, which
is local-only by nature: on a fork, block production is harness-controlled, so
wall-clock measures the test harness, not the network. We therefore do not run
these two sweeps on the fork (each fires thousands of transactions, and on a
forked node every transaction triggers throttled archive-RPC state fetches,
which makes the sweep impractically slow without buying any new information).

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

Current coverage (Auth/Main/Decision; the `contracts/echidna/` fuzzing
harnesses are excluded via `.solcover.js`):

| Contract       | Statements | Branches | Functions | Lines |
|----------------|-----------:|---------:|----------:|------:|
| `auth.sol`     | 100%       | 100%     | 100%      | 100%  |
| `main.sol`     | 100%       | 100%     | 100%      | 100%  |
| `Decision.sol` | 100%       | 100%     | 100%      | 100%  |
| **All**        | **100%**   | **100%** | **100%**  | **100%** |

`auth.sol` previously sat at 92.31% branch coverage: two `require` revert arms
in `addOrRequestMember` were untested — the `memberExist` guard on the request
path (reachable when a direct-added member, e.g. a JOURNAL, later requests
another role) and the `"You need to Request First"` guard on the direct-add
path (reachable via `request == false` for a non-JOURNAL that never requested).
Both are now exercised by tests in `test/Auth.test.js`, bringing every contract
to 100% branch coverage.

## Project layout

```
contracts/         Auth.sol, Main.sol, Decision.sol (no ABI changes in this revision)
contracts/echidna/ Echidna property-fuzzing harnesses (excluded from coverage)
scripts/           deploy.js, build-frontend-abis.js, benchmark/, plot.py
src/               React frontend (App.js + Components/)
src/contract_abi/  Frontend-imported ABI JSONs (rewritten by `npm run compile`)
benchmarks/        Performance report, CSVs, figures, SECURITY_ANALYSIS.md
hardhat.config.js  Solidity 0.8.19; hardhat (forkable to Sepolia), localhost, sepoliaSim
.env.example       Template for required environment variables
```

## License

LGPL — see `LICENSE`.
