/*
 * Exports the security-analysis results as paper-ready CSVs. The data below
 * is a structured transcription of benchmarks/SECURITY_ANALYSIS.md, which in
 * turn records the actual tool runs (Slither 0.11.5, Mythril 0.24.8, Echidna
 * 2.3.2, Solhint 6.2.1, solidity-coverage) -- see that file for reproduction
 * commands and raw output pointers. Keep the two in sync when re-running.
 *
 * Run:  node scripts/export-security-csv.js
 * Outputs: benchmarks/security_tools.csv
 *          benchmarks/security_owasp.csv
 *          benchmarks/security_echidna.csv
 */
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.resolve(__dirname, "..", "benchmarks");

const TOOLS = [
  ["Slither", "0.11.5", "SAST (static)",
   "No high, medium, or low vulnerabilities; 58 informational (style) findings. One medium finding (locked ether) on an earlier revision was fixed."],
  ["Mythril", "0.24.8", "Symbolic execution",
   "No vulnerabilities detected in any of the three contracts."],
  ["Echidna", "2.3.2", "Property fuzzing",
   "Found 2 real vulnerabilities (queue index corruption, member eviction); both fixed. All 7 invariants now pass at 50,000+ calls."],
  ["Solhint", "6.2.1", "Linter / SAST-lite",
   "No errors; 114 style and documentation warnings."],
  ["solidity-coverage", "toolbox", "Dynamic test coverage",
   "100% statement, function, and line coverage; 98.81% branch coverage (43 tests)."],
  ["SolidityScan", "Remix plugin (2026-07-11)", "SAST (cloud)",
   "No exploitable vulnerabilities; 33 informational findings (style, gas optimization, and 2 false positives)."],
];

const OWASP = [
  ["SC01 Access Control", "Mitigated",
   "Every state-changing action is gated by a role modifier (onlyAuthor, onlyEiC, onlyAE, onlyReviewer) that reads the caller's role from the Auth contract; membership can only be approved or denied by an existing member, and only for an address with a pending request. Verified by Echidna property fuzzing and access-control negative tests."],
  ["SC02 Price Oracle Manipulation", "Not applicable",
   "The system uses no price oracles or external data feeds, so there is nothing to manipulate."],
  ["SC03 Logic Errors", "Partially mitigated",
   "Queue integrity is enforced by per-queue index maps with guarded enqueue/dequeue helpers -- duplicate or absent entries revert instead of corrupting state -- and is verified by 4 Echidna invariants holding at 50,000+ randomized calls. Remaining documented deferrals: shared staging area (SECURITY.md 4.1), Decision wrong-pop (4.4), no-op reject branches (4.2/4.3)."],
  ["SC04 Lack of Input Validation", "Partially mitigated",
   "Approve/deny revert unless the target has a pending request; every queue operation reverts unless the paper is actually present. Remaining gap: an empty role string defaults to AUTHOR, the lowest-privilege role (benign, documented)."],
  ["SC05 Reentrancy", "Mitigated",
   "The contracts make no external calls and transfer no value, so no reentrancy surface exists; confirmed by Slither's and Mythril's reentrancy detectors."],
  ["SC06 Unchecked External Calls", "Mitigated",
   "No low-level .call, .send, or .transfer appears anywhere, so there are no external call results to leave unchecked."],
  ["SC07 Flash Loan Attacks", "Not applicable",
   "No DeFi or economic logic exists; borrowed capital confers no advantage in the editorial workflow."],
  ["SC08 Integer Overflow/Underflow", "Mitigated",
   "Solidity 0.8 checked arithmetic reverts on any overflow or underflow, and popping an empty queue reverts rather than wrapping; confirmed by Mythril's arithmetic detectors."],
  ["SC09 Insecure Randomness", "Not applicable",
   "The workflow is fully deterministic; no randomness is used anywhere."],
  ["SC10 Denial of Service", "Mitigated",
   "All state-changing paths are O(1) regardless of state size (state-growth benchmark flat through K=5,000); the denyRequest griefing vector is closed by the pending-request and authorization guards; and every list now has a bounded paginated getter (queueLength/queuePage on Main and Decision, memberCount/memberPage on Auth), so reads stay bounded at any array size."],
];

const ECHIDNA = [
  ["EchidnaMain", "echidna_eic_index_consistent", 50078, "passing",
   "Previously falsified in 2 calls (F1); fixed via sentinel index maps + guarded _enqueue/_dequeue."],
  ["EchidnaMain", "echidna_ae_index_consistent", 50078, "passing", "New invariant (post-fix)."],
  ["EchidnaMain", "echidna_reviewer_index_consistent", 50078, "passing", "New invariant (post-fix)."],
  ["EchidnaMain", "echidna_rbae_index_consistent", 50078, "passing", "New invariant (post-fix)."],
  ["EchidnaAuth", "echidna_request_index_consistent", 50051, "passing", ""],
  ["EchidnaAuth", "echidna_approved_flag_implies_entry", 50051, "passing", ""],
  ["EchidnaAuthGuarded", "echidna_count_matches", 50083, "passing",
   "Previously falsified (F2 member eviction); fixed via pending-request guard + state cleanup."],
];

function csvEscape(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(filename, header, rows) {
  const body = [header.join(","), ...rows.map((r) => r.map(csvEscape).join(","))];
  fs.writeFileSync(path.join(OUT_DIR, filename), body.join("\n") + "\n");
  console.log(`  -> benchmarks/${filename}`);
}

writeCsv("security_tools.csv",
  ["tool", "version", "category", "result"], TOOLS);
writeCsv("security_owasp.csv",
  ["owaspTop10", "riskAssessment", "implementationDetails"], OWASP);
writeCsv("security_echidna.csv",
  ["harness", "invariant", "calls", "verdict", "notes"], ECHIDNA);
console.log("security CSVs written");
