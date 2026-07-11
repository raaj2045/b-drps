/*
 * Runs every benchmark section in order and writes the unified
 * benchmarks/BENCHMARK_REPORT.md by concatenating each section's output.
 * Run:  npm run benchmark
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const {
  OUT_DIR, SECTIONS_DIR,
  SEPOLIA_BLOCK_GAS_LIMIT, SEPOLIA_BLOCK_TIME_S,
  writeCache, writeSection, networkLabel,
} = require("./lib");

const gas = require("./gas");
const latency = require("./latency");
const throughput = require("./throughput");
const scalability = require("./scalability");
const stateGrowth = require("./state-growth");
const parallel = require("./parallel");

function reportHeader() {
  const label = networkLabel();
  const authoritative =
    "Sections 1 and 3 and the lifecycle are **dual-network** (`local` + " +
    "`sepoliaFork` row-blocks); their per-operation gas tables are " +
    "byte-for-byte identical across networks (Section 1, and " +
    "`figures/gas_network_compare.png`), so the local measurements equal the " +
    "real-Sepolia-state ones. Sections 2 and 4–6 are **local-only by design** — see " +
    "the note in each. Tables are network-independent wherever gas-derived; " +
    "wall-clock columns reflect local execution and are not cross-network " +
    `meaningful. (This pass ran on \`${label}\`.)`;
  return [
    "# Benchmark Report",
    "",
    `_Generated: ${new Date().toISOString()} · network: ${label}_`,
    "",
    "## Methodology",
    "",
    "Measurements run on the in-process Hardhat network in two passes: a " +
    "**local** pass (fast, offline) and a **sepoliaFork** pass that forks real " +
    "Sepolia state at the pinned block (see README / CHANGELOG). The EVM is " +
    "deterministic, so gas-per-operation is identical across both — the fork " +
    "validates the local numbers against real-network parameters rather than " +
    "changing them. Latency, throughput, and scalability depend on block " +
    `cadence and gas limit (${SEPOLIA_BLOCK_TIME_S}s block interval, ` +
    `${SEPOLIA_BLOCK_GAS_LIMIT.toLocaleString()} gas/block).`,
    "",
    authoritative,
    "",
    "Every CSV in this directory carries a `network` column with one row-block " +
    "per network; the figures (`figures/`) compare them. Sections run " +
    "independently via `npm run benchmark:<section>`; both networks via " +
    "`npm run benchmark:all-networks`.",
    "",
  ].join("\n");
}

// Wall-clock-bound sections (4–7) run on the local pass only, where each
// writes its sections/<name>.md; the fork pass reuses that markdown so the
// assembled report stays complete. Fails loudly if the local pass never ran.
async function localOnlySection(name, mod) {
  if (networkLabel() === "local") {
    const data = await mod.run();
    mod.writeCsvFile(data);
    const md = mod.renderSection(data);
    writeSection(name, md);
    return md;
  }
  const p = path.join(SECTIONS_DIR, `${name}.md`);
  if (!fs.existsSync(p)) {
    throw new Error(
      `sections/${name}.md missing — run the local pass (npm run benchmark) first`);
  }
  console.log(`  (fork pass: reusing sections/${name}.md from the local run)`);
  return fs.readFileSync(p, "utf8");
}

async function main() {
  console.log(`Network: ${hre.network.name} (label: ${networkLabel()})`);

  console.log("\n[1/6] Gas per operation...");
  const gasData = await gas.run();
  writeCache("gas", gasData);
  gas.writeGasCsv(gasData);
  gas.writeLifecycleCsv(gasData);

  console.log("\n[2/6] Latency decomposition (composite mainnet-sim model)...");
  const latencyMd = await localOnlySection("02-latency", latency);

  console.log("\n[3/6] Throughput (analytical + empirical)...");
  const throughputData = await throughput.run();
  throughput.writeCsvFile(throughputData);

  console.log("\n[4/6] Scalability sweep...");
  const scalabilityMd = await localOnlySection("04-scalability", scalability);

  console.log("\n[5/6] State-growth scalability...");
  const stateGrowthMd = await localOnlySection("05-state-growth", stateGrowth);

  console.log("\n[6/6] Parallel-load scalability...");
  const parallelMd = await localOnlySection("06-parallel-scalability", parallel);

  // Concatenate sections in numbered order.
  const body = [
    reportHeader(),
    gas.renderSection(gasData),
    "",
    latencyMd,
    "",
    throughput.renderSection(throughputData),
    "",
    scalabilityMd,
    "",
    stateGrowthMd,
    "",
    parallelMd,
    "",
  ].join("\n");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "BENCHMARK_REPORT.md"), body);
  console.log(`\nReport: ${path.relative(process.cwd(), path.join(OUT_DIR, "BENCHMARK_REPORT.md"))}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
