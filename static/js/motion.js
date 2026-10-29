/* Entry choreography: elements tagged [data-reveal] fade up + de-blur as
 * they enter the viewport (GPU-safe: only transform/opacity/filter move).
 * Safe-by-default: initial hidden state is added via JS, so a broken JS
 * runtime never hides content. */
(function () {
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const els = document.querySelectorAll("[data-reveal]");
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.remove("will-reveal");
        e.target.classList.add("in-view");
        io.unobserve(e.target);      // one-shot reveal
      }
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });

  els.forEach((el) => {
    el.classList.add("will-reveal");
    io.observe(el);
  });
})();
