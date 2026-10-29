"""Minimal in-process fixed-window rate limiter.

Per the security checklist: this is safe for the single-process dev server
that serves this app (threaded, one interpreter). If the app is ever served
by more than one worker process, replace the local store with a shared
backend (Redis, SQLite, ...) — per-process counters would let each instance
admit its own quota, multiplying the real limit by the process count.
"""
import threading
import time

from flask import request

import config

_hits: dict = {}
_lock = threading.Lock()


def exceeded(kind: str):
    """Returns (limit, window_seconds) when over quota, else None."""
    rule = config.RATE_LIMITS.get(kind)
    if not rule:
        return None
    limit, window = rule
    key = (kind, request.remote_addr or "unknown")
    now = time.time()
    with _lock:
        stamps = _hits.get(key, [])
        cutoff = now - window
        while stamps and stamps[0] <= cutoff:
            stamps.pop(0)
        if len(stamps) >= limit:
            _hits[key] = stamps
            return limit, window
        stamps.append(now)
        _hits[key] = stamps
    return None
