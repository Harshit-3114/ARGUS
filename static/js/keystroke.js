/* Keystroke recorder: attaches to an <input> and records {key, down, up} pairs
 * (timestamps in ms via performance.now()) for every typed character.
 *
 * - modifiers (Shift/Ctrl/Alt/Meta/CapsLock) are NOT recorded;
 * - Backspace IS recorded (so the server can reject edited rounds);
 * - paste is blocked: the system must observe physical keystrokes;
 * - keys held via OS auto-repeat produce null "up" or long holds -> rejected.
 */
(function () {
  function attach(input, opts = {}) {
    const events = [];          // {key, down, up|null}
    const pending = new Map();  // code -> [eventRef,...]

    input.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) return;
      if (e.key === "Enter" || e.key === "Tab") {
        if (opts.blockEnter && e.key === "Enter") e.preventDefault();
        return;
      }
      const ev = { key: e.key, down: performance.now(), up: null };
      events.push(ev);
      const stack = pending.get(e.code) || [];
      stack.push(ev);
      pending.set(e.code, stack);
    });

    input.addEventListener("keyup", (e) => {
      const stack = pending.get(e.code);
      if (stack && stack.length) stack.shift().up = performance.now();
    });

    input.addEventListener("paste", (e) => e.preventDefault());

    return {
      events,
      length: () => events.length,
      hasBackspace: () => events.some((ev) => ev.key === "Backspace"),
      totalHolds: () =>
        events
          .filter((ev) => ev.up !== null && ev.key.length === 1)
          .reduce((s, ev) => s + (ev.up - ev.down), 0),
      exported: () => events.slice(),   // copied on JSON.stringify anyway
    };
  }
  window.KsCapture = { attach };
})();
