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
  writeSection, writeNetworkCsv,
} = require("./lib");

async function run() {
  await setMining({ auto: true });
  const rows = [];
  for (const K of STATE_GROWTH_KS) {
    console.log(`  K=${K}: seeding...`);
    const ctx = await deployAll();
    await registerRolesWithGas(ctx);

    // ---- Auth: pre-seed K approved members with synthetic addresses ----
    // P5's self-registration guard (msg.sender == _userAddress on the request
    // path) rules out bulk synthetic *requests*; the JOURNAL direct-add path
    // has no such check, so K now grows the approved-members array instead of
    // the pending-requests array. Probes are real signers self-registering.
    for (let i = 0; i < K; i++) {
      await getReceipt(await ctx.auth.connect(ctx.journal).addOrRequestMember(
        `Bulk${i}`, "JOURNAL", `b${i}@x.com`, syntheticAddress(i), false
      ));
      if ((i + 1) % 1000 === 0) {
        console.log(`    K=${K}: auth-seeded ${i + 1}/${K}`);
      }
    }

    const probeReq = ctx.rest[1];
    const probeDeny = ctx.rest[2];
    const r1 = await getReceipt(await ctx.auth.connect(probeReq).addOrRequestMember(
      "Probe", "REVIEWER", "probe@x.com", probeReq.address, true
    ));
    const gasAddRequest = Number(r1.gasUsed);

    await getReceipt(await ctx.auth.connect(probeDeny).addOrRequestMember(
      "ProbeDeny", "REVIEWER", "pd@x.com", probeDeny.address, true
    ));

    const r2 = await getReceipt(
      await ctx.auth.connect(ctx.ae).approoveRequest(probeReq.address, ctx.ae.address)
    );
    const gasApprove = Number(r2.gasUsed);

    const r3 = await getReceipt(
      await ctx.auth.connect(ctx.ae).denyRequest(probeDeny.address)
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
    "columns indicate an O(n) regression to investigate. Auth seeding grows " +
    "the approved-members array via the JOURNAL direct-add path (post-P5, " +
    "requests are strictly self-registered, so pending requests cannot be " +
    "bulk-seeded); pipeline seeding queues K papers by distinct authors.\n"
  );
  lines.push(
    "> **Local-only, valid cross-network.** Every column here is a gas " +
    "measurement, and Section 1 proves per-operation gas is byte-for-byte " +
    "identical between `local` and `sepoliaFork`. These O(1)/O(n) figures are " +
    "therefore network-independent; the fork would reproduce them exactly.\n"
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
  const body = rows.map(
    (r) => `${r.K},${r.gasAddRequest},${r.gasApprove},${r.gasDeny},${r.gasSend},${r.gasEicApprove}`
  );
  writeNetworkCsv(
    "state_growth.csv",
    "K,addOrRequestMember,approoveRequest,denyRequest,sendToEIC,EICapproval",
    body
  );
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
