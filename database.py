"""SQLite persistence layer: users, biometric templates, and logged attempts."""
import json
import sqlite3
import time

from config import DB_PATH, FACE_DIR, DATA_DIR

_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created       REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS face_templates (
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    embedding TEXT NOT NULL,          -- JSON list of floats (one per enrolled frame)
    created   REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS keystroke_samples (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phrase  TEXT NOT NULL,
    holds   TEXT NOT NULL,            -- JSON list: per-char key hold times (ms)
    lats    TEXT NOT NULL,            -- JSON list: key-down -> key-down latencies (ms)
    created REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS attempts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    mode        TEXT NOT NULL,        -- 'login' | 'eval'
    claimed     TEXT NOT NULL,        -- username the operator tried to log in as
    operator    TEXT,                 -- who actually operated (eval mode only)
    password_ok INTEGER NOT NULL,     -- knowledge factor passed?
    face_cos    REAL,                 -- raw max cosine similarity vs gallery
    ks_valid    INTEGER,              -- typing sample structurally valid
    ks_sim      REAL,                 -- keystroke similarity in [0, 1]
    fused       REAL,                 -- fused normalized score
    decision    TEXT NOT NULL,        -- 'ACCEPT' | 'REJECT' | ...
    note        TEXT,
    created     REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    FACE_DIR.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.executescript(_SCHEMA)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
def user_exists(name: str) -> bool:
    with connect() as conn:
        row = conn.execute("SELECT 1 FROM users WHERE username = ?", (name,)).fetchone()
        return row is not None


def create_user(name: str, password_hash: str) -> int:
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO users (username, password_hash, created) VALUES (?, ?, ?)",
            (name, password_hash, time.time()),
        )
        return cur.lastrowid


def get_user(name: str):
    with connect() as conn:
        return conn.execute("SELECT * FROM users WHERE username = ?", (name,)).fetchone()


def list_users():
    with connect() as conn:
        return conn.execute("SELECT * FROM users ORDER BY username").fetchall()


def delete_user(name: str) -> bool:
    with connect() as conn:
        cur = conn.execute("DELETE FROM users WHERE username = ?", (name,))
        return cur.rowcount > 0


def user_sample_counts(name: str):
    """Number of enrolled face embeddings and keystroke samples for a user."""
    with connect() as conn:
        uid = conn.execute("SELECT id FROM users WHERE username = ?", (name,)).fetchone()
        if uid is None:
            return {"face": 0, "keystroke": 0}
        face = conn.execute(
            "SELECT COUNT(*) c FROM face_templates WHERE user_id = ?", (uid["id"],)
        ).fetchone()["c"]
        ks = conn.execute(
            "SELECT COUNT(*) c FROM keystroke_samples WHERE user_id = ?", (uid["id"],)
        ).fetchone()["c"]
        return {"face": face, "keystroke": ks}


# ---------------------------------------------------------------------------
# Template storage
# ---------------------------------------------------------------------------
def add_face_embedding(user_id: int, embedding) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO face_templates (user_id, embedding, created) VALUES (?, ?, ?)",
            (user_id, json.dumps([float(v) for v in embedding]), time.time()),
        )


def get_face_gallery(name: str):
    """All stored embeddings for a user -> list of float lists."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT f.embedding FROM face_templates f JOIN users u ON u.id = f.user_id "
            "WHERE u.username = ?",
            (name,),
        ).fetchall()
        return [json.loads(r["embedding"]) for r in rows]


def add_keystroke_sample(user_id: int, phrase: str, holds, lats) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO keystroke_samples (user_id, phrase, holds, lats, created) "
            "VALUES (?, ?, ?, ?, ?)",
            (user_id, phrase, json.dumps(holds), json.dumps(lats), time.time()),
        )


def get_keystroke_samples(name: str):
    """(phrase, holds, lats) tuples for a user's enrollment typing rounds."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT k.phrase, k.holds, k.lats FROM keystroke_samples k "
            "JOIN users u ON u.id = k.user_id WHERE u.username = ? ORDER BY k.created",
            (name,),
        ).fetchall()
        return [(r["phrase"], json.loads(r["holds"]), json.loads(r["lats"])) for r in rows]


# ---------------------------------------------------------------------------
# Runtime settings (admin-tunable overrides of config.py defaults)
# ---------------------------------------------------------------------------
def get_setting(key: str, default=None):
    """Read one setting; silently fall back to default if the table is absent."""
    try:
        with connect() as conn:
            row = conn.execute("SELECT value FROM settings WHERE key = ?",
                               (key,)).fetchone()
            return row["value"] if row else default
    except sqlite3.Error:
        return default


def set_settings(mapping: dict) -> None:
    with connect() as conn:
        conn.executemany(
            "INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [(k, str(v)) for k, v in mapping.items()])


def list_attempts(mode=None, decision=None, relation=None, q=None,
                  limit=25, offset=0):
    """Filtered, paginated attempt log for the admin dashboard.

    relation: 'genuine' (operator == claimed) | 'impostor' (operator != claimed)
              | 'unknown' (no operator, plain login mode) | None = all.
    """
    where, params = [], []
    if mode in ("login", "eval"):
        where.append("mode = ?")
        params.append(mode)
    if decision in ("ACCEPT", "REJECT"):
        where.append("decision = ?")
        params.append(decision)
    if relation == "genuine":
        where.append("operator IS NOT NULL AND operator = claimed")
    elif relation == "impostor":
        where.append("operator IS NOT NULL AND operator <> claimed")
    elif relation == "unknown":
        where.append("operator IS NULL")
    if q:
        like = f"%{q.strip().lower()}%"
        where.append("(lower(claimed) LIKE ? OR lower(coalesce(operator,'')) LIKE ?)")
        params += [like, like]
    sql_where = ("WHERE " + " AND ".join(where)) if where else ""
    with connect() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) c FROM attempts {sql_where}", params).fetchone()["c"]
        rows = conn.execute(
            f"SELECT * FROM attempts {sql_where} ORDER BY id DESC "
            f"LIMIT ? OFFSET ?",
            params + [int(limit), int(offset)]).fetchall()
    return [dict(r) for r in rows], total


def admin_overview():
    """Aggregated counters for the admin overview + per-user attempt activity."""
    with connect() as conn:
        totals = {
            "attempts": conn.execute("SELECT COUNT(*) c FROM attempts").fetchone()["c"],
            "accepts": conn.execute(
                "SELECT COUNT(*) c FROM attempts WHERE decision='ACCEPT'"
            ).fetchone()["c"],
            "rejects": conn.execute(
                "SELECT COUNT(*) c FROM attempts WHERE decision='REJECT'"
            ).fetchone()["c"],
            "knowledge_fails": conn.execute(
                "SELECT COUNT(*) c FROM attempts WHERE password_ok=0"
            ).fetchone()["c"],
        }
        labeled = conn.execute(
            "SELECT SUM(CASE WHEN operator = claimed THEN 1 ELSE 0 END) g, "
            "       SUM(CASE WHEN operator <> claimed THEN 1 ELSE 0 END) i "
            "FROM attempts WHERE operator IS NOT NULL AND password_ok = 1"
        ).fetchone()
        totals["eval_genuine"] = labeled["g"] or 0
        totals["eval_impostor"] = labeled["i"] or 0
        last = conn.execute("SELECT MAX(created) m FROM attempts").fetchone()["m"]
        totals["last_attempt"] = last

        users = []
        for u in conn.execute("SELECT * FROM users ORDER BY username"):
            face = conn.execute(
                "SELECT COUNT(*) c FROM face_templates WHERE user_id=?",
                (u["id"],)).fetchone()["c"]
            kt = conn.execute(
                "SELECT COUNT(*) c FROM keystroke_samples WHERE user_id=?",
                (u["id"],)).fetchone()["c"]
            ops = conn.execute(
                "SELECT COUNT(*) c FROM attempts WHERE operator=?",
                (u["username"],)).fetchone()["c"]
            users.append({
                "username": u["username"],
                "created": u["created"],
                "face": face, "keystroke": kt, "attempts_made": ops,
            })
    return {"totals": totals, "users": users}


def recent_attempts(n=8):
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM attempts ORDER BY id DESC LIMIT ?", (n,)).fetchall()
    return [dict(r) for r in rows]


def reset_attempts() -> int:
    """Clear the attempt log (evaluation redesign convenience)."""
    with connect() as conn:
        n = conn.execute("SELECT COUNT(*) c FROM attempts").fetchone()["c"]
        conn.execute("DELETE FROM attempts")
    return n


# ---------------------------------------------------------------------------
# Attempts (labeled between enrollments; these are what evaluation consumes)
# ---------------------------------------------------------------------------
def add_attempt(mode, claimed, operator, password_ok, face_cos, ks_valid, ks_sim,
                fused, decision, note="") -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO attempts (mode, claimed, operator, password_ok, face_cos, "
            "ks_valid, ks_sim, fused, decision, note, created) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (mode, claimed, operator, int(bool(password_ok)), face_cos,
             None if ks_valid is None else int(ks_valid), ks_sim, fused, decision, note,
             time.time()),
        )


def scored_attempts():
    """Labeled, knowledge-factor-passed attempts usable for FAR/FRR/EER."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM attempts WHERE operator IS NOT NULL AND password_ok = 1 "
            "AND face_cos IS NOT NULL ORDER BY id"
        ).fetchall()
        return [dict(r) for r in rows]


def attempt_summary():
    """Coverage counters used by the evaluation page checklist."""
    with connect() as conn:
        rows = conn.execute("SELECT * FROM attempts ORDER BY id").fetchall()
    out = {"total": 0, "eval_labeled": 0, "genuine": 0, "impostor": 0,
           "per_operator": {}}
    for r in rows:
        out["total"] += 1
        if r["operator"] is None:
            continue
        out["eval_labeled"] += 1
        per = out["per_operator"].setdefault(
            r["operator"], {"as_self": 0, "as_other": 0})
        if r["operator"] == r["claimed"]:
            out["genuine"] += 1
            per["as_self"] += 1
        else:
            out["impostor"] += 1
            per["as_other"] += 1
    return out
