## 6. Parallel-load scalability

N distinct clients fire transactions concurrently (`Promise.all`), for N = 10 … 100.

- **registration** — N self-service membership requests. Parallel-safe (distinct state per client): the scalability curve of record.
- **submission** — N authors each stage + submit a paper (`getPaperInfo` + `sendToEIC`). **Not parallel-safe by design**: `getPaperInfo` stages into a single shared scratchpad (SECURITY.md §4.1), so exactly one `sendToEIC` succeeds and the remaining N−1 revert on the queue guard (`"Author already queued here"`). This phase is a **concurrency-safety result, not a throughput result**: pre-fix, the same workload silently corrupted the queue; post-fix the guards fail safe under maximal interleaving, verified by the queue-integrity column (EIC queue length == successful submissions).

> **Local-only, honestly labelled.** Instant-mine local node: this measures the contracts and node under concurrent load (nonce handling, guard correctness, harness throughput), not consensus throughput. The real-network ceiling is the analytical gas-based TPS in Section 3.

| N | Phase | Wall-clock (ms) | TPS | Mean tx (ms) | P95 tx (ms) | Max tx (ms) | Success | Queue intact |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 10 | registration | 17 | 588.24 | 16 | 17 | 17 | 10/10 | — |
| 10 | submission | 35 | 28.57 | 35 | 35 | 35 | 1/10 | ✅ |
| 20 | registration | 27 | 740.74 | 26 | 27 | 27 | 20/20 | — |
| 20 | submission | 47 | 21.28 | 47 | 47 | 47 | 1/20 | ✅ |
| 30 | registration | 41 | 731.71 | 39 | 41 | 41 | 30/30 | — |
| 30 | submission | 63 | 15.87 | 63 | 63 | 63 | 1/30 | ✅ |
| 40 | registration | 50 | 800 | 47 | 49 | 49 | 40/40 | — |
| 40 | submission | 88 | 11.36 | 88 | 88 | 88 | 1/40 | ✅ |
| 50 | registration | 62 | 806.45 | 59 | 61 | 61 | 50/50 | — |
| 50 | submission | 104 | 9.62 | 104 | 104 | 104 | 1/50 | ✅ |
| 60 | registration | 73 | 821.92 | 69 | 72 | 73 | 60/60 | — |
| 60 | submission | 129 | 7.75 | 129 | 129 | 129 | 1/60 | ✅ |
| 70 | registration | 88 | 795.45 | 82 | 88 | 88 | 70/70 | — |
| 70 | submission | 166 | 6.02 | 166 | 166 | 166 | 1/70 | ✅ |
| 80 | registration | 101 | 792.08 | 95 | 99 | 100 | 80/80 | — |
| 80 | submission | 164 | 6.1 | 164 | 164 | 164 | 1/80 | ✅ |
| 90 | registration | 115 | 782.61 | 110 | 114 | 114 | 90/90 | — |
| 90 | submission | 189 | 5.29 | 188 | 188 | 188 | 1/90 | ✅ |
| 100 | registration | 132 | 757.58 | 126 | 130 | 132 | 100/100 | — |
| 100 | submission | 3,004 | 0.33 | 3004 | 3004 | 3004 | 1/100 | ✅ |

Raw data: [parallel_scalability.csv](./parallel_scalability.csv)