# ARGUS — Multimodal Biometric Computer Login

A Flask-based secure login gate that authenticates users by fusing **two biometric
modalities** instead of relying on a password alone:

| Modality | Trait type | Captured by | Match score |
|---|---|---|---|
| Face recognition | physiological | webcam frames | max cosine similarity vs. enrolled embeddings (Facenet512 via DeepFace) |
| Keystroke dynamics | behavioral | browser keydown/keyup timestamps | per-user scaled-Manhattan filter (`sim = 1/(1+d)`) |

Both scores are normalized to [0, 1] and combined with a **weighted score-level
fusion** (`w_face=0.6`, `w_keystroke=0.4`); the fused score is compared against a
decision threshold θ. System performance is evaluated with **FAR, FRR, EER, AUC**
per modality and for the fused system — fused ROC curves and score distributions
are rendered automatically.

> Rationale for fusing a physiological and a behavioral trait: a photo of the user
> cannot reproduce their typing rhythm; an impostor who *knows the passphrase*
> cannot reproduce the face or the rhythm.

---

## Quickstart

```powershell
# one-click (Windows): bootstraps venv, installs deps once, starts server, opens browser
start.bat
```

or manually:

```powershell
# from this repository's folder (after clone or download)
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt    # deepface pulls TensorFlow (~600 MB)
.venv\Scripts\python app.py
```

Open **http://127.0.0.1:5000**. The first face capture downloads deepface model
weights (~250 MB, once, to `~\.deepface\weights`). A webcam must be available;
browsers only grant `getUserMedia` on `localhost`/HTTPS. If `requirements.txt`
changes, delete `.venv\.installed` so `start.bat` reinstalls.

## Admin dashboard

**`/admin`** — PIN-gated console (default `ADMIN_PIN = "admin123"` in `config.py`;
change it before putting the system in an open lab). The session key persists in
`data/secret_key`, so signing-in survives server restarts.

- **Overview** — KPI band (attempts, accept rate, labeled genuine/impostor,
  knowledge-gate fails), recent attempts table, latest evaluation charts.
- **Attempt log** — full history with filters (mode / decision /
  genuine-impostor / user search) and pagination.
- **Users** — enrollment status (face frames, typing rounds, attempts made);
  deleting a user (also from the public dashboard) requires the admin session and
  removes their templates and stored frames.
- **Settings** — runtime overrides for the **decision threshold θ** and the
  **fusion weights** (stored in the DB, surviving restarts, effective immediately
  for both the login decision and the evaluation sweep report). Defaults live in
  `config.py`. Danger zone: clear the attempt log between lab rounds.

## Security

Threat model first: this is a **single-tenant research/lab tool bound to
`127.0.0.1`**. The realistic attacker is someone at the same machine or another
local process — not a remote network adversary (the Flask dev server is not a
production deployment). Everything below hardens that boundary.

**Admin access**

- The console at `/admin` is PIN-gated; the default PIN is `admin123` in
  `config.py`. Override it without editing code by setting the environment
  variable `ARGUS_ADMIN_PIN` before starting the server. PIN comparison is
  constant-time; guessing is rate-limited (10 attempts / 15 min per address).
- The admin session cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` when
  `COOKIE_SECURE = True` (new in `config.py` — set it if you ever serve HTTPS).
  The Flask `SECRET_KEY` is generated once and stored in `data/secret_key`,
  outside version control via `.gitignore`.

**Rate limits** (per remote address, fixed window — `ratelimit.py`)

| Endpoint | Quota |
|---|---|
| `POST /api/attempt` (decision oracle) | 30 / 60 s |
| `POST /api/enroll` | 6 / 60 s |
| `POST /admin/login` | 10 / 900 s |
| `POST /api/evaluate` (chart regen) | 4 / 60 s |

Over-limit requests get `429` with a `Retry-After` header. The limiter is
in-process: correct only while a single Python process serves the app (the
default). If you ever put the app behind multiple workers, back it with a
shared store — per-process counters each get their own full quota.

**Input hardening**

- Request bodies are capped before work starts: ≤ 32 frames / 128 keystroke
  events per attempt, bounded frame/round counts at enrollment, passphrase
  length limits, and `MAX_CONTENT_LENGTH` 48 MB.
- Keystroke timestamps arrive from the browser, so they are treated as hostile:
  every value must be finite and non-negative, holds bounded to
  8–450 ms, digraph latencies to 10–3000 ms, and out-of-order events rejected —
  impossible to plant sub-physical timings or unbounded pauses.
- Usernames must match the configured regex and may not be composed only of
  dots/dashes/underscores.
- User deletion performs a destructive filesystem op on a name derived from the
  URL: the path is regex-checked, resolved (symlinks collapsed), and verified
  to sit exactly one level under the face-image root, with ownership proven in
  the database first, logged refusal on any mismatch.

**Data protection**

- **The passphrase is never stored.** The login credential is a Werkzeug
  scrypt/pbkdf2 password hash; the keystroke template ties itself to a SHA-256
  *fingerprint* (first 32 hex chars) of the phrase — enough to bind template
  rounds together, worthless for reconstructing the phrase. Attempt logs store
  scores only, never typed characters.
- **Biometric data residency**: face embeddings, typing statistics, enrolled
  JPEGs, and the SQLite DB all live under `data/` on the local disk. Nothing
  leaves the machine (the DeepFace model-weight download from its public repo
  is the one external fetch). Deleting a user removes their DB rows and their
  stored enrollment frames — there is no hidden copy.
- **Browser hardening**: every response carries
  `Content-Security-Policy: default-src 'self' …` (no `unsafe-inline` — page
  config is passed as a JSON `<script type="application/json">` block instead
  of inline JS), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`, and a `Permissions-Policy` that grants camera
  only to the app's own origin and denies microphone/geolocation. Error
  responses are generic; stack traces go to the server log only.

**Residual risks (accepted for a lab tool)**

- Keystroke timestamps use the client clock — a modified client can lie about
  rhythm (server-side plausibility bounds make blind fabrication harder, not
  impossible).
- Rate limiting counters are per-process; a multi-worker deployment would
  trivially multiply the quotas (documented above).
- Plain HTTP on localhost: another local process could sniff the session cookie
  or passphrases in transit. If this machine is shared and untrusted, put the
  app behind HTTPS and set `COOKIE_SECURE = True`.

## Workflow

1. **Enroll** (`/enroll`): username + passphrase (suggested demo passphrase:
   `biometrics123` — see Lab protocol below) → webcam captures 10 frames → the user
   types the passphrase 8 times (each clean round is recorded). Server validates
   every frame and every typing round, stores embeddings + typing statistics.
2. **Collect labeled attempts** (`/login?mode=eval`): every attempt is logged with
   ground truth (operator vs. claimed identity) → one attempt each for genuine and
   impostor cases; also used for daily logins.
3. **Evaluate** (`/evaluation`): click *Compute FAR / FRR / EER* → per-modality and
   fused AUC/EER, FAR/FRR at the currently configured θ, ROC + distribution charts,
   and the recommended θ to copy into `config.py`.

## Lab protocol for credible metrics

FAR/EER require impostor samples for *knowledge factor* — the shared demo
passphrase means an impostor *knows the password* and must be caught by
biometrics alone. Suggested minimum for a report-capable dataset:

- ≥ 3–5 enrolled users
- each operator: ≥ 10 genuine attempts (log in as self)
- each operator: ≥ 5 impostor attempts against every other user (log in as them)

Modify `SUGGESTED_PASSPHRASE` / `DECISION_THRESHOLD` / fusion weights in
`config.py`. Delete users and start over right from the dashboard.

### Calibrating the decision threshold

`DECISION_THRESHOLD` is a **calibrated** number, not "the middle of the 0–1
scale". The face score is `(cosine + 1) / 2`, and Facenet512 cosines between
two *different* people sit around **0.18**, not 0.0 — so an impostor's face
score floors out near 0.59 rather than near 0. A threshold of `0.55`
therefore landed almost exactly on the **median impostor score**, and on the
shipped 8-user / 416-attempt dataset it admitted **44.05%** of impostors
while rejecting nobody genuine.

The measured separation on that dataset is:

| modality | genuine range | impostor range | gap |
|---|---|---|---|
| Face | 0.885 – 0.997 | 0.434 – 0.779 | (0.779, 0.885) |
| Keystroke | 0.537 – 0.817 | 0.242 – 0.801 | *overlaps* |
| **Fused** | **0.801 – 0.923** | **0.369 – 0.757** | **(0.757, 0.801)** |

`DECISION_THRESHOLD = 0.78` is the midpoint of the fused gap, and gives
**FAR 0.00% / FRR 0.00%** on that data. Re-run the sweep on `/evaluation`
after changing the cohort and update it — the app shows the recommended θ on
that page, and the lab page can set it at runtime.

## Design notes

- **Designed for someone who has never used a biometric.** The person setting
  up an account may not know what a biometric is and may be nervous about the
  camera, so: warm paper instead of a dark instrument panel, one friendly teal
  accent, 56px controls, sentence-case labels in Atkinson Hyperlegible Next, and
  every instruction written as a helpful colleague would say it. The operator's
  console keeps the exact vocabulary (module codes, thresholds, FAR/FRR/EER)
  because there it is the subject matter — and none of it leaks into the
  novice-facing pages, where the technical numbers sit behind a
  *"Show me the technical numbers"* disclosure.
- **No dead ends.** The camera switches itself on when a step opens, and the
  button that turns it on (or off) is always visible inside the panel, not
  hidden in a corner. If something fails, the message says what to do next
  rather than printing an exception name.
- **Keystroke capture in the browser** (not `pynput`): a server-side keylogger would
  capture every keystroke on the machine and can't tell which window you typed in.
  The web UI records per-character `keydown`/`keyup` timing — the same features
  (hold times, digraph latencies) without invasive software. A typo corrected
  with backspace no longer voids the round: the server reconstructs the final
  text with an edit buffer, so only the surviving keystrokes are scored. Held
  keys (auto-repeat) and pastes are still rejected as invalid samples.
- **Phased typing test**: the 8 enrollment rounds run in three phases — *A*
  dwell & hold (phrase timing), *B* flight & latency (inter-key speed), *C*
  correction & recovery (how you fix a typo). Each round is tagged with its
  phase in `keystroke_samples.phase`; all phases feed one shared rhythm model.
- **Face pipeline**: OpenCV Haar detection picks the largest face and crops it with
  a margin; DeepFace *Facenet512* embeds the crop; match = max cosine vs. the
  user's gallery. Detection is ours, embedding is deepface's (`detector_backend="skip"`).
- **Keystroke model**: per-user *scaled Manhattan filter* — mean/σ learned from the
  8 enrollment rounds per feature position (σ floored to avoid zero-division),
  similarity `1/(1+mean(|x−μ|/σ))`. Deliberately simple: it works with only a few
  enrollment rounds far better than a per-user SVM trained against other users.
- **Fusion**: face cosine → `[−1,1] ↦ [0,1]`, keystroke similarity ∈ [0,1];
  weighted sum; decision at θ (`fusion.py`). Tune θ from the evaluation page.
- **Ground truth logging**: the `attempts` table stores scores per attempt but
  never the typed passphrase. Only knowledge-factor-passed attempts with both
  labeled modalities enter the FAR/FRR/EER computation.

## Honest limitations

- This is a **simulated login gate** (as the standard for such projects): it is not
  a Windows credential provider — Windows locks the real logon UI to system-level
  code (Windows Hello). Extension path: auto-lock wrapper / kiosk mode.
- **Presentation attacks**: fusion is anti-spoof by *fusing traits*, not by liveness
  detection. A printed photo next to a coerced typist is still about a face;
  a screen-replay attack on the webcam is plausible. Next steps: blink/head-pose
  liveness checks, DeepFace anti-spoofing model, per-user thresholds.
- Small-user-count FAR estimates have large confidence intervals; treat numbers
  below ~50 impostor attempts as indicative, not definitive. The shipped
  dataset (8 users, 416 attempts) separates **perfectly** (fused AUC 1.000),
  but "no impostor overlapped on these 336 attempts" is a statement about
  *these* 336 attempts — it is not a 0% false-accept *rate*, and it does not
  cover presentation attacks (see above).
- The fused result is carried almost entirely by the **face** modality: the
  keystroke template on its own is weak (AUC 0.883, EER 19.5%, and its genuine
  and impostor ranges overlap). Fusing protects against a case where one
  modality is defeated — it does not make the weak modality strong.
- **The fusion weights are a policy choice, and the shipped one is arguable.**
  In the simulated single-factor population, a stolen *photo* of the victim
  passes the fused gate **62%** of the time at `w = 0.6/0.4` — the face term
  alone contributes `0.6 × 0.99 = 0.594` of the `0.757` threshold, so the
  attacker's own rhythm only has to supply the last 0.16. Rebalancing to
  `w = 0.4/0.6` cuts that to **21%**, but raises the classic-impostor EER
  from 0.00% to 1.09%. `w = 0.55/0.45` holds the classic-impostor EER at
  0.00% while cutting the photo-attack rate further, and is the obvious next
  experiment — but it needs the cohort regenerated to measure properly.
  Weights are runtime-tunable on the lab page.
- Keystroke databases assume the *exact* enrolled phrase — this design ties the
  behavioral template to the user's passphrase (as do most password-tied systems).

## Project structure

```
app.py                  Flask routes + attempt decision pipeline
config.py               all tunables (frames, floors, weights, threshold)
database.py             SQLite: users, templates, labeled attempts
face_engine.py          OpenCV detect + DeepFace embed + cosine match
keystroke.py            feature extraction, integrity rules, scaled Manhattan model
fusion.py               normalization, weighted fusion, decision
evaluation.py           FAR/FRR/EER/AUC + ROC & distribution charts
templates/ + static/    Flask UI, camera buffer, keystroke recorder, admin console JS
smoke_test.py           logic tests that need no webcam (run with the venv)
start.bat               one-click launcher (venv bootstrap + server + browser)
DESIGN.md               design-system spec (tokens, motion grammar, named rules)
PRODUCT.md              product truth record (users, operating context, principles)
ARGUS-presentation.pptx  21-slide deck (explains + pitches the system, speaker notes)
data/                   SQLite db, enrolled JPEGs, admin secret (runtime, gitignored)
```

## Development

```powershell
.venv\Scripts\python smoke_test.py    # keystroke/fusion/evaluation logic (no webcam)
```
