/*
 * Section 4: scalability sweep -- push N papers end-to-end through
 * Auth->Main->Decision, recording total + mean gas and wall-clock per N.
 * Run standalone:  npx hardhat run scripts/benchmark/scalability.js
 * Or as part of:   npm run benchmark
 */
const {
  SCALABILITY_NS,
  fmtGas, setMining, deployAll, registerRolesWithGas, runPipelineOnce,
  writeSection, writeCsv,
} = require("./lib");

async function run() {
  await setMining({ auto: true });
  const rows = [];
  for (const N of SCALABILITY_NS) {
    const ctx = await deployAll();
    await registerRolesWithGas(ctx);

    const t0 = Date.now();
    let totalGas = 0;
    const progressEvery = N >= 100 ? 100 : N;
    for (let i = 0; i < N; i++) {
      const g = await runPipelineOnce(ctx, i);
      for (const v of Object.values(g)) totalGas += v;
      if ((i + 1) % progressEvery === 0 && i + 1 < N) {
        console.log(`    N=${N}: ${i + 1}/${N} papers processed`);
      }
    }
    const elapsed = Date.now() - t0;
    rows.push({
      N,
      totalGas,
      meanGasPerPaper: Math.round(totalGas / N),
      wallClockMs: elapsed,
      meanMsPerPaper: Math.round(elapsed / N),
    });
    console.log(`  N=${N}: totalGas=${fmtGas(totalGas)}, wallClock=${elapsed}ms`);
  }
  return rows;
}

function renderSection(data) {
  const lines = ["## 4. Scalability\n"];
  lines.push("Full Auth->Main->Decision pipeline run for N papers.\n");
  lines.push("| N | Total gas | Mean gas / paper | Wall-clock (ms) | Mean ms / paper |");
  lines.push("|---:|---:|---:|---:|---:|");
  for (const r of data) {
    lines.push(
      `| ${r.N} | ${fmtGas(r.totalGas)} | ${fmtGas(r.meanGasPerPaper)} | ` +
      `${fmtGas(r.wallClockMs)} | ${r.meanMsPerPaper} |`
    );
  }
  lines.push("\n![Pipeline scalability vs N](./figures/scalability.png)");
  lines.push("Raw data: [scalability.csv](./scalability.csv)");
  return lines.join("\n");
}

function writeCsvFile(rows) {
  const csv = ["N,totalGas,meanGasPerPaper,wallClockMs,meanMsPerPaper"];
  for (const r of rows) {
    csv.push(`${r.N},${r.totalGas},${r.meanGasPerPaper},${r.wallClockMs},${r.meanMsPerPaper}`);
  }
  writeCsv("scalability.csv", csv);
}

async function main() {
  console.log("[scalability] running...");
  const data = await run();
  writeCsvFile(data);
  writeSection("04-scalability", renderSection(data));
  console.log("[scalability] done");
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { run, renderSection, writeCsvFile };
