/* ARGUS HUD helpers: GPU-safe micro-visuals shared by the login and
 * enrollment pages. All motion is transform-only (scale/scaleY). */
window.Hud = (function () {
  "use strict";

  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  /** Horizontal progress meter (.cap-meter > i). transform-based. */
  function meter(iEl, frac) {
    if (!iEl) return;
    iEl.style.transform = "scaleX(" + clamp01(frac).toFixed(3) + ")";
  }

  /** Live keystroke pulse strip: last <=16 completed chars, bar height =
   *  key hold time (normalized ~180 ms). Rebuilds only when the signal
   *  changes, so pollers can call it on a timer. */
  function pulse(stripEl, events) {
    if (!stripEl || !stripEl.isConnected) return;
    const chars = (events || [])
      .filter((ev) => ev.key && ev.key.length === 1 && ev.up !== null)
      .slice(-16);
    const sig = chars.map((c) => c.key + ":" + Math.round(c.up - c.down)).join("|");
    if (sig === stripEl.dataset.sig) return;
    stripEl.dataset.sig = sig;
    stripEl.classList.toggle("idle", chars.length === 0);
    stripEl.innerHTML = "";
    for (const ev of chars) {
      const hold = Math.max(0, ev.up - ev.down);
      const i = document.createElement("i");
      i.style.transform = "scaleY(" + Math.max(0.08, Math.min(1, hold / 180)).toFixed(3) + ")";
      i.title = Math.round(hold) + " ms";
      stripEl.appendChild(i);
    }
  }

  return { meter, pulse };
})();
