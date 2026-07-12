## 7. Storage growth (on-chain footprint)

N papers are pushed end-to-end, then the storage the contracts occupy is accounted slot-by-slot from actual on-chain state (walked via the paginated getters) using Solidity's storage-layout rules — inline vs. long strings, array length slots, live index-map entries, and Auth's struct-mirror mappings. Bytes = slots × 32.

Workload: realistic field lengths per submission — authorName 24 chars, email 29 chars, title 120 chars, abstract 1500 chars, ipfsLink 80 chars, reviewerComment 2500 chars, aeComment 1000 chars, decisionMessage 300 chars.

> **Cross-checked against the EVM.** For one full lifecycle, a `debug_traceTransaction` count of net SSTOREs (slots left non-zero) gives **1167 slots** vs. **1167** from the analytical accounting — an exact match. Storage layout is EVM-deterministic, so these figures are network-independent (local-only run, same rationale as Section 5).

**What is stored per paper is constant**: metadata strings plus the IPFS link — the manuscript itself lives off-chain (Pinata/IPFS), so the on-chain footprint does not depend on the PDF's size. Total storage therefore grows linearly while bytes/paper is flat; the slightly higher N=1 value is the one-time overhead (staging structs, array length slots) amortizing over more papers.

The pipeline archives a copy of the paper at every approval stage (`approvedByEIC`, `approvedByAE`, `reviewedByReviewer`, `reviewedByAE`) plus two copies in Decision (`Publishpaper`, `ReturnAuthor`) — the `copies/paper` column quantifies this write amplification.

| N | Total slots | Total bytes | Bytes/paper | Copies/paper | Auth bytes (fixed roles) |
|---:|---:|---:|---:|---:|---:|
| 1 | 1,223 | 39,136 | 37,344 | 6 | 1,792 |
| 10 | 10,799 | 345,568 | 34,378 | 6 | 1,792 |
| 50 | 53,359 | 1,707,488 | 34,114 | 6 | 1,792 |
| 100 | 106,559 | 3,409,888 | 34,081 | 6 | 1,792 |

![Storage growth](./figures/storage_growth.png)
Raw data: [storage_growth.csv](./storage_growth.csv)