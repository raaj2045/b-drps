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
   "0 High / 0 Medium / 0 Low; 58 informational. One Medium (locked-ether) found on an earlier revision and fixed."],
  ["Mythril", "0.24.8", "Symbolic execution",
   "No issues at -t 1 and -t 3 on all three contracts (bounded; --execution-timeout 150)."],
  ["Echidna", "2.3.2", "Property fuzzing",
   "2 invariants falsified (real bugs: EIC queue index corruption; member eviction) -- both fixed; all 7 invariants pass at 50k+ calls."],
  ["Solhint", "6.2.1", "Linter / SAST-lite",
   "0 errors, 114 warnings (all style/documentation)."],
  ["solidity-coverage", "toolbox", "Dynamic test coverage",
   "100% stmt / 100% func / 100% line / 98.81% branch over 43 passing tests."],
  ["SolidityScan", "Remix plugin (2026-07-11)", "SAST (cloud)",
   "No new exploitable findings. Free-tier summary: 33 finding titles (severities paywalled) -- 2 false positives (single-arg abi.encodePacked), rest map to known informational classes (NatSpec/style, gas optimization, floating pragma, boolean equality) already reported by Slither/Solhint."],
];

const OWASP = [
  ["SC01", "Access Control", "Yes", "Echidna; manual",
   "Pass", "P5 role modifiers on every pipeline action; F2 arbitrary-caller eviction fixed."],
  ["SC02", "Price Oracle Manipulation", "No", "-", "N/A", "No oracles or price feeds."],
  ["SC03", "Logic Errors", "Yes", "Echidna; tests",
   "Partial", "F1 queue index corruption fixed (4 queue invariants hold at 50k). Deferred: shared staging (SECURITY.md 4.1), Decision wrong-pop (4.4), no-op reject branches (4.2/4.3)."],
  ["SC04", "Lack of Input Validation", "Yes", "Echidna; manual",
   "Partial", "Deny/approve require a pending request (F2 fix); queue ops validate presence. Empty role string falls through to AUTHOR (benign, documented)."],
  ["SC05", "Reentrancy", "Yes", "Slither; Mythril", "Pass", "No external calls, no value transfer."],
  ["SC06", "Unchecked External Calls", "No", "Slither; Mythril", "Pass", "No .call/.send/.transfer present."],
  ["SC07", "Flash Loan Attacks", "No", "-", "N/A", "No DeFi/economic logic."],
  ["SC08", "Integer Overflow/Underflow", "Yes", "compiler; Mythril",
   "Pass", "Solidity 0.8 checked arithmetic; empty-queue pop reverts rather than wrapping."],
  ["SC09", "Insecure Randomness", "No", "-", "N/A", "No randomness used."],
  ["SC10", "Denial of Service", "Yes", "manual; Echidna",
   "Partial", "Unbounded array getters grow O(n) (pagination deferred). denyRequest griefing vector closed."],
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
  ["id", "category", "applies", "checkedBy", "status", "notes"], OWASP);
writeCsv("security_echidna.csv",
  ["harness", "invariant", "calls", "verdict", "notes"], ECHIDNA);
console.log("security CSVs written");
