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
  writeCache,
} = require("./lib");

const gas = require("./gas");
const latency = require("./latency");
const throughput = require("./throughput");
const scalability = require("./scalability");
const stateGrowth = require("./state-growth");

function reportHeader() {
  return [
    "# Benchmark Report",
    "",
    `_Generated: ${new Date().toISOString()}_`,
    "",
    "## Methodology",
    "",
    "Measurements are taken on a local Hardhat in-process node because Sepolia " +
    "ETH was not available for live testing. The EVM is deterministic, so " +
    "gas-per-operation numbers are identical on Sepolia. Latency, throughput, " +
    "and scalability depend on block cadence and gas limit, so the local node " +
    `is configured to match Sepolia parameters (${SEPOLIA_BLOCK_TIME_S}s block ` +
    `interval, ${SEPOLIA_BLOCK_GAS_LIMIT.toLocaleString()} gas/block) for those ` +
    "sections.",
    "",
    "Each section can also be run independently via " +
    "`npm run benchmark:gas|latency|throughput|scalability|state-growth`.",
    "",
  ].join("\n");
}

async function main() {
  console.log(`Network: ${hre.network.name}`);

  console.log("\n[1/5] Gas per operation...");
  const gasData = await gas.run();
  writeCache("gas", gasData);
  gas.writeGasCsv(gasData);
  gas.writeLifecycleCsv(gasData);

  console.log("\n[2/5] Latency under Sepolia-like 12s blocks (slow)...");
  const latencyData = await latency.run();
  latency.writeCsvFile(latencyData);

  console.log("\n[3/5] Throughput (analytical + empirical)...");
  const throughputData = await throughput.run();
  throughput.writeCsvFile(throughputData);

  console.log("\n[4/5] Scalability sweep...");
  const scalabilityData = await scalability.run();
  scalability.writeCsvFile(scalabilityData);

  console.log("\n[5/5] State-growth scalability...");
  const stateGrowthData = await stateGrowth.run();
  stateGrowth.writeCsvFile(stateGrowthData);

  // Concatenate sections in numbered order.
  const body = [
    reportHeader(),
    gas.renderSection(gasData),
    "",
    latency.renderSection(latencyData),
    "",
    throughput.renderSection(throughputData),
    "",
    scalability.renderSection(scalabilityData),
    "",
    stateGrowth.renderSection(stateGrowthData),
    "",
  ].join("\n");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "BENCHMARK_REPORT.md"), body);
  console.log(`\nReport: ${path.relative(process.cwd(), path.join(OUT_DIR, "BENCHMARK_REPORT.md"))}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
