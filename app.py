"""ARGUS — multimodal biometric login gate (face + keystroke), Flask application.

Public routes:
    GET  /                     dashboard
    GET  /enroll               enrollment wizard (face + typing rounds)
    POST /api/enroll           finalize a new enrolled user
    GET  /login                login page (?mode=eval for labeled attempts)
    POST /api/attempt          score one login attempt, log it, return decision
    GET  /evaluation           evaluation dashboard (data collection + metrics)
    POST /api/evaluate         run FAR/FRR/EER sweep, regenerate charts

Admin routes (PIN-protected session):
    GET    /admin                  login wall or dashboard shell
    POST   /admin/login, /admin/logout
    GET    /admin/api/overview     KPIs, users, recent attempts, runtime settings
    GET    /admin/api/attempts     filtered + paginated attempt log
    POST   /admin/api/settings     override decision threshold / fusion weights
    POST   /admin/api/reset        clear the attempt log
"""
import base64
import hashlib
import hmac
import re
import secrets
import shutil
from datetime import datetime

import cv2
import numpy as np
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash

import database as db
import evaluation
import face_engine
import fusion
import keystroke as ks
import ratelimit
from config import (ADMIN_PIN, COOKIE_SECURE, ENROLL_FRAMES,
                    ENROLL_FRAMES_CAP, ENROLL_KS_SAMPLES, FACE_DIR,
                    KS_MIN_PASSWORD_LEN, LOGIN_FRAMES, MAX_EVENTS_PER_REQ,
                    MAX_FRAMES_PER_REQ, MIN_VALID_FRAMES, SECRET_FILE,
                    SUGGESTED_PASSPHRASE, USERNAME_RE)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 48 * 1024 * 1024   # ~10 webp-quality frames

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",       # CSRF defense for the admin session
    SESSION_COOKIE_SECURE=COOKIE_SECURE, # True once served over HTTPS
)


def _load_secret() -> str:
    """Persist the Flask session secret so admin stays signed in across restarts."""
    try:
        return SECRET_FILE.read_text().strip()
    except OSError:
        key = secrets.token_hex(32)
        SECRET_FILE.parent.mkdir(parents=True, exist_ok=True)
        SECRET_FILE.write_text(key)
        return key


app.secret_key = _load_secret()

_bad_username = re.compile(USERNAME_RE)
_dotted_name = re.compile(r"[._-]+$")   # names made only of dots/dashes/underscores


def admin_required(view):
    def wrapped(*args, **kwargs):
        if not session.get("admin"):
            api_call = request.path.startswith("/api/") or \
                request.path.startswith("/admin/api")
            if api_call:
                return _err(401, "admin session required")
            return redirect(url_for("admin_login_page"))
        return view(*args, **kwargs)
    wrapped.__name__ = view.__name__
    return wrapped


# ---------------------------------------------------------------------------
# Global hardening: security headers + safe error responses
# ---------------------------------------------------------------------------
@app.after_request
def _security_headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()"
    resp.headers["Content-Security-Policy"] = (
        "default-src 'self'; img-src 'self'; style-src 'self'; "
        "script-src 'self'; media-src 'self' blob:; connect-src 'self'; "
        "base-uri 'none'; frame-ancestors 'none'; object-src 'none'")
    return resp


@app.errorhandler(Exception)
def _unhandled_error(err):
    if isinstance(err, HTTPException):
        return err
    app.logger.exception("unhandled error")
    return _err(500, "internal error - see the server log")


def _rate_limited(kind: str):
    """Return a 429 response body when the caller is over quota, else None."""
    over = ratelimit.exceeded(kind)
    if over:
        limit, window = over
        resp = jsonify(ok=False, error=f"rate limit: max {limit} per "
                                       f"{window}s - slow down")
        resp.status_code = 429
        resp.headers["Retry-After"] = str(window)
        return resp
    return None


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------
@app.get("/")
def index():
    users = db.list_users()
    return render_template("index.html", users=users,
                           counts=[db.user_sample_counts(u["username"])
                                   for u in users],
                           summary=db.attempt_summary(),
                           passphrase=SUGGESTED_PASSPHRASE,
                           n_frames=ENROLL_FRAMES, n_rounds=ENROLL_KS_SAMPLES)


@app.get("/enroll")
def enroll_page():
    return render_template("enroll.html",
                           n_frames=ENROLL_FRAMES,
                           n_typing_rounds=ENROLL_KS_SAMPLES,
                           min_len=KS_MIN_PASSWORD_LEN,
                           passphrase=SUGGESTED_PASSPHRASE)


@app.get("/login")
def login_page():
    mode = request.args.get("mode", "login")
    users = [u["username"] for u in db.list_users()]
    return render_template("login.html", mode=mode, users=users,
                           passphrase=SUGGESTED_PASSPHRASE,
                           n_frames=LOGIN_FRAMES)


@app.get("/evaluation")
def evaluation_page():
    return render_template("evaluation.html", summary=db.attempt_summary(),
                           cfg_threshold=fusion.current_threshold())


@app.get("/admin")
def admin_page():
    if not session.get("admin"):
        return render_template("admin_login.html")
    return render_template("admin.html")


# ---------------------------------------------------------------------------
# Admin: auth + data APIs
# ---------------------------------------------------------------------------
@app.post("/admin/login")
def admin_login_page():
    """Form posts redirect to the console; JSON posts return the session cookie."""
    limited = _rate_limited("admin_login")
    if limited is not None:
        return limited
    if request.is_json:
        pin = (request.get_json(silent=True) or {}).get("pin")
        if not isinstance(pin, str) or not hmac.compare_digest(pin.strip(), ADMIN_PIN):
            return _err(401, "incorrect PIN")
        session["admin"] = True
        resp = _effective_settings()
        return resp
    pin = (request.form.get("pin") or "").strip()
    if not hmac.compare_digest(pin, ADMIN_PIN):
        return render_template("admin_login.html", error="Incorrect PIN"), 401
    session["admin"] = True
    return redirect(url_for("admin_page"))


@app.post("/admin/logout")
def admin_logout():
    session.pop("admin", None)
    return redirect(url_for("admin_page"))


@app.get("/admin/api/overview")
@admin_required
def admin_overview():
    data = db.admin_overview()
    w_face, w_ks = fusion.current_weights()
    data["settings"] = {"decision_threshold": fusion.current_threshold(),
                        "w_face": round(w_face, 3), "w_keystroke": round(w_ks, 3)}
    data["recent"] = db.recent_attempts()
    data["charts"] = chart_links()
    return jsonify(ok=True, **data)


@app.get("/admin/api/attempts")
@admin_required
def admin_attempts():
    rows, total = db.list_attempts(
        mode=request.args.get("mode"),
        decision=request.args.get("decision"),
        relation=request.args.get("relation"),
        q=request.args.get("q"),
        limit=request.args.get("limit", 25),
        offset=request.args.get("offset", 0))
    return jsonify(ok=True, rows=rows, total=total)


@app.post("/admin/api/settings")
@admin_required
def admin_settings():
    data = request.get_json(force=True, silent=True) or {}
    try:
        thr = float(data.get("decision_threshold"))
        w_face = float(data.get("w_face"))
    except (TypeError, ValueError):
        return _err(400, "threshold and weight must be numbers")
    if not (0.01 <= thr <= 0.99) or not (0.0 <= w_face <= 1.0):
        return _err(400, "threshold in [0.01, 0.99]; face weight in [0, 1]")
    db.set_settings({"decision_threshold": thr, "w_face": w_face,
                     "w_keystroke": round(1.0 - w_face, 6)})
    return _effective_settings()


@app.post("/admin/api/reset")
@admin_required
def admin_reset_attempts():
    n = db.reset_attempts()
    return jsonify(ok=True, removed=n, message=f"cleared {n} attempt rows")


def _effective_settings():
    w_face, w_ks = fusion.current_weights()
    return jsonify(ok=True, settings={
        "decision_threshold": fusion.current_threshold(),
        "w_face": round(w_face, 3), "w_keystroke": round(w_ks, 3)})


def chart_links():
    return {"roc": "/static/generated/roc.png?v=" + _ts(),
            "dist": "/static/generated/distributions.png?v=" + _ts()}


def _ts() -> str:
    return datetime.now().strftime("%H%M%S")


# ---------------------------------------------------------------------------
# Enrollment
# ---------------------------------------------------------------------------
@app.post("/api/enroll")
def api_enroll():
    limited = _rate_limited("enroll")
    if limited is not None:
        return limited
    data = request.get_json(force=True, silent=True) or {}
    username = (data.get("username") or "").strip().lower()
    password = data.get("password") or ""
    frames = data.get("frames") or []
    rounds = data.get("ks_samples") or []

    if not _bad_username.match(username) or _dotted_name.fullmatch(username):
        return _err(400, f"username must match {USERNAME_RE} and "
                         f"cannot be only dots/dashes/underscores")
    if len(password) < KS_MIN_PASSWORD_LEN:
        return _err(400, f"passphrase needs at least {KS_MIN_PASSWORD_LEN} characters")
    if len(frames) > ENROLL_FRAMES_CAP:
        return _err(400, f"too many frames ({len(frames)}) - cap is {ENROLL_FRAMES_CAP}")
    if len(rounds) > ENROLL_KS_SAMPLES * 4:
        return _err(400, "too many typing rounds in one request")
    if db.user_exists(username):
        return _err(409, f"user '{username}' already exists - delete them first "
                         f"if re-enrolling")

    # ---- face embeddings ---------------------------------------------------
    embeddings, saved_frames = [], []
    for b64 in frames:
        try:
            embeddings.append(face_engine.embed_b64(b64))
        except face_engine.FaceError:
            continue     # frames without a clean single face are skipped
        if len(saved_frames) < 6:
            saved_frames.append(b64)
    if len(embeddings) < MIN_VALID_FRAMES:
        return _err(422, f"only {len(embeddings)}/{len(frames)} frames contained a "
                         f"clear single face. Face the camera and retake.")

    # ---- keystroke rounds ----------------------------------------------------
    try:
        clean = ks.check_enrollment(rounds)
    except ks.KeystrokeError as exc:
        msg = f"typing round {exc.round_index}: {exc.reason}" \
            if exc.round_index else exc.reason
        return _err(422, f"keystroke sample rejected: {msg}")

    model = ks.KeystrokeModel.from_samples(clean)   # sanity: >= 3 rounds, same phrase

    # ---- persist -------------------------------------------------------------
    # The passphrase must NOT be stored: only a fingerprint that can verify
    # "all rounds share the same phrase" without revealing the phrase itself.
    phrase_fingerprint = hashlib.sha256(password.encode("utf-8")).hexdigest()[:32]
    uid = db.create_user(username, generate_password_hash(password))
    for emb in embeddings:
        db.add_face_embedding(uid, emb)
    for s in clean:
        db.add_keystroke_sample(uid, phrase_fingerprint, s["holds"], s["lats"])

    user_dir = FACE_DIR / username
    user_dir.mkdir(parents=True, exist_ok=True)
    for i, b64 in enumerate(saved_frames):
        buf = np.frombuffer(base64.b64decode(b64), dtype=np.uint8)
        cv2.imwrite(str(user_dir / f"enroll_{i:02d}.jpg"), cv2.imdecode(buf, 1))

    return jsonify(ok=True, username=username,
                   face_frames_used=len(embeddings),
                   keystroke_rounds_used=len(clean),
                   face_embedding_dim=len(embeddings[0]),
                   phrase=model.phrase)


# ---------------------------------------------------------------------------
# Login / evaluation attempts
# ---------------------------------------------------------------------------
@app.post("/api/attempt")
def api_attempt():
    limited = _rate_limited("attempt")
    if limited is not None:
        return limited
    data = request.get_json(force=True, silent=True) or {}
    mode = data.get("mode", "login")
    if mode not in ("login", "eval"):
        mode = "login"
    claimed = (data.get("username") or "").strip().lower()
    operator = (data.get("operator") or "").strip().lower() if mode == "eval" else None
    password = data.get("password") or ""
    events = data.get("events") or []
    frames = data.get("frames") or []

    if not isinstance(frames, list) or not isinstance(events, list):
        return _err(400, "frames and events must be arrays")
    if len(frames) > MAX_FRAMES_PER_REQ:
        return _err(400, f"too many frames ({len(frames)}) - cap is "
                         f"{MAX_FRAMES_PER_REQ}")
    if len(events) > MAX_EVENTS_PER_REQ:
        return _err(400, f"too many keystroke events ({len(events)}) - cap is "
                         f"{MAX_EVENTS_PER_REQ}")
    if len(password) > 256:
        return _err(400, "passphrase too long")

    if mode == "eval" and not operator:
        return _err(400, "evaluation mode requires selecting who is operating")
    if not claimed:
        return _err(400, "enter a username")

    user = db.get_user(claimed)
    if user is None:
        return _err(404, f"user '{claimed}' is not enrolled")

    # Knowledge factor ---------------------------------------------------------
    password_ok = check_password_hash(user["password_hash"], password)
    if not password_ok:
        db.add_attempt(mode, claimed, operator, False, None, None, None, None,
                       "REJECT", "wrong passphrase (knowledge factor failed)")
        return jsonify(ok=True, decision="REJECT",
                       reason="wrong passphrase",
                       scores=None)

    # Face modality ------------------------------------------------------------
    face_cos, face_norm = None, None
    face_err = None
    valid = 0
    gallery = db.get_face_gallery(claimed)
    for b64 in frames:
        try:
            emb = face_engine.embed_b64(b64)
        except face_engine.FaceError:
            continue
        valid += 1
        if gallery:
            score = face_engine.match_score(gallery, emb)
            if face_cos is None or score > face_cos:
                face_cos = score
    if face_cos is not None:
        face_norm = face_engine.normalize(face_cos)
    elif valid == 0:
        face_err = "no frame contained a detectable face - look at the camera"

    # Keystroke modality ---------------------------------------------------------
    ks_sim, ks_norm, ks_valid, ks_err = None, None, None, None
    try:
        sample = ks.sample_from_record(events, password)
        samples = db.get_keystroke_samples(claimed)
        if not samples:
            ks_err = "user has no keystroke template"
        else:
            model = ks.KeystrokeModel.from_samples(
                [{"phrase": p, "holds": h, "lats": l} for p, h, l in samples])
            ks_sim = model.similarity(sample)
            ks_norm = fusion.normalize_keystroke(ks_sim)
            ks_valid = True
    except ks.KeystrokeError as exc:
        ks_valid = False
        ks_err = exc.reason

    # Fusion + decision ----------------------------------------------------------
    fused, decision, notes = None, "REJECT", []
    if face_norm is not None and ks_norm is not None:
        fused = fusion.fuse(face_norm, ks_norm)
        decision = fusion.decide(fused)
    else:
        if face_err:
            notes.append("face modality failed: " + face_err)
        if ks_err:
            notes.append("keystroke modality failed: " + ks_err)
        notes.append("decision requires BOTH modalities")

    db.add_attempt(mode, claimed, operator, True, face_cos, ks_valid, ks_sim,
                   fused, decision, "; ".join(notes))

    w_face, w_ks = fusion.current_weights()
    return jsonify(ok=True, decision=decision,
                   scores={"face_cos": _r(face_cos), "face_norm": _r(face_norm),
                           "ks_sim": _r(ks_sim), "ks_norm": _r(ks_norm),
                           "fused": _r(fused),
                           "threshold": round(fusion.current_threshold(), 4),
                           "weights": {"face": round(w_face, 3),
                                       "keystroke": round(w_ks, 3)}},
                   notes=notes)


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------
@app.post("/api/evaluate")
def api_evaluate():
    limited = _rate_limited("evaluate")
    if limited is not None:
        return limited
    rows = db.scored_attempts()
    if not rows:
        return _err(422, "no labeled evaluation attempts yet. Collect them on the "
                         "login page in evaluation mode (?mode=eval): each operator "
                         "logs in as themselves (genuine) and as other users "
                         "(impostor).")
    report = evaluation.compute(rows, fusion.current_threshold())
    return jsonify(ok=True, report=report,
                   charts=chart_links())


# ---------------------------------------------------------------------------
# Users admin (protected)
# ---------------------------------------------------------------------------
@app.get("/api/users")
def api_users():
    out = []
    for u in db.list_users():
        out.append({"username": u["username"], **db.user_sample_counts(u["username"])})
    return jsonify(ok=True, users=out, summary=db.attempt_summary())


@app.delete("/api/users/<name>")
@admin_required
def api_delete_user(name):
    """Destructive op on a derived path: the name comes from the URL, so the
    target directory is proven safe before anything is removed — regex shape,
    resolved location strictly one level under FACE_DIR, and ownership
    evidence from the DB. On any refusal we log and stop; never a broader
    fallback path."""
    name = name.lower()
    if not _bad_username.fullmatch(name) or _dotted_name.fullmatch(name):
        app.logger.warning("refused delete: malformed user name %r", name)
        return _err(400, "invalid user name")

    face_root = FACE_DIR.resolve()
    user_dir = (FACE_DIR / name).resolve()          # symlinks resolved
    if user_dir.parent != face_root:
        app.logger.warning("refused delete: path escapes face dir (%s)", user_dir)
        return _err(400, "invalid user name")

    if not db.user_exists(name):                    # ownership evidence, read first
        return _err(404, f"user '{name}' not found")

    db.delete_user(name)
    shutil.rmtree(user_dir, ignore_errors=True)
    return jsonify(ok=True)


# ---------------------------------------------------------------------------
def _r(v, nd=4):
    return None if v is None else round(float(v), nd)


def _err(code: int, message: str):
    return jsonify(ok=False, error=message), code


if __name__ == "__main__":
    db.init_db()
    print("ARGUS biometric gate -> http://127.0.0.1:5000")
    print("First face capture will download deepface weights (~250 MB, once).")
    app.run(host="127.0.0.1", port=5000, threaded=True, use_reloader=False)
