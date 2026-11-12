"""FAR / FRR / EER evaluation over logged, labeled login attempts.

Ground truth comes from evaluation-mode attempts ("operator" vs "claimed"):
  genuine  pair: operator == claimed
  impostor pair: operator != claimed   (impostor knows the passphrase)

Metrics are computed independently for each modality and for the fused score,
from the same attempt rows. Also renders ROC and score-distribution charts
into static/generated/ as PNGs.
"""
from pathlib import Path

import numpy as np

STATIC_GEN_DIR = Path(__file__).resolve().parent / "static" / "generated"
MIN_SCORES_PER_GROUP = 3


def _to_arrays(rows, cfg_threshold: float = 0.0, ks_floor: float = 0.0):
    """Split labeled rows into per-modality genuine/impostor score arrays.

    Also records the joint ACCEPT decision under the real gate
    (`fused >= threshold` AND `keystroke >= floor`). The fused score on its
    own does not describe what the system does: the keystroke factor has its
    own floor, so a row that clears the threshold can still be rejected.
    """
    split = {"genuine": {"face": [], "ks": [], "fused": [], "gate": []},
             "impostor": {"face": [], "ks": [], "fused": [], "gate": []}}
    for r in rows:
        bucket = split["genuine"] if r["operator"] == r["claimed"] \
            else split["impostor"]
        if r["face_cos"] is not None:
            bucket["face"].append((r["face_cos"] + 1) / 2)   # cosine -> [0, 1]
        if r["ks_sim"] is not None:
            bucket["ks"].append(r["ks_sim"])
        if r["fused"] is not None:
            bucket["fused"].append(r["fused"])
            ks = r["ks_sim"]
            bucket["gate"].append(
                bool(r["fused"] >= cfg_threshold
                     and ks is not None and ks >= ks_floor))
    return ({k: np.asarray(v) for k, v in split["genuine"].items()},
            {k: np.asarray(v) for k, v in split["impostor"].items()})


def _roc_metrics(genuine: np.ndarray, impostor: np.ndarray) -> dict:
    """Threshold sweep -> (FAR, FRR) curves, AUC (Mann-Whitney), interpolated EER."""
    lo = min(genuine.min(), impostor.min()) - 1e-3
    hi = max(genuine.max(), impostor.max()) + 1e-3
    thr = np.linspace(lo, hi, 801)
    far = np.asarray([(impostor >= t).mean() for t in thr])   # impostor accepted
    frr = np.asarray([(genuine < t).mean() for t in thr])     # genuine rejected
    diff = genuine[:, None] - impostor[None, :]
    auc = float(((diff > 0).sum() + 0.5 * (diff == 0).sum()) / diff.size)
    crossing = np.abs(far - frr)
    k = int(np.argmin(crossing))
    if 0 < k < len(thr) - 1 and (far[k - 1] - frr[k - 1]) * (far[k + 1] - frr[k + 1]) < 0:
        t = (far[k - 1] - frr[k - 1]) + (far[k + 1] - frr[k + 1])
        w = 0.5 if t == 0 else (far[k - 1] - frr[k - 1]) / t
        eer = float(far[k - 1] + w * (far[k + 1] - far[k - 1]))
    else:
        eer = float((far[k] + frr[k]) / 2)
    return {"thr": thr, "far": far, "frr": frr,
            "eer": eer, "eer_thr": float(thr[k]), "auc": auc}


def compute(rows, cfg_threshold: float, ks_floor: float = 0.0) -> dict:
    """Full evaluation summary from scored attempt rows. See README for schema.

    `ks_floor` is the keystroke modality's own floor. The fused row reports
    FAR/FRR under the REAL gate (fused >= threshold AND keystroke >= floor);
    the single-modality rows are reference numbers on their own scales.
    """
    genuine, impostor = _to_arrays(rows, cfg_threshold, ks_floor)
    report = {
        "n_genuine": int(sum(r["operator"] == r["claimed"] for r in rows)),
        "n_impostor": int(sum(r["operator"] != r["claimed"] for r in rows)),
        "n_rows": len(rows),
        "cfg_threshold": cfg_threshold,
        "cfg_ks_floor": ks_floor,
        "modalities": {},
        "insufficient": False,
    }
    modality_label = {"face": "Face", "ks": "Keystroke", "fused": "Fused"}

    for name in ("face", "ks", "fused"):
        gm, im = genuine[name], impostor[name]
        if len(gm) < MIN_SCORES_PER_GROUP or len(im) < MIN_SCORES_PER_GROUP:
            report["modalities"][name] = {"ok": False, "label": modality_label[name],
                                          "n_genuine": len(gm),
                                          "n_impostor": len(im)}
            report["insufficient"] = True
            continue
        roc = _roc_metrics(gm, im)
        if name == "fused":
            # the real gate: both conditions, not the fused score alone
            far_at = float(impostor["gate"].mean())
            frr_at = 1.0 - float(genuine["gate"].mean())
        else:
            far_at = float((im >= cfg_threshold).mean())
            frr_at = float((gm < cfg_threshold).mean())
        report["modalities"][name] = {
            "ok": True,
            "label": modality_label[name],
            "n_genuine": len(gm),
            "n_impostor": len(im),
            "auc": round(roc["auc"], 4),
            "eer": round(roc["eer"], 4),
            "eer_thr": round(roc["eer_thr"], 4),
            "far_at_thr": round(far_at, 4),
            "frr_at_thr": round(frr_at, 4),
            "_roc": roc,
        }
    _render_charts(report, genuine, impostor)
    for name in report["modalities"]:
        report["modalities"][name].pop("_roc", None)
    return report


def _render_charts(report, genuine, impostor) -> None:
    """Write ROC + score-distribution PNGs under static/generated/."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    STATIC_GEN_DIR.mkdir(parents=True, exist_ok=True)
    # palette matches the light theme tokens: scanner-cyan, caution-amber,
    # signal-mint
    colors = {"face": "#0e7490", "ks": "#b54708", "fused": "#0da271"}

    # --- ROC curves ----------------------------------------------------
    fig, ax = plt.subplots(figsize=(6, 5))
    drawn = False
    for name, m in report["modalities"].items():
        if not m.get("ok"):
            continue
        roc = m["_roc"]
        ax.plot(roc["far"], 1 - roc["frr"], color=colors[name],
                label=f'{m["label"]} (AUC {m["auc"]:.3f}, EER {m["eer"]:.1%})')
        ax.scatter([roc["eer"]], [1 - roc["eer"]], color=colors[name],
                   marker="o", s=30, zorder=5)
        drawn = True
    if drawn:
        ax.plot([0, 1], [0, 1], ls="--", c="#999", lw=1)
        ax.set_xlabel("FAR (fraction of impostors accepted)")
        ax.set_ylabel("GAR (fraction of genuine accepted)")
        ax.set_title("ROC curves per modality")
        ax.legend(loc="lower right", fontsize=8)
        ax.set_xlim(-0.02, 1.02)
        ax.set_ylim(-0.02, 1.02)
        fig.tight_layout()
        fig.savefig(STATIC_GEN_DIR / "roc.png", dpi=110)
    plt.close(fig)

    # --- Score distributions -------------------------------------------
    fig, ax = plt.subplots(figsize=(6, 4.2))
    bins = np.linspace(0, 1, 41)
    for name in ("face", "ks", "fused"):
        if len(genuine[name]):
            ax.hist(genuine[name], bins=bins, alpha=0.45, color=colors[name],
                    label=f'{report["modalities"][name]["label"]} genuine')
        if len(impostor[name]):
            ax.hist(impostor[name], bins=bins, alpha=0.25, color=colors[name],
                    edgecolor=colors[name],
                    label=f'{report["modalities"][name]["label"]} impostor')
    ax.axvline(report["cfg_threshold"], color="crimson", lw=1.2, ls="--",
               label="decision threshold")
    floor = report.get("cfg_ks_floor", 0.0)
    if floor > 0:
        ax.axvline(floor, color="#b54708", lw=1.2, ls=":",
                   label="keystroke floor")
    ax.set_xlabel("normalized score")
    ax.set_ylabel("attempts")
    ax.set_title("Genuine vs impostor score distributions")
    ax.legend(fontsize=7)
    fig.tight_layout()
    fig.savefig(STATIC_GEN_DIR / "distributions.png", dpi=110)
    plt.close(fig)
