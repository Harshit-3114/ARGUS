/* Dashboard: user deletion (admin-only endpoint; the server replies 401 when
 * not signed in) + a minimal toast for feedback. */
(function () {
  function toast(message, kind) {
    let root = document.getElementById("toast-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "toast-root";
      document.body.appendChild(root);
    }
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

  document.querySelectorAll(".del-user").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const name = btn.dataset.name;
      if (!confirm(`Remove "${name}" and their photos and typing samples?`)) return;
      try {
        const res = await fetch(`/api/users/${name}`, { method: "DELETE" });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          toast(`${name} has been removed.`, "good");
          setTimeout(() => window.location.reload(), 700);
        } else if (res.status === 401) {
          toast("Removing someone needs the lab PIN — sign in on the lab page.", "bad");
        } else {
          toast(body.error || "That didn't work.", "bad");
        }
      } catch (err) {
        toast("Couldn't reach the server: " + err.message, "bad");
      }
    });
  });

  /* the technical numbers hide behind a link, like everywhere else */
  const techToggle = document.getElementById("tech-toggle");
  if (techToggle) {
    const detail = document.getElementById("tech-detail");
    techToggle.addEventListener("click", () => {
      const open = techToggle.getAttribute("aria-expanded") === "true";
      techToggle.setAttribute("aria-expanded", String(!open));
      detail.hidden = open;
    });
  }
})();
