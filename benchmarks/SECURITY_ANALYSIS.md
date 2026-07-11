# Security Analysis

Comprehensive automated security review of the `Auth`, `Main`, and `Decision`
contracts (Solidity 0.8.19). Combines static analysis (SAST), symbolic
execution, property fuzzing, linting, and dynamic test coverage, and maps the
results against the OWASP Smart Contract Top 10 (2025). Run on 2026-05-25.

## Tool summary

| Tool | Version | Category | What it checks | Our result |
|---|---|---|---|---|
| **Slither** | 0.11.5 | SAST (static) | 100+ detectors: reentrancy, locked ether, uninitialized storage, arbitrary-send, tx.origin, shadowing, naming | **0 High / 0 Medium / 0 Low**, 58 informational. One Medium (`locked-ether`) found on an earlier revision **and fixed**. |
| **Mythril** | 0.24.8 | Symbolic execution (static) | SWC-registry vulns via EVM bytecode symbolic execution: integer over/underflow, unprotected selfdestruct, unchecked calls, arbitrary jumps | **No issues** at `-t 1` and `-t 3` on all three contracts. Multi-tx state bugs are beyond what bounded symbolic execution reaches here (see note). |
| **Echidna** | 2.3.2 | Property fuzzing (dynamic) | User-defined state invariants under randomized multi-transaction call sequences | **2 invariants falsified** (real bugs) — **both fixed** and re-verified: all 7 invariants pass at 50k+ calls. See findings below. |
| **Solhint** | 6.2.1 | Linter / SAST-lite | Security rules (compiler version, visibility, tx.origin, low-level calls) + style | **0 errors, 114 warnings** — all style/documentation. |
| **solidity-coverage** | (toolbox) | Dynamic (test coverage) | Statement / branch / function / line coverage of the test suite | **100% stmt, 100% func, 100% line, 98.81% branch** over 43 passing tests (incl. fuzz-finding regressions). |

### Why symbolic execution found nothing but fuzzing did

Mythril analyzes bounded transaction sequences via symbolic execution; at
`-t 1`/`-t 3` it reported no issues. The real defects in these contracts are
**multi-transaction state-machine** problems (queue index corruption, member
eviction) that only manifest across specific call sequences against accumulated
storage state. Echidna's property fuzzing — which drives long randomized call
sequences against persistent state — found them in as few as **2 calls**. This
is the textbook reason a comprehensive review pairs symbolic execution *with*
property fuzzing: they cover different fault classes.

(Note: Mythril's symbolic engine does not terminate in reasonable time at
higher transaction depths on these contracts, due to state explosion from the
`for` loops over dynamic arrays and the heavy string storage writes. Runs were
bounded with `--execution-timeout 150`.)

## Finding found and fixed: locked ether (Slither, Medium)

Slither's `locked-ether` detector flagged `Auth` after an earlier revision
promoted a misspelled `function recieve() external payable {}` into a real
`receive()` fallback: the contract could receive ETH but had no withdrawal
path, so any ETH sent would be permanently locked.

**Resolution:** the payable hook was removed entirely (the workflow handles no
value). `Auth` now rejects plain ETH transfers, verified by a regression test.
Re-running Slither reports **0 Medium**.

## Findings from property fuzzing (Echidna) — found, then fixed

Both findings below were discovered by property fuzzing, fixed in
`fix/fuzz-findings` (ABI-preserving: internal mappings and guards only), and
re-verified: **all 7 invariants now pass at 50,000+ calls each** (2026-07-11,
Echidna 2.3.2, seed 1).

### F1 — EIC queue index corruption (Main) · OWASP SC03 Logic Errors · FIXED

Invariant `echidna_eic_index_consistent` (every queued paper's
`indexFromEIC[author]` points back to its slot) was **falsified in 2 calls**:

```
sendToEIC()
sendToEIC()
```

Two submissions sharing an author overwrite the same `indexFromEIC` slot, so
the first paper's index pointer becomes stale, and a later `EICapproval`
shuffle-pops the wrong queue entry. Investigation also showed the downstream
queues (`recievedByAE`, `recievedByReviewer`, `RreceivedByAE`) never wrote
their index maps at all — every removal swap-popped slot 0, correct only in
single-paper flows.

**Fix:** every pipeline queue now pairs its array with an `address => index+1`
map (0 = absent) managed by shared `_enqueue`/`_dequeue` helpers. Duplicate
submissions by a queued author and removals of absent papers revert
(`"Author already queued here"` / `"Paper not in this queue"`) instead of
corrupting the swap-and-pop. Regression tests:
`test/Main.test.js` → *"Fuzz-finding regressions (Echidna: EIC queue index
corruption)"* (4 tests, including two-author interleaving). The invariant now
holds across all four queues (`echidna_eic/ae/reviewer/rbae_index_consistent`).

### F2 — Unguarded `denyRequest` evicts an unrelated member (Auth) · OWASP SC01/SC04 · FIXED

Invariant `echidna_count_matches` (requested-array length equals the number of
genuinely requested members) was **falsified**:

```
reqUser(0)    // request member A
denyUser(1)   // deny member B, who was never requested
```

`denyRequest` did not verify the target was actually in the requested queue.
Called for a non-requested address it read `indexFromRequest[addr] == 0` and
swap-popped slot 0 — evicting an unrelated pending member (data loss).

**Fix:** `denyRequest` and `approoveRequest` now require
`memberRequested[_userAddress]` (`"No pending request for this address"`), and
both clear the full request state on completion — which also fixes a latent
bug where a denied requester could never request again. Regression tests:
`test/Auth.test.js` → *"Fuzz-finding regressions (Echidna: member eviction)"*.

### Invariant verdicts (re-run after fixes)

| Harness | Invariant | Calls | Verdict |
|---|---|---:|---|
| EchidnaMain | `echidna_eic_index_consistent` | 50,078 | **passing** (previously falsified in 2 calls) |
| EchidnaMain | `echidna_ae_index_consistent` | 50,078 | **passing** (new) |
| EchidnaMain | `echidna_reviewer_index_consistent` | 50,078 | **passing** (new) |
| EchidnaMain | `echidna_rbae_index_consistent` | 50,078 | **passing** (new) |
| EchidnaAuth | `echidna_request_index_consistent` | 50,051 | **passing** |
| EchidnaAuth | `echidna_approved_flag_implies_entry` | 50,051 | **passing** |
| EchidnaAuthGuarded | `echidna_count_matches` | 50,083 | **passing** (previously falsified) |

Post-P5 the harnesses needed an authorization rework to stay effective (role
gating made unauthorized fuzz calls revert): `EchidnaMain` drives the pipeline
through a `MockAuth` that maps Echidna's fixed sender set to the four roles,
and `EchidnaAuthGuarded` self-registers as a JOURNAL and denies via external
self-call. Without this the invariants would pass vacuously.

## OWASP Smart Contract Top 10 (2025) coverage

The contract review targets the OWASP **Smart Contract** Top 10. (The classic
OWASP Web Top 10 applies to the off-chain React dApp frontend and is out of
scope here.)

| # | Category | Applies? | Checked by | Status |
|---|---|---|---|---|
| SC01 | Access Control | **Yes** | Echidna, manual | ✅ Pass — P5 added role modifiers on every pipeline action; F2's arbitrary-caller eviction is fixed (guard + auth checks in `denyRequest`). |
| SC02 | Price Oracle Manipulation | No | — | N/A — no oracles/price feeds |
| SC03 | Logic Errors | **Yes** | Echidna, tests | ⚠️ **Partial** — F1's queue index corruption is **fixed** (all 4 queue invariants hold at 50k). Remaining documented deferrals: shared `instanceofPaperStruct` staging (SECURITY.md §4.1), `Decision.EICDecision` wrong-pop (§4.4), no-op reject branches (§4.2/§4.3). |
| SC04 | Lack of Input Validation | **Yes** | Echidna, manual | ⚠️ **Partial** — deny/approve now require a pending request (F2 fix); queue ops validate presence. `addOrRequestMember` still accepts an empty role string (falls through to AUTHOR power 5 — benign, documented). |
| SC05 | Reentrancy | Yes | Slither, Mythril | ✅ Pass — no external calls, no value transfer |
| SC06 | Unchecked External Calls | No | Slither, Mythril | ✅ Pass — no `.call`/`.send`/`.transfer` present |
| SC07 | Flash Loan Attacks | No | — | N/A — no DeFi/economic logic |
| SC08 | Integer Overflow/Underflow | Yes | compiler, Mythril | ✅ Pass — Solidity 0.8 checked arithmetic; empty-queue pop reverts rather than wrapping |
| SC09 | Insecure Randomness | No | — | N/A — no randomness used |
| SC10 | Denial of Service | **Yes** | manual, Echidna | ⚠️ **Partial** — unbounded array getters (`getApprovedOrRequestedMember`, `getRecievedByEIC`, …) grow O(n). The `denyRequest` griefing vector is closed (guarded + authorized). |

**Summary: 1 clean pass gained (SC01), 3 partials with documented deferrals
(SC03, SC04, SC10), 3 clean passes (SC05, SC06, SC08), 3 not applicable.**
Both Echidna findings are fixed and regression-netted; the remaining partials
are the §4 data-model deferrals and getter pagination.

## Interpreting the informational findings

The 58 Slither informational results and 114 Solhint warnings are
non-exploitable code-quality items: naming conventions (`recievedByEIC`,
`approoveRequest`), redundant `== true`/`== false` comparisons, missing NatSpec,
implicit state-variable visibility, and the floating `^0.8.7` pragma. None alter
contract behaviour.

## Remediation status

| Issue | OWASP | Source | Status |
|---|---|---|---|
| locked-ether | (SC) | Slither | **Fixed** — payable hook removed |
| Queue index corruption (all 4 pipeline queues) | SC03 | Echidna F1 | **Fixed** — sentinel index maps + guarded `_enqueue`/`_dequeue`; invariants pass at 50k |
| Unguarded deny/approve evicting members | SC01/SC04 | Echidna F2 | **Fixed** — pending-request guard + full request-state cleanup |
| No role-based access control | SC01 | manual | **Fixed** (P5) — role modifiers on every pipeline action |
| Shared paper scratchpad (staging by author, not ID) | SC03 | manual, tests | Deferred — SECURITY.md §4.1 (ABI change) |
| `Decision.EICDecision` wrong-pop | SC03 | manual, tests | Deferred — SECURITY.md §4.4 (ABI change) |
| No-op reject branches | SC03 | tests | Deferred — SECURITY.md §4.2/§4.3 |
| Unbounded array getters | SC10 | manual | Deferred (consider pagination) |

## Reproduce

```bash
# SAST (static)
slither contracts/auth.sol      # + main.sol, Decision.sol
npx solhint 'contracts/**/*.sol'

# Symbolic execution
docker run --rm -v "$PWD/contracts:/c" mythril/myth \
  analyze /c/auth.sol --solv 0.8.19 -t 3 --execution-timeout 150

# Property fuzzing
echidna contracts/echidna/EchidnaMain.sol --contract EchidnaMain \
  --config echidna.config.yaml
echidna contracts/echidna/EchidnaAuthGuarded.sol --contract EchidnaAuthGuarded \
  --config echidna.guarded.yaml

# Dynamic coverage
npx hardhat coverage
```

Raw output: `benchmarks/slither-*.json`, `benchmarks/solhint.txt`,
`benchmarks/echidna-corpus*/` (reproducers), `coverage/` (HTML).

Paper-ready CSV exports of the tables above (tool summary, OWASP coverage,
Echidna invariant verdicts): `npm run security:csv` →
`benchmarks/security_tools.csv`, `benchmarks/security_owasp.csv`,
`benchmarks/security_echidna.csv`. Keep in sync with this document when
re-running the tools.
