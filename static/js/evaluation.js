/* Evaluation page: run the metric sweep and display results + charts. */
(function () {
  const $ = (id) => document.getElementById(id);

  $("btn-evaluate").addEventListener("click", async () => {
    $("btn-evaluate").disabled = true;
    $("eval-status").textContent = "computing FAR / FRR / EER …";
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
      $("eval-status").textContent = "request failed: " + err.message;
    } finally {
      $("btn-evaluate").disabled = false;
    }
  });

  function fmtP(x) { return x === null || x === undefined ? "—" : (x * 100).toFixed(1) + "%"; }

  function render(report, charts) {
    $("eval-status").textContent =
      `${report.n_genuine} genuine vs ${report.n_impostor} impostor scored attempts`;
    const out = $("eval-out");
    out.innerHTML = "";
    out.classList.add("flash-in");  // panelIn entrance; self-removes on animationend
    out.addEventListener("animationend", () => out.classList.remove("flash-in"), { once: true });

    const table = document.createElement("table");
    table.innerHTML =
      "<thead><tr><th>modality</th><th>n genuine</th><th>n impostor</th>" +
      "<th>AUC</th><th>EER</th><th>EER at θ</th><th>FAR @ θ* </th>" +
      "<th>FRR @ θ*</th></tr></thead><tbody id='eval-rows'></tbody>";
    const tbody = table.querySelector("tbody");
    ["face", "ks", "fused"].forEach((name) => {
      const m = report.modalities[name];
      const tr = document.createElement("tr");
      if (!m.ok) {
        tr.innerHTML =
          `<td>${name}</td><td>${m.n_genuine}</td><td>${m.n_impostor}</td>` +
          `<td colspan="5" class="muted">insufficient labeled data — ` +
          `collect genuine + impostor attempts</td>`;
      } else {
        tr.innerHTML =
          `<td><strong>${m.label}</strong></td><td>${m.n_genuine}</td>` +
          `<td>${m.n_impostor}</td><td>${m.auc}</td><td><strong>${fmtP(m.eer)}</strong></td>` +
          `<td>${m.eer_thr}</td><td>${fmtP(m.far_at_thr)}</td><td>${fmtP(m.frr_at_thr)}</td>`;
      }
      tbody.appendChild(tr);
    });
    out.appendChild(table);

    if (report.modalities.fused && report.modalities.fused.ok) {
      const note = document.createElement("p");
      note.className = "hint";
      note.innerHTML =
        `Recommended operating point: set <code>DECISION_THRESHOLD = ` +
        `${report.modalities.fused.eer_thr}</code> in <code>config.py</code> ` +
        `for the fused modality's EER (θ* = current configured threshold).`;
      out.appendChild(note);
    }

    if (charts) {
      const img1 = document.createElement("img");
      img1.src = charts.roc; img1.alt = "ROC curves";
      const img2 = document.createElement("img");
      img2.src = charts.dist; img2.alt = "score distributions";
      out.appendChild(img1); out.appendChild(img2);
    }
    if (report.insufficient) {
      const warn = document.createElement("p");
      warn.className = "hint";
      warn.textContent =
        "One or more modalities lacked ≥3 genuine and ≥3 impostor attempts — " +
        "those rows are shown but their metrics are not credible yet.";
      out.appendChild(warn);
    }
  }
})();
