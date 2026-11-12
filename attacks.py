"""Single-factor attack populations, derived from the enrolled database.

A classic impostor - their own face, their own rhythm, the victim's
passphrase - is only ONE of the attacks worth measuring. Two others each
defeat exactly one modality:

  photo attack    the VICTIM's photo (face right) + the ATTACKER's rhythm
  rhythm attack   the ATTACKER's face + the VICTIM's rhythm

A weighted sum is not an AND, so the gate can be defeated by one strong
factor even when the other is wrong. These two populations are the ones
that expose that, and they are exactly the attacks the classic-impostor
FAR cannot see.

They are derived from the stored galleries and typing templates rather
than being hard-coded, so they can be re-measured whenever the cohort
changes - and reported by the app itself, so the weakness cannot hide
behind a headline number.

The photo attack's probe is a held-out enrolled frame of the victim
scored against the rest of their gallery: it stands in for a photograph
of that person. It is a conservative stand-in - a real photograph of a
face would match slightly less well than another frame of the same
person, so the true rate is a little lower than measured here.
"""
import numpy as np

import database
import fusion
import keystroke as ks


def _max_cosine(probe, gallery) -> float:
    """Max cosine similarity of a probe embedding against a gallery."""
    g = np.asarray(gallery, dtype=np.float64)
    if len(g) == 0:
        return 0.0
    pn = probe / (np.linalg.norm(probe) or 1.0)
    gn = g / (np.linalg.norm(g, axis=1, keepdims=True) + 1e-12)
    return float(np.max(gn @ pn))


def derive_attacks() -> dict:
    """-> {"photo": [(face_cos, ks_sim), ...], "rhythm": [...]}"""
    users = [u["username"] for u in database.list_users()]
    galleries, models, samples = {}, {}, {}
    for name in users:
        gal = database.get_face_gallery(name)
        if gal:
            galleries[name] = [np.asarray(g, dtype=np.float64) for g in gal]
        rounds = database.get_keystroke_samples(name)
        if rounds:
            parsed = [{"phrase": p, "holds": h, "lats": l} for p, h, l in rounds]
            try:
                models[name] = ks.KeystrokeModel.from_samples(parsed)
                samples[name] = parsed
            except ks.KeystrokeError:
                pass

    photo, rhythm = [], []
    for attacker in users:
        for victim in users:
            if attacker == victim:
                continue
            v_gal = galleries.get(victim)
            a_gal = galleries.get(attacker)
            v_model = models.get(victim)
            if not v_gal or not a_gal or v_model is None:
                continue
            a_samples = samples.get(attacker)
            v_samples = samples.get(victim)
            if not a_samples or not v_samples:
                continue

            # photo attack: the victim's own photo, the attacker's rhythm
            for i in range(len(v_gal)):
                held_out = v_gal[:i] + v_gal[i + 1:]
                face = _max_cosine(v_gal[i], held_out)
                for probe in a_samples:
                    photo.append((face, v_model.similarity(probe)))

            # rhythm attack: the attacker's face, the victim's rhythm
            for a_emb in a_gal:
                face = _max_cosine(a_emb, v_gal)
                for probe in v_samples:
                    rhythm.append((face, v_model.similarity(probe)))
    return {"photo": photo, "rhythm": rhythm}


def evaluate_attacks(threshold: float | None = None,
                     ks_floor: float | None = None,
                     weights: tuple[float, float] | None = None) -> dict:
    """How many single-factor attacks the CURRENT gate lets through.

    Returns one entry per attack kind with the acceptance rate, plus the
    same rate for each single-modality gate on its own (so the reader can
    see what the fusion is worth).
    """
    thr = fusion.current_threshold() if threshold is None else threshold
    floor = fusion.current_ks_floor() if ks_floor is None else ks_floor
    w_face, w_ks = fusion.current_weights() if weights is None else weights

    pops = derive_attacks()
    out = {}
    for kind, rows in pops.items():
        if not rows:
            out[kind] = {"n": 0, "accepted": 0, "rate": None}
            continue
        face = np.array([r[0] for r in rows])
        rhythm = np.array([r[1] for r in rows])
        face_norm = (face + 1.0) / 2.0
        fused = np.clip(w_face * face_norm + w_ks * rhythm, 0.0, 1.0)
        accepted = (fused >= thr) & (rhythm >= floor)
        out[kind] = {
            "n": len(rows),
            "accepted": int(accepted.sum()),
            "rate": float(accepted.mean()),
            "fused_only_rate": float((fused >= thr).mean()),
            "mean_face_cos": float(face.mean()),
            "mean_rhythm": float(rhythm.mean()),
        }
    return out
