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

  /* the button label cross-fades rather than snapping between two words */
  function setCamButton(on) {
    const label = $("btn-cam-label");
    const icon = $("btn-cam-icon");
    const text = on ? "Turn camera off" : "Turn on camera";
    if (!label || label.textContent === text) return;
    label.style.opacity = "0";
    setTimeout(() => {
      label.textContent = text;
      if (icon) icon.setAttribute("href", on ? "#i-camera-off" : "#i-camera");
      label.style.opacity = "1";
    }, 160);
  }

  function cameraOn() {
    $("cam-panel").classList.add("live");
    $("cam-state-text").textContent = "Camera on";
    setCamButton(true);
  }

  function cameraOff() {
    $("cam-panel").classList.remove("live");
    $("cam-state-text").textContent = "Camera off";
    setCamButton(false);
  }

  /* The camera asks permission by itself, so the page never sits on a dead
   * grey box; the button stays for the second tap browsers ask for.
   * Started straight away (the script is at the end of the body, so the DOM
   * is ready) — binding this to `load` could switch the camera back on after
   * the user had already turned it off. */
  let camStarting = false;
  async function startCamera() {
    if (camStarting) return;
    camStarting = true;
    const btn = $("btn-cam");
    btn.disabled = true;
    try {
      await window.BioCam.start($("face-video"),
        { intervalMs: 400, maxFrames: CFG.nFrames * 2 });
      // Every captured frame is checked for a face, so "photos taken" counts
      // photos of the person and not frames of whatever the camera sees.
      window.BioCam.setTester(window.BioCam.faceCheck);
      cameraOn();
      // the button is now the "turn camera off" control - it must stay usable
      btn.disabled = false;
      $("cam-overlay").textContent = "Camera on — look straight ahead";
      meterTimer = setInterval(() => {
        const total = window.BioCam.count();
        const n = Math.min(total, CFG.nFrames);
        const seen = window.BioCam.faceSeen();
        $("face-count").textContent = seen
          ? `${n} photo${n === 1 ? "" : "s"} taken`
          : "looking for your face…";
        $("cam-overlay").textContent = seen
          ? "Camera on — look straight ahead"
          : "I can't see your face yet — look at the camera";
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
    } finally {
      camStarting = false;
    }
  }

  $("btn-cam").addEventListener("click", async () => {
    if ($("cam-panel").classList.contains("live")) {
      /* second click switches the camera back off — the preview is the
       * user's to control, always. */
      clearInterval(meterTimer);
      window.BioCam.stop();
      cameraOff();
      return;
    }
    await startCamera();
  });

  startCamera();

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

  /* Count the lock down on the page, so the person knows exactly when to
     come back instead of guessing. */
  let lockTicker = null;
  function startLockCountdown(el, seconds) {
    if (lockTicker) clearInterval(lockTicker);
    let left = Math.max(0, Math.round(seconds));
    const paint = () => {
      const m = Math.floor(left / 60);
      const s = left % 60;
      el.textContent = `This account is locked for ${m}:${String(s).padStart(2, "0")}`
        + ` - please come back then, or ask the lab to release it.`;
      if (left <= 0) {
        clearInterval(lockTicker);
        lockTicker = null;
        el.textContent = "The lock has expired - please try again.";
      }
    };
    paint();
    lockTicker = setInterval(() => { left -= 1; paint(); }, 1000);
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
    // only the verdict's own animation may clear the class - the rows animate
    // too, and their animationend would otherwise cut the entrance short
    const onVerdictEnd = (e) => {
      if (e.target !== v) return;
      v.classList.remove("enter");
      v.removeEventListener("animationend", onVerdictEnd);
    };
    v.addEventListener("animationend", onVerdictEnd);
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
    if (body.ok === false || body.locked) {
      for (const [, r] of built) setRow(r, 0, "problem", "fail");
      const n = document.createElement("div");
      n.className = "notes";
      n.textContent = body.error || "Could not sign in";
      $("scores-rows").appendChild(n);
      showStamp(body.locked ? "PLEASE WAIT" : "SOMETHING WENT WRONG", "denied",
        Math.round(performance.now() - t0));
      if (body.locked && body.retry_after) startLockCountdown(n, body.retry_after);
      return;
    }

    const knowledgeFail = body.decision === "REJECT" && !body.scores;
    const sc = body.scores || {};
    // which factor fell short - the gate has three bars and the person
    // deserves to know which one they missed
    const failed = body.failed || [];
    for (const [s, r] of built) {
      switch (s.code) {
        case "Your photo":
          knowledgeFail ? setRow(r, 0, "skipped", "skip")
            : setRow(r, clamp01((payload.frames || []).length / (CFG.nFrames || 1)),
                     knowledgeFail ? "" : `ok · ${(payload.frames || []).length} photos`);
          if (failed.includes("photo")) setRow(r, 0, "didn't match", "fail");
          break;
        case "Your typing":
          knowledgeFail ? setRow(r, 0, "skipped", "skip")
            : setRow(r, sc.ks_norm || 0, `match ${fmt(sc.ks_sim)}`);
          if (failed.includes("typing")) setRow(r, sc.ks_norm || 0, "didn't match", "fail");
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
    // a wrong passphrase is not "that wasn't you" - it is the passphrase
    // that was wrong, and saying otherwise sends people hunting for a face
    // problem they do not have
    const stampText = body.decision === "ACCEPT" ? "YOU'RE IN"
      : (knowledgeFail ? "WRONG PASSPHRASE" : "THAT WASN'T YOU");
    showStamp(stampText,
      body.decision === "ACCEPT" ? "granted" : "denied",
      Math.round(performance.now() - t0));

    // reset the recorder for the next attempt
    $("in-password").value = "";
    recorder.events.length = 0;
  }

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = $("login-status");
    const btn = $("btn-login");
    const payload = {
      mode: CFG.mode,
      username: $("in-username").value.trim().toLowerCase(),
      password: $("in-password").value,
      events: recorder.exported(),
      frames: [],
    };
    if (CFG.mode === "eval") payload.operator = ($("in-operator") || {}).value || "";
    if (!payload.username) { status.textContent = "Please type your name."; return; }
    if (!payload.password) { status.textContent = "Please type your passphrase."; return; }
    if (CFG.mode === "eval" && !payload.operator) {
      status.textContent = "Please choose who is at the keyboard.";
      return;
    }
    status.textContent = "";
    btn.disabled = true;                 // pipeline guard: no double-submit races

    // only frames we have confirmed contain a face
    payload.frames = await window.BioCam.getFrames(CFG.nFrames);
    if (!payload.frames.length) {
      btn.disabled = false;
      status.textContent = window.BioCam.faceSeen()
        ? "Still getting your photos - please try again in a moment."
        : "We could not see your face in the camera. Make sure your face is " +
          "in the picture, and that the camera is not blocked.";
      return;
    }

    const resPromise = fetch("/api/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json().then((body) => {
        // a locked account is not a fault - it is a wait
        if (res.status === 429) body.locked = true;
        return body;
      }))
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
