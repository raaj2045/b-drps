/*
 * Section 1: gas per operation. Single deterministic sample per op.
 * Run standalone:  npx hardhat run scripts/benchmark/gas.js
 * Or as part of:   npm run benchmark
 */
const {
  fmtGas, setMining, deployAll, registerRolesWithGas, runPipelineOnce,
  writeSection, writeCache, writeCsv,
} = require("./lib");

const LIFECYCLE_LABELS = {
  getPaperInfo: "Author: getPaperInfo",
  sendToEIC: "Author: sendToEIC",
  EICapproval: "EIC: approval",
  AEapproval: "AE: approval",
  Reviewerapproval: "Reviewer: review",
  ReviewedByAE: "AE: final remarks",
  decisionGetPaperInfo: "Decision: getPaperInfo",
  EICDecision: "EIC: decision",
};

async function run() {
  await setMining({ auto: true });
  const ctx = await deployAll();
  const authGas = await registerRolesWithGas(ctx);
  const pipelineGas = await runPipelineOnce(ctx, 1);
  return {
    deployment: ctx.deploymentGas,
    auth: authGas,
    pipeline: pipelineGas,
  };
}

function renderSection(data) {
  const lines = ["## 1. Gas per operation\n"];
  lines.push("### Deployment\n");
  lines.push("| Contract | Gas used |");
  lines.push("|---|---:|");
  for (const [k, v] of Object.entries(data.deployment)) {
    lines.push(`| ${k} | ${fmtGas(v)} |`);
  }
  lines.push("\n### Auth operations\n");
  lines.push("| Operation | Gas used |");
  lines.push("|---|---:|");
  for (const [k, v] of Object.entries(data.auth)) {
    lines.push(`| ${k} | ${fmtGas(v)} |`);
  }
  lines.push("\n### Main + Decision pipeline\n");
  lines.push("| Operation | Gas used |");
  lines.push("|---|---:|");
  for (const [k, v] of Object.entries(data.pipeline)) {
    lines.push(`| ${k} | ${fmtGas(v)} |`);
  }
  return lines.join("\n");
}

// gas.csv: every write op, flat, with its category. Source for cost plots.
function writeGasCsv(data) {
  const csv = ["category,operation,gas"];
  for (const [k, v] of Object.entries(data.deployment)) {
    csv.push(`deployment,${k},${v}`);
  }
  for (const [k, v] of Object.entries(data.auth)) {
    csv.push(`auth,${k},${v}`);
  }
  for (const [k, v] of Object.entries(data.pipeline)) {
    csv.push(`pipeline,${k},${v}`);
  }
  writeCsv("gas.csv", csv);
}

// lifecycle.csv: the ordered single-paper journey with running total. Source
// for the cumulative-gas waterfall figure.
function writeLifecycleCsv(data) {
  const csv = ["step,operation,label,gas,cumulativeGas"];
  let cumulative = 0;
  let step = 1;
  for (const [k, label] of Object.entries(LIFECYCLE_LABELS)) {
    const gas = data.pipeline[k];
    if (gas === undefined) continue;
    cumulative += gas;
    csv.push(`${step},${k},${label},${gas},${cumulative}`);
    step += 1;
  }
  writeCsv("lifecycle.csv", csv);
}

async function main() {
  console.log("[gas] running...");
  const data = await run();
  writeCache("gas", data);
  writeGasCsv(data);
  writeLifecycleCsv(data);
  writeSection("01-gas", renderSection(data));
  console.log("[gas] done");
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { run, renderSection, writeGasCsv, writeLifecycleCsv };
