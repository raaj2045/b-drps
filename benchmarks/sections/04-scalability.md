## 4. Scalability

Full Auth->Main->Decision pipeline run for N papers.

> **Local-only, valid cross-network.** This sweep is run on the local network only. Its reported metrics (`totalGas`, `meanGasPerPaper`) are gas-derived, and Section 1 proves per-operation gas is byte-for-byte identical between `local` and `sepoliaFork`. Gas is EVM-deterministic, so a sum of identical per-op costs is itself identical — the fork would reproduce these numbers exactly. Only wall-clock differs, which on a fork measures the harness (block production is harness-controlled), not the network, so it is not a meaningful cross-network metric.

| N | Total gas | Mean gas / paper | Wall-clock (ms) | Mean ms / paper |
|---:|---:|---:|---:|---:|
| 1 | 4,957,138 | 4,957,138 | 20 | 20 |
| 10 | 48,310,651 | 4,831,065 | 214 | 21 |
| 50 | 241,002,371 | 4,820,047 | 1,085 | 22 |
| 100 | 481,860,021 | 4,818,600 | 2,033 | 20 |
| 500 | 2,408,765,221 | 4,817,530 | 11,263 | 23 |

Raw data: [scalability.csv](./scalability.csv)