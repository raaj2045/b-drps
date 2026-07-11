/*
 * Section 6: parallel-load scalability. For N = 10, 20, ..., 100 concurrent
 * clients, fire N transactions in parallel (Promise.all, one distinct signer
 * each) and record wall-clock, achieved throughput, per-transaction latency
 * percentiles, and success rate. Two phases per N:
 *
 *   registration -- N fresh accounts self-request membership concurrently
 *                   (parallel-safe: every client touches distinct state)
 *   submission   -- N registered authors each stage + submit a paper
 *                   concurrently (getPaperInfo + sendToEIC per client).
 *                   NOT parallel-safe by design: getPaperInfo stages into a
 *                   single shared scratchpad (SECURITY.md 4.1), so exactly one
 *                   sendToEIC succeeds and the rest revert on the queue guard
 *                   ("Author already queued here"). The phase demonstrates
 *                   that the guards fail SAFE under maximal interleaving --
 *                   pre-fix this same workload silently corrupted the queue.
 *                   Queue integrity is asserted after the run.
 *
 * HONESTY LABEL: this runs on the local instant-mine node, so it measures the
 * contracts + node under concurrent load (nonce handling, queue-guard
 * correctness under interleaving, harness throughput) -- NOT consensus-layer
 * throughput. The real-network ceiling is the analytical gas-based TPS in
 * Section 3.
 *
 * Run standalone:  npx hardhat run scripts/benchmark/parallel.js
 * Or as part of:   npm run benchmark
 */
const {
  fmtGas, getReceipt, setMining, deployAll, registerRolesWithGas,
  writeSection, writeNetworkCsv,
} = require("./lib");

const PARALLEL_NS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function percentile(sorted, p) {
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function summarize(N, phase, latencies, failures, wallClockMs) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  return {
    N, phase, wallClockMs,
    tps: Number(((latencies.length / wallClockMs) * 1000).toFixed(2)),
    meanTxMs: Math.round(mean),
    p95TxMs: Math.round(percentile(sorted, 95)),
    maxTxMs: Math.round(sorted[sorted.length - 1]),
    success: latencies.length,
    failed: failures,
  };
}

// Runs `tasks` (array of async thunks) concurrently; returns per-task
// latencies for the successes plus the failure count.
async function runParallel(tasks) {
  const t0 = Date.now();
  const settled = await Promise.allSettled(tasks.map(async (task) => {
    const s = Date.now();
    await task();
    return Date.now() - s;
  }));
  const wallClockMs = Date.now() - t0;
  const latencies = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const failures = settled.length - latencies.length;
  return { latencies, failures, wallClockMs };
}

async function run() {
  await setMining({ auto: true });
  const rows = [];

  for (const N of PARALLEL_NS) {
    const ctx = await deployAll();
    await registerRolesWithGas(ctx);
    const clients = ctx.rest.slice(1, 1 + N); // rest[0] is the deny target

    // ---- Phase A: N concurrent registration requests ----
    const regTasks = clients.map((signer, i) => async () => {
      await getReceipt(await ctx.auth.connect(signer).addOrRequestMember(
        `Client${i}`, "AUTHOR", `c${i}@x.com`, signer.address, true));
    });
    const reg = await runParallel(regTasks);
    rows.push(summarize(N, "registration", reg.latencies, reg.failures, reg.wallClockMs));

    // Approve everyone as AUTHOR (sequential, unmeasured setup for phase B).
    for (const signer of clients) {
      await getReceipt(await ctx.auth.connect(ctx.ae)
        .approoveRequest(signer.address, ctx.ae.address));
    }

    // ---- Phase B: N concurrent paper submissions ----
    const subTasks = clients.map((signer, i) => async () => {
      await getReceipt(await ctx.main.connect(signer).getPaperInfo(
        `C${i}`, `c${i}@x.com`, "abs", `Paper ${i}`, `link${i}`, signer.address));
      await getReceipt(await ctx.main.connect(signer).sendToEIC());
    });
    const sub = await runParallel(subTasks);
    const subRow = summarize(N, "submission", sub.latencies, sub.failures, sub.wallClockMs);

    // Integrity check: however the N clients interleaved, the EIC queue must
    // hold exactly the successful submissions -- reverts must not corrupt it.
    const queueLen = (await ctx.main.getRecievedByEIC()).length;
    subRow.queueIntact = queueLen === subRow.success;
    rows.push(subRow);

    const [r, s] = rows.slice(-2);
    console.log(
      `  N=${N}: registration ${r.tps} tps (${r.success}/${N} ok), ` +
      `submission ${s.success}/${N} ok (shared staging, expected 1), ` +
      `queue intact: ${s.queueIntact}`);
  }
  return rows;
}

function renderSection(data) {
  const lines = ["## 6. Parallel-load scalability\n"];
  lines.push(
    "N distinct clients fire transactions concurrently (`Promise.all`), for " +
    "N = 10 … 100.\n"
  );
  lines.push(
    "- **registration** — N self-service membership requests. Parallel-safe " +
    "(distinct state per client): the scalability curve of record.");
  lines.push(
    "- **submission** — N authors each stage + submit a paper " +
    "(`getPaperInfo` + `sendToEIC`). **Not parallel-safe by design**: " +
    "`getPaperInfo` stages into a single shared scratchpad (SECURITY.md " +
    "§4.1), so exactly one `sendToEIC` succeeds and the remaining N−1 revert " +
    "on the queue guard (`\"Author already queued here\"`). This phase is a " +
    "**concurrency-safety result, not a throughput result**: pre-fix, the " +
    "same workload silently corrupted the queue; post-fix the guards fail " +
    "safe under maximal interleaving, verified by the queue-integrity column " +
    "(EIC queue length == successful submissions).\n"
  );
  lines.push(
    "> **Local-only, honestly labelled.** Instant-mine local node: this " +
    "measures the contracts and node under concurrent load (nonce handling, " +
    "guard correctness, harness throughput), not consensus throughput. The " +
    "real-network ceiling is the analytical gas-based TPS in Section 3.\n"
  );
  lines.push("| N | Phase | Wall-clock (ms) | TPS | Mean tx (ms) | P95 tx (ms) | Max tx (ms) | Success | Queue intact |");
  lines.push("|---:|---|---:|---:|---:|---:|---:|---:|---|");
  for (const r of data) {
    const intact = r.queueIntact === undefined ? "—" : (r.queueIntact ? "✅" : "❌");
    lines.push(
      `| ${r.N} | ${r.phase} | ${fmtGas(r.wallClockMs)} | ${r.tps} | ` +
      `${r.meanTxMs} | ${r.p95TxMs} | ${r.maxTxMs} | ${r.success}/${r.N} | ${intact} |`
    );
  }
  lines.push("\n![Parallel-load scalability](./figures/parallel_scalability.png)");
  lines.push("Raw data: [parallel_scalability.csv](./parallel_scalability.csv)");
  return lines.join("\n");
}

function writeCsvFile(rows) {
  const body = rows.map(
    (r) => `${r.N},${r.phase},${r.wallClockMs},${r.tps},${r.meanTxMs},` +
           `${r.p95TxMs},${r.maxTxMs},${r.success},${r.failed},` +
           `${r.queueIntact === undefined ? "" : r.queueIntact}`
  );
  writeNetworkCsv(
    "parallel_scalability.csv",
    "N,phase,wallClockMs,tps,meanTxMs,p95TxMs,maxTxMs,success,failed,queueIntact",
    body
  );
}

async function main() {
  console.log("[parallel] running...");
  const data = await run();
  writeCsvFile(data);
  writeSection("06-parallel-scalability", renderSection(data));
  console.log("[parallel] done");
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { run, renderSection, writeCsvFile, PARALLEL_NS };
