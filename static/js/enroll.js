/* Enrollment wizard (plain DOM):
 *   1 account -> 2 face capture -> 3 typing rounds -> 4 save biometrics */
(function () {
  const $ = (id) => document.getElementById(id);

  /* Flask injects page config as a JSON <script> block (CSP has no
   * 'unsafe-inline', so a JS assignment in HTML would be blocked). */
  function readConfig() {
    const fallback = { nFrames: 10, nRounds: 8, minLen: 6 };
    const el = document.getElementById("bio-config");
    if (!el) return fallback;
    try { return { ...fallback, ...JSON.parse(el.textContent) }; }
    catch { return fallback; }
  }
  const CFG = readConfig();

  const state = {
    username: "",
    password: "",
    samples: [],       // typing rounds: {value, events}
  };

  function show(sectionId) {
    document.querySelectorAll(".step").forEach((s) => {
      s.hidden = true;
      s.classList.remove("enter");
    });
    const next = $(sectionId);
    next.hidden = false;
    next.classList.add("enter");   // panelIn entrance; self-removes on animationend
    next.addEventListener("animationend", () => next.classList.remove("enter"), { once: true });
    const stepNo = { "step-account": 1, "step-face": 2, "step-typing": 3, "step-done": 4 };
    document.querySelectorAll("#stepper li").forEach((li) => {
      const n = Number(li.dataset.step);
      li.classList.toggle("active", n === stepNo[sectionId]);
      li.classList.toggle("done", n < stepNo[sectionId]);
    });
  }

  function status(id, text, cls) {
    const el = $(id);
    el.textContent = text;
    el.hidden = !text;
    el.classList.remove("bad", "good");
    if (cls) el.classList.add(cls);
  }

  /* ---------------- step 1: account ---------------- */
  $("btn-account").addEventListener("click", () => {
    status("account-status", "");
    const username = $("in-username").value.trim().toLowerCase();
    const p1 = $("in-password").value;
    const p2 = $("in-password2").value;
    if (!/^[a-z0-9_.-]{3,24}$/.test(username)) {
      status("account-status",
        "Username must be 3–24 characters: letters, digits, _ . -", "bad");
      return;
    }
    if (p1.length < CFG.minLen) {
      status("account-status",
        `Passphrase needs at least ${CFG.minLen} characters.`, "bad");
      return;
    }
    if (p1 !== p2) {
      status("account-status", "Passphrases do not match.", "bad");
      return;
    }
    state.username = username;
    state.password = p1;
    $("kt-phrase").textContent = p1;
    $("show-typing").checked = true;
    $("in-typing").type = "text";
    show("step-face");
  });

  /* ---------------- step 2: face ---------------- */
  let poll = null;
  $("btn-face-record").addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      await window.BioCam.start($("face-video"),
        { intervalMs: 550, maxFrames: CFG.nFrames });
      $("cam-overlay").textContent = "camera on";
      $("cam-frame").classList.add("live");
      poll = setInterval(() => {
        const n = Math.min(window.BioCam.count(), CFG.nFrames);
        $("face-count").textContent = n;
        $("face-progress").textContent = `${n}/${CFG.nFrames}`;
        window.Hud.meter($("face-meter"), n / CFG.nFrames);
        $("btn-face-done").disabled = n < CFG.nFrames;
        if (n >= CFG.nFrames) $("cam-overlay").textContent = "captured enough frames";
      }, 400);
    } catch (err) {
      $("cam-overlay").textContent = "camera blocked";
      e.target.disabled = false;
      status("enroll-status",
        "Could not start the camera: " + err.message +
        " — open this page via http://localhost and allow the permission prompt.", "bad");
      if ($("step-face").hidden) show("step-face");
    }
  });

  $("btn-face-done").addEventListener("click", () => {
    clearInterval(poll);
    window.BioCam.stop();                    // buffer keeps the captured frames
    show("step-typing");
    $("in-typing").focus();
  });

  /* ---------------- step 3: typing rounds ---------------- */
  const recorder = window.KsCapture.attach($("in-typing"), { blockEnter: true });
  let cleanCount = 0;

  /* KD-02 HUD: live pulse strip + char count, polled (like login.js). */
  setInterval(() => {
    const v = $("in-typing");
    window.Hud.pulse($("ks-pulse"), recorder.events);
    $("ks-count").textContent = `${v.value.length} CH`;
    const stat = $("ks-stat");
    if (recorder.hasBackspace()) {
      stat.textContent = "edits detected — round will be discarded";
      stat.classList.add("bad-text");
    } else if (v.value.length) {
      stat.textContent = "capturing rhythm…";
      stat.classList.remove("bad-text");
    } else {
      stat.textContent = "awaiting keystrokes";
      stat.classList.remove("bad-text");
    }
  }, 140);

  function clientValidate() {
    const value = $("in-typing").value;
    if (recorder.hasBackspace()) return "edits used — retype cleanly";
    if (value !== state.password) return "typed text does not match the passphrase";
    const chars = recorder.events.filter((ev) => ev.key.length === 1);
    if (!chars.length) return "nothing typed";
    for (const ev of chars) {
      if (ev.up === null) return "a key was left held (keystroke repeat?)";
      if (ev.up - ev.down > 450) return "a key was held too long — type naturally";
    }
    return null;
  }

  $("btn-record-round").addEventListener("click", () => {
    if (recorder.length() === 0) {
      status("round-status", "type the phrase first, then press record", "bad");
      return;
    }
    const problem = clientValidate();
    if (problem) {
      status("round-status", `discarded: ${problem} (round restarts)`, "bad");
      $("in-typing").value = "";
      recorder.events.length = 0;
      return;
    }
    state.samples.push({ value: state.password, events: recorder.exported() });
    cleanCount = state.samples.length;
    $("kt-count").textContent = cleanCount;
    $("kt-round").textContent = cleanCount + 1;
    status("round-status", `round ${cleanCount} recorded`, "good");
    $("in-typing").value = "";
    recorder.events.length = 0;
    if (cleanCount >= CFG.nRounds) show("step-done");
  });

  $("show-typing").addEventListener("change", (e) => {
    $("in-typing").type = e.target.checked ? "text" : "password";
  });

  /* ---------------- step 4: save ---------------- */
  $("btn-enroll-submit").addEventListener("click", async () => {
    status("enroll-status",
      "building templates… (first user downloads deepface weights, ~30 s)");
    const payload = {
      username: state.username,
      password: state.password,
      frames: window.BioCam.getFrames(CFG.nFrames),
      ks_samples: state.samples,
    };
    try {
      const res = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        status("enroll-status",
          `saved: ${data.face_frames_used} face embeddings + ` +
          `${data.keystroke_rounds_used} typing rounds (phrase: ${data.phrase})`, "good");
        window.BioCam.stop();
        setTimeout(() => { window.location = "/"; }, 1400);
      } else {
        status("enroll-status", data.error || `HTTP ${res.status}`, "bad");
      }
    } catch (err) {
      status("enroll-status", "request failed: " + err.message, "bad");
    }
  });

  show("step-account");
})();
