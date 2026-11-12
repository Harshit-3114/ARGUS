/* Webcam frame buffer. Captures JPEG (base64, no "data:" prefix) frames on a
 * timer into a small ring buffer; pages pull the newest N frames on submit.
 *
 * A frame is only counted as a "photo" once it has been confirmed to contain
 * a face. Without that, the camera happily takes six pictures of the wall and
 * the person is told "6 photos taken" - and then cannot work out why they are
 * not let in. The page installs a `testFrame` callback; the server answers
 * "is there a face?" for each captured frame. */
(function () {
  let stream = null;
  let timer = null;
  let frames = [];            // { b64, ok: true | false | null, promise }
  let opts = { intervalMs: 500, maxFrames: 10 };
  let tester = null;          // async (b64) => boolean

  async function start(videoEl, userOpts = {}) {
    opts = Object.assign(opts, userOpts);
    frames = [];
    if (stream) return true;
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
      audio: false,
    });
    videoEl.srcObject = stream;
    await new Promise((res) => {
      if (videoEl.readyState >= 2) return res();
      videoEl.onloadeddata = res;
    });
    await videoEl.play();
    timer = setInterval(() => grab(videoEl), opts.intervalMs);
    grab(videoEl);
    return true;
  }

  function grab(videoEl) {
    const w = videoEl.videoWidth || 640;
    const h = videoEl.videoHeight || 480;
    if (!w || !h) return;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(videoEl, 0, 0, w, h);
    const b64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
    const entry = { b64, ok: tester ? null : true, promise: null };
    frames.push(entry);
    if (tester) {
      entry.promise = Promise.resolve(tester(b64))
        .then((ok) => { entry.ok = !!ok; })
        .catch(() => { entry.ok = false; });
    }
    while (frames.length > opts.maxFrames) frames.shift();
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  }

  /* Install the face check. Returns a promise that settles once every
     captured frame has been tested, so a frame captured a moment ago is
     not lost when the person presses the button. */
  function setTester(fn) { tester = fn; }

  /* Ask the server whether this frame contains a face. Detection only - no
     embedding - so it is fast enough to run on every captured frame. If the
     check cannot run, the frame is not counted: better to take another
     photo than to count a picture of nothing. */
  async function faceCheck(b64) {
    try {
      const res = await fetch("/api/face-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frame: b64 }),
      });
      const body = await res.json();
      return !!body.face;
    } catch (err) {
      return false;
    }
  }

  async function settle() {
    const pending = frames.filter((f) => f.promise).map((f) => f.promise);
    if (pending.length) {
      await Promise.all(pending).catch(() => {});
    }
  }

  async function getFrames(n) {
    await settle();
    const good = frames.filter((f) => f.ok === true);
    // slice(-0) returns the whole array, so take the last k explicitly
    const k = Math.max(0, Math.min(n, good.length));
    return good.slice(good.length - k).map((f) => f.b64);
  }

  function count() { return frames.filter((f) => f.ok === true).length; }
  function faceSeen() { return frames.some((f) => f.ok === true); }
  function lastKnown() {
    for (let i = frames.length - 1; i >= 0; i--) {
      if (frames[i].ok !== null) return frames[i].ok;
    }
    return null;
  }

  window.BioCam = { start, stop, getFrames, count, faceSeen, lastKnown,
                    setTester, faceCheck };
})();
