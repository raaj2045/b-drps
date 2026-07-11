## 2. Latency decomposition (composite mainnet-sim model)

Per-operation confirmation latency at N = 10, 25 and 50 samples, decomposed into **measured EVM execution** (wall-clock send→receipt on the in-process node) plus **simulated** network components:

- `propagation` = Gaussian(150 ms, σ 40 ms) [Box-Muller] + Exponential(mean 50 ms) queueing + 10% Pareto(scale 50, α 3) congestion spike
- `blockInclusion` = Gaussian(12,000 ms, σ 2,000 ms) — a 12 s ± 2 s inclusion wait, mean matching Sepolia's observed 12.242s block cadence (see Methodology)
- `total` = execution + propagation + blockInclusion

> **Honesty label.** Only `execution` is a measurement. `propagation` and `blockInclusion` are drawn from the parametric model above (`mainnet-sim`), with a seeded RNG (seed 42 + N) so runs are reproducible. This is **not** measured mainnet/testnet latency.

### N = 10 samples per operation

| Operation | Component | Source | Mean (ms) | P95 (ms) | P99 (ms) | Min (ms) | Max (ms) |
|---|---|---|---:|---:|---:|---:|---:|
| **registerRequest** | execution | measured | 2 | 2 | 2 | 1 | 2 |
|  | propagation | mainnet-sim | 260 | 536 | 536 | 131 | 536 |
|  | blockInclusion | mainnet-sim | 11,495 | 14,983 | 14,983 | 8,078 | 14,983 |
|  | total | composite | 11,757 | 15,265 | 15,265 | 8,218 | 15,265 |
| **approveRequest** | execution | measured | 2 | 4 | 4 | 1 | 4 |
|  | propagation | mainnet-sim | 201 | 265 | 265 | 147 | 265 |
|  | blockInclusion | mainnet-sim | 12,065 | 13,914 | 13,914 | 10,253 | 13,914 |
|  | total | composite | 12,268 | 14,068 | 14,068 | 10,463 | 14,068 |
| **submitPaper** | execution | measured | 3 | 4 | 4 | 2 | 4 |
|  | propagation | mainnet-sim | 205 | 324 | 324 | 129 | 324 |
|  | blockInclusion | mainnet-sim | 11,475 | 18,655 | 18,655 | 7,916 | 18,655 |
|  | total | composite | 11,684 | 18,880 | 18,880 | 8,065 | 18,880 |
| **EICapproval** | execution | measured | 3 | 4 | 4 | 2 | 4 |
|  | propagation | mainnet-sim | 189 | 322 | 322 | 84 | 322 |
|  | blockInclusion | mainnet-sim | 12,043 | 15,036 | 15,036 | 8,204 | 15,036 |
|  | total | composite | 12,236 | 15,121 | 15,121 | 8,397 | 15,121 |
| **AEapproval** | execution | measured | 3 | 4 | 4 | 1 | 4 |
|  | propagation | mainnet-sim | 223 | 307 | 307 | 170 | 307 |
|  | blockInclusion | mainnet-sim | 11,114 | 14,421 | 14,421 | 7,027 | 14,421 |
|  | total | composite | 11,340 | 14,596 | 14,596 | 7,221 | 14,596 |
| **Reviewerapproval** | execution | measured | 3 | 4 | 4 | 2 | 4 |
|  | propagation | mainnet-sim | 173 | 252 | 252 | 96 | 252 |
|  | blockInclusion | mainnet-sim | 11,495 | 14,802 | 14,802 | 7,595 | 14,802 |
|  | total | composite | 11,671 | 14,950 | 14,950 | 7,777 | 14,950 |
| **ReviewedByAE** | execution | measured | 2 | 3 | 3 | 1 | 3 |
|  | propagation | mainnet-sim | 185 | 306 | 306 | 89 | 306 |
|  | blockInclusion | mainnet-sim | 11,412 | 14,681 | 14,681 | 8,639 | 14,681 |
|  | total | composite | 11,599 | 14,990 | 14,990 | 8,873 | 14,990 |
| **EICDecision** | execution | measured | 5 | 8 | 8 | 3 | 8 |
|  | propagation | mainnet-sim | 213 | 273 | 273 | 163 | 273 |
|  | blockInclusion | mainnet-sim | 12,588 | 15,038 | 15,038 | 9,107 | 15,038 |
|  | total | composite | 12,806 | 15,237 | 15,237 | 9,308 | 15,237 |

### N = 25 samples per operation

| Operation | Component | Source | Mean (ms) | P95 (ms) | P99 (ms) | Min (ms) | Max (ms) |
|---|---|---|---:|---:|---:|---:|---:|
| **registerRequest** | execution | measured | 1 | 2 | 2 | 1 | 2 |
|  | propagation | mainnet-sim | 236 | 377 | 412 | 115 | 412 |
|  | blockInclusion | mainnet-sim | 11,989 | 15,110 | 16,666 | 8,285 | 16,666 |
|  | total | composite | 12,227 | 15,330 | 16,781 | 8,461 | 16,781 |
| **approveRequest** | execution | measured | 2 | 3 | 4 | 1 | 4 |
|  | propagation | mainnet-sim | 198 | 293 | 330 | 77 | 330 |
|  | blockInclusion | mainnet-sim | 12,111 | 14,989 | 15,446 | 8,573 | 15,446 |
|  | total | composite | 12,310 | 15,321 | 15,643 | 8,778 | 15,643 |
| **submitPaper** | execution | measured | 3 | 4 | 4 | 2 | 4 |
|  | propagation | mainnet-sim | 225 | 381 | 482 | 131 | 482 |
|  | blockInclusion | mainnet-sim | 12,805 | 16,971 | 17,421 | 8,587 | 17,421 |
|  | total | composite | 13,033 | 17,225 | 17,621 | 8,782 | 17,621 |
| **EICapproval** | execution | measured | 2 | 3 | 3 | 1 | 3 |
|  | propagation | mainnet-sim | 196 | 322 | 392 | 75 | 392 |
|  | blockInclusion | mainnet-sim | 11,693 | 15,239 | 16,911 | 4,892 | 16,911 |
|  | total | composite | 11,891 | 15,348 | 17,097 | 5,093 | 17,097 |
| **AEapproval** | execution | measured | 2 | 3 | 4 | 1 | 4 |
|  | propagation | mainnet-sim | 240 | 351 | 408 | 85 | 408 |
|  | blockInclusion | mainnet-sim | 12,041 | 15,578 | 15,847 | 8,880 | 15,847 |
|  | total | composite | 12,282 | 15,920 | 16,257 | 9,137 | 16,257 |
| **Reviewerapproval** | execution | measured | 2 | 4 | 7 | 1 | 7 |
|  | propagation | mainnet-sim | 194 | 343 | 372 | 47 | 372 |
|  | blockInclusion | mainnet-sim | 11,387 | 15,015 | 15,202 | 8,155 | 15,202 |
|  | total | composite | 11,583 | 15,243 | 15,417 | 8,295 | 15,417 |
| **ReviewedByAE** | execution | measured | 2 | 2 | 2 | 1 | 2 |
|  | propagation | mainnet-sim | 191 | 280 | 404 | 104 | 404 |
|  | blockInclusion | mainnet-sim | 12,181 | 14,707 | 14,789 | 7,187 | 14,789 |
|  | total | composite | 12,374 | 14,908 | 14,931 | 7,346 | 14,931 |
| **EICDecision** | execution | measured | 4 | 6 | 7 | 3 | 7 |
|  | propagation | mainnet-sim | 208 | 331 | 397 | 59 | 397 |
|  | blockInclusion | mainnet-sim | 12,407 | 14,865 | 15,647 | 8,771 | 15,647 |
|  | total | composite | 12,619 | 15,152 | 15,797 | 8,886 | 15,797 |

### N = 50 samples per operation

| Operation | Component | Source | Mean (ms) | P95 (ms) | P99 (ms) | Min (ms) | Max (ms) |
|---|---|---|---:|---:|---:|---:|---:|
| **registerRequest** | execution | measured | 2 | 2 | 4 | 1 | 4 |
|  | propagation | mainnet-sim | 209 | 296 | 424 | 66 | 424 |
|  | blockInclusion | mainnet-sim | 11,668 | 15,015 | 18,133 | 6,660 | 18,133 |
|  | total | composite | 11,878 | 15,133 | 18,201 | 6,919 | 18,201 |
| **approveRequest** | execution | measured | 2 | 2 | 3 | 1 | 3 |
|  | propagation | mainnet-sim | 207 | 346 | 394 | 65 | 394 |
|  | blockInclusion | mainnet-sim | 11,958 | 14,789 | 15,486 | 7,086 | 15,486 |
|  | total | composite | 12,167 | 14,993 | 15,686 | 7,266 | 15,686 |
| **submitPaper** | execution | measured | 3 | 4 | 7 | 2 | 7 |
|  | propagation | mainnet-sim | 209 | 342 | 486 | 101 | 486 |
|  | blockInclusion | mainnet-sim | 11,664 | 15,691 | 16,097 | 7,268 | 16,097 |
|  | total | composite | 11,876 | 15,936 | 16,314 | 7,475 | 16,314 |
| **EICapproval** | execution | measured | 2 | 3 | 4 | 1 | 4 |
|  | propagation | mainnet-sim | 198 | 365 | 380 | 80 | 380 |
|  | blockInclusion | mainnet-sim | 12,112 | 14,766 | 16,587 | 5,806 | 16,587 |
|  | total | composite | 12,311 | 14,965 | 16,802 | 6,003 | 16,802 |
| **AEapproval** | execution | measured | 2 | 3 | 5 | 1 | 5 |
|  | propagation | mainnet-sim | 201 | 292 | 484 | 76 | 484 |
|  | blockInclusion | mainnet-sim | 11,884 | 15,320 | 17,209 | 7,560 | 17,209 |
|  | total | composite | 12,087 | 15,599 | 17,408 | 7,710 | 17,408 |
| **Reviewerapproval** | execution | measured | 2 | 3 | 5 | 1 | 5 |
|  | propagation | mainnet-sim | 222 | 331 | 345 | 108 | 345 |
|  | blockInclusion | mainnet-sim | 11,748 | 15,535 | 17,691 | 6,000 | 17,691 |
|  | total | composite | 11,972 | 15,850 | 17,912 | 6,196 | 17,912 |
| **ReviewedByAE** | execution | measured | 2 | 2 | 4 | 1 | 4 |
|  | propagation | mainnet-sim | 193 | 268 | 380 | 55 | 380 |
|  | blockInclusion | mainnet-sim | 11,665 | 15,435 | 16,742 | 4,908 | 16,742 |
|  | total | composite | 11,860 | 15,668 | 16,937 | 5,074 | 16,937 |
| **EICDecision** | execution | measured | 4 | 5 | 7 | 2 | 7 |
|  | propagation | mainnet-sim | 211 | 364 | 521 | 83 | 521 |
|  | blockInclusion | mainnet-sim | 11,792 | 14,982 | 16,528 | 8,114 | 16,528 |
|  | total | composite | 12,007 | 15,130 | 16,719 | 8,247 | 16,719 |

![Latency decomposition](./figures/latency_decomposition.png)
![Latency stability across N](./figures/latency_by_n.png)
Raw data: [latency.csv](./latency.csv)