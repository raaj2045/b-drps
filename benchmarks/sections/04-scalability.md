## 4. Scalability

Full Auth->Main->Decision pipeline run for N papers.

> **Local-only, valid cross-network.** This sweep is run on the local network only. Its reported metrics (`totalGas`, `meanGasPerPaper`) are gas-derived, and Section 1 proves per-operation gas is byte-for-byte identical between `local` and `sepoliaFork`. Gas is EVM-deterministic, so a sum of identical per-op costs is itself identical — the fork would reproduce these numbers exactly. Only wall-clock differs, which on a fork measures the harness (block production is harness-controlled), not the network, so it is not a meaningful cross-network metric.

| N | Total gas | Mean gas / paper | Wall-clock (ms) | Mean ms / paper |
|---:|---:|---:|---:|---:|
| 1 | 4,957,070 | 4,957,070 | 13 | 13 |
| 10 | 48,309,971 | 4,830,997 | 170 | 17 |
| 50 | 240,998,971 | 4,819,979 | 854 | 17 |
| 100 | 481,853,221 | 4,818,532 | 1,700 | 17 |
| 500 | 2,408,731,221 | 4,817,462 | 9,840 | 20 |

![Pipeline scalability vs N](./figures/scalability.png)
Raw data: [scalability.csv](./scalability.csv)