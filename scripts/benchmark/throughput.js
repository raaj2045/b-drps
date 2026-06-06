/*
 * Section 3: throughput. Analytical (gas-based) + empirical sanity check.
 * Reads gas numbers from the cache written by gas.js. If the cache is
 * missing (standalone run before gas.js), recomputes them inline.
 * Run standalone:  npx hardhat run scripts/benchmark/throughput.js
 * Or as part of:   npm run benchmark
 */
const hre = require("hardhat");
const {
  SEPOLIA_BLOCK_GAS_LIMIT, SEPOLIA_BLOCK_TIME_S,
  fmtGas, setMining, deployAll, registerRolesWithGas, runPipelineOnce,
  writeSection, writeNetworkCsv, readCache,
} = require("./lib");
const gasModule = require("./gas");

async function run() {
  // Need per-op gas to compute analytical TPS. Prefer cached; recompute if missing.
  let perOpGas = readCache("gas");
  if (!perOpGas) {
    console.log("  (gas cache missing; computing inline)");
    perOpGas = await gasModule.run();
  }

  const ops = {
    addOrRequestMember: perOpGas.auth.requestMember,
    approveRequest: perOpGas.auth.approveRequest,
    getPaperInfo: perOpGas.pipeline.getPaperInfo,
    sendToEIC: perOpGas.pipeline.sendToEIC,
    EICapproval: perOpGas.pipeline.EICapproval,
    AEapproval: perOpGas.pipeline.AEapproval,
    Reviewerapproval: perOpGas.pipeline.Reviewerapproval,
    EICDecision: perOpGas.pipeline.EICDecision,
  };
  const analytical = {};
  for (const [name, gas] of Object.entries(ops)) {
    const perBlock = Math.floor(SEPOLIA_BLOCK_GAS_LIMIT / gas);
    const tps = perBlock / SEPOLIA_BLOCK_TIME_S;
    analytical[name] = { gas, opsPerBlock: perBlock, tps: Number(tps.toFixed(2)) };
  }

  // Empirical: 100 sendToEIC calls back-to-back under instant mine.
  await setMining({ auto: true });
  const ctx = await deployAll();
  await registerRolesWithGas(ctx);
  await (await ctx.main.connect(ctx.author).getPaperInfo(
    "A", "a@x.com", "abs", "Title", "link", ctx.author.address)).wait();

  const startBlock = await hre.ethers.provider.getBlockNumber();
  const N = 100;
  const t0 = Date.now();
  const txs = [];
  for (let i = 0; i < N; i++) {
    txs.push(await ctx.main.connect(ctx.author).sendToEIC());
  }
  await Promise.all(txs.map((t) => t.wait()));
  const elapsed = Date.now() - t0;
  const endBlock = await hre.ethers.provider.getBlockNumber();

  return {
    analytical,
    empirical: {
      op: "sendToEIC",
      txCount: N,
      blocksConsumed: endBlock - startBlock,
      wallClockMs: elapsed,
      localTps: Number(((N / elapsed) * 1000).toFixed(2)),
    },
  };
}

function renderSection(data) {
  const lines = ["## 3. Throughput\n"];
  lines.push("### Analytical (Sepolia 30M gas/block, 12s/block)\n");
  lines.push("Theoretical upper bound assuming a block contains only that operation.\n");
  lines.push("| Operation | Gas | Ops/block | TPS |");
  lines.push("|---|---:|---:|---:|");
  for (const [k, v] of Object.entries(data.analytical)) {
    lines.push(`| ${k} | ${fmtGas(v.gas)} | ${v.opsPerBlock} | ${v.tps} |`);
  }
  lines.push("\n### Empirical (local instant-mine sanity check)\n");
  const e = data.empirical;
  lines.push(`- Operation: \`${e.op}\``);
  lines.push(`- Transactions: ${e.txCount}`);
  lines.push(`- Blocks consumed: ${e.blocksConsumed}`);
  lines.push(`- Wall-clock: ${e.wallClockMs} ms`);
  lines.push(`- Local TPS (instant-mine, no block-time floor): ${e.localTps}`);
  lines.push("\n![Analytical TPS by operation](./figures/throughput.png)");
  lines.push("Raw data: [throughput.csv](./throughput.csv)");
  return lines.join("\n");
}

function writeCsvFile(data) {
  const rows = Object.entries(data.analytical).map(
    ([k, v]) => `${k},${v.gas},${v.opsPerBlock},${v.tps}`
  );
  writeNetworkCsv("throughput.csv", "operation,gas,opsPerBlock,tps", rows);
}

async function main() {
  console.log("[throughput] running...");
  const data = await run();
  writeCsvFile(data);
  writeSection("03-throughput", renderSection(data));
  console.log("[throughput] done");
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { run, renderSection, writeCsvFile };
