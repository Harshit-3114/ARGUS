"""Score-level fusion: weighted sum of normalized modality scores.

Threshold and weights default to config.py but can be overridden at runtime
from the admin dashboard (stored in the `settings` table).
"""
import numpy as np

import database
from config import (DECISION_THRESHOLD, KS_FLOOR, W_FACE, W_KEYSTROKE)


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


def current_ks_floor() -> float:
    """The keystroke modality's own floor.

    A weighted sum is not an AND: a near-perfect face score contributes
    w_face * 0.99 of the threshold by itself, so the typing factor can be
    almost entirely skipped. The floor makes the keystroke factor have to
    clear a bar of its own, which is what "both factors must pass" means.
    """
    return _setting_float("ks_floor", KS_FLOOR)


def normalize_keystroke(sim: float) -> float:
    """Keystroke similarity is already in [0, 1]; clamp for safety."""
    return float(min(max(sim, 0.0), 1.0))


def fuse(face_norm: float, ks_norm: float) -> float:
    """Weighted score-level fusion."""
    w_face, w_ks = current_weights()
    return float(np.clip(w_face * face_norm + w_ks * ks_norm, 0.0, 1.0))


def decide(fused: float, ks_norm: float | None = None,
           threshold: float | None = None) -> str:
    """ACCEPT only if the fused score clears the threshold AND the keystroke
    factor clears its own floor.

    `ks_norm` is optional so the single-modality path (and older callers)
    still work; when it is given, both conditions must hold.
    """
    thr = current_threshold() if threshold is None else threshold
    if ks_norm is not None and ks_norm < current_ks_floor():
        return "REJECT"
    return "ACCEPT" if fused >= thr else "REJECT"
