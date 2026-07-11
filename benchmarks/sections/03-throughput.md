## 3. Throughput

### Analytical (Sepolia 30M gas/block, 12s/block)

Theoretical upper bound assuming a block contains only that operation.

| Operation | Gas | Ops/block | TPS |
|---|---:|---:|---:|
| addOrRequestMember | 303,838 | 98 | 8.01 |
| approveRequest | 308,335 | 97 | 7.92 |
| getPaperInfo | 282,499 | 106 | 8.66 |
| sendToEIC | 363,444 | 82 | 6.7 |
| EICapproval | 655,519 | 45 | 3.68 |
| AEapproval | 655,497 | 45 | 3.68 |
| Reviewerapproval | 912,355 | 32 | 2.61 |
| EICDecision | 864,967 | 34 | 2.78 |

### Empirical (local instant-mine sanity check)

- Operation: `submission (getPaperInfo + sendToEIC)`
- Submissions: 100 (two txs each)
- Blocks consumed: 200
- Wall-clock: 315 ms
- Local TPS (instant-mine, no block-time floor): 317.46

![Analytical TPS by operation](./figures/throughput.png)
Raw data: [throughput.csv](./throughput.csv)