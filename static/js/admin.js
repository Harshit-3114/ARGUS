/* Admin console: tabs, KPI overview, attempt log with filters + pagination,
 * user management and runtime fusion settings. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------------- helpers ---------------- */
  function toast(message, kind) {
    const root = $("toast-root");
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");      // leave via the entry edge, then remove
      const done = () => { if (el.isConnected) el.remove(); };
      el.addEventListener("transitionend", done, { once: true });
      setTimeout(done, 300);        // fallback if transitions are disabled
    }, 3800);
  }

  const pct = (x) => (x === null || x === undefined) ? "—" :
    (Number(x) * 100).toFixed(1) + "%";
  const val = (x) => (x === null || x === undefined) ? "—" : Number(x).toFixed(3);
  const when = (ts) => ts ? new Date(ts * 1000).toLocaleString(
    undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const badge = (text, kind) => `<span class="badge ${kind}">${esc(text)}</span>`;

  /* ---------------- tabs ---------------- */
  function activate(tab) {
    $$(".sidenav-item").forEach((b) =>
      b.classList.toggle("active", b.dataset.tab === tab));
    $$(".admin-tab").forEach((s) => { s.hidden = s.dataset.tab !== tab; });
    if (tab === "overview") loadOverview();
    if (tab === "attempts") loadAttempts();
    if (tab === "users") loadUsers();
    if (tab === "settings") loadSettings();
  }
  $$(".sidenav-item").forEach((b) =>
    b.addEventListener("click", () => activate(b.dataset.tab)));
  $$("[data-tab-target]").forEach((b) =>
    b.addEventListener("click", () => activate(b.dataset.tabTarget)));

  /* ---------------- overview ---------------- */
  let cache = null;

  function kpi(num, label) {
    return `<article class="kpi"><span class="kpi-num">${num}</span>` +
      `<span class="kpi-label">${esc(label)}</span></article>`;
  }

  async function loadOverview() {
    try {
      cache = await (await fetch("/admin/api/overview")).json();
    } catch (err) {
      toast("Could not load overview: " + err.message, "bad");
      return;
    }
    const t = cache.totals;
    const acceptRate = t.attempts ? (t.accepts / t.attempts * 100).toFixed(0) + "%" : "—";
    $("kpi-row").innerHTML =
      kpi(t.attempts, "attempts logged") +
      kpi(acceptRate, "accept rate") +
      kpi(cache.users.length, "enrolled users") +
      kpi(t.eval_genuine + " / " + t.eval_impostor, "labeled genuine / impostor") +
      kpi(t.knowledge_fails, "knowledge-gate fails") +
      kpi(when(t.last_attempt), "last attempt");

    recentTable();
    charts(cache.charts);
  }

  function attemptRow(r, { withOperator = true } = {}) {
    let relation = badge("public", "muted");
    if (r.operator) {
      relation = r.operator === r.claimed
        ? badge("genuine", "good") : badge("impostor", "bad");
    }
    const dec = r.decision === "ACCEPT"
      ? badge("ACCEPT", "good") : badge("REJECT", "bad");
    return `<tr>
      <td>${when(r.created)}</td>
      <td>${esc(r.mode)}</td>
      <td><code>${esc(r.claimed)}</code></td>
      ${withOperator ? `<td>${r.operator ? "<code>" + esc(r.operator) + "</code>" :
        '<span class="muted">—</span>'}</td>` : ""}
      <td>${withOperator ? relation : ""}</td>
      <td class="num">${r.password_ok ? "✓" : "✗"}</td>
      <td class="num">${val(r.face_cos)}</td>
      <td class="num">${val(r.ks_sim)}</td>
      <td class="num">${val(r.fused)}</td>
      <td>${dec}</td>
      <td class="muted small" title="${esc(r.note || "")}">${esc(r.note || "")}</td>
    </tr>`;
  }

  function recentTable() {
    const rows = cache.recent.map((r) => attemptRow(r)).join("");
    $("recent-attempts").innerHTML = rows
      ? `<table><thead><tr><th>time</th><th>mode</th><th>claimed</th><th>operator</th>
         <th>relation</th><th class="num">pw</th><th class="num">face</th>
         <th class="num">keys</th><th class="num">fused</th><th>decision</th>
         <th>note</th></tr></thead><tbody>${rows}</tbody></table>`
      : emptyState("No attempts logged yet",
        "Log in for real on the public page, or collect labeled attempts in evaluation mode.");
  }

  function charts(links) {
    const wrap = $("overview-charts");
    wrap.innerHTML = "";
    [["roc", "ROC curves"], ["dist", "Score distributions"]].forEach(([key, label]) => {
      const img = document.createElement("img");
      img.className = "chart";
      img.alt = label;
      img.src = links[key];
      img.onerror = () => {
        img.replaceWith(Object.assign(document.createElement("div"),
          { className: "chart-fallback",
            textContent: `${label} — not generated yet. Run the metric sweep on the evaluation page.` }));
      };
      wrap.appendChild(img);
    });
  }

  function emptyState(title, hint) {
    return `<div class="empty"><p class="empty-title">${esc(title)}</p>` +
      `<p class="hint">${esc(hint)}</p></div>`;
  }

  /* ---------------- users ---------------- */
  async function loadUsers() {
    let data;
    try { data = await (await fetch("/admin/api/overview")).json(); }
    catch (err) { toast("Could not load users: " + err.message, "bad"); return; }
    const rows = data.users.map((u) => `<tr>
      <td><code>${esc(u.username)}</code></td>
      <td class="num">${u.face}</td>
      <td class="num">${u.keystroke}</td>
      <td class="num">${u.attempts_made}</td>
      <td>${when(u.created)}</td>
      <td class="row-action"><button class="btn sm danger-outline" data-del="${esc(u.username)}"
        type="button">delete</button></td>
    </tr>`).join("");
    $("users-table").innerHTML = rows
      ? `<table><thead><tr><th>user</th><th class="num">face frames</th>
        <th class="num">typing rounds</th><th class="num">attempts made</th>
        <th>enrolled</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
      : emptyState("No enrolled users",
        "Run the enrollment wizard to capture face frames and typing rhythm.");

    $$("[data-del]", $("users-table")).forEach((btn) => btn.addEventListener("click", async () => {
      const name = btn.dataset.del;
      if (!confirm(`Delete user "${name}" and all their biometrics?`)) return;
      const res = await fetch(`/api/users/${name}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) { toast(`User ${name} deleted`, "good"); loadUsers(); }
      else toast(body.error || "Delete failed", "bad");
    }));
  }

  /* ---------------- attempt log ---------------- */
  const state = { offset: 0 };

  async function loadAttempts() {
    const limit = Number($("f-limit").value);
    const params = new URLSearchParams({
      mode: $("f-mode").value, decision: $("f-decision").value,
      relation: $("f-relation").value, q: $("f-q").value,
      limit, offset: state.offset,
    });
    let data;
    try { data = await (await fetch("/admin/api/attempts?" + params)).json(); }
    catch (err) { toast("Could not load attempts: " + err.message, "bad"); return; }
    const rows = data.rows.map((r) => attemptRow(r)).join("");
    $("attempts-table").innerHTML = rows
      ? `<table><thead><tr><th>time</th><th>mode</th><th>claimed</th><th>operator</th>
        <th>relation</th><th class="num">pw</th><th class="num">face cos</th>
        <th class="num">keys sim</th><th class="num">fused</th><th>decision</th>
        <th>note</th></tr></thead><tbody>${rows}</tbody></table>`
      : emptyState("No matching attempts", "Adjust the filters, or collect attempts first.");

    const from = data.total ? state.offset + 1 : 0;
    const to = Math.min(state.offset + limit, data.total);
    $("pg-info").textContent = `${from}–${to} of ${data.total}`;
    $("pg-prev").disabled = state.offset <= 0;
    $("pg-next").disabled = state.offset + limit >= data.total;
  }

  ["f-mode", "f-decision", "f-relation", "f-limit"].forEach((id) =>
    $(id).addEventListener("change", () => { state.offset = 0; loadAttempts(); }));
  let searchDebounce = null;
  $("f-q").addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => { state.offset = 0; loadAttempts(); }, 260);
  });
  $("pg-prev").addEventListener("click", () => {
    state.offset = Math.max(0, state.offset - Number($("f-limit").value));
    loadAttempts();
  });
  $("pg-next").addEventListener("click", () => {
    state.offset += Number($("f-limit").value);
    loadAttempts();
  });

  /* ---------------- settings ---------------- */
  async function loadSettings() {
    let data;
    try { data = await (await fetch("/admin/api/overview")).json(); }
    catch (err) { toast("Could not load settings: " + err.message, "bad"); return; }
    const s = data.settings;
    $("s-threshold").value = s.decision_threshold;
    $("s-wface").value = s.w_face;
    renderEffective(s);
    $("w-effect").textContent =
      `keystroke weight = (1 − ${s.w_face.toFixed(2)}) = ${(1 - s.w_face).toFixed(2)}`;
  }

  function renderEffective(s) {
    $("effective-kv").innerHTML = `
      <div><dt>decision threshold θ</dt><dd>${s.decision_threshold}</dd></div>
      <div><dt>face weight</dt><dd>${s.w_face}</dd></div>
      <div><dt>keystroke weight</dt><dd>${s.w_keystroke}</dd></div>
      <div><dt>accept rule</dt><dd>fused ≥ θ</dd></div>`;
  }

  $("settings-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = { decision_threshold: $("s-threshold").value,
      w_face: $("s-wface").value };
    const res = await fetch("/admin/api/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      toast("Fusion settings saved", "good");
      renderEffective(body.settings);
      $("w-effect").textContent =
        `keystroke weight = (1 − ${body.settings.w_face.toFixed(2)}) = ` +
        (1 - body.settings.w_face).toFixed(2);
    } else toast(body.error || "Save failed", "bad");
  });

  /* danger zone: clear the attempt log */
  $("btn-reset-attempts").addEventListener("click", async () => {
    if (!confirm("Clear the ENTIRE attempt log? Users and templates are kept.")) return;
    if (!confirm("This cannot be undone. Proceed?")) return;
    const res = await fetch("/admin/api/reset", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    $("reset-status").textContent = res.ok
      ? `cleared ${body.removed} attempt rows` : (body.error || "failed");
    if (res.ok) toast("Attempt log cleared", "good");
  });

  /* ---------------- boot ---------------- */
  activate("overview");
})();
