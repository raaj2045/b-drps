/*
 * Shared helpers and constants for the benchmark suite. Imported by every
 * scripts/benchmark/*.js section script.
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const OUT_DIR = path.resolve(__dirname, "..", "..", "benchmarks");
const SECTIONS_DIR = path.join(OUT_DIR, "sections");
const CACHE_DIR = path.join(OUT_DIR, ".cache");

// Sepolia parameters used for analytical TPS / latency conversion.
const SEPOLIA_BLOCK_GAS_LIMIT = 30_000_000;
const SEPOLIA_BLOCK_TIME_S = 12.242;

const SCALABILITY_NS = [1, 10, 50, 100, 500];
const STATE_GROWTH_KS = [10, 100, 1000, 5000];

function fmtGas(n) {
  return n.toLocaleString("en-US");
}

function networkLabel() {
  return process.env.FORK_SEPOLIA ? "sepoliaFork" : "local";
}

function isAppend() {
  return Boolean(process.env.BENCH_APPEND);
}

async function getReceipt(tx) {
  return await tx.wait();
}

async function setMining({ auto, intervalMs }) {
  await hre.network.provider.send("evm_setAutomine", [auto]);
  await hre.network.provider.send("evm_setIntervalMining", [
    auto ? 0 : intervalMs,
  ]);
}

// Deterministic synthetic address from an integer index. Used only as a
// struct field / mapping key when pre-seeding state -- never as msg.sender,
// so it does not need a private key.
function syntheticAddress(i) {
  return "0x" + (i + 1).toString(16).padStart(40, "0");
}

async function deployAll() {
  const [journal, eic, ae, reviewer, author, ...rest] =
    await hre.ethers.getSigners();
  const Auth = await hre.ethers.getContractFactory("Auth");
  const auth = await Auth.deploy();
  const authReceipt = await auth.deploymentTransaction().wait();
  await auth.waitForDeployment();

  // Main and Decision take the Auth address (P5 role gating).
  const authAddress = await auth.getAddress();
  const Main = await hre.ethers.getContractFactory("Main");
  const main = await Main.deploy(authAddress);
  const mainReceipt = await main.deploymentTransaction().wait();
  await main.waitForDeployment();

  const Decision = await hre.ethers.getContractFactory("Decision");
  const decision = await Decision.deploy(authAddress);
  const decisionReceipt = await decision.deploymentTransaction().wait();
  await decision.waitForDeployment();

  return {
    auth, main, decision,
    journal, eic, ae, reviewer, author, rest,
    deploymentGas: {
      Auth: Number(authReceipt.gasUsed),
      Main: Number(mainReceipt.gasUsed),
      Decision: Number(decisionReceipt.gasUsed),
    },
  };
}

// Bootstraps JOURNAL -> EIC -> AE -> REVIEWER -> AUTHOR while capturing the
// gas of every distinct call type so the gas section can show each in
// isolation. Used by every section that needs a working hierarchy.
async function registerRolesWithGas(ctx) {
  const { auth, journal, eic, ae, reviewer, author } = ctx;
  const gas = {};

  const r0 = await getReceipt(
    await auth.connect(journal).addOrRequestMember(
      "Journal Inc", "JOURNAL", "j@x.com", journal.address, true
    )
  );
  gas.addJournalDirect = Number(r0.gasUsed);

  const r1 = await getReceipt(
    await auth.connect(eic).addOrRequestMember(
      "E. I. Chief", "EIC", "e@x.com", eic.address, true
    )
  );
  gas.requestMember = Number(r1.gasUsed);

  const r2 = await getReceipt(
    await auth.connect(journal).approoveRequest(eic.address, journal.address)
  );
  gas.approveRequest = Number(r2.gasUsed);

  await getReceipt(await auth.connect(ae).addOrRequestMember(
    "Assoc Editor", "AE", "a@x.com", ae.address, true));
  await getReceipt(await auth.connect(eic).approoveRequest(ae.address, eic.address));
  await getReceipt(await auth.connect(reviewer).addOrRequestMember(
    "Reviewer", "REVIEWER", "r@x.com", reviewer.address, true));
  await getReceipt(await auth.connect(ae).approoveRequest(reviewer.address, ae.address));
  await getReceipt(await auth.connect(author).addOrRequestMember(
    "Author", "AUTHOR", "au@x.com", author.address, true));
  await getReceipt(await auth.connect(ae).approoveRequest(author.address, ae.address));

  const denyTarget = ctx.rest[0];
  await getReceipt(await auth.connect(denyTarget).addOrRequestMember(
    "Denied", "REVIEWER", "d@x.com", denyTarget.address, true));
  const r3 = await getReceipt(
    await auth.connect(ae).denyRequest(denyTarget.address)
  );
  gas.denyRequest = Number(r3.gasUsed);

  return gas;
}

// Runs one paper through the full Auth -> Main -> Decision pipeline,
// returning gas per step. Used by gas, scalability, and (internally) the
// throughput section.
async function runPipelineOnce(ctx, paperIdx) {
  const { main, decision, eic, ae, reviewer, author } = ctx;
  const gas = {};

  const paperInfo = [
    `Author ${paperIdx}`,
    `au${paperIdx}@x.com`,
    "An abstract describing the paper contents for benchmarking purposes.",
    `Benchmark Paper ${paperIdx}`,
    `https://gateway.pinata.cloud/ipfs/Qm${paperIdx}`,
    author.address,
  ];

  gas.getPaperInfo = Number((await getReceipt(
    await main.connect(author).getPaperInfo(...paperInfo)
  )).gasUsed);
  gas.sendToEIC = Number((await getReceipt(
    await main.connect(author).sendToEIC()
  )).gasUsed);
  gas.EICapproval = Number((await getReceipt(
    await main.connect(eic).EICapproval(true)
  )).gasUsed);
  gas.AEapproval = Number((await getReceipt(
    await main.connect(ae).AEapproval(true)
  )).gasUsed);
  gas.Reviewerapproval = Number((await getReceipt(
    await main.connect(reviewer).Reviewerapproval(
      true, "Looks good. Minor revisions suggested.", reviewer.address
    )
  )).gasUsed);
  gas.ReviewedByAE = Number((await getReceipt(
    await main.connect(ae).ReviewedByAE(true, "Concur with reviewer.")
  )).gasUsed);
  gas.decisionGetPaperInfo = Number((await getReceipt(
    await decision.connect(eic).getPaperInfo(
      paperInfo[0], paperInfo[1], paperInfo[2], paperInfo[3], paperInfo[4],
      "Looks good. Minor revisions suggested.",
      "Concur with reviewer.",
      author.address
    )
  )).gasUsed);
  gas.EICDecision = Number((await getReceipt(
    await decision.connect(eic).EICDecision(true, "Accepted for publication.")
  )).gasUsed);

  return gas;
}

// Section MD output helpers. Each section writes its own `sections/<name>.md`
// which scripts/benchmark/all.js concatenates into BENCHMARK_REPORT.md.
function writeSection(name, body) {
  fs.mkdirSync(SECTIONS_DIR, { recursive: true });
  fs.writeFileSync(path.join(SECTIONS_DIR, `${name}.md`), body);
  console.log(`  -> sections/${name}.md`);
}

function writeCsv(filename, lines) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, filename), lines.join("\n") + "\n");
  console.log(`  -> ${filename}`);
}

// Network-aware CSV writer. `header` and `rows` are WITHOUT the network column;
// this prepends "network" / the active label. On the local pass it truncates
// and writes header + rows; on the appending fork pass it appends rows only
// (assuming the header already matches). One file ends up with a `network`
// column and one row-block per network.
function writeNetworkCsv(filename, header, rows) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const label = networkLabel();
  const full = path.join(OUT_DIR, filename);
  const bodyRows = rows.map((r) => `${label},${r}`);
  if (isAppend() && fs.existsSync(full)) {
    fs.appendFileSync(full, bodyRows.join("\n") + "\n");
    console.log(`  -> ${filename} (appended ${label})`);
  } else {
    fs.writeFileSync(full, [`network,${header}`, ...bodyRows].join("\n") + "\n");
    console.log(`  -> ${filename} (${label})`);
  }
}

// JSON cache for cross-section dependencies (throughput needs gas numbers).
// Standalone runs of dependent sections fall back to recomputing.
function writeCache(name, data) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, `${name}.json`), JSON.stringify(data, null, 2));
}

function readCache(name) {
  const p = path.join(CACHE_DIR, `${name}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

module.exports = {
  OUT_DIR, SECTIONS_DIR, CACHE_DIR,
  SEPOLIA_BLOCK_GAS_LIMIT, SEPOLIA_BLOCK_TIME_S,
  SCALABILITY_NS, STATE_GROWTH_KS,
  fmtGas, networkLabel, isAppend, getReceipt, setMining, syntheticAddress,
  deployAll, registerRolesWithGas, runPipelineOnce,
  writeSection, writeCsv, writeNetworkCsv, writeCache, readCache,
};
