## 6. Parallel-load scalability

N distinct clients fire transactions concurrently (`Promise.all`), for N = 10 … 100.

- **registration** — N self-service membership requests. Parallel-safe (distinct state per client): the scalability curve of record.
- **submission** — N authors each stage + submit a paper (`getPaperInfo` + `sendToEIC`). **Not parallel-safe by design**: `getPaperInfo` stages into a single shared scratchpad (SECURITY.md §4.1), so exactly one `sendToEIC` succeeds and the remaining N−1 revert on the queue guard (`"Author already queued here"`). This phase is a **concurrency-safety result, not a throughput result**: pre-fix, the same workload silently corrupted the queue; post-fix the guards fail safe under maximal interleaving, verified by the queue-integrity column (EIC queue length == successful submissions).

> **Local-only, honestly labelled.** Instant-mine local node: this measures the contracts and node under concurrent load (nonce handling, guard correctness, harness throughput), not consensus throughput. The real-network ceiling is the analytical gas-based TPS in Section 3.

| N | Phase | Wall-clock (ms) | TPS | Mean tx (ms) | P95 tx (ms) | Max tx (ms) | Success | Queue intact |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 10 | registration | 16 | 625 | 15 | 16 | 16 | 10/10 | — |
| 10 | submission | 28 | 35.71 | 28 | 28 | 28 | 1/10 | ✅ |
| 20 | registration | 24 | 833.33 | 23 | 24 | 24 | 20/20 | — |
| 20 | submission | 39 | 25.64 | 39 | 39 | 39 | 1/20 | ✅ |
| 30 | registration | 44 | 681.82 | 43 | 44 | 44 | 30/30 | — |
| 30 | submission | 63 | 15.87 | 63 | 63 | 63 | 1/30 | ✅ |
| 40 | registration | 57 | 701.75 | 54 | 57 | 57 | 40/40 | — |
| 40 | submission | 88 | 11.36 | 87 | 87 | 87 | 1/40 | ✅ |
| 50 | registration | 65 | 769.23 | 63 | 65 | 65 | 50/50 | — |
| 50 | submission | 98 | 10.2 | 98 | 98 | 98 | 1/50 | ✅ |
| 60 | registration | 70 | 857.14 | 64 | 68 | 69 | 60/60 | — |
| 60 | submission | 121 | 8.26 | 121 | 121 | 121 | 1/60 | ✅ |
| 70 | registration | 84 | 833.33 | 78 | 82 | 83 | 70/70 | — |
| 70 | submission | 143 | 6.99 | 143 | 143 | 143 | 1/70 | ✅ |
| 80 | registration | 90 | 888.89 | 86 | 90 | 90 | 80/80 | — |
| 80 | submission | 151 | 6.62 | 151 | 151 | 151 | 1/80 | ✅ |
| 90 | registration | 110 | 818.18 | 104 | 109 | 109 | 90/90 | — |
| 90 | submission | 192 | 5.21 | 192 | 192 | 192 | 1/90 | ✅ |
| 100 | registration | 127 | 787.4 | 121 | 126 | 127 | 100/100 | — |
| 100 | submission | 207 | 4.83 | 207 | 207 | 207 | 1/100 | ✅ |

![Parallel-load scalability](./figures/parallel_scalability.png)
Raw data: [parallel_scalability.csv](./parallel_scalability.csv)