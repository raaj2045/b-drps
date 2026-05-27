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
| **Echidna** | 2.3.2 | Property fuzzing (dynamic) | User-defined state invariants under randomized multi-transaction call sequences | **2 invariants falsified** (real bugs) + 2 held. See findings below. |
| **Solhint** | 6.2.1 | Linter / SAST-lite | Security rules (compiler version, visibility, tx.origin, low-level calls) + style | **0 errors, 114 warnings** — all style/documentation. |
| **solidity-coverage** | (toolbox) | Dynamic (test coverage) | Statement / branch / function / line coverage of the test suite | **100% stmt, 100% func, 100% line, 94.44% branch** over 27 passing tests. |

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

## Findings from property fuzzing (Echidna)

### F1 — EIC queue index corruption (Main) · OWASP SC03 Logic Errors

Invariant `echidna_eic_index_consistent` (every queued paper's
`indexFromEIC[author]` points back to its slot) was **falsified in 2 calls**:

```
sendToEIC()
sendToEIC()
```

Two submissions sharing an author (here `address(0)` from the shared
`instanceofPaperStruct`) overwrite the same `indexFromEIC` slot, so the first
paper's index pointer becomes stale. A later `EICapproval` then shuffle-pops
the wrong queue entry. This is the concrete manifestation of the deferred
"operations select papers from a shared scratchpad, not by ID" issue.

### F2 — Unguarded `denyRequest` evicts an unrelated member (Auth) · OWASP SC01/SC04

Invariant `echidna_count_matches` (requested-array length equals the number of
genuinely requested members) was **falsified**:

```
reqUser(0)    // request member A
denyUser(1)   // deny member B, who was never requested
```

`denyRequest` does not verify the target is actually in the requested queue.
Called for a non-requested address it reads `indexFromRequest[addr] == 0` and
swap-pops slot 0 — evicting an unrelated pending member (data loss). With no
access control, any address can trigger this.

### Invariants that held

`echidna_request_index_consistent` and `echidna_approved_flag_implies_entry`
(Auth) held over 50,000+ calls: the index map itself never desynchronizes under
*valid* use, because misuse paths revert rather than corrupting the map.

## OWASP Smart Contract Top 10 (2025) coverage

The contract review targets the OWASP **Smart Contract** Top 10. (The classic
OWASP Web Top 10 applies to the off-chain React dApp frontend and is out of
scope here.)

| # | Category | Applies? | Checked by | Status |
|---|---|---|---|---|
| SC01 | Access Control | **Yes** | Echidna, manual | ❌ **Finding** — no role modifiers; any address can call `EICapproval`/`AEapproval`/`Reviewerapproval`/`denyRequest`/`EICDecision`. Echidna F2 demonstrates arbitrary-caller eviction. |
| SC02 | Price Oracle Manipulation | No | — | N/A — no oracles/price feeds |
| SC03 | Logic Errors | **Yes** | Echidna, tests | ❌ **Finding** — shared `instanceofPaperStruct`; `Decision.EICDecision` pops the last queue element, not the decided paper; reject branches are no-ops. Echidna F1 falsified queue consistency. |
| SC04 | Lack of Input Validation | **Yes** | Echidna, manual | ❌ **Finding** — `denyRequest`/`approoveRequest` don't verify the target was requested; `addOrRequestMember` accepts empty role. |
| SC05 | Reentrancy | Yes | Slither, Mythril | ✅ Pass — no external calls, no value transfer |
| SC06 | Unchecked External Calls | No | Slither, Mythril | ✅ Pass — no `.call`/`.send`/`.transfer` present |
| SC07 | Flash Loan Attacks | No | — | N/A — no DeFi/economic logic |
| SC08 | Integer Overflow/Underflow | Yes | compiler, Mythril | ✅ Pass — Solidity 0.8 checked arithmetic; empty-queue pop reverts rather than wrapping |
| SC09 | Insecure Randomness | No | — | N/A — no randomness used |
| SC10 | Denial of Service | **Yes** | manual, Echidna | ⚠️ **Partial** — unbounded array getters (`getApprovedOrRequestedMember`, `getRecievedByEIC`, …) grow O(n); griefing via unguarded `denyRequest` |

**Summary: 4 applicable categories with findings/partials (SC01, SC03, SC04,
SC10), 3 clean passes (SC05, SC06, SC08), 3 not applicable.** Findings cluster
on access control and state-machine logic.

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
| Shared paper scratchpad / queue corruption | SC03 | Echidna F1 | Deferred (P5 — requires ABI change) |
| No role-based access control | SC01 | Echidna F2, manual | Deferred (P5) |
| Missing input validation on deny/approve | SC04 | Echidna F2 | Deferred (P5) |
| `Decision.EICDecision` wrong-pop | SC03 | manual, tests | Deferred (P5) |
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
