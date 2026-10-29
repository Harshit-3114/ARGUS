"""Face engine: OpenCV face detection + DeepFace embedding + cosine scoring.

Pipeline:
  1. Decode a base64 JPEG frame (captured in the browser).
  2. Detect faces with OpenCV's Haar cascade; keep the largest one and crop it
     with a margin. (Doing detection ourselves keeps the deepface detector
     backend at "skip", which is fast and robust across deepface versions.)
  3. Embed the crop with DeepFace (Facenet512 by default -> 512-d vector).
  4. Match = max cosine similarity between the probe embedding and every
     embedding stored in the user's gallery.
"""
import base64
import threading

import cv2
import numpy as np

from config import CROP_MARGIN, DETECTOR_BACKEND, FACE_MODEL, MIN_FACE_BOX

_lock = threading.Lock()          # DeepFace/TF inference is not re-entrant safe
_cascade = None
_deepface = None                  # lazy-loaded: importing deepface pulls TF


def _get_cascade():
    global _cascade
    if _cascade is None:
        _cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    return _cascade


def _get_deepface():
    global _deepface
    if _deepface is None:
        # Heavy import (~10 s first time); deferred so the app boots fast.
        from deepface import DeepFace
        _deepface = DeepFace
    return _deepface


class FaceError(Exception):
    """Raised when a frame cannot produce a usable face embedding."""


def crop_largest_face(bgr: np.ndarray) -> np.ndarray:
    """Return the largest detected face crop (with margin) or raise FaceError."""
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    boxes = _get_cascade().detectMultiScale(
        gray, scaleFactor=1.15, minNeighbors=5, minSize=(MIN_FACE_BOX, MIN_FACE_BOX))
    if len(boxes) == 0:
        raise FaceError("no face detected")
    x, y, w, h = max(boxes, key=lambda b: b[2] * b[3])
    mx, my = int(w * CROP_MARGIN), int(h * CROP_MARGIN)
    x0, y0 = max(0, x - mx), max(0, y - my)
    x1, y1 = min(bgr.shape[1], x + w + mx), min(bgr.shape[0], y + h + my)
    crop = bgr[y0:y1, x0:x1]
    if crop.shape[0] < 40 or crop.shape[1] < 40:
        raise FaceError("face crop too small")
    return crop


def embed_b64(frame_b64: str) -> np.ndarray:
    """Decode one base64 JPEG frame -> 512-d embedding (raises FaceError)."""
    try:
        buf = np.frombuffer(base64.b64decode(frame_b64), dtype=np.uint8)
        bgr = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    except Exception as exc:  # malformed base64 / corrupt JPEG
        raise FaceError(f"undecodable frame: {exc}") from exc
    if bgr is None:
        raise FaceError("undecodable frame")
    crop = crop_largest_face(bgr)
    with _lock:
        objs = _get_deepface().represent(
            img_path=crop[:, :, ::-1],   # deepface expects RGB
            model_name=FACE_MODEL,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=False,
        )
    if not objs:
        raise FaceError("embedding failed")
    return np.asarray(objs[0]["embedding"], dtype=np.float64)


def cosine(a, b) -> float:
    a, b = np.asarray(a, dtype=np.float64), np.asarray(b, dtype=np.float64)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def match_score(gallery, probe: np.ndarray) -> float:
    """Max cosine similarity of the probe against all gallery embeddings."""
    return max(cosine(probe, g) for g in gallery) if gallery else 0.0


def normalize(cos: float) -> float:
    """Map cosine similarity [-1, 1] to [0, 1] for score-level fusion."""
    return float(min(max((cos + 1.0) / 2.0, 0.0), 1.0))
