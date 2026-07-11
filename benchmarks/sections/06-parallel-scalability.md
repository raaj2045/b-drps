## 6. Parallel-load scalability

N distinct clients fire transactions concurrently (`Promise.all`), for N = 10 … 100.

- **registration** — N self-service membership requests. Parallel-safe (distinct state per client): the scalability curve of record.
- **submission** — N authors each stage + submit a paper (`getPaperInfo` + `sendToEIC`). **Not parallel-safe by design**: `getPaperInfo` stages into a single shared scratchpad (SECURITY.md §4.1), so exactly one `sendToEIC` succeeds and the remaining N−1 revert on the queue guard (`"Author already queued here"`). This phase is a **concurrency-safety result, not a throughput result**: pre-fix, the same workload silently corrupted the queue; post-fix the guards fail safe under maximal interleaving, verified by the queue-integrity column (EIC queue length == successful submissions).

> **Local-only, honestly labelled.** Instant-mine local node: this measures the contracts and node under concurrent load (nonce handling, guard correctness, harness throughput), not consensus throughput. The real-network ceiling is the analytical gas-based TPS in Section 3.

| N | Phase | Wall-clock (ms) | TPS | Mean tx (ms) | P95 tx (ms) | Max tx (ms) | Success | Queue intact |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 10 | registration | 20 | 500 | 19 | 20 | 20 | 10/10 | — |
| 10 | submission | 38 | 26.32 | 38 | 38 | 38 | 1/10 | ✅ |
| 20 | registration | 26 | 769.23 | 25 | 26 | 26 | 20/20 | — |
| 20 | submission | 42 | 23.81 | 42 | 42 | 42 | 1/20 | ✅ |
| 30 | registration | 53 | 566.04 | 50 | 52 | 52 | 30/30 | — |
| 30 | submission | 69 | 14.49 | 68 | 68 | 68 | 1/30 | ✅ |
| 40 | registration | 52 | 769.23 | 49 | 51 | 51 | 40/40 | — |
| 40 | submission | 83 | 12.05 | 83 | 83 | 83 | 1/40 | ✅ |
| 50 | registration | 66 | 757.58 | 63 | 66 | 66 | 50/50 | — |
| 50 | submission | 106 | 9.43 | 106 | 106 | 106 | 1/50 | ✅ |
| 60 | registration | 77 | 779.22 | 73 | 76 | 76 | 60/60 | — |
| 60 | submission | 120 | 8.33 | 120 | 120 | 120 | 1/60 | ✅ |
| 70 | registration | 74 | 945.95 | 69 | 73 | 73 | 70/70 | — |
| 70 | submission | 129 | 7.75 | 128 | 128 | 128 | 1/70 | ✅ |
| 80 | registration | 84 | 952.38 | 79 | 82 | 83 | 80/80 | — |
| 80 | submission | 137 | 7.3 | 137 | 137 | 137 | 1/80 | ✅ |
| 90 | registration | 96 | 937.5 | 91 | 95 | 96 | 90/90 | — |
| 90 | submission | 161 | 6.21 | 161 | 161 | 161 | 1/90 | ✅ |
| 100 | registration | 106 | 943.4 | 101 | 105 | 105 | 100/100 | — |
| 100 | submission | 202 | 4.95 | 191 | 191 | 191 | 1/100 | ✅ |

Raw data: [parallel_scalability.csv](./parallel_scalability.csv)