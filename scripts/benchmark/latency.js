/*
 * Section 2: latency decomposition under a mainnet-like composite delay model.
 *
 * Each operation is sampled over 50 transactions. Per sample the end-to-end
 * confirmation latency is decomposed into three components:
 *
 *   execution      MEASURED  -- wall-clock of the real EVM transaction
 *                               (send -> receipt) on the in-process node
 *   propagation    SIMULATED -- network propagation + mempool queueing +
 *                               occasional congestion spikes:
 *                                 Gaussian(mean=150ms, sigma=40ms)   [Box-Muller]
 *                               + Exponential(mean=50ms)             [queueing]
 *                               + 10% chance: Pareto(scale=50, alpha=3) [spike]
 *   blockInclusion SIMULATED -- Gaussian(mean=12000ms, sigma=2000ms), i.e. a
 *                               12s +/- 2s block-inclusion wait matching
 *                               Sepolia's observed block cadence
 *
 *   total = execution + propagation + blockInclusion
 *
 * HONESTY LABEL: only the `execution` component is a measurement; propagation
 * and blockInclusion are drawn from the parametric model above (label
 * `mainnet-sim`), seeded for reproducibility. No claim of measured mainnet or
 * testnet latency is made.
 *
 * Run standalone:  npx hardhat run scripts/benchmark/latency.js
 * Or as part of:   npm run benchmark
 */
const {
  SEPOLIA_BLOCK_TIME_S,
  setMining, deployAll, registerRolesWithGas, getReceipt,
  writeSection, writeCsv,
} = require("./lib");

const LATENCY_SAMPLES = 50;
// The CSV's network label: execution is measured locally, the delay model is
// parameterized for a mainnet-like chain -- hence "mainnet-sim", not a claim
// of measured mainnet data.
const NETWORK_LABEL = "mainnet-sim";
const RNG_SEED = 42;

// Propagation / inclusion model parameters (ms).
const PROP_GAUSS_MEAN = 150;
const PROP_GAUSS_SIGMA = 40;
const QUEUE_EXP_MEAN = 50;
const SPIKE_PROBABILITY = 0.10;
const SPIKE_PARETO_SCALE = 50;
const SPIKE_PARETO_ALPHA = 3;
const INCLUSION_GAUSS_MEAN = 12000;
const INCLUSION_GAUSS_SIGMA = 2000;

// ---- seeded RNG (mulberry32) + distribution samplers --------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSamplers(rng) {
  // Box-Muller transform; regenerates on the (measure-zero) u1 = 0 draw.
  function gaussian(mean, sigma) {
    let u1 = 0;
    while (u1 === 0) u1 = rng();
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + sigma * z;
  }
  function exponential(mean) {
    let u = 0;
    while (u === 0) u = rng();
    return -mean * Math.log(u);
  }
  function pareto(scale, alpha) {
    let u = 0;
    while (u === 0) u = rng();
    return scale / Math.pow(u, 1 / alpha);
  }
  return {
    propagation() {
      let d = gaussian(PROP_GAUSS_MEAN, PROP_GAUSS_SIGMA)
            + exponential(QUEUE_EXP_MEAN);
      if (rng() < SPIKE_PROBABILITY) d += pareto(SPIKE_PARETO_SCALE, SPIKE_PARETO_ALPHA);
      return Math.max(0, d);
    },
    blockInclusion() {
      return Math.max(0, gaussian(INCLUSION_GAUSS_MEAN, INCLUSION_GAUSS_SIGMA));
    },
  };
}

// ---- statistics ----------------------------------------------------------

function percentile(sorted, p) {
  // Nearest-rank on a pre-sorted array.
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function stats(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    meanMs: Math.round(mean),
    p95Ms: Math.round(percentile(sorted, 95)),
    p99Ms: Math.round(percentile(sorted, 99)),
    minMs: Math.round(sorted[0]),
    maxMs: Math.round(sorted[sorted.length - 1]),
  };
}

// ---- measurement ---------------------------------------------------------

async function timed(txPromise) {
  const t0 = Date.now();
  await getReceipt(await txPromise);
  return Date.now() - t0;
}

// One full Auth -> Main -> Decision pass, returning measured execution ms per
// operation. `extra` is a fresh, never-registered signer for the auth steps.
async function measureIteration(ctx, i, extra) {
  const e = {};
  e.registerRequest = await timed(ctx.auth.connect(extra).addOrRequestMember(
    `Person${i}`, "REVIEWER", `p${i}@x.com`, extra.address, true));
  e.approveRequest = await timed(
    ctx.auth.connect(ctx.ae).approoveRequest(extra.address, ctx.ae.address));

  e.submitPaper =
    (await timed(ctx.main.connect(ctx.author).getPaperInfo(
      `A${i}`, `a${i}@x.com`, "abs", `Title ${i}`, `link${i}`, ctx.author.address))) +
    (await timed(ctx.main.connect(ctx.author).sendToEIC()));
  e.EICapproval = await timed(ctx.main.connect(ctx.eic).EICapproval(true));
  e.AEapproval = await timed(ctx.main.connect(ctx.ae).AEapproval(true));
  e.Reviewerapproval = await timed(ctx.main.connect(ctx.reviewer).Reviewerapproval(
    true, "Looks good.", ctx.reviewer.address));
  e.ReviewedByAE = await timed(ctx.main.connect(ctx.ae).ReviewedByAE(true, "Concur."));

  e.EICDecision =
    (await timed(ctx.decision.connect(ctx.eic).getPaperInfo(
      `A${i}`, `a${i}@x.com`, "abs", `Title ${i}`, `link${i}`,
      "Looks good.", "Concur.", ctx.author.address))) +
    (await timed(ctx.decision.connect(ctx.eic).EICDecision(true, "Accept")));
  return e;
}

const OPERATIONS = [
  "registerRequest", "approveRequest", "submitPaper", "EICapproval",
  "AEapproval", "Reviewerapproval", "ReviewedByAE", "EICDecision",
];

async function run() {
  await setMining({ auto: true });
  const N = LATENCY_SAMPLES;
  console.log(`  measuring execution over ${N} full pipeline passes...`);
  const ctx = await deployAll();
  await registerRolesWithGas(ctx);
  const sim = makeSamplers(mulberry32(RNG_SEED));

  const exec = Object.fromEntries(OPERATIONS.map((op) => [op, []]));
  for (let i = 0; i < N; i++) {
    const extra = ctx.rest[1 + i];
    const e = await measureIteration(ctx, i, extra);
    for (const op of OPERATIONS) exec[op].push(e[op]);
    if ((i + 1) % 10 === 0) console.log(`    ${i + 1}/${N} passes done`);
  }

  const results = []; // { op, components: {execution, propagation, blockInclusion, total} }
  for (const op of OPERATIONS) {
    const execution = exec[op];
    const propagation = execution.map(() => sim.propagation());
    const blockInclusion = execution.map(() => sim.blockInclusion());
    const total = execution.map((ms, j) => ms + propagation[j] + blockInclusion[j]);
    results.push({
      op,
      components: {
        execution: stats(execution),
        propagation: stats(propagation),
        blockInclusion: stats(blockInclusion),
        total: stats(total),
      },
    });
  }
  return results;
}

// ---- output --------------------------------------------------------------

const COMPONENT_SOURCE = {
  execution: "measured",
  propagation: "mainnet-sim",
  blockInclusion: "mainnet-sim",
  total: "composite",
};

function renderSection(data) {
  const lines = ["## 2. Latency decomposition (composite mainnet-sim model)\n"];
  lines.push(
    `Per-operation confirmation latency over ${LATENCY_SAMPLES} transactions, ` +
    "decomposed into **measured EVM execution** (wall-clock send→receipt on " +
    "the in-process node) plus **simulated** network components:\n"
  );
  lines.push(
    "- `propagation` = Gaussian(150 ms, σ 40 ms) [Box-Muller] + " +
    "Exponential(mean 50 ms) queueing + 10% Pareto(scale 50, α 3) congestion spike");
  lines.push(
    "- `blockInclusion` = Gaussian(12,000 ms, σ 2,000 ms) — a 12 s ± 2 s " +
    `inclusion wait, mean matching Sepolia's observed ${SEPOLIA_BLOCK_TIME_S}s ` +
    "block cadence (see Methodology)");
  lines.push("- `total` = execution + propagation + blockInclusion\n");
  lines.push(
    "> **Honesty label.** Only `execution` is a measurement. `propagation` " +
    "and `blockInclusion` are drawn from the parametric model above " +
    "(network label `" + NETWORK_LABEL + "`), with a seeded RNG (seed " +
    RNG_SEED + ") so runs are reproducible. This is **not** measured " +
    "mainnet/testnet latency.\n"
  );

  lines.push("| Operation | Component | Source | Mean (ms) | P95 (ms) | P99 (ms) | Min (ms) | Max (ms) |");
  lines.push("|---|---|---|---:|---:|---:|---:|---:|");
  for (const r of data) {
    for (const [comp, s] of Object.entries(r.components)) {
      const opCell = comp === "execution" ? `**${r.op}**` : "";
      lines.push(
        `| ${opCell} | ${comp} | ${COMPONENT_SOURCE[comp]} | ` +
        `${s.meanMs.toLocaleString("en-US")} | ${s.p95Ms.toLocaleString("en-US")} | ` +
        `${s.p99Ms.toLocaleString("en-US")} | ${s.minMs.toLocaleString("en-US")} | ` +
        `${s.maxMs.toLocaleString("en-US")} |`
      );
    }
  }
  lines.push("");
  lines.push("![Latency decomposition](./figures/latency_decomposition.png)");
  lines.push("Raw data: [latency.csv](./latency.csv)");
  return lines.join("\n");
}

function writeCsvFile(data) {
  const rows = [`network,operation,component,meanMs,p95Ms,p99Ms,minMs,maxMs`];
  for (const r of data) {
    for (const [comp, s] of Object.entries(r.components)) {
      rows.push(
        `${NETWORK_LABEL},${r.op},${comp},` +
        `${s.meanMs},${s.p95Ms},${s.p99Ms},${s.minMs},${s.maxMs}`
      );
    }
  }
  writeCsv("latency.csv", rows);
}

async function main() {
  console.log("[latency] running...");
  const data = await run();
  writeCsvFile(data);
  writeSection("02-latency", renderSection(data));
  console.log("[latency] done");
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { run, renderSection, writeCsvFile, LATENCY_SAMPLES };
