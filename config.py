"""Central configuration for the multimodal biometric login system.

All tunable parameters live here so evaluation results (thresholds, weights)
can be adjusted after running the evaluation sweep without touching logic.
"""
import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
FACE_DIR = DATA_DIR / "face_samples"        # stored enrollment JPEGs (audit trail)
DB_PATH = DATA_DIR / "biometrocs.db"

# ---------------------------------------------------------------------------
# Face engine
# ---------------------------------------------------------------------------
FACE_MODEL = "Facenet512"        # deepface model: "Facenet512" | "Facenet" | "ArcFace" ...
DETECTOR_BACKEND = "skip"        # we crop faces ourselves with OpenCV, then embed
CROP_MARGIN = 0.30               # extra margin around the detected face box
MIN_FACE_BOX = 60                # px: reject detections smaller than this
ENROLL_FRAMES = 10               # frames captured during enrollment
LOGIN_FRAMES = 6                 # frames kept for a login attempt
MIN_VALID_FRAMES = 3             # frames that must contain a detectable single face

# ---------------------------------------------------------------------------
# Keystroke dynamics
# ---------------------------------------------------------------------------
KS_MIN_PASSWORD_LEN = 6          # typed phrase must be at least this long
ENROLL_KS_SAMPLES = 8            # typing rounds collected at enrollment
MAX_HOLD_MS = 450                # a single key held longer => invalid sample
MIN_LATENCY_MS = 10              # impossible digraph latency => invalid sample
MAX_LATENCY_MS = 3000            # digraph gap above this => invalid sample
MIN_HOLD_MS = 8                  # physically implausible hold => invalid sample
HOLD_FLOOR_MS = 35.0             # per-feature std floor used in scaled Manhattan
LATENCY_FLOOR_MS = 55.0

# ---------------------------------------------------------------------------
# Request hardening (all request bodies are untrusted client input)
# ---------------------------------------------------------------------------
MAX_FRAMES_PER_REQ = 32          # hard cap for face frames per API call
MAX_EVENTS_PER_REQ = 128         # hard cap for recorded keystroke events
ENROLL_FRAMES_CAP = ENROLL_FRAMES + 4   # enrollment may send a little extra

RATE_LIMITS = {                  # (max requests, window seconds) per client IP
    "attempt": (30, 60),         # login oracle
    "enroll": (6, 60),
    "admin_login": (10, 900),    # PIN guessing
    "evaluate": (4, 60),         # matplotlib/chart regeneration
}

COOKIE_SECURE = False            # set True when served over HTTPS
ADMIN_PIN = os.environ.get("ARGUS_ADMIN_PIN", "admin123")

# ---------------------------------------------------------------------------
# Fusion + decision
# ---------------------------------------------------------------------------
W_FACE = 0.60                    # weight of the (normalized) face score
W_KEYSTROKE = 0.40               # weight of the (normalized) keystroke score
DECISION_THRESHOLD = 0.78        # fusion score >= threshold => ACCEPT
                                 #
                                 # This is CALIBRATED, not a "middle of the 0-1
                                 # scale" guess. The face score is (cosine + 1) / 2
                                 # and Facenet512 cosines for two different people
                                 # sit around 0.18, not 0.0 - so an impostor's
                                 # face score floors out near 0.59 instead of near
                                 # 0. A threshold of 0.55 therefore landed right on
                                 # the MEDIAN impostor score and admitted 44% of
                                 # them. The measured separation gap is
                                 # (0.757, 0.801); 0.78 is its midpoint, keeping
                                 # ~0.02 of margin on both sides.
                                 #
                                 # Re-run the sweep on /evaluation after changing
                                 # the cohort, and update this value (or set it at
                                 # runtime on the lab page).

# ---------------------------------------------------------------------------
# Admin dashboard
# ---------------------------------------------------------------------------
# ADMIN_PIN is defined in the request-hardening section above; override it
# with the ARGUS_ADMIN_PIN environment variable for anything beyond a lab.
SECRET_FILE = DATA_DIR / "secret_key"   # app secret persisted across restarts

# ---------------------------------------------------------------------------
# Demo conveniences
# ---------------------------------------------------------------------------
SUGGESTED_PASSPHRASE = "biometrics123"   # suggested enrollment password; during a
                                         # lab evaluation every user should use the
                                         # same passphrase so that impostors "know
                                         # the password" and must be caught by
                                         # biometrics, not by the knowledge factor.
USERNAME_RE = r"^[A-Za-z0-9_.-]{3,24}$"
