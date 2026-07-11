## 7. Parallel-load scalability

N distinct clients fire transactions concurrently (`Promise.all`), for N = 10 … 100.

- **registration** — N self-service membership requests. Parallel-safe (distinct state per client): the scalability curve of record.
- **submission** — N authors each stage + submit a paper (`getPaperInfo` + `sendToEIC`). **Not parallel-safe by design**: `getPaperInfo` stages into a single shared scratchpad (SECURITY.md §4.1), so exactly one `sendToEIC` succeeds and the remaining N−1 revert on the queue guard (`"Author already queued here"`). This phase is a **concurrency-safety result, not a throughput result**: pre-fix, the same workload silently corrupted the queue; post-fix the guards fail safe under maximal interleaving, verified by the queue-integrity column (EIC queue length == successful submissions).

> **Local-only, honestly labelled.** Instant-mine local node: this measures the contracts and node under concurrent load (nonce handling, guard correctness, harness throughput), not consensus throughput. The real-network ceiling is the analytical gas-based TPS in Section 3.

| N | Phase | Wall-clock (ms) | TPS | Mean tx (ms) | P95 tx (ms) | Max tx (ms) | Success | Queue intact |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 10 | registration | 14 | 714.29 | 13 | 14 | 14 | 10/10 | — |
| 10 | submission | 30 | 33.33 | 29 | 29 | 29 | 1/10 | ✅ |
| 20 | registration | 27 | 740.74 | 24 | 25 | 27 | 20/20 | — |
| 20 | submission | 46 | 21.74 | 45 | 45 | 45 | 1/20 | ✅ |
| 30 | registration | 45 | 666.67 | 43 | 45 | 45 | 30/30 | — |
| 30 | submission | 67 | 14.93 | 66 | 66 | 66 | 1/30 | ✅ |
| 40 | registration | 52 | 769.23 | 49 | 51 | 52 | 40/40 | — |
| 40 | submission | 88 | 11.36 | 88 | 88 | 88 | 1/40 | ✅ |
| 50 | registration | 84 | 595.24 | 80 | 83 | 84 | 50/50 | — |
| 50 | submission | 117 | 8.55 | 117 | 117 | 117 | 1/50 | ✅ |
| 60 | registration | 78 | 769.23 | 74 | 77 | 77 | 60/60 | — |
| 60 | submission | 133 | 7.52 | 133 | 133 | 133 | 1/60 | ✅ |
| 70 | registration | 95 | 736.84 | 92 | 95 | 95 | 70/70 | — |
| 70 | submission | 185 | 5.41 | 185 | 185 | 185 | 1/70 | ✅ |
| 80 | registration | 123 | 650.41 | 116 | 120 | 122 | 80/80 | — |
| 80 | submission | 184 | 5.43 | 184 | 184 | 184 | 1/80 | ✅ |
| 90 | registration | 140 | 642.86 | 130 | 138 | 139 | 90/90 | — |
| 90 | submission | 209 | 4.78 | 200 | 200 | 200 | 1/90 | ✅ |
| 100 | registration | 153 | 653.59 | 137 | 149 | 152 | 100/100 | — |
| 100 | submission | 241 | 4.15 | 240 | 240 | 240 | 1/100 | ✅ |

![Parallel-load scalability](./figures/parallel_scalability.png)
Raw data: [parallel_scalability.csv](./parallel_scalability.csv)