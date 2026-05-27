# Benchmark Report

_Generated: 2026-05-24T08:24:24.960Z_

## Methodology

Measurements are taken on a local Hardhat in-process node because Sepolia ETH was not available for live testing. The EVM is deterministic, so gas-per-operation numbers are identical on Sepolia. Latency, throughput, and scalability depend on block cadence and gas limit, so the local node is configured to match Sepolia parameters (12.242s block interval, 30,000,000 gas/block) for those sections.

Each section can also be run independently via `npm run benchmark:gas|latency|throughput|scalability|state-growth`.

## 1. Gas per operation

### Deployment

| Contract | Gas used |
|---|---:|
| Auth | 2,520,171 |
| Main | 5,171,573 |
| Decision | 1,996,712 |

### Auth operations

| Operation | Gas used |
|---|---:|
| addJournalDirect | 296,509 |
| requestMember | 301,333 |
| approveRequest | 310,518 |
| denyRequest | 45,708 |

### Main + Decision pipeline

| Operation | Gas used |
|---|---:|
| getPaperInfo | 276,390 |
| sendToEIC | 331,885 |
| EICapproval | 626,129 |
| AEapproval | 626,107 |
| Reviewerapproval | 882,729 |
| ReviewedByAE | 473,481 |
| decisionGetPaperInfo | 736,442 |
| EICDecision | 854,151 |

## 2. Latency under Sepolia-like 12s blocks

Each row is 5 samples on an in-process node with interval mining at 12.242s.

| Operation | Samples | Mean (ms) | Min (ms) | Max (ms) |
|---|---:|---:|---:|---:|
| request | 5 | 12258 | 12221 | 12276 |
| approve | 5 | 12232 | 12202 | 12262 |
| submit | 5 | 24485 | 24455 | 24511 |
| EICapproval | 5 | 12239 | 12227 | 12248 |
| EICDecision | 5 | 24485 | 24461 | 24510 |

![Latency by operation](./figures/latency.png)
Raw data: [latency.csv](./latency.csv)

## 3. Throughput

### Analytical (Sepolia 30M gas/block, 12s/block)

Theoretical upper bound assuming a block contains only that operation.

| Operation | Gas | Ops/block | TPS |
|---|---:|---:|---:|
| addOrRequestMember | 301,333 | 99 | 8.09 |
| approveRequest | 310,518 | 96 | 7.84 |
| getPaperInfo | 276,390 | 108 | 8.82 |
| sendToEIC | 331,885 | 90 | 7.35 |
| EICapproval | 626,129 | 47 | 3.84 |
| AEapproval | 626,107 | 47 | 3.84 |
| Reviewerapproval | 882,729 | 33 | 2.7 |
| EICDecision | 854,151 | 35 | 2.86 |

### Empirical (local instant-mine sanity check)

- Operation: `sendToEIC`
- Transactions: 100
- Blocks consumed: 100
- Wall-clock: 172 ms
- Local TPS (instant-mine, no block-time floor): 581.4

![Analytical TPS by operation](./figures/throughput.png)
Raw data: [throughput.csv](./throughput.csv)

## 4. Scalability

Full Auth->Main->Decision pipeline run for N papers.

| N | Total gas | Mean gas / paper | Wall-clock (ms) | Mean ms / paper |
|---:|---:|---:|---:|---:|
| 1 | 4,807,314 | 4,807,314 | 29 | 29 |
| 10 | 46,806,930 | 4,680,693 | 326 | 33 |
| 50 | 233,481,330 | 4,669,627 | 1,058 | 21 |
| 100 | 466,817,330 | 4,668,173 | 1,800 | 18 |
| 500 | 2,333,549,330 | 4,667,099 | 10,300 | 21 |

![Pipeline scalability vs N](./figures/scalability.png)
Raw data: [scalability.csv](./scalability.csv)

## 5. State-growth scalability

For each K, the relevant data structure is pre-seeded with K entries (distinct synthetic addresses), then one more operation is measured. Flat columns indicate O(1) per-op cost regardless of state size; rising columns indicate an O(n) regression to investigate.

| K | addOrRequestMember | approoveRequest | denyRequest | sendToEIC | EICapproval |
|---:|---:|---:|---:|---:|---:|
| 10 | 303,989 | 336,960 | 69,072 | 213,238 | 394,518 |
| 100 | 303,989 | 336,960 | 69,072 | 213,238 | 394,518 |
| 1000 | 304,001 | 336,960 | 69,072 | 213,238 | 394,518 |
| 5000 | 304,001 | 336,960 | 69,072 | 213,238 | 394,518 |

![State-growth flatness](./figures/state_growth.png)
Raw data: [state_growth.csv](./state_growth.csv)
