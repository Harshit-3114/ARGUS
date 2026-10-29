"""Score-level fusion: weighted sum of normalized modality scores.

Threshold and weights default to config.py but can be overridden at runtime
from the admin dashboard (stored in the `settings` table).
"""
import numpy as np

import database
from config import DECISION_THRESHOLD, W_FACE, W_KEYSTROKE


def _setting_float(key: str, default: float) -> float:
    val = database.get_setting(key, None)
    try:
        return float(val) if val is not None else float(default)
    except (TypeError, ValueError):
        return float(default)


def current_weights() -> tuple[float, float]:
    """(w_face, w_keystroke) from runtime settings, renormalized to sum to 1."""
    w_face = _setting_float("w_face", W_FACE)
    w_ks = _setting_float("w_keystroke", W_KEYSTROKE)
    s = w_face + w_ks
    if s <= 0:
        return 0.5, 0.5
    return w_face / s, w_ks / s


def current_threshold() -> float:
    return _setting_float("decision_threshold", DECISION_THRESHOLD)


def normalize_keystroke(sim: float) -> float:
    """Keystroke similarity is already in [0, 1]; clamp for safety."""
    return float(min(max(sim, 0.0), 1.0))


def fuse(face_norm: float, ks_norm: float) -> float:
    """Weighted score-level fusion."""
    w_face, w_ks = current_weights()
    return float(np.clip(w_face * face_norm + w_ks * ks_norm, 0.0, 1.0))


def decide(fused: float, threshold: float | None = None) -> str:
    thr = current_threshold() if threshold is None else threshold
    return "ACCEPT" if fused >= thr else "REJECT"
