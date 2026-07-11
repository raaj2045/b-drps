/*
 * Section 7: storage growth -- the on-chain storage footprint as papers move
 * through the pipeline. Complements Section 5 (state-growth, which measures
 * GAS as a function of existing state): this section measures the BYTES the
 * contracts permanently occupy.
 *
 * Method: run N papers end-to-end, then account storage slots analytically
 * from the actual on-chain state using Solidity's storage-layout rules:
 *   - every struct field occupies >= 1 slot here (no two fields pack);
 *   - a string occupies 1 slot inline when < 32 bytes, else 1 slot +
 *     ceil(len/32) data slots;
 *   - a dynamic array adds 1 length slot (while non-empty);
 *   - active mapping entries add 1 slot each (index maps) or a full struct
 *     copy (Auth's address => MemberStruct mirrors).
 * State is walked through the paginated getters (queuePage/memberPage), so
 * the numbers reflect what is actually stored, not an estimate.
 *
 * Validation: for one paper's lifecycle the analytical slot delta is
 * cross-checked against a debug_traceTransaction SSTORE count (net slots
 * whose final value is non-zero) over all pipeline transactions.
 *
 * Local-only, valid cross-network: storage layout is EVM-deterministic.
 *
 * Run standalone:  npx hardhat run scripts/benchmark/storage-growth.js
 * Or as part of:   npm run benchmark
 */
const hre = require("hardhat");
const {
  fmtGas, setMining, deployAll, registerRolesWithGas, runPipelineOnce,
  writeSection, writeCsv,
} = require("./lib");

const STORAGE_GROWTH_NS = [1, 10, 50, 100];
const SLOT_BYTES = 32;

// ---- Solidity storage-layout slot accounting -----------------------------

// Zero-valued fields occupy no storage: the EVM never writes their slots.
function slotsForString(s) {
  const len = Buffer.byteLength(s, "utf8");
  if (len === 0) return 0;
  // < 32 bytes: stored inline in the field's slot. >= 32: the field slot
  // holds the length and ceil(len/32) keccak-addressed data slots hold bytes.
  return 1 + (len >= 32 ? Math.ceil(len / 32) : 0);
}

function slotsForAddress(a) {
  return /^0x0+$/.test(a) ? 0 : 1;
}

function slotsForUint(v) {
  return Number(v) === 0 ? 0 : 1;
}

// Main.PaperStruct: 5 strings, address, 2 strings, address = 9 base fields.
function slotsForMainPaper(p) {
  return (
    slotsForString(p.name) + slotsForString(p.email) +
    slotsForString(p.abstractofpaper) + slotsForString(p.papertitle) +
    slotsForString(p.linkofpaper) + slotsForAddress(p.authorAddress) +
    slotsForString(p.reviewofreviewer) + slotsForString(p.reviewofAE) +
    slotsForAddress(p.reviewerAddress)
  );
}

// Decision.PaperStruct: 5 strings, address, 3 strings = 9 base fields.
function slotsForDecisionPaper(p) {
  return (
    slotsForString(p.name) + slotsForString(p.email) +
    slotsForString(p.abstractofpaper) + slotsForString(p.papertitle) +
    slotsForString(p.linkofpaper) + slotsForAddress(p.authorAddress) +
    slotsForString(p.reviewofreviewer) + slotsForString(p.reviewofAE) +
    slotsForString(p.messagetoauthor)
  );
}

// Auth.MemberStruct: 3 strings, address, uint256 = 5 base fields.
function slotsForMember(m) {
  return (
    slotsForString(m.name) + slotsForString(m.role) +
    slotsForString(m.email) + slotsForAddress(m.userAddress) +
    slotsForUint(m.power)
  );
}

async function walkQueue(contract, id, slotsFor) {
  const len = Number(await contract.queueLength(id));
  let slots = len > 0 ? 1 : 0; // array length slot (occupied while non-empty)
  const PAGE = 50;
  for (let offset = 0; offset < len; offset += PAGE) {
    const page = await contract.queuePage(id, offset, PAGE);
    for (const p of page) slots += slotsFor(p);
  }
  return { len, slots };
}

// Main queue ids with an active address => index map (1 slot per live entry).
const MAIN_INDEXED_QUEUES = new Set([0, 2, 4, 6]);

async function accountMain(main) {
  let slots = 0;
  const queueLens = [];
  for (let id = 0; id < 8; id++) {
    const q = await walkQueue(main, id, slotsForMainPaper);
    queueLens.push(q.len);
    slots += q.slots;
    if (MAIN_INDEXED_QUEUES.has(id)) slots += q.len; // live index-map entries
  }
  // Shared staging struct: after a completed lifecycle it matches the last
  // finalized copy (reviews + reviewer address all set), i.e. the tail of
  // reviewedByAE (queue 7).
  const len7 = Number(await main.queueLength(7));
  if (len7 > 0) {
    const staged = await main.queuePage(7, len7 - 1, 1);
    slots += slotsForMainPaper(staged[0]);
  }
  return { slots, queueLens };
}

async function accountDecision(decision) {
  let slots = 0;
  for (let id = 0; id < 3; id++) {
    slots += (await walkQueue(decision, id, slotsForDecisionPaper)).slots;
  }
  const len2 = Number(await decision.queueLength(2));
  if (len2 > 0) {
    const staged = await decision.queuePage(2, len2 - 1, 1);
    slots += slotsForDecisionPaper(staged[0]);
  }
  return { slots };
}

async function accountAuth(auth) {
  let slots = 0;
  let members = 0;
  for (const pending of [false, true]) {
    const len = Number(await auth.memberCount(pending));
    if (len > 0) slots += 1; // array length slot
    const PAGE = 50;
    for (let offset = 0; offset < len; offset += PAGE) {
      const page = await auth.memberPage(pending, offset, PAGE);
      for (const m of page) {
        // Array entry + full struct copy in the address => MemberStruct
        // mirror mapping + 1 flag slot (memberExist / memberRequested);
        // pending entries also hold an indexFromRequest slot.
        slots += 2 * slotsForMember(m) + 1 + (pending ? 1 : 0);
      }
    }
    if (!pending) members = len;
  }
  return { slots, members };
}

// ---- SSTORE-trace cross-check (one lifecycle) -----------------------------

async function traceNetSlots(txHashes) {
  // final value per (to-address, slot); fresh contracts => prior values are 0.
  const finalVal = new Map();
  for (const { hash, to } of txHashes) {
    const trace = await hre.network.provider.send("debug_traceTransaction", [
      hash, { disableMemory: true, disableStorage: true },
    ]);
    for (const log of trace.structLogs) {
      if (log.op !== "SSTORE" || log.depth !== 1) continue;
      const stack = log.stack;
      const key = stack[stack.length - 1];
      const val = stack[stack.length - 2];
      finalVal.set(`${to}:${key}`, val);
    }
  }
  let net = 0;
  for (const v of finalVal.values()) {
    if (!/^0+$/.test(v)) net++;
  }
  return net;
}

async function runTracedLifecycle() {
  const ctx = await deployAll();
  await registerRolesWithGas(ctx);
  const { main, decision, eic, ae, reviewer, author } = ctx;
  const mainAddr = await main.getAddress();
  const decisionAddr = await decision.getAddress();

  const txs = [];
  async function send(target, addr, promise) {
    const tx = await promise;
    await tx.wait();
    txs.push({ hash: tx.hash, to: addr });
  }
  await send(main, mainAddr, main.connect(author).getPaperInfo(
    "Author 0", "au0@x.com",
    "An abstract describing the paper contents for benchmarking purposes.",
    "Benchmark Paper 0", "https://gateway.pinata.cloud/ipfs/Qm0", author.address));
  await send(main, mainAddr, main.connect(author).sendToEIC());
  await send(main, mainAddr, main.connect(eic).EICapproval(true));
  await send(main, mainAddr, main.connect(ae).AEapproval(true));
  await send(main, mainAddr, main.connect(reviewer).Reviewerapproval(
    true, "Looks good. Minor revisions suggested.", reviewer.address));
  await send(main, mainAddr, main.connect(ae).ReviewedByAE(true, "Concur with reviewer."));
  await send(decision, decisionAddr, decision.connect(eic).getPaperInfo(
    "Author 0", "au0@x.com",
    "An abstract describing the paper contents for benchmarking purposes.",
    "Benchmark Paper 0", "https://gateway.pinata.cloud/ipfs/Qm0",
    "Looks good. Minor revisions suggested.", "Concur with reviewer.",
    author.address));
  await send(decision, decisionAddr, decision.connect(eic).EICDecision(
    true, "Accepted for publication."));

  const traced = await traceNetSlots(txs);
  const analytical =
    (await accountMain(main)).slots + (await accountDecision(decision)).slots;
  return { traced, analytical };
}

// ---- sweep ----------------------------------------------------------------

async function run() {
  await setMining({ auto: true });

  console.log("  cross-check: tracing one lifecycle's SSTOREs...");
  const check = await runTracedLifecycle();
  console.log(`  trace-net slots: ${check.traced}, analytical: ${check.analytical}`);

  const rows = [];
  for (const N of STORAGE_GROWTH_NS) {
    const ctx = await deployAll();
    await registerRolesWithGas(ctx);
    for (let i = 0; i < N; i++) {
      await runPipelineOnce(ctx, i);
      if ((i + 1) % 50 === 0) console.log(`    N=${N}: ${i + 1}/${N} papers`);
    }
    const m = await accountMain(ctx.main);
    const d = await accountDecision(ctx.decision);
    const a = await accountAuth(ctx.auth);

    const paperSlots = m.slots + d.slots;
    const totalSlots = paperSlots + a.slots;
    // Copies retained per published paper across Main archives + Decision.
    const archivedCopies =
      m.queueLens.reduce((s, l) => s + l, 0) / N +
      2; /* Decision: Publishpaper + ReturnAuthor */
    rows.push({
      N,
      totalSlots,
      totalBytes: totalSlots * SLOT_BYTES,
      paperBytes: paperSlots * SLOT_BYTES,
      bytesPerPaper: Math.round((paperSlots * SLOT_BYTES) / N),
      copiesPerPaper: Number(archivedCopies.toFixed(1)),
      authBytes: a.slots * SLOT_BYTES,
      members: a.members,
    });
    console.log(
      `  N=${N}: total ${fmtGas(totalSlots)} slots (${fmtGas(totalSlots * SLOT_BYTES)} B), ` +
      `${fmtGas(rows[rows.length - 1].bytesPerPaper)} B/paper, ` +
      `${archivedCopies.toFixed(1)} copies/paper`);
  }
  return { rows, check };
}

// ---- output ----------------------------------------------------------------

function renderSection(data) {
  const { rows, check } = data;
  const lines = ["## 7. Storage growth (on-chain footprint)\n"];
  lines.push(
    "N papers are pushed end-to-end, then the storage the contracts occupy " +
    "is accounted slot-by-slot from actual on-chain state (walked via the " +
    "paginated getters) using Solidity's storage-layout rules — inline vs. " +
    "long strings, array length slots, live index-map entries, and Auth's " +
    "struct-mirror mappings. Bytes = slots × 32.\n"
  );
  lines.push(
    `> **Cross-checked against the EVM.** For one full lifecycle, a ` +
    `\`debug_traceTransaction\` count of net SSTOREs (slots left non-zero) ` +
    `gives **${check.traced} slots** vs. **${check.analytical}** from the ` +
    `analytical accounting${check.traced === check.analytical
      ? " — an exact match"
      : ` (Δ ${Math.abs(check.traced - check.analytical)})`}. ` +
    "Storage layout is EVM-deterministic, so these figures are " +
    "network-independent (local-only run, same rationale as Section 5).\n"
  );
  lines.push(
    "The pipeline archives a copy of the paper at every approval stage " +
    "(`approvedByEIC`, `approvedByAE`, `reviewedByReviewer`, `reviewedByAE`) " +
    "plus two copies in Decision (`Publishpaper`, `ReturnAuthor`) — the " +
    "`copies/paper` column quantifies this write amplification.\n"
  );
  lines.push("| N | Total slots | Total bytes | Bytes/paper | Copies/paper | Auth bytes (fixed roles) |");
  lines.push("|---:|---:|---:|---:|---:|---:|");
  for (const r of rows) {
    lines.push(
      `| ${r.N} | ${fmtGas(r.totalSlots)} | ${fmtGas(r.totalBytes)} | ` +
      `${fmtGas(r.bytesPerPaper)} | ${r.copiesPerPaper} | ${fmtGas(r.authBytes)} |`
    );
  }
  lines.push("\n![Storage growth](./figures/storage_growth.png)");
  lines.push("Raw data: [storage_growth.csv](./storage_growth.csv)");
  return lines.join("\n");
}

function writeCsvFile(data) {
  const rows = ["N,totalSlots,totalBytes,paperBytes,bytesPerPaper,copiesPerPaper,authBytes"];
  for (const r of data.rows) {
    rows.push(`${r.N},${r.totalSlots},${r.totalBytes},${r.paperBytes},` +
              `${r.bytesPerPaper},${r.copiesPerPaper},${r.authBytes}`);
  }
  writeCsv("storage_growth.csv", rows);
}

async function main() {
  console.log("[storage-growth] running...");
  const data = await run();
  writeCsvFile(data);
  writeSection("07-storage-growth", renderSection(data));
  console.log("[storage-growth] done");
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { run, renderSection, writeCsvFile, STORAGE_GROWTH_NS };
