## 1. Gas per operation

### Deployment

| Contract | Gas used |
|---|---:|
| Auth | 3,078,225 |
| Main | 5,608,132 |
| Decision | 2,332,648 |

### Auth operations

| Operation | Gas used |
|---|---:|
| addJournalDirect | 299,014 |
| requestMember | 303,838 |
| approveRequest | 308,335 |
| denyRequest | 73,448 |

### Main + Decision pipeline

| Operation | Gas used |
|---|---:|
| getPaperInfo | 282,499 |
| sendToEIC | 363,444 |
| EICapproval | 655,519 |
| AEapproval | 655,497 |
| Reviewerapproval | 912,355 |
| ReviewedByAE | 477,427 |
| decisionGetPaperInfo | 745,362 |
| EICDecision | 864,967 |