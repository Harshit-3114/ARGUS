/* ARGUS — sign in: camera panel, live typing rhythm, and the staged
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

  /* ---------------- camera panel ---------------- */
  let meterTimer = null;

  function cameraOn() {
    $("cam-off").hidden = true;
    $("cam-live").hidden = false;
    $("cam-panel").classList.add("live");
    $("cam-state-text").textContent = "Camera on";
    $("btn-cam").innerHTML =
      '<svg class="icon-orb" aria-hidden="true" width="20" height="20">' +
      '<use href="#i-camera-off"></use></svg> Turn camera off';
  }

  function cameraOff() {
    $("cam-live").hidden = true;
    $("cam-off").hidden = false;
    $("cam-panel").classList.remove("live");
    $("cam-state-text").textContent = "Camera off";
    $("btn-cam").innerHTML =
      '<svg class="icon-orb" aria-hidden="true" width="20" height="20">' +
      '<use href="#i-camera"></use></svg> Turn on camera';
  }

  async function startCamera() {
    const btn = $("btn-cam");
    btn.disabled = true;
    try {
      await window.BioCam.start($("face-video"),
        { intervalMs: 400, maxFrames: CFG.nFrames });
      cameraOn();
      $("cam-overlay").textContent = "Camera on — look straight ahead";
      meterTimer = setInterval(() => {
        const n = window.BioCam.count();
        $("face-count").textContent = `${n} photo${n === 1 ? "" : "s"} taken`;
        $("face-progress").textContent = `${n}/${CFG.nFrames}`;
        window.Hud.meter($("face-meter"), n / CFG.nFrames);
      }, 280);
    } catch (err) {
      cameraOff();
      $("cam-state-text").textContent = "Camera off";
      btn.disabled = false;
      $("login-status").textContent =
        "We couldn't switch the camera on — that's fine, you can try again. " +
        "If your browser asked permission, choose Allow. (" + err.name + ")";
    }
  }

  $("btn-cam").addEventListener("click", async () => {
    if (!$("cam-live").hidden) {
      /* second click switches the camera back off — the preview is the
       * user's to control, always. */
      clearInterval(meterTimer);
      window.BioCam.stop();
      cameraOff();
      return;
    }
    await startCamera();
  });

  /* the camera asks permission by itself, so the page never sits on a
   * dead grey box; the button stays for the second tap browsers ask for */
  window.addEventListener("load", () => { startCamera(); });

  /* ---------------- live typing rhythm ---------------- */
  const recorder = window.KsCapture.attach($("in-password"));
  let rhythmSig = "";
  setInterval(() => {
    const v = $("in-password");
    const done = recorder.events.filter((ev) => ev.up !== null);
    const sig = done.map((c) => c.key).join("").slice(-16) + ":" + v.value.length;
    if (sig === rhythmSig) return;
    rhythmSig = sig;
    window.Hud.pulse($("ks-pulse"), recorder.events);
    $("ks-count").textContent = `${v.value.length} keys`;
    const stat = $("ks-stat");
    if (recorder.hasBackspace()) {
      stat.textContent = "That's fine — just carry on typing";
      stat.classList.remove("bad-text");
      stat.classList.add("good-text");
    } else if (v.value.length) {
      stat.textContent = "Good — keep typing";
      stat.classList.remove("bad-text", "good-text");
    } else {
      stat.textContent = "Waiting for you to start typing";
      stat.classList.remove("bad-text", "good-text");
    }
  }, 140);

  /* ---------------- verification console (staged) ---------------- */
  const STAGES = [
    { code: "Your photo", name: "Checking your face", min: 700 },
    { code: "Your photo", name: "Comparing with your saved photos", min: 800 },
    { code: "Your typing", name: "Checking your typing rhythm", min: 800 },
    { code: "Result", name: "Putting it together", min: 700 },
  ];
  const fmt = (x) => (x === null || x === undefined) ? "—" :
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
      `<span class="c-stat mono">waiting</span>`;
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
    $("v-elapsed").textContent = `TOOK ${ms} MS`;
    $("verdict").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderScores(data) {
    const rows = $("scores-rows");
    rows.innerHTML = "";
    if (data.decision === "REJECT" && !data.scores) {
      const n = document.createElement("div");
      n.className = "notes";
      n.textContent = data.reason || "That passphrase did not match.";
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
    add("Face check", s.face_norm,
      s.face_cos !== null && s.face_cos !== undefined ? `similarity ${s.face_cos}` : "—");
    add("Typing check", s.ks_norm,
      s.ks_sim !== null && s.ks_sim !== undefined ? `similarity ${s.ks_sim}` : "—");
    add("Combined result", s.fused,
      `cut-off ${s.threshold} · weights ${s.weights ? s.weights.face + "/" + s.weights.keystroke : ""}`);
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
      r.stat.textContent = "checking";
      const start = performance.now();
      while (performance.now() - start < s.min && !body && !netErr) {
        r.bar.style.transform =
          "scaleX(" + Math.min(0.94, (performance.now() - start) / s.min * 1.1).toFixed(3) + ")";
        await wait(70);
      }
    }

    // Server still crunching? hold the top bar softly rather than lying "done".
    if (!body && !netErr) {
      for (const [, r] of built) r.stat.textContent = "still checking";
      do { await wait(120); } while (!body && !netErr);
    }

    // Apply the real verdict data to every stage now.
    if (netErr) {
      for (const [, r] of built) setRow(r, 0, "problem", "fail");
      const n = document.createElement("div");
      n.className = "notes";
      n.textContent = "request failed: " + netErr.message;
      $("scores-rows").appendChild(n);
      showStamp("SOMETHING WENT WRONG", "denied", Math.round(performance.now() - t0));
      return;
    }
    if (body.ok === false) {
      for (const [, r] of built) setRow(r, 0, "problem", "fail");
      const n = document.createElement("div");
      n.className = "notes";
      n.textContent = body.error || "Could not sign in";
      $("scores-rows").appendChild(n);
      showStamp("SOMETHING WENT WRONG", "denied", Math.round(performance.now() - t0));
      return;
    }

    const knowledgeFail = body.decision === "REJECT" && !body.scores;
    const sc = body.scores || {};
    for (const [s, r] of built) {
      switch (s.code) {
        case "Your photo":
          knowledgeFail ? setRow(r, 0, "skipped", "skip")
            : setRow(r, clamp01((payload.frames || []).length / (CFG.nFrames || 1)),
                     knowledgeFail ? "" : `ok · ${(payload.frames || []).length} photos`);
          break;
        case "Your typing":
          knowledgeFail ? setRow(r, 0, "skipped", "skip")
            : setRow(r, sc.ks_norm || 0, `match ${fmt(sc.ks_sim)}`);
          break;
        case "Result":
          knowledgeFail ? setRow(r, 0, "passphrase wrong", "fail")
            : setRow(r, sc.fused || 0,
              body.decision === "ACCEPT" ? "you're in" : "not you");
          break;
      }
    }
    if (knowledgeFail) {
      const pf = document.createElement("div");
      pf.className = "c-row fault";
      pf.innerHTML = `<span class="c-code mono">Passphrase</span>` +
        `<span class="c-name">That passphrase did not match</span>` +
        `<div class="c-bar"><i></i></div>` + `<span class="c-stat mono">no</span>`;
      consoleEl.appendChild(pf);
    }

    renderScores(body);
    showStamp(body.decision === "ACCEPT" ? "YOU'RE IN" : "THAT WASN'T YOU",
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
    if (!payload.username) { status.textContent = "Please type your name."; return; }
    if (!payload.password) { status.textContent = "Please type your passphrase."; return; }
    if (CFG.mode === "eval" && !payload.operator) {
      status.textContent = "Please choose who is at the keyboard.";
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
      status.textContent = "Something went wrong: " + err.message;
      done();
    });
  });
})();
