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
      if (!confirm(`Delete user "${name}" and all their biometrics?`)) return;
      try {
        const res = await fetch(`/api/users/${name}`, { method: "DELETE" });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          toast(`User ${name} deleted.`, "good");
          setTimeout(() => window.location.reload(), 700);
        } else if (res.status === 401) {
          toast("Delete requires an admin session — sign in at /admin.", "bad");
        } else {
          toast(body.error || "Delete failed.", "bad");
        }
      } catch (err) {
        toast("Request failed: " + err.message, "bad");
      }
    });
  });
})();
