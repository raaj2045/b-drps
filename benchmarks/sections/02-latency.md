## 2. Latency decomposition (composite mainnet-sim model)

Per-operation confirmation latency over 50 transactions, decomposed into **measured EVM execution** (wall-clock send→receipt on the in-process node) plus **simulated** network components:

- `propagation` = Gaussian(150 ms, σ 40 ms) [Box-Muller] + Exponential(mean 50 ms) queueing + 10% Pareto(scale 50, α 3) congestion spike
- `blockInclusion` = Gaussian(12,000 ms, σ 2,000 ms) — a 12 s ± 2 s inclusion wait, mean matching Sepolia's observed 12.242s block cadence (see Methodology)
- `total` = execution + propagation + blockInclusion

> **Honesty label.** Only `execution` is a measurement. `propagation` and `blockInclusion` are drawn from the parametric model above (network label `mainnet-sim`), with a seeded RNG (seed 42) so runs are reproducible. This is **not** measured mainnet/testnet latency.

| Operation | Component | Source | Mean (ms) | P95 (ms) | P99 (ms) | Min (ms) | Max (ms) |
|---|---|---|---:|---:|---:|---:|---:|
| **registerRequest** | execution | measured | 2 | 4 | 5 | 1 | 5 |
|  | propagation | mainnet-sim | 200 | 327 | 401 | 99 | 401 |
|  | blockInclusion | mainnet-sim | 11,825 | 15,990 | 16,247 | 8,090 | 16,247 |
|  | total | composite | 12,027 | 16,157 | 16,428 | 8,249 | 16,428 |
| **approveRequest** | execution | measured | 2 | 3 | 4 | 1 | 4 |
|  | propagation | mainnet-sim | 201 | 385 | 398 | 64 | 398 |
|  | blockInclusion | mainnet-sim | 12,089 | 14,226 | 15,910 | 6,872 | 15,910 |
|  | total | composite | 12,292 | 14,353 | 16,110 | 7,142 | 16,110 |
| **submitPaper** | execution | measured | 3 | 4 | 5 | 2 | 5 |
|  | propagation | mainnet-sim | 210 | 332 | 422 | 114 | 422 |
|  | blockInclusion | mainnet-sim | 11,923 | 14,819 | 16,546 | 8,771 | 16,546 |
|  | total | composite | 12,136 | 15,023 | 16,794 | 9,060 | 16,794 |
| **EICapproval** | execution | measured | 2 | 4 | 5 | 1 | 5 |
|  | propagation | mainnet-sim | 205 | 309 | 318 | 116 | 318 |
|  | blockInclusion | mainnet-sim | 11,580 | 15,116 | 15,713 | 7,393 | 15,713 |
|  | total | composite | 11,787 | 15,330 | 15,934 | 7,593 | 15,934 |
| **AEapproval** | execution | measured | 2 | 3 | 3 | 1 | 3 |
|  | propagation | mainnet-sim | 216 | 358 | 385 | 98 | 385 |
|  | blockInclusion | mainnet-sim | 12,677 | 16,164 | 17,413 | 9,621 | 17,413 |
|  | total | composite | 12,894 | 16,306 | 17,622 | 9,801 | 17,622 |
| **Reviewerapproval** | execution | measured | 2 | 3 | 4 | 1 | 4 |
|  | propagation | mainnet-sim | 218 | 307 | 437 | 70 | 437 |
|  | blockInclusion | mainnet-sim | 11,819 | 15,735 | 16,080 | 7,646 | 16,080 |
|  | total | composite | 12,039 | 15,988 | 16,324 | 7,807 | 16,324 |
| **ReviewedByAE** | execution | measured | 2 | 2 | 4 | 1 | 4 |
|  | propagation | mainnet-sim | 215 | 369 | 379 | 75 | 379 |
|  | blockInclusion | mainnet-sim | 11,786 | 14,350 | 16,485 | 7,024 | 16,485 |
|  | total | composite | 12,003 | 14,628 | 16,679 | 7,202 | 16,679 |
| **EICDecision** | execution | measured | 4 | 6 | 8 | 2 | 8 |
|  | propagation | mainnet-sim | 212 | 334 | 379 | 96 | 379 |
|  | blockInclusion | mainnet-sim | 12,214 | 14,841 | 15,205 | 8,850 | 15,205 |
|  | total | composite | 12,430 | 15,064 | 15,367 | 9,122 | 15,367 |

![Latency decomposition](./figures/latency_decomposition.png)
Raw data: [latency.csv](./latency.csv)