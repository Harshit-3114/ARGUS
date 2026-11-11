/* Enrollment wizard (plain DOM):
 *   1 your details -> 2 your face -> 3 your typing -> 4 all done
 * Everything speaks plain English: the person setting this up may never
 * have used a camera in a browser before. */
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

  const PARTS = [
    { n: "1", text: "Part 1 of 3 — type it the way you normally would",
      hint: "Keep your natural pace." },
    { n: "2", text: "Part 2 of 3 — let your hands fly, keep the flow going",
      hint: "A bit faster, still you." },
    { n: "3", text: "Part 3 of 3 — type naturally and fix typos as you notice them",
      hint: "Mistakes are welcome here." },
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
    next.classList.add("enter");   // panelIn entrance; self-removes on animationend
    // only the step's own animation may clear the class - its children animate
    // too, and their animationend would otherwise cut the entrance short
    const onStepEnd = (e) => {
      if (e.target !== next) return;
      next.classList.remove("enter");
      next.removeEventListener("animationend", onStepEnd);
    };
    next.addEventListener("animationend", onStepEnd);
    const stepNo = { "step-account": 1, "step-face": 2, "step-typing": 3, "step-done": 4 };
    document.querySelectorAll("#stepper li").forEach((li) => {
      const n = Number(li.dataset.step);
      li.classList.toggle("active", n === stepNo[sectionId]);
      li.classList.toggle("done", n < stepNo[sectionId]);
    });
    if (sectionId === "step-face") startCamera();   // ask for the camera ourselves
  }

  function status(id, text, cls) {
    const el = $(id);
    if (!el) return;
    el.textContent = text;
    el.hidden = !text;
    el.classList.remove("bad", "good");
    if (cls) el.classList.add(cls);
  }

  /* ---------------- step 2: the camera ---------------- */
  let poll = null;

  function buildSlots() {
    const wrap = $("face-slots");
    wrap.innerHTML = "";
    for (let i = 0; i < CFG.nFrames; i++) {
      const slot = document.createElement("i");
      slot.style.animationDelay = (i * 30) + "ms";   // stagger as they fill
      wrap.appendChild(slot);
    }
  }

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
    $("cam-status-text").textContent = "Camera on";
    setCamButton(true);
  }

  function cameraOff() {
    $("cam-panel").classList.remove("live");
    $("cam-status-text").textContent = "Camera off";
    setCamButton(false);
  }

  async function startCamera() {
    if (!$("cam-off")) return;
    buildSlots();
    const btn = $("btn-cam-enable");
    btn.disabled = true;
    try {
      await window.BioCam.start($("face-video"),
        { intervalMs: 550, maxFrames: CFG.nFrames });
      cameraOn();
      // the button is now the "turn camera off" control - it must stay usable
      btn.disabled = false;
      $("cam-overlay").textContent = "Camera on — look straight ahead";
      poll = setInterval(() => {
        const n = Math.min(window.BioCam.count(), CFG.nFrames);
        $("face-count").textContent = `${n} photo${n === 1 ? "" : "s"} taken`;
        $("face-progress").textContent = `${n}/${CFG.nFrames}`;
        window.Hud.meter($("face-meter"), n / CFG.nFrames);
        const slots = $("face-slots").children;
        for (let i = 0; i < slots.length; i++) {
          slots[i].classList.toggle("filled", i < n);
        }
        $("btn-face-done").disabled = n < CFG.nFrames;
        if (n >= CFG.nFrames) {
          $("cam-overlay").textContent = "That's all of them — nice";
        }
      }, 400);
    } catch (err) {
      cameraOff();
      btn.disabled = false;
      status("enroll-status",
        "We couldn't switch the camera on — that's fine, press the button to "
        + "try again. If your browser asked permission, choose Allow. ("
        + err.name + ")", "bad");
    }
  }

  $("btn-cam-enable").addEventListener("click", async () => {
    if ($("cam-panel").classList.contains("live")) {
      clearInterval(poll);
      window.BioCam.stop();
      cameraOff();
      return;
    }
    await startCamera();
  });

  $("btn-face-record").addEventListener("click", async () => {
    await startCamera();
    $("btn-face-record").disabled = true;
  });

  $("btn-face-done").addEventListener("click", () => {
    clearInterval(poll);
    window.BioCam.stop();                    // buffer keeps the captured frames
    show("step-typing");
    $("in-typing").focus();
  });

  /* ---------------- step 1: details ---------------- */
  $("btn-account").addEventListener("click", () => {
    status("account-status", "");
    const username = $("in-username").value.trim().toLowerCase();
    const p1 = $("in-password").value;
    const p2 = $("in-password2").value;
    if (!/^[a-z0-9_.-]{3,24}$/.test(username)) {
      status("account-status",
        "That name won't work. Use 3–24 characters: letters, numbers, dots or dashes.",
        "bad");
      return;
    }
    if (p1.length < CFG.minLen) {
      status("account-status",
        `Your passphrase needs at least ${CFG.minLen} characters.`, "bad");
      return;
    }
    if (p1 !== p2) {
      status("account-status",
        "Those two passphrases don't match — type them the same way.", "bad");
      return;
    }
    state.username = username;
    state.password = p1;
    $("kt-phrase").textContent = p1;
    $("show-typing").checked = true;
    $("in-typing").type = "text";
    show("step-face");
  });

  /* ---------------- step 3: typing ---------------- */
  const recorder = window.KsCapture.attach($("in-typing"), { blockEnter: true });
  let cleanCount = 0;

  function currentPart() {
    const idx = state.samples.length;
    if (idx < 3) return PARTS[0];
    if (idx < 6) return PARTS[1];
    return PARTS[2];
  }

  function updateTypingUI() {
    const part = currentPart();
    $("typing-phase").querySelector(".num").textContent = part.n;
    $("typing-phase-text").textContent = part.text;
    $("typing-phase-hint").textContent = part.hint;

    const v = $("in-typing");
    window.Hud.pulse($("ks-pulse"), recorder.events);
    $("ks-count").textContent = `${v.value.length} keys`;

    const stat = $("ks-stat");
    if (v.value.length === 0) {
      stat.textContent = "Waiting for you to start typing";
      stat.classList.remove("bad-text", "good-text");
    } else if (v.value === state.password) {
      stat.textContent = "That's it — saving your round…";
      stat.classList.add("good-text");
    } else if (recorder.hasBackspace()) {
      stat.textContent = "No problem — just carry on typing";
      stat.classList.remove("bad-text");
      stat.classList.add("good-text");
    } else {
      stat.textContent = "Good — keep typing";
      stat.classList.remove("bad-text", "good-text");
    }

    const done = state.samples.length;
    $("kt-count-label").textContent =
      `Round ${Math.min(done + 1, CFG.nRounds)} of ${CFG.nRounds}`;
    $("kt-count").textContent = done;
    window.Hud.meter($("kt-meter"), done / CFG.nRounds);
  }

  setInterval(updateTypingUI, 140);

  function clientValidate() {
    const value = $("in-typing").value;
    if (value !== state.password) return "that isn't the phrase yet";
    const chars = recorder.events.filter((ev) => ev.key.length === 1);
    if (!chars.length) return "nothing typed yet";
    for (const ev of chars) {
      if (ev.up === null) return "one of your keys is still held down";
      if (ev.up - ev.down > 450) return "a key was held down a long time";
    }
    return null;
  }

  function recordRound() {
    if (recorder.length() === 0) {
      status("round-status", "Type the phrase first, then this saves itself.");
      return;
    }
    const problem = clientValidate();
    if (problem) {
      status("round-status", `Not saved: ${problem}.`, "bad");
      $("in-typing").value = "";
      recorder.events.length = 0;
      return;
    }
    const part = currentPart();
    state.samples.push({
      value: state.password,
      events: recorder.exported(),
      phase: ["A", "B", "C"][PARTS.indexOf(part)],
    });
    cleanCount = state.samples.length;
    status("round-status",
      `Nice — round ${cleanCount} of ${CFG.nRounds} saved.`, "good");
    $("in-typing").value = "";
    recorder.events.length = 0;
    if (cleanCount >= CFG.nRounds) show("step-done");
  }

  $("btn-record-round").addEventListener("click", recordRound);

  // Auto-advance: the instant the full passphrase is on the field, the round
  // saves itself. The 350 ms timer re-checks the value so keystrokes typed
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
    status("enroll-status",
      "Saving your account… (the first person on a machine waits for the "
      + "face model to download, about half a minute)");
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
          `Saved: ${data.face_frames_used} photos and `
          + `${data.keystroke_rounds_used} typing rounds. Taking you home…`, "good");
        window.BioCam.stop();
        setTimeout(() => { window.location = "/"; }, 1600);
      } else {
        status("enroll-status", data.error || `That didn't work (${res.status}).`, "bad");
      }
    } catch (err) {
      status("enroll-status", "Couldn't reach the server: " + err.message, "bad");
    }
  });

  show("step-account");
})();
