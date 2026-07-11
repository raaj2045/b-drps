## 2. Latency under Sepolia-like 12s blocks

Each row is 5 samples on an in-process node with interval mining at 12.242s.

| Operation | Samples | Mean (ms) | Min (ms) | Max (ms) |
|---|---:|---:|---:|---:|
| request | 5 | 13411 | 12197 | 15183 |
| approve | 5 | 13350 | 12247 | 15112 |
| submit | 5 | 26692 | 24500 | 27432 |
| EICapproval | 5 | 13381 | 12199 | 15115 |
| EICDecision | 5 | 26513 | 24505 | 27224 |

![Latency by operation](./figures/latency.png)
Raw data: [latency.csv](./latency.csv)