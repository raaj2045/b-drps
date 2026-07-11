# Security Policy & Analysis — B-DRPS

Standalone security reference for the B-DRPS contracts (`Auth`, `Main`,
`Decision`): threat model, P5 access-control hardening, deferred limitations,
static-analysis disposition, and reentrancy/EIP-7702 notes.

Companion file `benchmarks/SECURITY_ANALYSIS.md` is the tool-by-tool evidence log
(Slither / Solhint / Echidna / Mythril / coverage + OWASP SC Top 10). This file
is the policy and limitations register.

---

## 1. Scope and system model

- **`Auth`** — membership registry. Role *power*: `JOURNAL=1`, `EIC=2`, `AE=3`,
  `REVIEWER=4`, other (e.g. `AUTHOR`) `=5`. A `JOURNAL` is added directly and
  approves the `EIC`, who approves `AE`s, who approve `REVIEWER`s and `AUTHOR`s.
- **`Main`** — submission → EIC → AE → Reviewer → AE pipeline.
- **`Decision`** — final EIC verdict (publish / return).

`Main` and `Decision` hold an immutable `Auth` reference (constructor arg) and
read authority via `Auth.memberPower`. No contract is payable; `Auth` rejects
plain ETH (no `receive`/`fallback`).

---

## 2. Threat model

| Threat | Vector in B-DRPS | Current posture |
|---|---|---|
| **Sybil on registration** | A single actor requests many roles / addresses to gain disproportionate influence (e.g. many `REVIEWER`s). | Registration requires approval by a higher-authority existing member (`approoveRequest`, power hierarchy), and `addOrRequestMember` now requires `msg.sender == _userAddress` on the request path so an actor cannot register *other* addresses. Sybil resistance ultimately depends on the approving members' diligence — there is no on-chain identity/stake. **Documented residual risk**; out-of-band vetting by the journal is assumed. |
| **Reviewer / AE / EiC collusion** | Colluding role-holders push a paper through (or block it) regardless of merit. | The contracts enforce *who* may act at each stage (role modifiers) but cannot enforce *honest* judgement — a fundamental limitation of on-chain editorial workflows. Mitigation is procedural (multiple independent reviewers, editor oversight), not contract-level. **Accepted, documented.** |
| **Address-linkability de-anonymization** | Reviewer/author addresses are recorded on-chain (`reviewerAddress`, `authorAddress`), so pseudonymous reviewers can be correlated across papers and potentially de-anonymized, breaking double-blind review. | Real risk: all actions are public on-chain and linkable by address. The current design is **not** double-blind at the chain layer. Mitigation (per-paper ephemeral addresses, commit-reveal, or off-chain blinding) is **future work**. **Documented residual risk.** |
| **Metadata leakage** | Paper title, abstract, author email, and the IPFS link are stored in plaintext in contract storage / events, visible before publication. | Pre-publication metadata is world-readable. Sensitive fields (email, unpublished abstract) should not be considered confidential. Mitigation (store only hashes/CIDs, encrypt off-chain) is **future work**. **Documented residual risk.** |

---

## 3. Access control (added in P5)

Before P5, every pipeline function was unguarded. P5 adds **ABI-additive** role
gating: successful role flows are unchanged; unauthorized callers revert.

- **`Auth`** — `addOrRequestMember` (request path) requires
  `msg.sender == _userAddress`; `approoveRequest` requires an approved member
  acting as themselves (previously `approvingUserAddress` was unchecked, so a
  non-member's power-0 satisfied `0 <= power`); `denyRequest` requires the
  requester or an approved member.
- **`Main`** — `onlyAuthor` (`getPaperInfo`, `sendToEIC`), `onlyEiC`
  (`EICapproval`), `onlyAE` (`AEapproval`, `ReviewedByAE`), `onlyReviewer`
  (`Reviewerapproval`). Getters stay public.
- **`Decision`** — `onlyEiC` (`getPaperInfo` intake, `EICDecision`).

Modifiers read `Auth.memberPower` (a `uint256`), not the full `findMember`
struct, to keep bytecode under EIP-170 (§4.6). `onlyJournal` is intentionally
absent — no cross-contract function is JOURNAL-gated.

All state-changing ops now emit events for an off-chain audit trail.

---

## 3a. Fuzz findings — fixed (`fix/fuzz-findings`)

Two defects found by Echidna property fuzzing (evidence log:
`benchmarks/SECURITY_ANALYSIS.md` F1/F2) were fixed ABI-preserving — internal
mappings and guards only, no signature changes:

- **Queue index corruption (Main, F1)** — every pipeline queue now pairs its
  array with an `address => index+1` map (0 = absent) managed by shared
  `_enqueue`/`_dequeue` helpers. Duplicate submission by a queued author and
  removal of an absent paper revert instead of corrupting the swap-and-pop.
  The pre-fix code also never wrote the downstream queues' index maps, so
  every removal swap-popped slot 0 — correct only single-paper by accident.
- **Member eviction (Auth, F2)** — `denyRequest`/`approoveRequest` require a
  pending request and clear the full request state on completion (a denied
  requester can now re-request).

All 7 Echidna invariants pass at 50k+ calls each; unit regressions live in
`test/Auth.test.js` and `test/Main.test.js` under *"Fuzz-finding regressions"*.

---

## 4. Deferred architectural limitations

Known bugs intentionally **not** fixed — fixing them changes the ABI/data model
and breaks `v1.0-paper` parity. Each is pinned by a passing characterization
test and/or a `.skip`'d test whose un-skipping is the future-fix acceptance
criterion.

> Scope note: §4.1's *staging* model (actions apply to the most-recently-staged
> paper) is unchanged, but its most damaging consequence — queue/index
> corruption under multiple papers — is fixed per §3a. What remains deferred is
> the by-ID data model itself (§4.1), the no-op reject branches (§4.2/§4.3),
> and Decision's wrong-pop (§4.4).

### §4.1 — Single shared `instanceofPaperStruct` (Main + Decision)

Both `Main` and `Decision` store one module-level `instanceofPaperStruct` that
every function reads and writes. Two concurrent submissions overwrite each
other: an action always operates on the most-recently-touched paper, not a
specific one. Correct behavior requires per-paper IDs and a mapping — an ABI and
data-model change.

- Forcing function: `test/Main.test.js` → *"operations should select papers by
  ID, not from the shared instanceofPaperStruct"* (`.skip`). Removing the
  `.skip` is the acceptance criterion.

### §4.2 — `Main.Reviewerapproval(false, …)` is a no-op

The reject branch does nothing: the paper stays in `recievedByReviewer`, never
returns to the AE, and is never recorded as reviewed.

- Characterization (passing): `test/Main.test.js` → *"Reviewerapproval(false,…)
  is a no-op today …"*.
- Forcing function (`.skip`): *"Reviewerapproval(false,…) should remove paper
  from recievedByReviewer"*.

### §4.3 — `Main.ReviewedByAE(false, …)` is a no-op

Same shape as §4.2 for the AE final-remarks reject branch: the paper is not
removed from `RreceivedByAE`.

- Characterization (passing): `test/Main.test.js` → *"ReviewedByAE(false,…) is a
  no-op today …"*.
- Forcing function (`.skip`): *"ReviewedByAE(false,…) should remove paper from
  RreceivedByAE"*.

### §4.4 — `Decision.EICDecision` pops the wrong queue element

`EICDecision` unconditionally calls `RreceivedByEIC.pop()`, removing the **last**
element regardless of which paper the decision was for. Under interleaved
submissions/decisions the queue corrupts. Correct behavior requires keying the
decision to a paper id (ABI change).

- Forcing function (`.skip`): `test/Decision.test.js` → *"EICDecision should pop
  the paper being decided, not the last element of the queue"*.

### §4.5 — `linkofpaper` stored as a full gateway URL, not a bare CID

Papers store a full IPFS gateway URL (`https://gateway.pinata.cloud/ipfs/<CID>`)
rather than the bare CID, coupling stored data to one gateway operator. Storing
the CID and resolving the gateway client-side is future work (data-format change).

### §4.6 — EIP-170 contract size (deployment limitation)

With the optimizer disabled (the P3 benchmark methodology), P5's additions push
`Main`/`Decision` past EIP-170's 24,576-byte limit. Tests run with
`allowUnlimitedContractSize` (no effect on bytecode or gas, so P3 numbers stand).
For real-chain deployment, enable the optimizer. Deployment config item, not a
vulnerability.

---

## 5. Static analysis disposition (Slither)

Full run captured in [`security/slither-report.md`](security/slither-report.md).
**Zero high-severity and zero critical-severity findings.** All results are
low/informational and are consciously accepted for this revision:

| Detector | Count | Accepted-risk rationale |
|---|---:|---|
| `naming-convention` | 44 | Legacy identifier names preserved for ABI/frontend parity with `v1.0-paper`. NatSpec/naming cleanup scheduled for P7. |
| `boolean-equal` | 12 | `x == true` comparisons; semantically correct, cosmetic. |
| `cache-array-length` | 3 | Inside the Echidna harnesses only (`contracts/echidna/`), which are test-only and not deployed. |
| `solc-version` | 1 | Floating pragma `^0.8.7` flagged; mitigated by pinning the compiler to `0.8.19` in `hardhat.config.js`. Pragma tightening is a P7 item. |

No finding requires a code change to meet the P5 bar of zero high/critical.

---

## 6. Reentrancy

No contract is payable and none makes value-transferring or
control-handing-off external calls — the only cross-contract call is
`Main`/`Decision` reading the `Auth.memberPower` view on a fixed address. There
is **no reentrancy surface**, so no `ReentrancyGuard` is added (it would be
no-op theater). The P5 plan named `Auth.recieve()`, but that payable function
was removed earlier (it caused a Slither `locked-ether` finding); reintroducing
it to guard would re-create that finding. The no-payable design is asserted by
the "no payable hook" test in `test/Auth.test.js`.

---

## 7. EIP-7702 awareness

[EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) (mainnet, 2025) lets an EOA
delegate its code to a contract, so a delegated account can satisfy role checks
that authenticate purely by `msg.sender`/power, as B-DRPS does. (Notably, the
dev wallet from the earlier live-deploy attempt was compromised by a 7702
sweeper — the reason live deployment was dropped.) Account-type-aware
authentication is out of scope here and flagged for future mainnet work.

---

## 8. Reporting

Raise issues via the repository tracker or the maintainer. This is an academic
prototype; the §4 limitations and §2 residual risks are documented rather than
fixed to preserve `v1.0-paper` parity.
