# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased] — revision 2026

### Reviewer-concern traceability

Each merged revision PR mapped to the reviewer concerns (R1–R4) it addresses —
for the response-to-reviewers letter.

| PR | Change | Addresses |
|---|---|---|
| #1 | Hardhat migration + Pinata IPFS pinning | **R1** (Web3.storage discontinued), **R4** (Truffle-sunset risk) |
| #3 | Contract test suite + coverage | **R1** (no tests), **R3** (no rigorous validation), **R4** (no test methodology) |
| #4 / #5 | Sepolia fork for realistic measurements | **R3** (Ganache-only evaluation), **R4** (no real testnet conditions) |
| #6 | Multi-network benchmark harness | **R3** (no latency/throughput/scalability), **R4** (single-point measurements, no variance) |
| #7 | README benchmark methodology | **R3** (analytical depth) |
| #8 | Security hardening (access control, events, `SECURITY.md`) | **R1** (no access control), **R3** (no security analysis), **R4** (no threat model / access modifiers / events) |
| P7 | Repository hygiene (this PR) | **R3** (writing clarity), **R4** (LICENSE/SPDX consistency) |
| fuzz-fix | Fix both Echidna findings (queue index corruption, member eviction) | **R3** (security analysis acts on its findings), **R4** (fuzz-verified state-machine integrity) |
| paper-artifacts | Latency decomposition (N=10/25/50), parallel-load sweep (10–100), security CSVs, figures | **R3** (latency/scalability depth, percentile statistics), **R4** (variance reporting, honest simulation labelling) |

### Fixed
- **Fuzz findings — queue index corruption and member eviction
  (`fix/fuzz-findings`).** Both defects surfaced by Echidna property fuzzing
  (`benchmarks/SECURITY_ANALYSIS.md` F1/F2) are fixed ABI-preserving and
  re-verified: **all 7 invariants pass at 50,000+ calls each**.
  - *F1 (Main):* every pipeline queue now pairs its array with an
    `address => index+1` map (0 = absent) managed by shared
    `_enqueue`/`_dequeue` helpers — duplicate submission by a queued author
    and removal of an absent paper revert instead of corrupting the
    swap-and-pop. Pre-fix, the downstream queues never wrote their index maps
    at all (every removal swap-popped slot 0).
  - *F2 (Auth):* `denyRequest`/`approoveRequest` require a pending request and
    clear the full request state, which also lets a denied requester
    re-request.
  - Echidna harnesses reworked for post-P5 role gating (`MockAuth` role map
    for `EchidnaMain`; JOURNAL self-registration + external self-call for
    `EchidnaAuthGuarded`) — without this the invariants pass vacuously.
    `scripts/benchmark/lib.js` deployment fixed for the P5 constructor
    signature, and all benchmark CSVs/figures regenerated (dual-network).
  - Unit regressions: `test/Auth.test.js` / `test/Main.test.js`
    *"Fuzz-finding regressions"* suites; coverage 100% stmt/func/line.

### Added
- **Paper artifacts — latency decomposition, parallel-load sweep, security
  CSVs (`feat/paper-artifacts`).**
  - *Section 6 — latency decomposition* (`scripts/benchmark/latency-v2.js`):
    per-operation confirmation latency at N = 10/25/50 samples with
    Mean/P95/P99/Min/Max, decomposed into **measured** EVM execution plus
    **simulated** (`mainnet-sim`, seeded RNG) propagation — Gaussian(150 ms,
    σ 40) + Exponential(50 ms) queueing + 10% Pareto(50, α 3) congestion
    spikes — and Gaussian(12 s, σ 2 s) block inclusion. Output:
    `benchmarks/latency_v2.csv`, `figures/latency_decomposition.*`,
    `figures/latency_v2_by_n.*`.
  - *Section 7 — parallel-load scalability* (`scripts/benchmark/parallel.js`):
    N = 10…100 concurrent clients; registration phase (parallel-safe
    throughput curve) and submission phase, which demonstrates that the
    shared-staging model (SECURITY.md §4.1) serializes concurrent submissions
    and the post-fix queue guards **fail safe** (queue-integrity asserted at
    every N). Output: `benchmarks/parallel_scalability.csv`,
    `figures/parallel_scalability.*`.
  - *Security CSVs* (`npm run security:csv`): `security_tools.csv`,
    `security_owasp.csv`, `security_echidna.csv` — structured transcriptions
    of `benchmarks/SECURITY_ANALYSIS.md` for direct use as paper tables.
  - `npm run benchmark` now runs sections 1–7; the fork pass reuses the
    wall-clock-bound sections (4–7) from the local run. Hardhat local network
    account count raised to 130 (first 20 addresses unchanged).
- **P7 — Repository hygiene.** Concise NatSpec (`@notice`, plus `@param`/`@return`
  where non-obvious) on every public/external function in `Auth`, `Main`, and
  `Decision`; SPDX headers in all `.sol` files corrected to
  `LGPL-2.1-only` (matching the `LICENSE`); `CITATION.cff` added; and the
  reviewer-concern traceability section. `LICENSE` is unchanged (canonical
  LGPL-2.1).
- **P5 — Security hardening: access control, events, and `SECURITY.md`.**
  - *Role-based access control (addresses **R1**, **R4** — no access control /
    no access modifiers anywhere).* `Main` and `Decision` now take an `Auth`
    address at construction and gate every state-changing action by role:
    `onlyAuthor` (submit), `onlyEiC`, `onlyAE`, `onlyReviewer` on `Main`;
    `onlyEiC` on `Decision`. `Auth` itself now enforces self-only registration
    (`addOrRequestMember` request path), approver-must-be-a-member
    (`approoveRequest`), and authorized denial (`denyRequest`). Modifiers read a
    new lightweight `Auth.memberPower(address)` view. All additions are
    ABI-additive — successful role flows are unchanged; unauthorized callers
    revert. `scripts/deploy.js` deploys `Auth` first and passes its address to
    `Main`/`Decision`.
  - *Events (addresses **R4** — auditability).* Every state-changing op emits an
    event (`MemberRequested`/`MemberAdded`/`MemberApproved`/`MemberDenied`;
    `PaperSubmitted`/`EICApprovalDecision`/`AEApprovalDecision`/
    `ReviewerReviewed`/`AEReviewed`; `PaperReceived`/`EICFinalDecision`/
    `PaperPublished`) for off-chain indexing and an on-chain audit trail.
  - *`SECURITY.md` (addresses **R3** — security threats; **R4** — architectural
    limitations not analyzed).* New standalone threat model (Sybil, role
    collusion, address-linkability de-anonymization, metadata leakage), the P5
    access-control summary, the deferred architectural limitations (§4.1–§4.6)
    with test cross-references and forcing-function acceptance criteria, the
    Slither accepted-risk register (§5), and reentrancy (§6) + EIP-7702 (§7)
    rationale.
  - *Static analysis.* `security/slither-report.md` records a project-wide
    Slither run: **zero high/critical findings**; 60 low/informational results
    (naming, boolean-equal, cache-array-length on the Echidna harnesses,
    floating pragma) are documented as accepted risk. `security:slither` now
    runs project-wide (`slither .`).
  - *Tests.* The **5 access-control negative tests** previously `.skip`'d in P2
    are unskipped and pass via the new modifiers (Auth ×2, Main ×1,
    Decision ×2); two new `denyRequest`-guard tests keep contract coverage at
    **100% statements/branches/functions/lines**. The **4 deferred data-model
    bug tests** remain `.skip` with `SECURITY.md` §4.x cross-references and
    forcing-function comments (fixing them would change the ABI / documented
    data model — out of scope to preserve `v1.0-paper` parity). Suite: **36
    passing, 4 pending**.
- **P3 — Multi-network benchmark harness.** The benchmark suite now runs in two
  passes — a fast **local** Hardhat pass and a **sepoliaFork** pass against real
  Sepolia state at the pinned block — and every CSV carries a leading `network`
  column with one row-block per network. `npm run benchmark:all-networks` runs
  both; `npm run benchmark:fork` adds the forked rows to an existing local run.
  The forked-Sepolia numbers are the authoritative source for the revised
  paper. `plot.py` reads the `network` column, renders single-series figures
  from the authoritative network, and adds a `gas_network_compare` figure whose
  caption interprets the result — per-op gas is *byte-for-byte identical* local
  vs fork (EVM-deterministic), annotated `Δgas = 0` on the figure.
  - *Network coverage (addresses **R3**, **R4** on scalability).* `gas.csv`,
    `latency.csv`, `throughput.csv`, and `lifecycle.csv` carry both `local` and
    `sepoliaFork` row-blocks. `scalability.csv` and `state_growth.csv` are
    **local-only by design**: every metric they report is gas-derived, and the
    proven per-operation gas parity makes those sums network-independent (the
    fork would reproduce them exactly); only wall-clock would differ, which on a
    fork measures the harness rather than the network. The two sweeps each fire
    thousands of transactions, and on a forked node every transaction triggers
    throttled archive-RPC state fetches — impractically slow for no new
    information. README and `BENCHMARK_REPORT.md` document this explicitly.

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
