# Benchmark Report

_Generated: 2026-07-11T08:29:41.388Z · network: local_

## Methodology

Measurements run on the in-process Hardhat network in two passes: a **local** pass (fast, offline) and a **sepoliaFork** pass that forks real Sepolia state at the pinned block (see README / CHANGELOG). The EVM is deterministic, so gas-per-operation is identical across both — the fork validates the local numbers against real-network parameters rather than changing them. Latency, throughput, and scalability depend on block cadence and gas limit (12.242s block interval, 30,000,000 gas/block).

Sections 1–3 and the lifecycle are **dual-network** (`local` + `sepoliaFork` row-blocks); their per-operation gas tables are byte-for-byte identical across networks (Section 1, and `figures/gas_network_compare.png`), so the local measurements equal the real-Sepolia-state ones. Sections 4–5 are **local-only by design** — see the note in each. Tables are network-independent wherever gas-derived; wall-clock columns reflect local execution and are not cross-network meaningful. (This pass ran on `local`.)

Every CSV in this directory carries a `network` column with one row-block per network; the figures (`figures/`) compare them. Sections run independently via `npm run benchmark:<section>`; both networks via `npm run benchmark:all-networks`.

## 1. Gas per operation

### Deployment

| Contract | Gas used |
|---|---:|
| Auth | 3,078,225 |
| Main | 5,608,132 |
| Decision | 2,332,648 |

### Auth operations

| Operation | Gas used |
|---|---:|
| addJournalDirect | 299,014 |
| requestMember | 303,838 |
| approveRequest | 308,335 |
| denyRequest | 73,448 |

### Main + Decision pipeline

| Operation | Gas used |
|---|---:|
| getPaperInfo | 282,499 |
| sendToEIC | 363,444 |
| EICapproval | 655,519 |
| AEapproval | 655,497 |
| Reviewerapproval | 912,355 |
| ReviewedByAE | 477,427 |
| decisionGetPaperInfo | 745,362 |
| EICDecision | 864,967 |

## 2. Latency under Sepolia-like 12s blocks

Each row is 5 samples on an in-process node with interval mining at 12.242s.

| Operation | Samples | Mean (ms) | Min (ms) | Max (ms) |
|---|---:|---:|---:|---:|
| request | 5 | 12826 | 12199 | 15184 |
| approve | 5 | 13392 | 12245 | 15185 |
| submit | 5 | 26805 | 24458 | 27440 |
| EICapproval | 5 | 13414 | 12249 | 15168 |
| EICDecision | 5 | 26786 | 24453 | 27404 |

![Latency by operation](./figures/latency.png)
Raw data: [latency.csv](./latency.csv)

## 3. Throughput

### Analytical (Sepolia 30M gas/block, 12s/block)

Theoretical upper bound assuming a block contains only that operation.

| Operation | Gas | Ops/block | TPS |
|---|---:|---:|---:|
| addOrRequestMember | 303,838 | 98 | 8.01 |
| approveRequest | 308,335 | 97 | 7.92 |
| getPaperInfo | 282,499 | 106 | 8.66 |
| sendToEIC | 363,444 | 82 | 6.7 |
| EICapproval | 655,519 | 45 | 3.68 |
| AEapproval | 655,497 | 45 | 3.68 |
| Reviewerapproval | 912,355 | 32 | 2.61 |
| EICDecision | 864,967 | 34 | 2.78 |

### Empirical (local instant-mine sanity check)

- Operation: `submission (getPaperInfo + sendToEIC)`
- Submissions: 100 (two txs each)
- Blocks consumed: 200
- Wall-clock: 309 ms
- Local TPS (instant-mine, no block-time floor): 323.62

![Analytical TPS by operation](./figures/throughput.png)
Raw data: [throughput.csv](./throughput.csv)

## 4. Scalability

Full Auth->Main->Decision pipeline run for N papers.

> **Local-only, valid cross-network.** This sweep is run on the local network only. Its reported metrics (`totalGas`, `meanGasPerPaper`) are gas-derived, and Section 1 proves per-operation gas is byte-for-byte identical between `local` and `sepoliaFork`. Gas is EVM-deterministic, so a sum of identical per-op costs is itself identical — the fork would reproduce these numbers exactly. Only wall-clock differs, which on a fork measures the harness (block production is harness-controlled), not the network, so it is not a meaningful cross-network metric.

| N | Total gas | Mean gas / paper | Wall-clock (ms) | Mean ms / paper |
|---:|---:|---:|---:|---:|
| 1 | 4,957,070 | 4,957,070 | 25 | 25 |
| 10 | 48,309,971 | 4,830,997 | 217 | 22 |
| 50 | 240,998,971 | 4,819,979 | 913 | 18 |
| 100 | 481,853,221 | 4,818,532 | 1,743 | 17 |
| 500 | 2,408,731,221 | 4,817,462 | 10,789 | 22 |

![Pipeline scalability vs N](./figures/scalability.png)
Raw data: [scalability.csv](./scalability.csv)

## 5. State-growth scalability

For each K, the relevant data structure is pre-seeded with K entries (distinct synthetic addresses), then one more operation is measured. Flat columns indicate O(1) per-op cost regardless of state size; rising columns indicate an O(n) regression to investigate. Auth seeding grows the approved-members array via the JOURNAL direct-add path (post-P5, requests are strictly self-registered, so pending requests cannot be bulk-seeded); pipeline seeding queues K papers by distinct authors.

> **Local-only, valid cross-network.** Every column here is a gas measurement, and Section 1 proves per-operation gas is byte-for-byte identical between `local` and `sepoliaFork`. These O(1)/O(n) figures are therefore network-independent; the fork would reproduce them exactly.

| K | addOrRequestMember | approoveRequest | denyRequest | sendToEIC | EICapproval |
|---:|---:|---:|---:|---:|---:|
| 10 | 303,922 | 335,005 | 73,448 | 224,790 | 425,802 |
| 100 | 303,922 | 335,005 | 73,448 | 224,790 | 425,802 |
| 1000 | 303,922 | 335,005 | 73,448 | 224,790 | 425,802 |
| 5000 | 303,922 | 335,005 | 73,448 | 224,790 | 425,802 |

![State-growth flatness](./figures/state_growth.png)
Raw data: [state_growth.csv](./state_growth.csv)
