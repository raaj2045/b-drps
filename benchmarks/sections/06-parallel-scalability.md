## 6. Parallel-load scalability

N distinct clients fire transactions concurrently (`Promise.all`), for N = 10 … 100.

- **registration** — N self-service membership requests. Parallel-safe (distinct state per client): the scalability curve of record.
- **submission** — N authors each stage + submit a paper (`getPaperInfo` + `sendToEIC`). **Not parallel-safe by design**: `getPaperInfo` stages into a single shared scratchpad (SECURITY.md §4.1), so exactly one `sendToEIC` succeeds and the remaining N−1 revert on the queue guard (`"Author already queued here"`). This phase is a **concurrency-safety result, not a throughput result**: pre-fix, the same workload silently corrupted the queue; post-fix the guards fail safe under maximal interleaving, verified by the queue-integrity column (EIC queue length == successful submissions).

> **Local-only, honestly labelled.** Instant-mine local node: this measures the contracts and node under concurrent load (nonce handling, guard correctness, harness throughput), not consensus throughput. The real-network ceiling is the analytical gas-based TPS in Section 3.

| N | Phase | Wall-clock (ms) | TPS | Mean tx (ms) | P95 tx (ms) | Max tx (ms) | Success | Queue intact |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 10 | registration | 15 | 666.67 | 14 | 14 | 14 | 10/10 | — |
| 10 | submission | 27 | 37.04 | 27 | 27 | 27 | 1/10 | ✅ |
| 20 | registration | 25 | 800 | 23 | 25 | 25 | 20/20 | — |
| 20 | submission | 45 | 22.22 | 45 | 45 | 45 | 1/20 | ✅ |
| 30 | registration | 44 | 681.82 | 42 | 44 | 44 | 30/30 | — |
| 30 | submission | 64 | 15.63 | 64 | 64 | 64 | 1/30 | ✅ |
| 40 | registration | 51 | 784.31 | 47 | 51 | 51 | 40/40 | — |
| 40 | submission | 82 | 12.2 | 82 | 82 | 82 | 1/40 | ✅ |
| 50 | registration | 61 | 819.67 | 59 | 61 | 61 | 50/50 | — |
| 50 | submission | 99 | 10.1 | 99 | 99 | 99 | 1/50 | ✅ |
| 60 | registration | 78 | 769.23 | 73 | 75 | 77 | 60/60 | — |
| 60 | submission | 120 | 8.33 | 120 | 120 | 120 | 1/60 | ✅ |
| 70 | registration | 88 | 795.45 | 82 | 87 | 87 | 70/70 | — |
| 70 | submission | 159 | 6.29 | 158 | 158 | 158 | 1/70 | ✅ |
| 80 | registration | 101 | 792.08 | 96 | 100 | 100 | 80/80 | — |
| 80 | submission | 164 | 6.1 | 164 | 164 | 164 | 1/80 | ✅ |
| 90 | registration | 109 | 825.69 | 101 | 109 | 109 | 90/90 | — |
| 90 | submission | 181 | 5.52 | 181 | 181 | 181 | 1/90 | ✅ |
| 100 | registration | 124 | 806.45 | 117 | 122 | 123 | 100/100 | — |
| 100 | submission | 205 | 4.88 | 205 | 205 | 205 | 1/100 | ✅ |

![Parallel-load scalability](./figures/parallel_scalability.png)
Raw data: [parallel_scalability.csv](./parallel_scalability.csv)