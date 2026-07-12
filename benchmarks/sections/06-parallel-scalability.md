## 6. Parallel-load scalability

N distinct clients fire transactions concurrently (`Promise.all`), for N = 10 … 100.

- **registration** — N self-service membership requests. Parallel-safe (distinct state per client): the scalability curve of record.
- **submission** — N authors each stage + submit a paper (`getPaperInfo` + `sendToEIC`). **Not parallel-safe by design**: `getPaperInfo` stages into a single shared scratchpad (SECURITY.md §4.1), so exactly one `sendToEIC` succeeds and the remaining N−1 revert on the queue guard (`"Author already queued here"`). This phase is a **concurrency-safety result, not a throughput result**: pre-fix, the same workload silently corrupted the queue; post-fix the guards fail safe under maximal interleaving, verified by the queue-integrity column (EIC queue length == successful submissions).

> **Local-only, honestly labelled.** Instant-mine local node: this measures the contracts and node under concurrent load (nonce handling, guard correctness, harness throughput), not consensus throughput. The real-network ceiling is the analytical gas-based TPS in Section 3.

| N | Phase | Wall-clock (ms) | TPS | Mean tx (ms) | P95 tx (ms) | Max tx (ms) | Success | Queue intact |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 10 | registration | 14 | 714.29 | 14 | 14 | 14 | 10/10 | — |
| 10 | submission | 29 | 34.48 | 29 | 29 | 29 | 1/10 | ✅ |
| 20 | registration | 28 | 714.29 | 26 | 27 | 27 | 20/20 | — |
| 20 | submission | 46 | 21.74 | 46 | 46 | 46 | 1/20 | ✅ |
| 30 | registration | 52 | 576.92 | 50 | 52 | 52 | 30/30 | — |
| 30 | submission | 59 | 16.95 | 59 | 59 | 59 | 1/30 | ✅ |
| 40 | registration | 45 | 888.89 | 42 | 44 | 44 | 40/40 | — |
| 40 | submission | 75 | 13.33 | 75 | 75 | 75 | 1/40 | ✅ |
| 50 | registration | 61 | 819.67 | 58 | 60 | 60 | 50/50 | — |
| 50 | submission | 100 | 10 | 100 | 100 | 100 | 1/50 | ✅ |
| 60 | registration | 72 | 833.33 | 68 | 71 | 71 | 60/60 | — |
| 60 | submission | 119 | 8.4 | 119 | 119 | 119 | 1/60 | ✅ |
| 70 | registration | 79 | 886.08 | 75 | 78 | 78 | 70/70 | — |
| 70 | submission | 128 | 7.81 | 128 | 128 | 128 | 1/70 | ✅ |
| 80 | registration | 89 | 898.88 | 84 | 88 | 89 | 80/80 | — |
| 80 | submission | 151 | 6.62 | 151 | 151 | 151 | 1/80 | ✅ |
| 90 | registration | 105 | 857.14 | 99 | 105 | 105 | 90/90 | — |
| 90 | submission | 181 | 5.52 | 175 | 175 | 175 | 1/90 | ✅ |
| 100 | registration | 115 | 869.57 | 109 | 114 | 115 | 100/100 | — |
| 100 | submission | 188 | 5.32 | 188 | 188 | 188 | 1/100 | ✅ |

Raw data: [parallel_scalability.csv](./parallel_scalability.csv)