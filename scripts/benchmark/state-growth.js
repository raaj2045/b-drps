/*
 * Section 5: state-growth scalability. For each K, pre-seed K entries into
 * the relevant data structure, then measure the gas of ONE more operation.
 * Surfaces O(n) regressions hidden by per-call shuffle-pop logic.
 * Run standalone:  npx hardhat run scripts/benchmark/state-growth.js
 * Or as part of:   npm run benchmark
 */
const {
  STATE_GROWTH_KS,
  fmtGas, getReceipt, setMining, syntheticAddress,
  deployAll, registerRolesWithGas,
  writeSection, writeCsv,
} = require("./lib");

async function run() {
  await setMining({ auto: true });
  const rows = [];
  for (const K of STATE_GROWTH_KS) {
    console.log(`  K=${K}: seeding...`);
    const ctx = await deployAll();
    await registerRolesWithGas(ctx);

    // ---- Auth: pre-seed K REVIEWER requests with synthetic addresses ----
    for (let i = 0; i < K; i++) {
      await getReceipt(await ctx.auth.connect(ctx.ae).addOrRequestMember(
        `Bulk${i}`, "REVIEWER", `b${i}@x.com`, syntheticAddress(i), true
      ));
      if ((i + 1) % 1000 === 0) {
        console.log(`    K=${K}: auth-seeded ${i + 1}/${K}`);
      }
    }

    const newReqAddr = syntheticAddress(K);
    const r1 = await getReceipt(await ctx.auth.connect(ctx.ae).addOrRequestMember(
      "Probe", "REVIEWER", "probe@x.com", newReqAddr, true
    ));
    const gasAddRequest = Number(r1.gasUsed);

    const r2 = await getReceipt(
      await ctx.auth.connect(ctx.ae).approoveRequest(syntheticAddress(0), ctx.ae.address)
    );
    const gasApprove = Number(r2.gasUsed);

    const r3 = await getReceipt(
      await ctx.auth.connect(ctx.ae).denyRequest(syntheticAddress(1))
    );
    const gasDeny = Number(r3.gasUsed);

    // ---- Main: pre-seed K papers in recievedByEIC ----
    for (let i = 0; i < K; i++) {
      await getReceipt(await ctx.main.connect(ctx.author).getPaperInfo(
        `P${i}`, `p${i}@x.com`, "abs", `T${i}`, `l${i}`, syntheticAddress(i)
      ));
      await getReceipt(await ctx.main.connect(ctx.author).sendToEIC());
      if ((i + 1) % 1000 === 0) {
        console.log(`    K=${K}: main-seeded ${i + 1}/${K}`);
      }
    }

    await getReceipt(await ctx.main.connect(ctx.author).getPaperInfo(
      "Probe", "probe@x.com", "abs", "T", "l", syntheticAddress(K)
    ));
    const r4 = await getReceipt(await ctx.main.connect(ctx.author).sendToEIC());
    const gasSend = Number(r4.gasUsed);

    const r5 = await getReceipt(await ctx.main.connect(ctx.eic).EICapproval(true));
    const gasEicApprove = Number(r5.gasUsed);

    rows.push({ K, gasAddRequest, gasApprove, gasDeny, gasSend, gasEicApprove });
    console.log(`  K=${K}: addRequest=${fmtGas(gasAddRequest)}, ` +
                `approve=${fmtGas(gasApprove)}, deny=${fmtGas(gasDeny)}, ` +
                `send=${fmtGas(gasSend)}, eicApprove=${fmtGas(gasEicApprove)}`);
  }
  return rows;
}

function renderSection(data) {
  const lines = ["## 5. State-growth scalability\n"];
  lines.push(
    "For each K, the relevant data structure is pre-seeded with K entries " +
    "(distinct synthetic addresses), then one more operation is measured. " +
    "Flat columns indicate O(1) per-op cost regardless of state size; rising " +
    "columns indicate an O(n) regression to investigate.\n"
  );
  lines.push("| K | addOrRequestMember | approoveRequest | denyRequest | sendToEIC | EICapproval |");
  lines.push("|---:|---:|---:|---:|---:|---:|");
  for (const r of data) {
    lines.push(
      `| ${r.K} | ${fmtGas(r.gasAddRequest)} | ${fmtGas(r.gasApprove)} | ` +
      `${fmtGas(r.gasDeny)} | ${fmtGas(r.gasSend)} | ${fmtGas(r.gasEicApprove)} |`
    );
  }
  lines.push("\n![State-growth flatness](./figures/state_growth.png)");
  lines.push("Raw data: [state_growth.csv](./state_growth.csv)");
  return lines.join("\n");
}

function writeCsvFile(rows) {
  const csv = ["K,addOrRequestMember,approoveRequest,denyRequest,sendToEIC,EICapproval"];
  for (const r of rows) {
    csv.push(`${r.K},${r.gasAddRequest},${r.gasApprove},${r.gasDeny},${r.gasSend},${r.gasEicApprove}`);
  }
  writeCsv("state_growth.csv", csv);
}

async function main() {
  console.log("[state-growth] running...");
  const data = await run();
  writeCsvFile(data);
  writeSection("05-state-growth", renderSection(data));
  console.log("[state-growth] done");
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { run, renderSection, writeCsvFile };
