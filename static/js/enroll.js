/* Enrollment wizard (plain DOM):
 *   1 account -> 2 face capture -> 3 typing rounds -> 4 save biometrics */
(function () {
  const $ = (id) => document.getElementById(id);

  function readConfig() {
    const fallback = { nFrames: 10, nRounds: 8, minLen: 6 };
    const el = document.getElementById("bio-config");
    if (!el) return fallback;
    try { return { ...fallback, ...JSON.parse(el.textContent) }; }
    catch { return fallback; }
  }
  const CFG = readConfig();

  const PHASES = [
    { id: "A", label: "Phase A · Dwell & Hold",
      desc: "phrase timing — natural pace, accurate to the phrase" },
    { id: "B", label: "Phase B · Flight & Latency",
      desc: "inter-key speed — let your hands fly, keep the flow going" },
    { id: "C", label: "Phase C · Correction & Recovery",
      desc: "recovery — type naturally and fix typos as you notice them" },
  ];

  const state = {
    username: "",
    password: "",
    samples: [],       // typing rounds: {value, events, phase}
  };

  function show(sectionId) {
    document.querySelectorAll(".step").forEach((s) => {
      s.hidden = true;
      s.classList.remove("enter");
    });
    const next = $(sectionId);
    next.hidden = false;
    next.classList.add("enter");
    next.addEventListener("animationend", () => next.classList.remove("enter"), { once: true });
    const stepNo = { "step-account": 1, "step-face": 2, "step-typing": 3, "step-done": 4 };
    document.querySelectorAll("#stepper li").forEach((li) => {
      const n = Number(li.dataset.step);
      li.classList.toggle("active", n === stepNo[sectionId]);
      li.classList.toggle("done", n < stepNo[sectionId]);
    });

    // AUTO-START CAMERA when entering Face step
    if (sectionId === "step-face") {
      tryCamera();
    }
  }

  function status(id, text, cls) {
    const el = $(id);
    if (!el) return;
    el.textContent = text;
    el.hidden = !text;
    el.classList.remove("bad", "good");
    if (cls) el.classList.add(cls);
  }

  async function tryCamera() {
    try {
      await window.BioCam.start($("face-video"),
        { intervalMs: 550, maxFrames: CFG.nFrames });
      $("cam-overlay").textContent = "camera active";
      $("cam-status").textContent = "camera on";
      $("cam-frame").classList.add("live");
      return true;
    } catch (err) {
      $("cam-overlay").textContent = "access denied";
      $("cam-status").textContent = "camera off";
      status("enroll-status", "Camera blocked: " + err.message, "bad");
      return false;
    }
  }

  /* ---------------- step 1: account ---------------- */
  $("btn-account").addEventListener("click", () => {
    status("account-status", "");
    const username = $("in-username").value.trim().toLowerCase();
    const p1 = $("in-password").value;
    const p2 = $("in-password2").value;
    if (!/^[a-z0-9_.-]{3,24}$/.test(username)) {
      status("account-status", "Username must be 3–24 characters: letters, digits, _ . -", "bad");
      return;
    }
    if (p1.length < CFG.minLen) {
      status("account-status", `Passphrase needs at least ${CFG.minLen} characters.`, "bad");
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
  async function startCapture() {
    $("btn-face-record").disabled = true;
    try {
      await tryCamera();
      $("cam-overlay").textContent = "capturing frames...";
      poll = setInterval(() => {
        const n = Math.min(window.BioCam.count(), CFG.nFrames);
        $("face-count").textContent = n;
        $("face-progress").textContent = `${n}/${CFG.nFrames}`;
        window.Hud.meter($("face-meter"), n / CFG.nFrames);
        $("btn-face-done").disabled = n < CFG.nFrames;
        if (n >= CFG.nFrames) $("cam-overlay").textContent = "captured enough frames";
      }, 400);
    } catch (err) {
      status("enroll-status", "Capture failed: " + err.message, "bad");
      $("btn-face-record").disabled = false;
    }
  }

  $("btn-cam-enable").addEventListener("click", tryCamera);
  $("btn-face-record").addEventListener("click", startCapture);

  $("btn-face-done").addEventListener("click", () => {
    clearInterval(poll);
    window.BioCam.stop();
    show("step-typing");
    $("in-typing").focus();
  });

  /* ---------------- step 3: typing rounds ---------------- */
  const recorder = window.KsCapture.attach($("in-typing"), { blockEnter: true });
  let cleanCount = 0;

  function getCurrentPhase() {
    // Split rounds across 3 phases. E.g. if nRounds=8, 3, 3, 2.
    const idx = state.samples.length;
    if (idx < 3) return PHASES[0];
    if (idx < 6) return PHASES[1];
    return PHASES[2];
  }

  function updateTypingUI() {
    const phase = getCurrentPhase();
    $("typing-phase").textContent = phase.label;
    $("phase-hint").textContent = phase.desc;
    
    const v = $("in-typing");
    window.Hud.pulse($("ks-pulse"), recorder.events);
    $("ks-count").textContent = `${v.value.length} CH`;
    
    const stat = $("ks-stat");
    if (v.value.length === 0) {
      stat.textContent = "awaiting keystrokes";
      stat.classList.remove("bad-text", "good-text");
    } else if (v.value === state.password) {
      stat.textContent = "phrase complete — recording round…";
      stat.classList.add("good-text");
    } else {
      stat.textContent = "capturing rhythm…";
      stat.classList.remove("bad-text", "good-text");
    }
  }

  setInterval(updateTypingUI, 140);

  function clientValidate() {
    const value = $("in-typing").value;
    if (value !== state.password) return "typed text does not match the passphrase";
    const chars = recorder.events.filter((ev) => ev.key.length === 1);
    if (!chars.length) return "nothing typed";
    for (const ev of chars) {
      if (ev.up === null) return "a key was left held";
      if (ev.up - ev.down > 450) return "a key was held too long";
    }
    return null;
  }

  function recordRound() {
    if (recorder.length() === 0) {
      status("round-status", "type the phrase first", "bad");
      return;
    }
    const problem = clientValidate();
    if (problem) {
      status("round-status", `invalid: ${problem}`, "bad");
      $("in-typing").value = "";
      recorder.events.length = 0;
      return;
    }
    
    const phase = getCurrentPhase();
    state.samples.push({ 
      value: state.password, 
      events: recorder.exported(),
      phase: phase.id 
    });
    
    cleanCount = state.samples.length;
    $("kt-count").textContent = cleanCount;
    $("kt-round").textContent = cleanCount + 1;
    status("round-status", `round ${cleanCount} recorded`, "good");
    
    $("in-typing").value = "";
    recorder.events.length = 0;
    
    if (cleanCount >= CFG.nRounds) show("step-done");
  }

  $("btn-record-round").addEventListener("click", recordRound);
  
  // Auto-advance: the instant the full passphrase is on the field, the round
  // records itself. The 350 ms timer re-checks the value so keystrokes typed
  // late (a user still editing) never land in a half-finished round.
  $("in-typing").addEventListener("input", () => {
    if ($("in-typing").value === state.password) {
      setTimeout(() => {
        if ($("in-typing").value === state.password) recordRound();
      }, 350);
    }
  });

  $("show-typing").addEventListener("change", (e) => {
    $("in-typing").type = e.target.checked ? "text" : "password";
  });

  /* ---------------- step 4: save ---------------- */
  $("btn-enroll-submit").addEventListener("click", async () => {
    status("enroll-status", "building templates…");
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
        status("enroll-status", `saved: ${data.face_frames_used} face + ${data.keystroke_rounds_used} ks`, "good");
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
