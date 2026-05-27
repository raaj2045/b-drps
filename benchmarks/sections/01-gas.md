## 1. Gas per operation

### Deployment

| Contract | Gas used |
|---|---:|
| Auth | 2,520,171 |
| Main | 5,171,573 |
| Decision | 1,996,712 |

### Auth operations

| Operation | Gas used |
|---|---:|
| addJournalDirect | 296,509 |
| requestMember | 301,333 |
| approveRequest | 310,518 |
| denyRequest | 45,708 |

### Main + Decision pipeline

| Operation | Gas used |
|---|---:|
| getPaperInfo | 276,390 |
| sendToEIC | 331,885 |
| EICapproval | 626,129 |
| AEapproval | 626,107 |
| Reviewerapproval | 882,729 |
| ReviewedByAE | 473,481 |
| decisionGetPaperInfo | 736,442 |
| EICDecision | 854,151 |