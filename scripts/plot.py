"""
Render comparison graphs from the benchmark CSVs.

Inputs  (read from benchmarks/):  latency.csv, storage_growth.csv
Outputs (written to benchmarks/figures/): latency_decomposition, storage_growth
                                          (png + pdf each)

Only these two earn a figure: the latency component composition and the
two-trend storage growth cannot be read from a table. Everything else in
benchmarks/ is communicated by its CSV/report table directly.

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

# Cost-model parameters for the USD figure -- the assumptions cited in the
# paper (owner-provided, 2026-07-11).
GAS_PRICE_GWEI = 0.123
ETH_PRICE_USD = 1798.0

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


def plot_storage_growth():
    """On-chain storage vs. N papers: a single, unannotated linearly rising
    line. The explanation of the linear growth (what metadata is stored, why
    the slope is constant) lives in benchmarks/storage_growth_note.txt as
    ready-to-adapt paper text."""
    path = DATA_DIR / "storage_growth.csv"
    if not path.exists():
        print(f"  (skip storage-growth: {path.name} not found)")
        return
    rows = sorted(_read_csv(path), key=lambda r: int(r["N"]))
    N = [int(r["N"]) for r in rows]
    total_kb = [int(r["totalBytes"]) / 1024 for r in rows]
    # Marginal per-paper rate from the two largest sweeps (excludes the
    # one-time deployment overhead visible at small N).
    slope_kb = (total_kb[-1] - total_kb[-2]) / (N[-1] - N[-2])
    print(f"  (storage slope ~{slope_kb:.1f} KiB/paper; explanation in "
          "benchmarks/storage_growth_note.txt)")

    fig, ax = plt.subplots(figsize=(7, 4))
    ax.plot(N, total_kb, "o-", color="#4C72B0")
    ax.set_xlabel("Papers published")
    ax.set_ylabel("Total on-chain storage (KiB)")
    ax.set_ylim(bottom=0)
    ax.set_title("On-chain storage growth")
    _save(fig, "storage_growth")


def plot_latency_decomposition():
    """Stacked bars: per-operation latency split into measured execution +
    simulated propagation + simulated block inclusion (50 samples). The
    legend carries each component's average so the composition is readable
    at a glance; simulated components are hatched and the title carries the
    mainnet-sim label so the figure is honest standalone."""
    path = DATA_DIR / "latency.csv"
    if not path.exists():
        print(f"  (skip latency-decomposition: {path.name} not found)")
        return
    rows = _read_csv(path)  # single mainnet-sim block, no network variants
    n_samples = 50
    ops = list(dict.fromkeys(r["operation"] for r in rows))
    comp = {
        c: [int(next(r for r in rows
                     if r["operation"] == op and r["component"] == c)["meanMs"])
            for op in ops]
        for c in ("execution", "propagation", "blockInclusion", "total")
    }
    def avg(component):
        vals = comp[component]
        return sum(vals) / len(vals)

    def fmt_ms(ms):
        return f"{ms/1000:,.1f} s" if ms >= 1000 else f"{ms:,.0f} ms"

    fig, ax = plt.subplots(figsize=(8.5, 4.5))
    x = range(len(ops))
    ax.bar(x, comp["execution"], color="#4C72B0",
           edgecolor="black", linewidth=0.5,
           label=f"execution (measured) — avg {fmt_ms(avg('execution'))}")
    ax.bar(x, comp["propagation"], bottom=comp["execution"],
           color="#DD8452", edgecolor="black", linewidth=0.5, hatch="//",
           label=f"propagation (simulated) — avg {fmt_ms(avg('propagation'))}")
    bottom2 = [a + b for a, b in zip(comp["execution"], comp["propagation"])]
    ax.bar(x, comp["blockInclusion"], bottom=bottom2, color="#55A868",
           edgecolor="black", linewidth=0.5, hatch="//",
           label=f"block inclusion (simulated) — avg {fmt_ms(avg('blockInclusion'))}")
    for i, op in enumerate(ops):
        ax.text(i, comp["total"][i] * 0.5,
                f"{comp['total'][i]/1000:.1f}s", ha="center", va="center",
                fontsize=8, color="white", fontweight="bold")

    ax.set_xticks(list(x))
    ax.set_xticklabels(ops, rotation=25, ha="right", fontsize=9)
    ax.set_ylabel("Latency (ms)")
    ax.yaxis.set_major_formatter(
        mtick.FuncFormatter(lambda v, _: f"{v/1000:.0f}k"))
    ax.set_title(f"Transaction confirmation latency ({n_samples} samples per operation)")
    ax.legend(frameon=False, fontsize=8, loc="center left",
              bbox_to_anchor=(1.02, 0.5))
    _save(fig, "latency_decomposition")


def main():
    print(f"reading from {DATA_DIR.relative_to(ROOT)}/")
    plot_latency_decomposition()
    plot_storage_growth()
    print(f"figures in {FIG_DIR.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
