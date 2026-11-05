/* ARGUS — login: camera HUD, live rhythm pulses, and the staged
 * verification console. The console paces the UX while the real
 * /api/attempt pipeline runs server-side; when the response lands,
 * every displayed number is the server's actual score. */
(function () {
  const $ = (id) => document.getElementById(id);

  /* Flask injects page config as a JSON <script> block (CSP: no
   * 'unsafe-inline', so a JS assignment in HTML would be blocked). */
  function readConfig() {
    const fallback = { nFrames: 6, mode: "login" };
    const el = document.getElementById("bio-config");
    if (!el) return fallback;
    try { return { ...fallback, ...JSON.parse(el.textContent) }; }
    catch { return fallback; }
  }
  const CFG = readConfig();

  /* ---------------- session chip ---------------- */
  $("hud-session").textContent =
    "SCN " + Array.from(crypto.getRandomValues(new Uint8Array(3)))
      .map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();

  /* ---------------- camera HUD (FS-01) ---------------- */
  let meterTimer = null;
  $("btn-cam").addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      await window.BioCam.start($("face-video"),
        { intervalMs: 400, maxFrames: CFG.nFrames });
      document.querySelector(".cam-wrap").classList.add("live");
      $("cam-overlay").textContent = "camera on · align face in frame";
      $("cam-state").textContent = "LIVE";
      $("cam-state").classList.add("live");
      meterTimer = setInterval(() => {
        const n = window.BioCam.count();
        $("face-count").textContent = `${n} frames in buffer`;
        $("face-progress").textContent = `${n}/${CFG.nFrames}`;
        window.Hud.meter($("face-meter"), n / CFG.nFrames);
      }, 280);
    } catch (err) {
      $("cam-overlay").textContent = "camera blocked";
      $("cam-state").textContent = "BLOCKED";
      $("cam-state").classList.add("bad");
      e.target.disabled = false;
      const st = $("login-status");
      st.textContent = "Could not start the camera: " + err.message +
        " — open this page via http://localhost and allow the permission prompt.";
    }
  });

  /* ---------------- rhythm HUD (KD-02) ---------------- */
  const recorder = window.KsCapture.attach($("in-password"));
  let rhythmSig = "";
  setInterval(() => {
    const v = $("in-password");
    const done = recorder.events.filter((ev) => ev.up !== null);
    const sig = done.map((c) => c.key).join("").slice(-16) + ":" + v.value.length;
    if (sig === rhythmSig) return;
    rhythmSig = sig;
    window.Hud.pulse($("ks-pulse"), recorder.events);
    $("ks-count").textContent = `${v.value.length} CH`;
    const stat = $("ks-stat");
    if (recorder.hasBackspace()) {
      stat.textContent = "corrections in progress — final text is what counts";
      stat.classList.add("bad-text");
    } else {
      stat.textContent = v.value.length ? "capturing rhythm…" : "awaiting keystrokes";
      stat.classList.remove("bad-text");
    }
  }, 140);

  /* ---------------- verification console (staged) ---------------- */
  const STAGES = [
    { code: "FS-01", name: "Face embedding", min: 750 },
    { code: "FS-02", name: "Gallery match", min: 800 },
    { code: "KD-02", name: "Rhythm analysis", min: 800 },
    { code: "FS-09", name: "Fusion · decision", min: 700 },
  ];
  const fmt = (x) => (x === null || x === undefined) ? "N/A" :
    (Math.round(x * 1000) / 1000).toFixed(3);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function rowFor(s) {
    const row = document.createElement("div");
    row.className = "c-row";
    row.innerHTML =
      `<span class="c-code mono">${s.code}</span>` +
      `<span class="c-name">${s.name}</span>` +
      `<div class="c-bar"><i></i></div>` +
      `<span class="c-stat mono">STANDBY</span>`;
    return { row, bar: row.querySelector("i"), stat: row.querySelector(".c-stat") };
  }

  function setRow(r, frac, text, cls) {
    r.bar.style.transform = "scaleX(" + clamp01(frac).toFixed(3) + ")";
    r.stat.textContent = text;
    r.row.classList.toggle("fault", cls === "fail");
    r.row.classList.toggle("bypass", cls === "skip");
  }

  function showStamp(text, cls, ms) {
    const stamp = $("stamp");
    stamp.textContent = text;
    stamp.className = "stamp " + cls;
    requestAnimationFrame(() => stamp.classList.add("show"));
    $("v-elapsed").textContent = `PIPELINE ${ms} MS`;
    $("verdict").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderScores(data) {
    const rows = $("scores-rows");
    rows.innerHTML = "";
    if (data.decision === "REJECT" && !data.scores) {
      const n = document.createElement("div");
      n.className = "notes";
      n.textContent = data.reason || "knowledge factor failed";
      rows.appendChild(n);
      return;
    }
    const s = data.scores || {};
    const add = (name, norm, raw) => {
      const row = document.createElement("div");
      row.className = "score-row";
      const label = document.createElement("span");
      label.className = "name";
      label.textContent = name;
      const bar = document.createElement("div");
      bar.className = "bar";
      const fill = document.createElement("i");
      bar.appendChild(fill);
      // Animate transform only: insert at the CSS default scaleX(0), then set
      // the final value on the NEXT frame so the 700ms --ease transition in
      // .bar > i actually plays (a transform set before insertion snaps).
      const w = Math.max(0, Math.min(1, norm || 0));
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fill.style.transform = "scaleX(" + w.toFixed(3) + ")";
      }));
      const pct = document.createElement("span");
      pct.className = "score-num";
      pct.textContent = norm === null || norm === undefined ? "—" :
        (norm * 100).toFixed(1) + "%";
      const detail = document.createElement("span");
      detail.className = "score-num muted";
      detail.textContent = raw || "";
      row.append(label, bar, pct, detail);
      rows.appendChild(row);
    };
    add("FS-02 · Face (normalized)", s.face_norm,
      s.face_cos !== null && s.face_cos !== undefined ? `cos ${s.face_cos}` : "—");
    add("KD-02 · Keystroke (similarity)", s.ks_norm,
      s.ks_sim !== null && s.ks_sim !== undefined ? `sim ${s.ks_sim}` : "—");
    add("FS-09 · Fused score", s.fused,
      `θ ${s.threshold} · w ${s.weights ? s.weights.face + "/" + s.weights.keystroke : ""}`);
    if (data.notes && data.notes.length) {
      const n = document.createElement("div");
      n.className = "notes";
      n.textContent = data.notes.join(" · ");
      rows.appendChild(n);
    }
  }

  async function runConsole(payload, resPromise) {
    const t0 = performance.now();
    const v = $("verdict");
    // un-hide with a 300ms panelIn entrance (class self-removes on animationend)
    v.hidden = false;
    v.classList.add("enter");
    v.addEventListener("animationend", () => v.classList.remove("enter"), { once: true });
    const consoleEl = $("verdict-console");
    consoleEl.innerHTML = "";
    $("scores-rows").innerHTML = "";
    const stamp = $("stamp");
    stamp.className = "stamp";
    $("v-elapsed").textContent = "";

    let body = null, netErr = null;
    resPromise.then((b) => { body = b; }).catch((e) => { netErr = e; });

    const built = [];
    for (const s of STAGES) {
      const r = rowFor(s);
      built.push([s, r]);
      consoleEl.appendChild(r.row);
      r.stat.textContent = "SCANNING";
      const start = performance.now();
      while (performance.now() - start < s.min && !body && !netErr) {
        r.bar.style.transform =
          "scaleX(" + Math.min(0.94, (performance.now() - start) / s.min * 1.1) .toFixed(3) + ")";
        await wait(70);
      }
    }

    // Server still crunching? hold the top bar softly rather than lying "done".
    if (!body && !netErr) {
      for (const [, r] of built) r.stat.textContent = "ANALYZING";
      do { await wait(120); } while (!body && !netErr);
    }

    // Apply the real verdict data to every stage now.
    if (netErr) {
      for (const [, r] of built) setRow(r, 0, "FAULT", "fail");
      const n = document.createElement("div");
      n.className = "notes";
      n.textContent = "request failed: " + netErr.message;
      $("scores-rows").appendChild(n);
      showStamp("ACCESS DENIED", "denied", Math.round(performance.now() - t0));
      return;
    }
    if (body.ok === false) {
      for (const [, r] of built) setRow(r, 0, "FAULT", "fail");
      const n = document.createElement("div");
      n.className = "notes";
      n.textContent = body.error || `HTTP error`;
      $("scores-rows").appendChild(n);
      showStamp("ACCESS DENIED", "denied", Math.round(performance.now() - t0));
      return;
    }

    const knowledgeFail = body.decision === "REJECT" && !body.scores;
    const sc = body.scores || {};
    for (const [s, r] of built) {
      switch (s.code) {
        case "FS-01":
          knowledgeFail ? setRow(r, 0, "BYPASS", "skip")
            : setRow(r, clamp01((payload.frames || []).length / (CFG.nFrames || 1)),
                     knowledgeFail ? "" : `OK · ${(payload.frames || []).length} FR`);
          break;
        case "FS-02":
          knowledgeFail ? setRow(r, 0, "BYPASS", "skip")
            : setRow(r, sc.face_norm || 0, `SIM ${fmt(sc.face_cos)}`);
          break;
        case "KD-02":
          knowledgeFail ? setRow(r, 0, "BYPASS", "skip")
            : setRow(r, sc.ks_norm || 0, `SIM ${fmt(sc.ks_sim)}`);
          break;
        case "FS-09":
          knowledgeFail ? setRow(r, 0, "PF-00 · FAIL", "fail")
            : setRow(r, sc.fused || 0,
              body.decision === "ACCEPT" ? `GRANTED @ θ${sc.threshold}` : `DENIED @ θ${sc.threshold}`);
          break;
      }
    }
    if (knowledgeFail) {
      const pf = document.createElement("div");
      pf.className = "c-row fault";
      pf.innerHTML = `<span class="c-code mono">PF-00</span>` +
        `<span class="c-name">Knowledge factor — passphrase rejected</span>` +
        `<div class="c-bar"><i></i></div>` + `<span class="c-stat mono">FAIL</span>`;
      consoleEl.appendChild(pf);
    }

    renderScores(body);
    showStamp(body.decision === "ACCEPT" ? "ACCESS GRANTED" : "ACCESS DENIED",
      body.decision === "ACCEPT" ? "granted" : "denied",
      Math.round(performance.now() - t0));

    // reset the recorder for the next attempt
    $("in-password").value = "";
    recorder.events.length = 0;
  }

  $("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const status = $("login-status");
    const payload = {
      mode: CFG.mode,
      username: $("in-username").value.trim().toLowerCase(),
      password: $("in-password").value,
      events: recorder.exported(),
      frames: window.BioCam.getFrames(CFG.nFrames),
    };
    if (CFG.mode === "eval") payload.operator = ($("in-operator") || {}).value || "";
    if (!payload.username) { status.textContent = "enter a username"; return; }
    if (!payload.password) { status.textContent = "type the passphrase"; return; }
    if (CFG.mode === "eval" && !payload.operator) {
      status.textContent = "evaluation mode: select who is operating";
      return;
    }
    status.textContent = "";
    const btn = $("btn-login");
    btn.disabled = true;                 // pipeline guard: no double-submit races
    const resPromise = fetch("/api/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((body) => { if (!body.ok && !body.decision) throw new Error(body.error || "HTTP " + ""); return body; });
    // ^ /api/attempt returns ok:true with decision on validation passes; ok:false
    //   bodies carry .error. Server 4xx with json body also lands here.

    const done = () => { btn.disabled = false; };
    runConsole(payload, resPromise).then(done).catch((err) => {
      console.error("verification console fault:", err);
      status.textContent = "verification console fault: " + err.message;
      done();
    });
  });
})();
