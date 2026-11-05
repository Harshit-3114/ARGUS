"""Developer smoke test for the logic that does not need a webcam or a face model:
keystroke feature extraction/model, fusion, evaluation. Run with the venv:

    .venv\\Scripts\\python smoke_test.py
"""
import numpy as np

import evaluation
import fusion
import keystroke as ks
from config import HOLD_FLOOR_MS, LATENCY_FLOOR_MS

PHRASE = "biometrics123"
rng = np.random.default_rng(7)


def synth_events(base_hold, base_lat, hold_sd=0.0, lat_sd=0.0):
    """Browser-style {key, down, up} events for PHRASE with independent
    per-keystroke noise (hold_sd/lat_sd in ms)."""
    events, down = [], 0.0
    for i, ch in enumerate(PHRASE):
        down += (base_lat + float(rng.normal(0, lat_sd))) * (1 if i else 0)
        up = down + base_hold + float(rng.normal(0, hold_sd))
        events.append({"key": ch, "down": down, "up": up})
    return events


def synth_sample(base_hold, base_lat, hold_sd=0.0, lat_sd=0.0):
    return ks.sample_from_record(
        synth_events(base_hold, base_lat, hold_sd, lat_sd), PHRASE)


def synth_typo(base_hold, base_lat, at: int = 8):
    """Browser-style events for PHRASE with one mid-phrase typo that is fixed:
    the prefix is typed clean, char `at` comes out wrong, is backspaced away,
    and the suffix is re-typed. The final text equals PHRASE."""
    events, down = [], 0.0

    def add(ch, lat=base_lat, hold=base_hold):
        nonlocal down
        down += lat
        events.append({"key": ch, "down": down, "up": down + hold})

    for ch in PHRASE[:at]:
        add(ch)
    add("x")                                    # the typo
    down += 45.0
    events.append({"key": "Backspace", "down": down, "up": down + 60.0})
    for ch in PHRASE[at:]:
        add(ch)
    return events


def main():
    print("== keystroke feature extraction ==")
    base = synth_sample(85, 130, 0, 0)
    assert len(base["holds"]) == len(PHRASE)
    assert len(base["lats"]) == len(PHRASE) - 1
    assert abs(base["holds"][0] - 85) < 1e-6
    assert abs(base["lats"][0] - 130) < 1e-6
    print(f"  holds/lats dims: {len(base['holds'])}/{len(base['lats'])}  ok")

    print("== integrity rules ==")
    for bad, desc in [
        (synth_events(85, 130, 0, 0)[:-1], "short text"),
        (synth_events(500, 130, 0, 0), "key held too long"),
        ([{"key": ch, "down": i * 10.0, "up": None} for i, ch in enumerate(PHRASE)],
         "null keyup"),
    ]:
        try:
            ks.sample_from_record(bad, PHRASE)
            raise SystemExit(f"FAIL: {desc} round was accepted")
        except ks.KeystrokeError:
            print(f"  rejected {desc}: ok")

    print("== typo tolerance (edit-buffer reconstruction) ==")
    clean = synth_sample(85, 130, 0, 0)

    # 1) a mid-phrase typo fixed with backspace still yields a full sample
    corrected = ks.sample_from_record(synth_typo(85, 130, at=8), PHRASE)
    assert len(corrected["holds"]) == len(PHRASE)
    assert len(corrected["lats"]) == len(PHRASE) - 1
    print(f"  typo corrected at pos 8: holds {len(corrected['holds'])}/"
          f"{len(PHRASE)}, lats {len(corrected['lats'])}/{len(PHRASE) - 1}  ok")

    # 2) corrected rounds are dimension-compatible with clean rounds — one
    #    shared model scores both (login uses enrolled dims)
    mix = ([synth_sample(85, 130, 18.0, 30.0) for _ in range(4)] +
           [ks.sample_from_record(synth_typo(85, 130, at=i), PHRASE)
            for i in (3, 5, 8, 10)])
    model_mix = ks.KeystrokeModel.from_samples(mix)
    model_mix.validate_len(clean)
    print(f"  mixed clean/corrected model built, dim={model_mix.dim}  ok")

    # 3) garbage typed, fully backspaced away, then the phrase typed clean
    events, down = [], 0.0
    for ch in "junkx":
        down += 120.0
        events.append({"key": ch, "down": down, "up": down + 85.0})
    for _ in range(5):
        down += 60.0
        events.append({"key": "Backspace", "down": down, "up": down + 50.0})
    for ch in PHRASE:
        down += 130.0
        events.append({"key": ch, "down": down, "up": down + 85.0})
    recovered = ks.sample_from_record(events, PHRASE)
    assert len(recovered["holds"]) == len(PHRASE)
    print("  junk cleared with backspace, phrase re-typed: ok")

    # 4) an UNcorrected typo still rejects the round
    try:
        ks.sample_from_record(synth_typo(85, 130, at=8)[:-1], PHRASE)
        raise SystemExit("FAIL: uncorrected typo was accepted")
    except ks.KeystrokeError:
        print("  rejected uncorrected typo: ok")

    print("== keystroke model: genuine vs impostor separation ==")
    # user A rhythm: fast/regular; user B rhythm: slow/irregular
    a_samples = [synth_sample(85, 130, 18.0, 30.0) for _ in range(8)]
    model_a = ks.KeystrokeModel.from_samples(a_samples)
    a_probe = synth_sample(85, 130, 18.0, 30.0)
    b_probe = synth_sample(150, 210, 18.0, 30.0)
    s_genuine = model_a.similarity(a_probe)
    s_impostor = model_a.imposter_similarity = model_a.similarity(b_probe)
    assert s_genuine > s_impostor, "FAIL: impostor scored higher than genuine"
    assert s_genuine > 0.55, f"FAIL: genuine similarity too low ({s_genuine})"
    assert s_impostor < 0.45, f"FAIL: impostor similarity too high ({s_impostor})"
    print(f"  genuine sim={s_genuine:.3f}  impostor sim={s_impostor:.3f}  "
          f"margin={s_genuine - s_impostor:.3f}  ok")

    print("== fusion normalization + decision ==")
    from face_engine import normalize as face_normalize
    n = face_normalize(0.6)
    assert 0 <= n <= 1
    f = fusion.fuse(face_norm=face_normalize(0.75), ks_norm=0.7)
    assert 0 < f <= 1
    d = fusion.decide(f, threshold=0.55)
    assert d in ("ACCEPT", "REJECT")
    print(f"  face cos .75 -> norm {n:.3f}; fused={f:.3f} -> {d}  ok")

    print("== evaluation: synthetic FAR/FRR/EER ==")
    erng = np.random.default_rng(7)   # section-local stream: upstream section
                                      # additions must not perturb these asserts

    def make_rows(genuine, impostor):
        rows = [{"operator": "u", "claimed": "u", "face_cos": v * 2 - 1,
                 "ks_sim": None, "fused": float(v)}
                for v in genuine]
        rows += [{"operator": "attacker", "claimed": "u", "face_cos": v * 2 - 1,
                  "ks_sim": None, "fused": float(v)}
                 for v in impostor]
        rows += [{"operator": "u", "claimed": "u", "face_cos": None,
                  "ks_sim": 0.8, "fused": 0.8}]   # ks-only row (face must ignore it)
        return rows

    # Case A: perfectly separated scores -> EER ~ 0 is the CORRECT result
    genuine = np.clip(erng.normal(0.80, 0.035, size=40), 0.01, 0.99)
    impostor = np.clip(erng.normal(0.40, 0.045, size=40), 0.01, 0.99)
    report = evaluation.compute(make_rows(genuine, impostor), cfg_threshold=0.55)
    fused = report["modalities"]["fused"]
    assert fused["ok"]
    assert fused["auc"] > 0.9, f"FAIL: AUC too low on separated data: {fused['auc']}"
    assert fused["eer"] <= 0.05, \
        f"FAIL: EER should be ~0 for separated distributions: {fused['eer']}"
    ks_mod = report["modalities"]["ks"]
    assert not ks_mod["ok"], "FAIL: ks modality should report insufficient data"
    print(f"  separated: fused AUC={fused['auc']:.3f}  EER={fused['eer']:.3f} at thr "
          f"{fused['eer_thr']:.3f}  (n_genuine {fused['n_genuine']}, "
          f"n_impostor {fused['n_impostor']})  ok")

    # Case B: overlapping scores -> EER must sit inside the overlap band
    genuine = np.clip(erng.normal(0.72, 0.06, size=60), 0.01, 0.99)
    impostor = np.clip(erng.normal(0.55, 0.10, size=60), 0.01, 0.99)
    report = evaluation.compute(make_rows(genuine, impostor), cfg_threshold=0.55)
    fused = report["modalities"]["fused"]
    assert 0.70 < fused["auc"] < 0.96, f"FAIL: AUC odd on overlapping data: {fused['auc']}"
    assert 0.10 <= fused["eer"] <= 0.32, \
        f"FAIL: EER should fall inside the overlap band: {fused['eer']}"
    print(f"  overlapping: fused AUC={fused['auc']:.3f}  EER={fused['eer']:.3f} at thr "
          f"{fused['eer_thr']:.3f}  ok")

    # charts from case B remain under static/generated/
    print("  charts written under static/generated/ (roc.png, distributions.png)")

    print("\nALL SMOKE TESTS PASSED")


if __name__ == "__main__":
    main()
