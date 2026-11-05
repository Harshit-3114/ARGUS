"""Keystroke dynamics engine with typo tolerance.

The browser records, for every typed character, a {key, down, up} event pair
(timestamps in ms). A round is reconstructed with an edit-buffer simulation:
backspaces pop the last committed character, so a natural typo-and-correct
cycle still yields a clean feature sample of the final text.

Features per character position of the surviving text:
  holds   : key hold times (key-up - key-down)
  lats    : digraph latencies (key-down_{i+1} - key-down_i)

The behavioral model per user is a "scaled Manhattan filter" - a simple,
data-hungry-friendly statistical model: for each feature position we store
the mean and standard deviation learned from enrollment samples, then score
a probe by

    d(x) = mean_i |x_i - mu_i| / max(sigma_i, floor_i)
    sim  = 1 / (1 + d)        in [0, 1]

Integrity rules for a usable sample:
  * final text must equal the expected phrase (characters deleted by
    edits never reach the buffer, and corrections are allowed),
  * no key held > MAX_HOLD_MS (keystroke auto-repeat leaks into hold times),
  * every digraph latency within [MIN_LATENCY_MS, MAX_LATENCY_MS].
"""
import numpy as np

from config import (ENROLL_KS_SAMPLES, HOLD_FLOOR_MS, KS_MIN_PASSWORD_LEN,
                    LATENCY_FLOOR_MS, MAX_HOLD_MS, MAX_LATENCY_MS,
                    MIN_HOLD_MS, MIN_LATENCY_MS)


class KeystrokeError(Exception):
    """A recorded typing round is not usable as a biometric sample."""

    def __init__(self, reason: str, round_index: int | None = None):
        super().__init__(reason)
        self.reason = reason
        self.round_index = round_index


def sample_from_record(events, phrase: str):
    """Validate a browser-recorded typing round and extract features.

    events: list of {key: str, down: float, up: float|None} (ms, client clock).
    The clock belongs to the client, so every number here is treated as
    hostile input: it must be a finite number and satisfy physical
    plausibility bounds before it can become a biometric sample.

    Edit-buffer reconstruction: Backspace events pop the last committed
    character (and its timings) from the buffer, so a typo that is corrected
    does not discard the round. Only the surviving keystrokes are scored.
    """
    if not events:
        raise KeystrokeError("no keystrokes recorded")
    for ev in events:
        for f in ("down", "up"):
            if f not in ev or ev[f] is None:
                continue          # null up is tolerated: the event may be edited away
            try:
                value = float(ev[f])
                if not np.isfinite(value) or value < 0:
                    raise ValueError
                ev[f] = value
            except (KeyError, TypeError, ValueError) as exc:
                raise KeystrokeError(
                    "keystroke timestamp invalid or not a finite number") from exc

    # ---- edit-buffer simulation -------------------------------------------
    buffer = []                   # surviving {key, down, up} char events
    for ev in events:
        key = ev.get("key", "")
        if key == "Backspace":
            if buffer:
                buffer.pop()
        elif len(key) == 1:
            buffer.append(ev)

    typed = "".join(ev["key"] for ev in buffer)
    if typed != phrase:
        raise KeystrokeError(f"typed text does not match the expected phrase "
                             f"(final text is {len(typed)} chars, "
                             f"phrase is {len(phrase)})")

    # ---- feature extraction from surviving keystrokes ----------------------
    holds, downs = [], []
    for ev in buffer:
        if ev.get("up") is None:
            raise KeystrokeError("a key was left held (keystroke repeat?)")
        hold = ev["up"] - ev["down"]
        if hold > MAX_HOLD_MS:
            raise KeystrokeError(
                f"a key was held longer than {MAX_HOLD_MS} ms "
                f"(typing pace must be natural, not pressed)")
        if hold < MIN_HOLD_MS:
            raise KeystrokeError("physically impossible key hold time")
        holds.append(hold)
        downs.append(ev["down"])

    lats = [downs[i + 1] - downs[i] for i in range(len(downs) - 1)]
    if any(l < MIN_LATENCY_MS for l in lats):
        raise KeystrokeError("impossible digraph latency (keystroke repeat?)")
    if any(l > MAX_LATENCY_MS for l in lats):
        raise KeystrokeError(f"a gap longer than {int(MAX_LATENCY_MS)} ms "
                             f"between keys breaks the rhythm sample")
    if lats and sorted(downs) != downs:   # sanity: timestamps must advance
        raise KeystrokeError("keystroke timestamps out of order")
    return {"phrase": phrase, "holds": holds, "lats": lats}


def _feature_vector(sample) -> np.ndarray:
    return np.asarray(sample["holds"] + sample["lats"], dtype=np.float64)


def floors(vec_dim: int) -> np.ndarray:
    """Std floors over the concatenatd feature vector:
    first (dim+1)//2 features are holds, the rest are digraph latencies."""
    n_holds = (vec_dim + 1) // 2
    n_lats = vec_dim - n_holds
    return np.asarray(
        [HOLD_FLOOR_MS] * n_holds + [LATENCY_FLOOR_MS] * n_lats)


class KeystrokeModel:
    """Per-user typing-rhythm model (mean/std per feature position)."""

    def __init__(self, phrase: str, mu: np.ndarray, sigma: np.ndarray):
        self.phrase = phrase
        self.mu, self.sigma = mu, sigma

    @property
    def dim(self):
        return len(self.mu)

    @classmethod
    def from_samples(cls, samples):
        """Build from a list of sample dicts (all of the same phrase)."""
        if len(samples) < 3:
            raise KeystrokeError(
                f"need at least 3 clean typing rounds, got {len(samples)}")
        phrases = {s["phrase"] for s in samples}
        if len(phrases) != 1:
            raise KeystrokeError("typing rounds do not share a common phrase")
        vecs = np.stack([_feature_vector(s) for s in samples])
        mu, sigma = vecs.mean(axis=0), vecs.std(axis=0)
        return cls(phrases.pop(), mu, np.maximum(sigma, floors(vecs.shape[1])))

    def validate_len(self, sample):
        if len(_feature_vector(sample)) != self.dim:
            raise KeystrokeError("typing sample does not align with the "
                                 "enrolled phrase length")

    def similarity(self, sample) -> float:
        """Behavioral match score in [0, 1] for one typed round."""
        self.validate_len(sample)
        x = _feature_vector(sample)
        d = float(np.mean(np.abs(x - self.mu) / self.sigma))
        return float(min(max(1.0 / (1.0 + d), 0.0), 1.0))


def check_enrollment(samples):
    """Parse + validate enrollment rounds, return list of clean samples.
    Each client round may carry a `phase` tag ('A' dwell, 'B' flight,
    'C' correction); it rides along as metadata on the parsed sample and is
    stored alongside the features. All phases feed one shared rhythm model."""
    if len(samples) < ENROLL_KS_SAMPLES:
        raise KeystrokeError(
            f"need {ENROLL_KS_SAMPLES} clean typing rounds, got {len(samples)}")
    parsed = []
    for i, rec in enumerate(samples, start=1):
        phrase = rec.get("value", "")
        if len(phrase) < KS_MIN_PASSWORD_LEN:
            raise KeystrokeError(
                f"round {i}: phrase shorter than {KS_MIN_PASSWORD_LEN} chars", i)
        parsed.append(sample_from_record(rec.get("events", []), phrase))
        parsed[-1]["phase"] = rec.get("phase") if rec.get("phase") in ("A", "B", "C") else "A"
    return parsed
