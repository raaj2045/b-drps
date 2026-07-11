## 6. Parallel-load scalability

N distinct clients fire transactions concurrently (`Promise.all`), for N = 10 … 100.

- **registration** — N self-service membership requests. Parallel-safe (distinct state per client): the scalability curve of record.
- **submission** — N authors each stage + submit a paper (`getPaperInfo` + `sendToEIC`). **Not parallel-safe by design**: `getPaperInfo` stages into a single shared scratchpad (SECURITY.md §4.1), so exactly one `sendToEIC` succeeds and the remaining N−1 revert on the queue guard (`"Author already queued here"`). This phase is a **concurrency-safety result, not a throughput result**: pre-fix, the same workload silently corrupted the queue; post-fix the guards fail safe under maximal interleaving, verified by the queue-integrity column (EIC queue length == successful submissions).

> **Local-only, honestly labelled.** Instant-mine local node: this measures the contracts and node under concurrent load (nonce handling, guard correctness, harness throughput), not consensus throughput. The real-network ceiling is the analytical gas-based TPS in Section 3.

| N | Phase | Wall-clock (ms) | TPS | Mean tx (ms) | P95 tx (ms) | Max tx (ms) | Success | Queue intact |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 10 | registration | 14 | 714.29 | 13 | 14 | 14 | 10/10 | — |
| 10 | submission | 25 | 40 | 25 | 25 | 25 | 1/10 | ✅ |
| 20 | registration | 23 | 869.57 | 22 | 23 | 23 | 20/20 | — |
| 20 | submission | 38 | 26.32 | 38 | 38 | 38 | 1/20 | ✅ |
| 30 | registration | 40 | 750 | 38 | 40 | 40 | 30/30 | — |
| 30 | submission | 56 | 17.86 | 56 | 56 | 56 | 1/30 | ✅ |
| 40 | registration | 45 | 888.89 | 43 | 45 | 45 | 40/40 | — |
| 40 | submission | 68 | 14.71 | 68 | 68 | 68 | 1/40 | ✅ |
| 50 | registration | 68 | 735.29 | 64 | 67 | 68 | 50/50 | — |
| 50 | submission | 106 | 9.43 | 105 | 105 | 105 | 1/50 | ✅ |
| 60 | registration | 74 | 810.81 | 70 | 73 | 73 | 60/60 | — |
| 60 | submission | 109 | 9.17 | 109 | 109 | 109 | 1/60 | ✅ |
| 70 | registration | 76 | 921.05 | 72 | 75 | 76 | 70/70 | — |
| 70 | submission | 131 | 7.63 | 131 | 131 | 131 | 1/70 | ✅ |
| 80 | registration | 100 | 800 | 95 | 99 | 99 | 80/80 | — |
| 80 | submission | 147 | 6.8 | 146 | 146 | 146 | 1/80 | ✅ |
| 90 | registration | 97 | 927.84 | 93 | 97 | 97 | 90/90 | — |
| 90 | submission | 166 | 6.02 | 162 | 162 | 162 | 1/90 | ✅ |
| 100 | registration | 117 | 854.7 | 109 | 116 | 117 | 100/100 | — |
| 100 | submission | 191 | 5.24 | 191 | 191 | 191 | 1/100 | ✅ |

![Parallel-load scalability](./figures/parallel_scalability.png)
Raw data: [parallel_scalability.csv](./parallel_scalability.csv)