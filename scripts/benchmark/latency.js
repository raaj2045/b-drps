/*
 * Section 2: latency under Sepolia-like 12s block mining.
 * Slow by design (~5 min) -- each sample waits for a real block interval.
 * Run standalone:  npx hardhat run scripts/benchmark/latency.js
 * Or as part of:   npm run benchmark
 */
const {
  LATENCY_SAMPLES, SEPOLIA_BLOCK_TIME_S,
  setMining, deployAll, registerRolesWithGas,
  writeSection, writeNetworkCsv,
} = require("./lib");

async function run() {
  await setMining({ auto: false, intervalMs: SEPOLIA_BLOCK_TIME_S * 1000 });
  const ctx = await deployAll();
  await registerRolesWithGas(ctx);

  const samples = {
    request: [], approve: [], submit: [], EICapproval: [], EICDecision: [],
  };

  for (let i = 0; i < LATENCY_SAMPLES; i++) {
    const extra = ctx.rest[1 + i];

    let t0 = Date.now();
    await (await ctx.auth.connect(extra).addOrRequestMember(
      `Person${i}`, "REVIEWER", `p${i}@x.com`, extra.address, true)).wait();
    samples.request.push(Date.now() - t0);

    t0 = Date.now();
    await (await ctx.auth.connect(ctx.ae).approoveRequest(
      extra.address, ctx.ae.address)).wait();
    samples.approve.push(Date.now() - t0);
    console.log(`  auth sample ${i + 1}/${LATENCY_SAMPLES} done`);
  }

  for (let i = 0; i < LATENCY_SAMPLES; i++) {
    let t0 = Date.now();
    await (await ctx.main.connect(ctx.author).getPaperInfo(
      `A${i}`, `a${i}@x.com`, "abs", `Title ${i}`, `link${i}`, ctx.author.address)).wait();
    await (await ctx.main.connect(ctx.author).sendToEIC()).wait();
    samples.submit.push(Date.now() - t0);

    t0 = Date.now();
    await (await ctx.main.connect(ctx.eic).EICapproval(true)).wait();
    samples.EICapproval.push(Date.now() - t0);

    t0 = Date.now();
    await (await ctx.decision.connect(ctx.eic).getPaperInfo(
      `A${i}`, `a${i}@x.com`, "abs", `Title ${i}`, `link${i}`,
      "rev", "ae-rev", ctx.author.address)).wait();
    await (await ctx.decision.connect(ctx.eic).EICDecision(true, "Accept")).wait();
    samples.EICDecision.push(Date.now() - t0);
    console.log(`  pipeline sample ${i + 1}/${LATENCY_SAMPLES} done`);
  }

  // Restore instant mining for any follow-up sections.
  await setMining({ auto: true });

  const summary = {};
  for (const k of Object.keys(samples)) {
    const arr = samples[k];
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    summary[k] = {
      samples: arr.length,
      meanMs: Math.round(mean),
      minMs: Math.min(...arr),
      maxMs: Math.max(...arr),
    };
  }
  return summary;
}

function renderSection(data) {
  const lines = ["## 2. Latency under Sepolia-like 12s blocks\n"];
  lines.push(`Each row is ${LATENCY_SAMPLES} samples on an in-process node ` +
             `with interval mining at ${SEPOLIA_BLOCK_TIME_S}s.\n`);
  lines.push("| Operation | Samples | Mean (ms) | Min (ms) | Max (ms) |");
  lines.push("|---|---:|---:|---:|---:|");
  for (const [k, v] of Object.entries(data)) {
    lines.push(`| ${k} | ${v.samples} | ${v.meanMs} | ${v.minMs} | ${v.maxMs} |`);
  }
  lines.push("\n![Latency by operation](./figures/latency.png)");
  lines.push("Raw data: [latency.csv](./latency.csv)");
  return lines.join("\n");
}

function writeCsvFile(data) {
  const rows = Object.entries(data).map(
    ([k, v]) => `${k},${v.samples},${v.meanMs},${v.minMs},${v.maxMs}`
  );
  writeNetworkCsv("latency.csv", "operation,samples,meanMs,minMs,maxMs", rows);
}

async function main() {
  console.log("[latency] running (slow -- 12s blocks)...");
  const data = await run();
  writeCsvFile(data);
  writeSection("02-latency", renderSection(data));
  console.log("[latency] done");
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { run, renderSection, writeCsvFile };
