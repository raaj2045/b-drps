# Benchmark Report

_Generated: 2026-07-11T13:16:52.492Z · network: sepoliaFork_

## Methodology

Measurements run on the in-process Hardhat network in two passes: a **local** pass (fast, offline) and a **sepoliaFork** pass that forks real Sepolia state at the pinned block (see README / CHANGELOG). The EVM is deterministic, so gas-per-operation is identical across both — the fork validates the local numbers against real-network parameters rather than changing them. Latency, throughput, and scalability depend on block cadence and gas limit (12.242s block interval, 30,000,000 gas/block).

Sections 1 and 3 and the lifecycle are **dual-network** (`local` + `sepoliaFork` row-blocks); their per-operation gas tables are byte-for-byte identical across networks (Section 1, and `figures/gas_network_compare.png`), so the local measurements equal the real-Sepolia-state ones. Sections 2 and 4–7 are **local-only by design** — see the note in each. Tables are network-independent wherever gas-derived; wall-clock columns reflect local execution and are not cross-network meaningful. (This pass ran on `sepoliaFork`.)

Every CSV in this directory carries a `network` column with one row-block per network; the figures (`figures/`) compare them. Sections run independently via `npm run benchmark:<section>`; both networks via `npm run benchmark:all-networks`.

## 1. Gas per operation

### Deployment

| Contract | Gas used |
|---|---:|
| Auth | 3,344,851 |
| Main | 6,126,560 |
| Decision | 2,883,004 |

### Auth operations

| Operation | Gas used |
|---|---:|
| addJournalDirect | 299,014 |
| requestMember | 303,838 |
| approveRequest | 308,357 |
| denyRequest | 73,448 |

### Main + Decision pipeline

| Operation | Gas used |
|---|---:|
| getPaperInfo | 282,499 |
| sendToEIC | 363,466 |
| EICapproval | 655,497 |
| AEapproval | 655,564 |
| Reviewerapproval | 912,289 |
| ReviewedByAE | 477,449 |
| decisionGetPaperInfo | 745,340 |
| EICDecision | 865,034 |

## 2. Latency decomposition (composite mainnet-sim model)

Per-operation confirmation latency over 50 transactions, decomposed into **measured EVM execution** (wall-clock send→receipt on the in-process node) plus **simulated** network components:

- `propagation` = Gaussian(150 ms, σ 40 ms) [Box-Muller] + Exponential(mean 50 ms) queueing + 10% Pareto(scale 50, α 3) congestion spike
- `blockInclusion` = Gaussian(12,000 ms, σ 2,000 ms) — a 12 s ± 2 s inclusion wait, mean matching Sepolia's observed 12.242s block cadence (see Methodology)
- `total` = execution + propagation + blockInclusion

> **Honesty label.** Only `execution` is a measurement. `propagation` and `blockInclusion` are drawn from the parametric model above (network label `mainnet-sim`), with a seeded RNG (seed 42) so runs are reproducible. This is **not** measured mainnet/testnet latency.

| Operation | Component | Source | Mean (ms) | P95 (ms) | P99 (ms) | Min (ms) | Max (ms) |
|---|---|---|---:|---:|---:|---:|---:|
| **registerRequest** | execution | measured | 2 | 3 | 5 | 1 | 5 |
|  | propagation | mainnet-sim | 200 | 327 | 401 | 99 | 401 |
|  | blockInclusion | mainnet-sim | 11,825 | 15,990 | 16,247 | 8,090 | 16,247 |
|  | total | composite | 12,027 | 16,157 | 16,428 | 8,249 | 16,428 |
| **approveRequest** | execution | measured | 2 | 3 | 4 | 1 | 4 |
|  | propagation | mainnet-sim | 201 | 385 | 398 | 64 | 398 |
|  | blockInclusion | mainnet-sim | 12,089 | 14,226 | 15,910 | 6,872 | 15,910 |
|  | total | composite | 12,292 | 14,353 | 16,112 | 7,141 | 16,112 |
| **submitPaper** | execution | measured | 3 | 4 | 5 | 2 | 5 |
|  | propagation | mainnet-sim | 210 | 332 | 422 | 114 | 422 |
|  | blockInclusion | mainnet-sim | 11,923 | 14,819 | 16,546 | 8,771 | 16,546 |
|  | total | composite | 12,136 | 15,023 | 16,796 | 9,060 | 16,796 |
| **EICapproval** | execution | measured | 2 | 4 | 5 | 1 | 5 |
|  | propagation | mainnet-sim | 205 | 309 | 318 | 116 | 318 |
|  | blockInclusion | mainnet-sim | 11,580 | 15,116 | 15,713 | 7,393 | 15,713 |
|  | total | composite | 11,787 | 15,330 | 15,933 | 7,593 | 15,933 |
| **AEapproval** | execution | measured | 2 | 4 | 4 | 1 | 4 |
|  | propagation | mainnet-sim | 216 | 358 | 385 | 98 | 385 |
|  | blockInclusion | mainnet-sim | 12,677 | 16,164 | 17,413 | 9,621 | 17,413 |
|  | total | composite | 12,895 | 16,306 | 17,624 | 9,802 | 17,624 |
| **Reviewerapproval** | execution | measured | 2 | 3 | 3 | 1 | 3 |
|  | propagation | mainnet-sim | 218 | 307 | 437 | 70 | 437 |
|  | blockInclusion | mainnet-sim | 11,819 | 15,735 | 16,080 | 7,646 | 16,080 |
|  | total | composite | 12,039 | 15,989 | 16,324 | 7,808 | 16,324 |
| **ReviewedByAE** | execution | measured | 2 | 2 | 5 | 1 | 5 |
|  | propagation | mainnet-sim | 215 | 369 | 379 | 75 | 379 |
|  | blockInclusion | mainnet-sim | 11,786 | 14,350 | 16,485 | 7,024 | 16,485 |
|  | total | composite | 12,003 | 14,628 | 16,679 | 7,201 | 16,679 |
| **EICDecision** | execution | measured | 4 | 8 | 8 | 3 | 8 |
|  | propagation | mainnet-sim | 212 | 334 | 379 | 96 | 379 |
|  | blockInclusion | mainnet-sim | 12,214 | 14,841 | 15,205 | 8,850 | 15,205 |
|  | total | composite | 12,431 | 15,064 | 15,367 | 9,120 | 15,367 |

![Latency decomposition](./figures/latency_decomposition.png)
Raw data: [latency.csv](./latency.csv)

## 3. Throughput

### Analytical (Sepolia 30M gas/block, 12s/block)

Theoretical upper bound assuming a block contains only that operation.

| Operation | Gas | Ops/block | TPS |
|---|---:|---:|---:|
| addOrRequestMember | 303,838 | 98 | 8.01 |
| approveRequest | 308,357 | 97 | 7.92 |
| getPaperInfo | 282,499 | 106 | 8.66 |
| sendToEIC | 363,466 | 82 | 6.7 |
| EICapproval | 655,497 | 45 | 3.68 |
| AEapproval | 655,564 | 45 | 3.68 |
| Reviewerapproval | 912,289 | 32 | 2.61 |
| EICDecision | 865,034 | 34 | 2.78 |

### Empirical (local instant-mine sanity check)

- Operation: `submission (getPaperInfo + sendToEIC)`
- Submissions: 100 (two txs each)
- Blocks consumed: 200
- Wall-clock: 603 ms
- Local TPS (instant-mine, no block-time floor): 165.84

![Analytical TPS by operation](./figures/throughput.png)
Raw data: [throughput.csv](./throughput.csv)

## 4. Scalability

Full Auth->Main->Decision pipeline run for N papers.

> **Local-only, valid cross-network.** This sweep is run on the local network only. Its reported metrics (`totalGas`, `meanGasPerPaper`) are gas-derived, and Section 1 proves per-operation gas is byte-for-byte identical between `local` and `sepoliaFork`. Gas is EVM-deterministic, so a sum of identical per-op costs is itself identical — the fork would reproduce these numbers exactly. Only wall-clock differs, which on a fork measures the harness (block production is harness-controlled), not the network, so it is not a meaningful cross-network metric.

| N | Total gas | Mean gas / paper | Wall-clock (ms) | Mean ms / paper |
|---:|---:|---:|---:|---:|
| 1 | 4,957,138 | 4,957,138 | 17 | 17 |
| 10 | 48,310,651 | 4,831,065 | 189 | 19 |
| 50 | 241,002,371 | 4,820,047 | 920 | 18 |
| 100 | 481,860,021 | 4,818,600 | 1,940 | 19 |
| 500 | 2,408,765,221 | 4,817,530 | 13,899 | 28 |

![Pipeline scalability vs N](./figures/scalability.png)
Raw data: [scalability.csv](./scalability.csv)

## 5. State-growth scalability

For each K, the relevant data structure is pre-seeded with K entries (distinct synthetic addresses), then one more operation is measured. Flat columns indicate O(1) per-op cost regardless of state size; rising columns indicate an O(n) regression to investigate. Auth seeding grows the approved-members array via the JOURNAL direct-add path (post-P5, requests are strictly self-registered, so pending requests cannot be bulk-seeded); pipeline seeding queues K papers by distinct authors.

> **Local-only, valid cross-network.** Every column here is a gas measurement, and Section 1 proves per-operation gas is byte-for-byte identical between `local` and `sepoliaFork`. These O(1)/O(n) figures are therefore network-independent; the fork would reproduce them exactly.

| K | addOrRequestMember | approoveRequest | denyRequest | sendToEIC | EICapproval |
|---:|---:|---:|---:|---:|---:|
| 10 | 303,922 | 335,027 | 73,448 | 224,812 | 425,780 |
| 100 | 303,922 | 335,027 | 73,448 | 224,812 | 425,780 |
| 1000 | 303,922 | 335,027 | 73,448 | 224,812 | 425,780 |
| 5000 | 303,922 | 335,027 | 73,448 | 224,812 | 425,780 |

![State-growth flatness](./figures/state_growth.png)
Raw data: [state_growth.csv](./state_growth.csv)

## 6. Parallel-load scalability

N distinct clients fire transactions concurrently (`Promise.all`), for N = 10 … 100.

- **registration** — N self-service membership requests. Parallel-safe (distinct state per client): the scalability curve of record.
- **submission** — N authors each stage + submit a paper (`getPaperInfo` + `sendToEIC`). **Not parallel-safe by design**: `getPaperInfo` stages into a single shared scratchpad (SECURITY.md §4.1), so exactly one `sendToEIC` succeeds and the remaining N−1 revert on the queue guard (`"Author already queued here"`). This phase is a **concurrency-safety result, not a throughput result**: pre-fix, the same workload silently corrupted the queue; post-fix the guards fail safe under maximal interleaving, verified by the queue-integrity column (EIC queue length == successful submissions).

> **Local-only, honestly labelled.** Instant-mine local node: this measures the contracts and node under concurrent load (nonce handling, guard correctness, harness throughput), not consensus throughput. The real-network ceiling is the analytical gas-based TPS in Section 3.

| N | Phase | Wall-clock (ms) | TPS | Mean tx (ms) | P95 tx (ms) | Max tx (ms) | Success | Queue intact |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 10 | registration | 15 | 666.67 | 14 | 14 | 14 | 10/10 | — |
| 10 | submission | 27 | 37.04 | 27 | 27 | 27 | 1/10 | ✅ |
| 20 | registration | 25 | 800 | 23 | 25 | 25 | 20/20 | — |
| 20 | submission | 45 | 22.22 | 45 | 45 | 45 | 1/20 | ✅ |
| 30 | registration | 44 | 681.82 | 42 | 44 | 44 | 30/30 | — |
| 30 | submission | 64 | 15.63 | 64 | 64 | 64 | 1/30 | ✅ |
| 40 | registration | 51 | 784.31 | 47 | 51 | 51 | 40/40 | — |
| 40 | submission | 82 | 12.2 | 82 | 82 | 82 | 1/40 | ✅ |
| 50 | registration | 61 | 819.67 | 59 | 61 | 61 | 50/50 | — |
| 50 | submission | 99 | 10.1 | 99 | 99 | 99 | 1/50 | ✅ |
| 60 | registration | 78 | 769.23 | 73 | 75 | 77 | 60/60 | — |
| 60 | submission | 120 | 8.33 | 120 | 120 | 120 | 1/60 | ✅ |
| 70 | registration | 88 | 795.45 | 82 | 87 | 87 | 70/70 | — |
| 70 | submission | 159 | 6.29 | 158 | 158 | 158 | 1/70 | ✅ |
| 80 | registration | 101 | 792.08 | 96 | 100 | 100 | 80/80 | — |
| 80 | submission | 164 | 6.1 | 164 | 164 | 164 | 1/80 | ✅ |
| 90 | registration | 109 | 825.69 | 101 | 109 | 109 | 90/90 | — |
| 90 | submission | 181 | 5.52 | 181 | 181 | 181 | 1/90 | ✅ |
| 100 | registration | 124 | 806.45 | 117 | 122 | 123 | 100/100 | — |
| 100 | submission | 205 | 4.88 | 205 | 205 | 205 | 1/100 | ✅ |

![Parallel-load scalability](./figures/parallel_scalability.png)
Raw data: [parallel_scalability.csv](./parallel_scalability.csv)

## 7. Storage growth (on-chain footprint)

N papers are pushed end-to-end, then the storage the contracts occupy is accounted slot-by-slot from actual on-chain state (walked via the paginated getters) using Solidity's storage-layout rules — inline vs. long strings, array length slots, live index-map entries, and Auth's struct-mirror mappings. Bytes = slots × 32.

> **Cross-checked against the EVM.** For one full lifecycle, a `debug_traceTransaction` count of net SSTOREs (slots left non-zero) gives **123 slots** vs. **123** from the analytical accounting — an exact match. Storage layout is EVM-deterministic, so these figures are network-independent (local-only run, same rationale as Section 5).

The pipeline archives a copy of the paper at every approval stage (`approvedByEIC`, `approvedByAE`, `reviewedByReviewer`, `reviewedByAE`) plus two copies in Decision (`Publishpaper`, `ReturnAuthor`) — the `copies/paper` column quantifies this write amplification.

| N | Total slots | Total bytes | Bytes/paper | Copies/paper | Auth bytes (fixed roles) |
|---:|---:|---:|---:|---:|---:|
| 1 | 179 | 5,728 | 3,936 | 6 | 1,792 |
| 10 | 1,043 | 33,376 | 3,158 | 6 | 1,792 |
| 50 | 4,883 | 156,256 | 3,089 | 6 | 1,792 |
| 100 | 9,683 | 309,856 | 3,081 | 6 | 1,792 |

![Storage growth](./figures/storage_growth.png)
Raw data: [storage_growth.csv](./storage_growth.csv)
