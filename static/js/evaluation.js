/* Evaluation page: run the metric sweep and show the result — first in plain
 * words, then the technical table and charts. */
(function () {
  const $ = (id) => document.getElementById(id);

  $("btn-evaluate").addEventListener("click", async () => {
    $("btn-evaluate").disabled = true;
    $("eval-status").textContent = "Working out how well it's doing…";
    try {
      const res = await fetch("/api/evaluate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        const st = $("eval-status");
        st.textContent = data.error || `HTTP ${res.status}`;
        st.className = "bad";
        return;
      }
      render(data.report, data.charts);
    } catch (err) {
      $("eval-status").textContent = "Couldn't reach the server: " + err.message;
    } finally {
      $("btn-evaluate").disabled = false;
    }
  });

  function fmtP(x) { return x === null || x === undefined ? "—" : (x * 100).toFixed(1) + "%"; }

  function render(report, charts) {
    $("eval-status").textContent =
      `Based on ${report.n_genuine} attempts by the real person and ` +
      `${report.n_impostor} by someone else.`;
    const out = $("eval-out");
    out.innerHTML = "";
    out.classList.add("flash-in");  // panelIn entrance; self-removes on animationend
    out.addEventListener("animationend", () => out.classList.remove("flash-in"), { once: true });

    /* ---- the plain-language answer first ---- */
    const fused = report.modalities.fused;
    if (fused && fused.ok) {
      const wrongIn = fused.far_at_thr * 100;
      const wrongOut = fused.frr_at_thr * 100;
      const summary = document.createElement("ul");
      summary.className = "finding-list";
      summary.innerHTML =
        `<li><span class="dot" aria-hidden="true"></span><span>` +
        `<strong>${wrongIn.toFixed(1)}% of impostors got in, ` +
        `${wrongOut.toFixed(1)}% of the real person was turned away.</strong>` +
        `<span>At the cut-off the system is using right now ` +
        `(θ = ${report.cfg_threshold}).</span></span></li>` +
        `<li><span class="dot" aria-hidden="true"></span><span>` +
        `<strong>The best cut-off is ${fused.eer_thr}.</strong>` +
        `<span>At that point both kinds of mistake are equally unlikely ` +
        `(${fmtP(fused.eer)} of each). You can set it any time on the ` +
        `<a href="/admin">lab page</a>.</span></span></li>` +
        `<li><span class="dot" aria-hidden="true"></span><span>` +
        `<strong>Checking both is better than checking one.</strong>` +
        `<span>On its own, the face check let ` +
        `${fmtP(report.modalities.face.ok ? report.modalities.face.far_at_thr : 0)} ` +
        `of impostors through; the typing check alone let ` +
        `${fmtP(report.modalities.ks.ok ? report.modalities.ks.far_at_thr : 0)} ` +
        `through. Together they stop far more.</span></span></li>`;
      out.appendChild(summary);
    }

    const tech = document.createElement("div");
    tech.className = "tech-detail";
    tech.innerHTML =
      `<button class="tech-toggle" type="button" aria-expanded="false">` +
      `Show me the technical numbers` +
      `<svg class="icon-orb" aria-hidden="true" width="18" height="18">` +
      `<use href="#i-chevron"></use></svg></button>`;
    const table = document.createElement("table");
    table.innerHTML =
      "<thead><tr><th>check</th><th>real person</th><th>someone else</th>" +
      "<th>AUC</th><th>EER</th><th>EER at θ</th><th>FAR @ θ* </th>" +
      "<th>FRR @ θ*</th></tr></thead><tbody id='eval-rows'></tbody>";
    const tbody = table.querySelector("tbody");
    const labels = { face: "Face check", ks: "Typing check", fused: "Both together" };
    ["face", "ks", "fused"].forEach((name) => {
      const m = report.modalities[name];
      const tr = document.createElement("tr");
      if (!m.ok) {
        tr.innerHTML =
          `<td>${labels[name]}</td><td>${m.n_genuine}</td><td>${m.n_impostor}</td>` +
          `<td colspan="5" class="muted">not enough attempts yet — ` +
          `record more of both kinds</td>`;
      } else {
        tr.innerHTML =
          `<td><strong>${labels[name]}</strong></td><td>${m.n_genuine}</td>` +
          `<td>${m.n_impostor}</td><td>${m.auc}</td><td><strong>${fmtP(m.eer)}</strong></td>` +
          `<td>${m.eer_thr}</td><td>${fmtP(m.far_at_thr)}</td><td>${fmtP(m.frr_at_thr)}</td>`;
      }
      tbody.appendChild(tr);
    });
    tech.appendChild(table);
    out.appendChild(tech);

    let note = null;
    if (fused && fused.ok) {
      note = document.createElement("p");
      note.className = "hint";
      note.innerHTML =
        `Recommended cut-off for the combined check: <code>${fused.eer_thr}</code> ` +
        `(θ* = the cut-off configured right now).`;
      tech.appendChild(note);
    }

    if (charts) {
      const img1 = document.createElement("img");
      img1.className = "chart";
      img1.src = charts.roc; img1.alt = "How well each check separates the real person from someone else";
      const img2 = document.createElement("img");
      img2.className = "chart";
      img2.src = charts.dist; img2.alt = "Score distributions for the real person and for impostors";
      out.appendChild(img1); out.appendChild(img2);
    }
    if (report.insufficient) {
      const warn = document.createElement("p");
      warn.className = "hint";
      warn.textContent =
        "One of the checks doesn't have enough of both kinds of attempt yet — " +
        "its row is shown, but its numbers aren't trustworthy until it does.";
      out.appendChild(warn);
    }

    /* the technical numbers hide behind a link, like everywhere else */
    const toggle = tech.querySelector(".tech-toggle");
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      table.hidden = open;
      if (note) note.hidden = open;
    });
    table.hidden = true;
    if (note) note.hidden = true;
  }
})();
