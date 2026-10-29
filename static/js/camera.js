/* Webcam frame buffer. Captures JPEG (base64, no "data:" prefix) frames on a
 * timer into a small ring buffer; pages pull the newest N frames on submit. */
(function () {
  let stream = null;
  let timer = null;
  let frames = [];
  let opts = { intervalMs: 500, maxFrames: 10 };

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
    frames.push(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
    while (frames.length > opts.maxFrames) frames.shift();
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  }

  function getFrames(n) { return frames.slice(-Math.max(0, Math.min(n, frames.length))); }
  function count() { return frames.length; }

  window.BioCam = { start, stop, getFrames, count };
})();
