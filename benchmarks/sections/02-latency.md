## 2. Latency decomposition (composite mainnet-sim model)

Per-operation confirmation latency over 50 transactions, decomposed into **measured EVM execution** (wall-clock send→receipt on the in-process node) plus **simulated** network components:

- `propagation` = Gaussian(150 ms, σ 40 ms) [Box-Muller] + Exponential(mean 50 ms) queueing + 10% Pareto(scale 50, α 3) congestion spike
- `blockInclusion` = Gaussian(12,000 ms, σ 2,000 ms) — a 12 s ± 2 s inclusion wait, mean matching Sepolia's observed 12.242s block cadence (see Methodology)
- `total` = execution + propagation + blockInclusion

> **Honesty label.** Only `execution` is a measurement. `propagation` and `blockInclusion` are drawn from the parametric model above (network label `mainnet-sim`), with a seeded RNG (seed 42) so runs are reproducible. This is **not** measured mainnet/testnet latency.

| Operation | Component | Source | Mean (ms) | P95 (ms) | Min (ms) | Max (ms) |
|---|---|---|---:|---:|---:|---:|
| **registerRequest** | execution | measured | 1 | 2 | 1 | 3 |
|  | propagation | mainnet-sim | 200 | 327 | 99 | 401 |
|  | blockInclusion | mainnet-sim | 11,825 | 15,990 | 8,090 | 16,247 |
|  | total | composite | 12,027 | 16,156 | 8,249 | 16,428 |
| **approveRequest** | execution | measured | 2 | 3 | 1 | 4 |
|  | propagation | mainnet-sim | 201 | 385 | 64 | 398 |
|  | blockInclusion | mainnet-sim | 12,089 | 14,226 | 6,872 | 15,910 |
|  | total | composite | 12,292 | 14,352 | 7,142 | 16,111 |
| **submitPaper** | execution | measured | 3 | 4 | 2 | 6 |
|  | propagation | mainnet-sim | 210 | 332 | 114 | 422 |
|  | blockInclusion | mainnet-sim | 11,923 | 14,819 | 8,771 | 16,546 |
|  | total | composite | 12,136 | 15,023 | 9,061 | 16,796 |
| **EICapproval** | execution | measured | 2 | 4 | 1 | 4 |
|  | propagation | mainnet-sim | 205 | 309 | 116 | 318 |
|  | blockInclusion | mainnet-sim | 11,580 | 15,116 | 7,393 | 15,713 |
|  | total | composite | 11,787 | 15,331 | 7,593 | 15,934 |
| **AEapproval** | execution | measured | 2 | 3 | 1 | 4 |
|  | propagation | mainnet-sim | 216 | 358 | 98 | 385 |
|  | blockInclusion | mainnet-sim | 12,677 | 16,164 | 9,621 | 17,413 |
|  | total | composite | 12,894 | 16,306 | 9,802 | 17,623 |
| **Reviewerapproval** | execution | measured | 2 | 3 | 1 | 4 |
|  | propagation | mainnet-sim | 218 | 307 | 70 | 437 |
|  | blockInclusion | mainnet-sim | 11,819 | 15,735 | 7,646 | 16,080 |
|  | total | composite | 12,039 | 15,988 | 7,807 | 16,324 |
| **ReviewedByAE** | execution | measured | 2 | 2 | 1 | 2 |
|  | propagation | mainnet-sim | 215 | 369 | 75 | 379 |
|  | blockInclusion | mainnet-sim | 11,786 | 14,350 | 7,024 | 16,485 |
|  | total | composite | 12,003 | 14,628 | 7,201 | 16,679 |
| **EICDecision** | execution | measured | 4 | 7 | 3 | 8 |
|  | propagation | mainnet-sim | 212 | 334 | 96 | 379 |
|  | blockInclusion | mainnet-sim | 12,214 | 14,841 | 8,850 | 15,205 |
|  | total | composite | 12,430 | 15,062 | 9,121 | 15,367 |

![Latency decomposition](./figures/latency_decomposition.png)
Raw data: [latency.csv](./latency.csv)