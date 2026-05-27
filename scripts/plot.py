"""
Render comparison graphs from the benchmark CSVs.

Inputs  (read from benchmarks/):  latency.csv, throughput.csv,
                                  scalability.csv, state_growth.csv
Outputs (written to benchmarks/figures/):
                                  latency.png, throughput.png,
                                  scalability.png, state_growth.png

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


def _save(fig, name):
    for ext in ("png", "pdf"):
        out = FIG_DIR / f"{name}.{ext}"
        fig.savefig(out)
        print(f"  -> {out.relative_to(ROOT)}")
    plt.close(fig)


def plot_latency():
    path = DATA_DIR / "latency.csv"
    if not path.exists():
        print(f"  (skip latency: {path.name} not found)")
        return
    rows = _read_csv(path)
    ops = [r["operation"] for r in rows]
    means = [int(r["meanMs"]) for r in rows]
    mins = [int(r["minMs"]) for r in rows]
    maxs = [int(r["maxMs"]) for r in rows]
    # Asymmetric error bars: (mean - min, max - mean).
    errs = [[m - lo for m, lo in zip(means, mins)],
            [hi - m for m, hi in zip(means, maxs)]]

    fig, ax = plt.subplots(figsize=(7, 4))
    bars = ax.bar(ops, means, yerr=errs, capsize=4, color="#4C72B0",
                  edgecolor="black", linewidth=0.5)
    ax.set_ylabel("Latency (ms)")
    ax.set_title("Per-operation latency under Sepolia-like 12s blocks")
    ax.tick_params(axis="x", rotation=20)
    # Annotate each bar with the mean.
    for bar, m in zip(bars, means):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(),
                f"{m}", ha="center", va="bottom", fontsize=9)
    _save(fig, "latency")


def plot_throughput():
    path = DATA_DIR / "throughput.csv"
    if not path.exists():
        print(f"  (skip throughput: {path.name} not found)")
        return
    rows = sorted(_read_csv(path), key=lambda r: float(r["tps"]), reverse=True)
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
    rows = sorted(_read_csv(path), key=lambda r: int(r["N"]))
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
    rows = sorted(_read_csv(path), key=lambda r: int(r["step"]))
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
    rows = _read_csv(path)
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
    rows = sorted(_read_csv(path), key=lambda r: int(r["K"]))
    K = [int(r["K"]) for r in rows]
    op_columns = [c for c in rows[0].keys() if c != "K"]

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


def main():
    print(f"reading from {DATA_DIR.relative_to(ROOT)}/")
    plot_lifecycle()
    plot_cost()
    plot_latency()
    plot_throughput()
    plot_scalability()
    plot_state_growth()
    print(f"figures in {FIG_DIR.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
