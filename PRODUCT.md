# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Biometrics-course lab. The author operates the system and enrolls classmates as
subjects; subjects interact only with the login page. During lab sessions the
author also drives enrollment, labeled attempt collection and the admin console.

## Product Purpose

ARGUS is a multimodal biometric computer-login gate: a login attempt is decided by
fusing a face-recognition score (webcam → Facenet512 embeddings) with a
keystroke-dynamics score (the rhythm of typing a passphrase). It exists to
demonstrate, end to end, that "knowing the password" is not identity — the gate
must grant real users and reject impostors who deliberately hold the shared demo
passphrase. Success: the full demo runs reliably in class — known users granted,
impostors rejected — with evaluation tooling to measure the separation honestly.

## Positioning

A self-hosted score-level-fusion gate that fuses physiological (face), behavioral
(keystroke rhythm) and knowledge (passphrase) factors with a verification console
that renders each modality's contribution live. Built as a classroom demo, not a
cloud product.

## Operating Context

- Run locally via `start.bat` (venv bootstrap → Flask dev server on
  `127.0.0.1:5000`).
- Enrollment: the operator walks a classmate through face capture and clean
  typing rounds of the shared passphrase.
- Labeled collection: login `?mode=eval` logs genuine/impostor attempts with
  ground truth (all users share the demo passphrase `biometrics123` — by design,
  so impostors pass the knowledge factor).
- The evaluation page computes FAR/FRR/EER and regenerates charts; the PIN-gated
  admin console tunes θ / fusion weights and manages users and the attempt log.
- Webcam required for the face flow; first run downloads DeepFace weights
  (~250 MB, once).

## Capabilities and Constraints

- Flask + Jinja server-rendered pages with vanilla JS; no external front-end
  runtime dependencies.
- Hard constraints: localhost-only; strict CSP (`default-src 'self'`, no inline
  style/script — page config travels in a JSON `<script id="bio-config">`
  block); self-hosted fonts and assets; rate-limited endpoints; PIN-gated admin;
  transform/opacity-only motion discipline.
- Keystroke capture is in-browser JS (documented replacement for pynput).
- Open / undecided: no fixed course grading rubric recorded yet; no deployment
  target beyond the lab machine.

## Brand Commitments

- Name: **ARGUS** (the hundred-eyed watchman); mark: ◍.
- Module-code nomenclature is part of the ritual voice: `PF-00` Knowledge,
  `FS-01` Face capture, `FS-02` Gallery match, `KD-02` Rhythm, `FS-09` Fusion.
- Console theatre (staged verification, ACCESS GRANTED/DENIED stamp, scan-sweep
  camera HUD) is a product feature confirmed by the user — motion renders the
  gate's reasoning, not chrome.
- Fonts: Space Grotesk / Plus Jakarta Sans / JetBrains Mono, self-hosted.

## Evidence on Hand

- `smoke_test.py` passes: keystroke separation (genuine sim 0.705 vs impostor
  0.375), fusion decision path, synthetic FAR/FRR/EER (separated AUC 1.00;
  overlapping AUC 0.934, EER 0.116).
- Charts generate under `static/generated/` (roc.png, distributions.png).
- No real labeled attempts yet (fresh DB). Future work must not fabricate
  metrics; numbers on screen must come from the live pipeline or the sweep.

## Product Principles

1. **Demo honesty.** Anything displayed as a score comes from the real pipeline;
   the theatre may pace the ritual, never fabricate a result.
2. **Seconds, not strings.** The passphrase is public by design; only face and
   rhythm separate real users from impostors, and the demo must show that
   separation.
3. **Measure, then tune.** Thresholds and weights follow the evaluation sweep,
   not intuition.
4. **Contained by default.** Single-tenant, localhost-bound, hardened boundaries;
   the lab machine is the trust boundary.
