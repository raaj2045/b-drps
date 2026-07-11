## 6. Parallel-load scalability

N distinct clients fire transactions concurrently (`Promise.all`), for N = 10 … 100.

- **registration** — N self-service membership requests. Parallel-safe (distinct state per client): the scalability curve of record.
- **submission** — N authors each stage + submit a paper (`getPaperInfo` + `sendToEIC`). **Not parallel-safe by design**: `getPaperInfo` stages into a single shared scratchpad (SECURITY.md §4.1), so exactly one `sendToEIC` succeeds and the remaining N−1 revert on the queue guard (`"Author already queued here"`). This phase is a **concurrency-safety result, not a throughput result**: pre-fix, the same workload silently corrupted the queue; post-fix the guards fail safe under maximal interleaving, verified by the queue-integrity column (EIC queue length == successful submissions).

> **Local-only, honestly labelled.** Instant-mine local node: this measures the contracts and node under concurrent load (nonce handling, guard correctness, harness throughput), not consensus throughput. The real-network ceiling is the analytical gas-based TPS in Section 3.

| N | Phase | Wall-clock (ms) | TPS | Mean tx (ms) | P95 tx (ms) | Max tx (ms) | Success | Queue intact |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 10 | registration | 20 | 500 | 19 | 20 | 20 | 10/10 | — |
| 10 | submission | 35 | 28.57 | 34 | 34 | 34 | 1/10 | ✅ |
| 20 | registration | 35 | 571.43 | 33 | 35 | 35 | 20/20 | — |
| 20 | submission | 54 | 18.52 | 54 | 54 | 54 | 1/20 | ✅ |
| 30 | registration | 45 | 666.67 | 43 | 44 | 45 | 30/30 | — |
| 30 | submission | 66 | 15.15 | 66 | 66 | 66 | 1/30 | ✅ |
| 40 | registration | 79 | 506.33 | 76 | 78 | 78 | 40/40 | — |
| 40 | submission | 101 | 9.9 | 101 | 101 | 101 | 1/40 | ✅ |
| 50 | registration | 69 | 724.64 | 67 | 69 | 69 | 50/50 | — |
| 50 | submission | 115 | 8.7 | 115 | 115 | 115 | 1/50 | ✅ |
| 60 | registration | 80 | 750 | 75 | 79 | 79 | 60/60 | — |
| 60 | submission | 137 | 7.3 | 137 | 137 | 137 | 1/60 | ✅ |
| 70 | registration | 100 | 700 | 96 | 99 | 99 | 70/70 | — |
| 70 | submission | 168 | 5.95 | 168 | 168 | 168 | 1/70 | ✅ |
| 80 | registration | 110 | 727.27 | 105 | 108 | 109 | 80/80 | — |
| 80 | submission | 189 | 5.29 | 189 | 189 | 189 | 1/80 | ✅ |
| 90 | registration | 129 | 697.67 | 122 | 128 | 128 | 90/90 | — |
| 90 | submission | 216 | 4.63 | 216 | 216 | 216 | 1/90 | ✅ |
| 100 | registration | 139 | 719.42 | 132 | 137 | 138 | 100/100 | — |
| 100 | submission | 253 | 3.95 | 253 | 253 | 253 | 1/100 | ✅ |

Raw data: [parallel_scalability.csv](./parallel_scalability.csv)