"""
Render comparison graphs from the benchmark CSVs.

Inputs  (read from benchmarks/):  gas.csv, lifecycle.csv, latency.csv,
                                  throughput.csv, scalability.csv,
                                  state_growth.csv, parallel_scalability.csv
Outputs (written to benchmarks/figures/): one png+pdf per figure

Each figure is also written as .pdf for vector embedding in LaTeX.
Run:  python3 scripts/plot.py   (or `npm run benchmark:plot`)
"""
import csv
import os
import sys
from pathlib import Path

try:
    import matplotlib.pyplot as plt
    import matplotlib.ticker as mtick
except ImportError:
    sys.stderr.write(
        "matplotlib is required. Install with: pip install matplotlib\n"
    )
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "benchmarks"
FIG_DIR = DATA_DIR / "figures"
FIG_DIR.mkdir(parents=True, exist_ok=True)

# Cost-model parameters for the USD figure. EDIT THESE to match the gas-price
# and ETH-price assumptions you cite in the paper. Defaults are placeholders.
GAS_PRICES_GWEI = [10, 30, 50]
ETH_PRICE_USD = 3000.0

# Paper-friendly defaults: muted palette, readable fonts, light grid.
plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 11,
    "axes.titlesize": 13,
    "axes.labelsize": 11,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "grid.alpha": 0.25,
    "grid.linestyle": "--",
    "figure.dpi": 120,
    "savefig.bbox": "tight",
})


def _read_csv(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


# Authoritative network for single-series figures: prefer the forked-Sepolia
# rows (the paper's authoritative source); fall back to local if the fork pass
# hasn't been run. Tolerates CSVs with no `network` column (older runs).
def _networks(rows):
    return [n for n in dict.fromkeys(r.get("network", "local") for r in rows)]


def _authoritative(rows):
    if not rows or "network" not in rows[0]:
        return rows
    pref = "sepoliaFork" if any(r["network"] == "sepoliaFork" for r in rows) else "local"
    return [r for r in rows if r["network"] == pref]


def _save(fig, name):
    for ext in ("png", "pdf"):
        out = FIG_DIR / f"{name}.{ext}"
        fig.savefig(out)
        print(f"  -> {out.relative_to(ROOT)}")
    plt.close(fig)


def plot_throughput():
    path = DATA_DIR / "throughput.csv"
    if not path.exists():
        print(f"  (skip throughput: {path.name} not found)")
        return
    rows = sorted(_authoritative(_read_csv(path)), key=lambda r: float(r["tps"]), reverse=True)
    ops = [r["operation"] for r in rows]
    tps = [float(r["tps"]) for r in rows]

    fig, ax = plt.subplots(figsize=(7, 4))
    bars = ax.bar(ops, tps, color="#55A868", edgecolor="black", linewidth=0.5)
    ax.set_ylabel("TPS (Sepolia 30M gas / 12s block)")
    ax.set_title("Analytical throughput ceiling per operation")
    ax.tick_params(axis="x", rotation=20)
    for bar, t in zip(bars, tps):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(),
                f"{t:.1f}", ha="center", va="bottom", fontsize=9)
    _save(fig, "throughput")


def plot_scalability():
    path = DATA_DIR / "scalability.csv"
    if not path.exists():
        print(f"  (skip scalability: {path.name} not found)")
        return
    rows = sorted(_authoritative(_read_csv(path)), key=lambda r: int(r["N"]))
    N = [int(r["N"]) for r in rows]
    total_gas = [int(r["totalGas"]) for r in rows]
    mean_gas = [int(r["meanGasPerPaper"]) for r in rows]

    # Two gas-based views; wall-clock ms is intentionally omitted -- on a real
    # chain, time is governed by block cadence, not local EVM execution speed.
    fig, ax1 = plt.subplots(figsize=(7, 4))
    ax1.plot(N, total_gas, "o-", color="#4C72B0", label="Total gas")
    ax1.set_xscale("log")
    ax1.set_yscale("log")
    ax1.set_xlabel("N (papers through pipeline)")
    ax1.set_ylabel("Total gas (log)", color="#4C72B0")
    ax1.tick_params(axis="y", labelcolor="#4C72B0")
    ax1.yaxis.set_major_formatter(
        mtick.FuncFormatter(lambda v, _: f"{v / 1e6:.0f}M" if v >= 1e6 else f"{v/1e3:.0f}k")
    )

    ax2 = ax1.twinx()
    ax2.plot(N, mean_gas, "s--", color="#55A868", label="Mean gas / paper")
    ax2.set_ylabel("Mean gas per paper", color="#55A868")
    ax2.tick_params(axis="y", labelcolor="#55A868")
    ax2.yaxis.set_major_formatter(
        mtick.FuncFormatter(lambda v, _: f"{v / 1e6:.2f}M")
    )
    ax2.grid(False)
    ax2.spines["top"].set_visible(False)

    ax1.set_title("Pipeline scalability vs. N papers (gas only)")
    _save(fig, "scalability")


def plot_lifecycle():
    path = DATA_DIR / "lifecycle.csv"
    if not path.exists():
        print(f"  (skip lifecycle: {path.name} not found)")
        return
    rows = sorted(_authoritative(_read_csv(path)), key=lambda r: int(r["step"]))
    labels = [r["label"] for r in rows]
    gas = [int(r["gas"]) for r in rows]

    # Waterfall: each step's bar floats on top of the running cumulative.
    bottoms = []
    running = 0
    for g in gas:
        bottoms.append(running)
        running += g
    total = running

    fig, ax = plt.subplots(figsize=(8, 4.5))
    bars = ax.bar(range(len(labels)), gas, bottom=bottoms, color="#4C72B0",
                  edgecolor="black", linewidth=0.5, width=0.6)
    # Connector lines between consecutive bars.
    for i in range(len(labels) - 1):
        y = bottoms[i] + gas[i]
        ax.plot([i + 0.3, i + 1 - 0.3], [y, y], color="grey",
                linewidth=0.8, linestyle="--")
    for i, (b, g) in enumerate(zip(bottoms, gas)):
        ax.text(i, b + g, f"+{g/1e3:.0f}k", ha="center", va="bottom", fontsize=8)

    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=30, ha="right", fontsize=9)
    ax.set_ylabel("Cumulative gas")
    ax.yaxis.set_major_formatter(
        mtick.FuncFormatter(lambda v, _: f"{v / 1e6:.1f}M")
    )
    ax.set_title(f"Gas to publish one paper end-to-end (total {total/1e6:.2f}M gas)")
    _save(fig, "lifecycle")


def plot_cost():
    path = DATA_DIR / "lifecycle.csv"
    if not path.exists():
        print(f"  (skip cost: {path.name} not found)")
        return
    rows = _authoritative(_read_csv(path))
    total_gas = sum(int(r["gas"]) for r in rows)

    # cost_usd = gas * gasPrice(gwei) * 1e9 wei/gwei / 1e18 wei/ETH * ETH_USD
    def cost(gas, gwei):
        return gas * gwei * 1e9 / 1e18 * ETH_PRICE_USD

    scenarios = [f"{g} gwei" for g in GAS_PRICES_GWEI]
    costs = [cost(total_gas, g) for g in GAS_PRICES_GWEI]

    fig, ax = plt.subplots(figsize=(6.5, 4))
    bars = ax.bar(scenarios, costs, color="#DD8452", edgecolor="black",
                  linewidth=0.5, width=0.55)
    ax.set_ylabel("USD to publish one paper")
    ax.set_title(
        f"End-to-end publishing cost\n"
        f"({total_gas/1e6:.2f}M gas/paper @ ETH=${ETH_PRICE_USD:,.0f})"
    )
    for bar, c in zip(bars, costs):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(),
                f"${c:,.2f}", ha="center", va="bottom", fontsize=10)
    _save(fig, "cost")


def plot_state_growth():
    path = DATA_DIR / "state_growth.csv"
    if not path.exists():
        print(f"  (skip state-growth: {path.name} not found)")
        return
    rows = sorted(_authoritative(_read_csv(path)), key=lambda r: int(r["K"]))
    K = [int(r["K"]) for r in rows]
    op_columns = [c for c in rows[0].keys() if c not in ("K", "network")]

    fig, ax = plt.subplots(figsize=(7, 4.5))
    markers = ["o", "s", "^", "D", "v"]
    colors = ["#4C72B0", "#DD8452", "#55A868", "#C44E52", "#8172B3"]
    for i, op in enumerate(op_columns):
        gas = [int(r[op]) for r in rows]
        ax.plot(K, gas, marker=markers[i % len(markers)],
                color=colors[i % len(colors)], label=op, linewidth=1.5)
    ax.set_xscale("log")
    ax.set_xlabel("K (existing entries in data structure)")
    ax.set_ylabel("Gas of one more operation")
    ax.set_title("State-growth scalability (flat lines => O(1) per op)")
    ax.legend(loc="center left", bbox_to_anchor=(1.02, 0.5), frameon=False)
    _save(fig, "state_growth")


def plot_gas_network_compare():
    """Grouped bars: per-op gas, local vs sepoliaFork. Gas is EVM-deterministic,
    so the bars should coincide -- the figure validates that the local
    measurements equal the forked-Sepolia ones. Skipped if only one network."""
    path = DATA_DIR / "gas.csv"
    if not path.exists():
        print(f"  (skip gas-compare: {path.name} not found)")
        return
    rows = _read_csv(path)
    nets = _networks(rows)
    if len(nets) < 2:
        print("  (skip gas-compare: need >1 network; run npm run benchmark:fork)")
        return
    # Pipeline ops only (most relevant + comparable across networks).
    ops = [r["operation"] for r in rows if r["network"] == nets[0]
           and r["category"] == "pipeline"]
    gas_by_net = {
        n: {r["operation"]: int(r["gas"]) for r in rows
            if r["network"] == n and r["category"] == "pipeline"}
        for n in nets
    }

    import numpy as np
    x = np.arange(len(ops))
    width = 0.8 / len(nets)
    palette = ["#4C72B0", "#DD8452", "#55A868"]
    fig, ax = plt.subplots(figsize=(9, 4.5))
    for i, n in enumerate(nets):
        vals = [gas_by_net[n].get(op, 0) for op in ops]
        ax.bar(x + i * width, vals, width, label=n,
               color=palette[i % len(palette)], edgecolor="black", linewidth=0.4)
    ax.set_xticks(x + width * (len(nets) - 1) / 2)
    ax.set_xticklabels(ops, rotation=25, ha="right", fontsize=9)
    ax.set_ylabel("Gas used")
    ax.yaxis.set_major_formatter(mtick.FuncFormatter(lambda v, _: f"{v/1e3:.0f}k"))

    ax.set_title(
        "Per-operation gas is byte-for-byte identical across networks\n"
        "(local vs forked Sepolia bars coincide — gas is EVM-deterministic)"
    )

    # Quantify the parity on-figure so the claim is unmistakable even at a glance.
    if len(nets) >= 2:
        ref = gas_by_net[nets[0]]
        identical = all(
            gas_by_net[n].get(op) == ref.get(op) for n in nets[1:] for op in ops
        )
        if identical:
            ax.text(
                0.99, 0.97,
                f"Δgas = 0 across all {len(ops)} pipeline ops\n"
                f"({' = '.join(nets)})",
                transform=ax.transAxes, ha="right", va="top", fontsize=9,
                bbox=dict(boxstyle="round,pad=0.4", fc="#EEF3FA", ec="#4C72B0",
                          lw=0.8),
            )
    ax.legend(frameon=False, loc="upper left")
    _save(fig, "gas_network_compare")


def plot_latency_decomposition():
    """Stacked bars: per-operation latency split into measured execution +
    simulated propagation + simulated block inclusion (N=50 pass), with the
    total's P95/P99 marked. Simulated components are hatched and the title
    carries the mainnet-sim label so the figure is honest standalone."""
    path = DATA_DIR / "latency.csv"
    if not path.exists():
        print(f"  (skip latency-decomposition: {path.name} not found)")
        return
    rows = _authoritative(_read_csv(path))
    n_max = max(int(r["N"]) for r in rows)
    rows = [r for r in rows if int(r["N"]) == n_max]
    ops = list(dict.fromkeys(r["operation"] for r in rows))
    comp = {
        c: [int(next(r for r in rows
                     if r["operation"] == op and r["component"] == c)["meanMs"])
            for op in ops]
        for c in ("execution", "propagation", "blockInclusion", "total")
    }
    tot_rows = {op: next(r for r in rows
                         if r["operation"] == op and r["component"] == "total")
                for op in ops}

    fig, ax = plt.subplots(figsize=(8.5, 4.5))
    x = range(len(ops))
    b1 = ax.bar(x, comp["execution"], color="#4C72B0",
                edgecolor="black", linewidth=0.5, label="execution (measured)")
    b2 = ax.bar(x, comp["propagation"], bottom=comp["execution"],
                color="#DD8452", edgecolor="black", linewidth=0.5,
                hatch="//", label="propagation (simulated)")
    bottom2 = [a + b for a, b in zip(comp["execution"], comp["propagation"])]
    ax.bar(x, comp["blockInclusion"], bottom=bottom2, color="#55A868",
           edgecolor="black", linewidth=0.5, hatch="//",
           label="block inclusion (simulated)")
    # P95 / P99 markers on the composite total.
    p95 = [int(tot_rows[op]["p95Ms"]) for op in ops]
    p99 = [int(tot_rows[op]["p99Ms"]) for op in ops]
    ax.plot(x, p95, "v", color="#C44E52", markersize=6, linestyle="none",
            label="total P95")
    ax.plot(x, p99, "^", color="#8172B3", markersize=6, linestyle="none",
            label="total P99")
    for i, op in enumerate(ops):
        ax.text(i, comp["total"][i] * 0.5,
                f"{comp['total'][i]/1000:.1f}s", ha="center", va="center",
                fontsize=8, color="white", fontweight="bold")

    ax.set_xticks(list(x))
    ax.set_xticklabels(ops, rotation=25, ha="right", fontsize=9)
    ax.set_ylabel("Latency (ms)")
    ax.yaxis.set_major_formatter(
        mtick.FuncFormatter(lambda v, _: f"{v/1000:.0f}k"))
    ax.set_title(
        f"Confirmation-latency decomposition, N={n_max} samples/op\n"
        "(execution measured; propagation + inclusion from the mainnet-sim model)")
    ax.legend(frameon=False, fontsize=8, loc="center left",
              bbox_to_anchor=(1.02, 0.5))
    _save(fig, "latency_decomposition")


def plot_latency_by_n():
    """Grouped bars of the composite total mean per operation at N=10/25/50,
    with min–P95 whiskers: shows the estimates are stable in sample size."""
    path = DATA_DIR / "latency.csv"
    if not path.exists():
        print(f"  (skip latency-by-n: {path.name} not found)")
        return
    rows = [r for r in _authoritative(_read_csv(path)) if r["component"] == "total"]
    ns = sorted({int(r["N"]) for r in rows})
    ops = list(dict.fromkeys(r["operation"] for r in rows))
    by_n = {n: {r["operation"]: r for r in rows if int(r["N"]) == n} for n in ns}

    import numpy as np
    x = np.arange(len(ops))
    width = 0.8 / len(ns)
    palette = ["#A8C4E0", "#6A94C4", "#2F5C94"]
    fig, ax = plt.subplots(figsize=(8.5, 4.5))
    for i, n in enumerate(ns):
        means = [int(by_n[n][op]["meanMs"]) for op in ops]
        lo = [m - int(by_n[n][op]["minMs"]) for m, op in zip(means, ops)]
        hi = [int(by_n[n][op]["p95Ms"]) - m for m, op in zip(means, ops)]
        ax.bar(x + i * width, means, width, yerr=[lo, hi], capsize=2,
               color=palette[i % len(palette)], edgecolor="black",
               linewidth=0.4, label=f"N={n}", error_kw={"linewidth": 0.7})
    ax.set_xticks(x + width * (len(ns) - 1) / 2)
    ax.set_xticklabels(ops, rotation=25, ha="right", fontsize=9)
    ax.set_ylabel("Total latency (ms), composite model")
    ax.yaxis.set_major_formatter(
        mtick.FuncFormatter(lambda v, _: f"{v/1000:.0f}k"))
    ax.set_title("Composite total latency is stable across sample sizes\n"
                 "(bars = mean, whiskers = min…P95; mainnet-sim model)")
    ax.legend(frameon=False)
    _save(fig, "latency_by_n")


def plot_parallel():
    """Parallel-load sweep, three panels: registration throughput (the
    parallel-safe scalability curve), registration per-tx latency, and the
    per-phase success rate -- where the submission phase's 1/N curve shows the
    shared-staging serialization (SECURITY.md 4.1) failing safe."""
    path = DATA_DIR / "parallel_scalability.csv"
    if not path.exists():
        print(f"  (skip parallel: {path.name} not found)")
        return
    rows = _authoritative(_read_csv(path))

    def phase_rows(ph):
        return sorted([r for r in rows if r["phase"] == ph],
                      key=lambda r: int(r["N"]))

    reg = phase_rows("registration")
    sub = phase_rows("submission")
    N = [int(r["N"]) for r in reg]

    fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(13, 4))

    ax1.plot(N, [float(r["tps"]) for r in reg], "o-", color="#4C72B0")
    ax1.set_xlabel("N concurrent clients")
    ax1.set_ylabel("Achieved throughput (tx/s)")
    ax1.set_title("Registration throughput\n(parallel-safe workload)")

    ax2.plot(N, [int(r["meanTxMs"]) for r in reg], "o-", color="#4C72B0",
             label="mean")
    ax2.plot(N, [int(r["p95TxMs"]) for r in reg], "s--", color="#4C72B0",
             alpha=0.55, label="P95")
    ax2.set_xlabel("N concurrent clients")
    ax2.set_ylabel("Per-transaction latency (ms)")
    ax2.set_title("Registration per-tx latency")
    ax2.legend(frameon=False)

    ax3.plot(N, [100.0 * int(r["success"]) / int(r["N"]) for r in reg],
             "o-", color="#4C72B0", label="registration")
    ax3.plot([int(r["N"]) for r in sub],
             [100.0 * int(r["success"]) / int(r["N"]) for r in sub],
             "s-", color="#DD8452", label="submission (shared staging)")
    ax3.set_xlabel("N concurrent clients")
    ax3.set_ylabel("Success rate (%)")
    ax3.set_ylim(-5, 105)
    ax3.set_title("Success rate: shared staging\nserializes submissions (fails safe)")
    ax3.legend(frameon=False, fontsize=9)

    fig.suptitle("Parallel-load scalability (local instant-mine node)",
                 y=1.03, fontsize=13)
    fig.tight_layout()
    _save(fig, "parallel_scalability")


def main():
    print(f"reading from {DATA_DIR.relative_to(ROOT)}/")
    plot_gas_network_compare()
    plot_lifecycle()
    plot_cost()
    plot_latency_decomposition()
    plot_latency_by_n()
    plot_throughput()
    plot_scalability()
    plot_state_growth()
    plot_parallel()
    print(f"figures in {FIG_DIR.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
