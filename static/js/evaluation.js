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

  /* The single-factor attacks each defeat exactly one modality: a photo of
     you, or your typing rhythm. The headline false-accept rate is measured
     against impostors who have BOTH wrong, so it cannot see them. They get
     their own plain-language line, with the real limit stated rather than
     a reassuring gloss. */
  function attackBullet(report) {
    const atk = report.attacks;
    if (!atk || !atk.photo || !atk.photo.n) return "";
    const photo = atk.photo.rate;
    const rhythm = (atk.rhythm && atk.rhythm.n) ? atk.rhythm.rate : null;
    let body = "";
    if (photo !== null && photo !== undefined) {
      body += `If someone holds up a photo of you, ${fmtP(photo)} of those ` +
              `attempts still get in.`;
    }
    if (rhythm !== null && rhythm !== undefined) {
      body += ` If someone copies your typing rhythm, ${fmtP(rhythm)} get in.`;
    }
    body += ` The typing check is the weaker of the two and it is what sets ` +
            `this limit. Making the camera check able to tell a live face ` +
            `from a print is the real fix, and that is not built yet.`;
    return `<li><span class="dot" aria-hidden="true"></span><span>` +
           `<strong>One attack still gets through.</strong>` +
           `<span>${body}</span></span></li>`;
  }

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
      const face = report.modalities.face.ok ? report.modalities.face : null;
      const ks = report.modalities.ks.ok ? report.modalities.ks : null;

      /* The "checking both is better" line has to follow the numbers.
         On some datasets the face check alone already separates the two
         populations perfectly, and claiming fusion "stops far more" is
         then simply false. When the numbers tie, say so - and give the
         real reason for keeping the second factor. */
      let third;
      if (face && ks) {
        const bestSingle = Math.min(face.far_at_thr, ks.far_at_thr);
        const both = fused.far_at_thr;
        const detail =
          `On its own, the face check let ${fmtP(face.far_at_thr)} of impostors ` +
          `through; the typing check alone let ${fmtP(ks.far_at_thr)} through.`;
        if (both < bestSingle - 1e-9) {
          third = `<strong>Checking both is better than checking one.</strong>` +
            `<span>${detail} Together they stop far more.</span>`;
        } else if (both <= bestSingle + 1e-9) {
          third = `<strong>Checking both is no worse than checking one.</strong>` +
            `<span>${detail} Together they stop the same number - on this ` +
            `data the face check is doing most of the work. The typing check ` +
            `still matters, because it is a second, separate thing an attacker ` +
            `has to fake.</span>`;
        } else {
          third = `<strong>The two checks are pulling in different directions.</strong>` +
            `<span>${detail} Together they stop ${fmtP(both)}. On this data the ` +
            `weights in config.py are worth a look.</span>`;
        }
      } else {
        third = `<strong>Recording more attempts of both kinds will show whether ` +
          `checking both really helps.</strong>`;
      }

      const summary = document.createElement("ul");
      summary.className = "finding-list";
      summary.innerHTML =
        `<li><span class="dot" aria-hidden="true"></span><span>` +
        `<strong>${wrongIn.toFixed(1)}% of impostors got in, ` +
        `${wrongOut.toFixed(1)}% of the real person was turned away.</strong>` +
        `<span>At the cut-off the system is using right now ` +
        `(θ = ${report.cfg_threshold}` +
        (report.cfg_ks_floor ? `, and the typing has to score at least ` +
          `${report.cfg_ks_floor}` : ``) + `).</span></span></li>` +
        `<li><span class="dot" aria-hidden="true"></span><span>` +
        `<strong>The best cut-off is ${fused.eer_thr}.</strong>` +
        `<span>At that point both kinds of mistake are equally unlikely ` +
        `(${fmtP(fused.eer)} of each). You can set it any time on the ` +
        `<a href="/admin">lab page</a>.</span></span></li>` +
        `<li><span class="dot" aria-hidden="true"></span><span>` +
        third + `</span></li>` +
        attackBullet(report);
      out.appendChild(summary);
    }

    const tech = document.createElement("div");
    tech.className = "tech-detail";
    tech.innerHTML =
      `<button class="tech-toggle" type="button" aria-expanded="false">` +
      `Show me the technical numbers` +
      `<svg class="icon-orb" aria-hidden="true" width="18" height="18">` +
      `<use href="#i-chevron"></use></svg></button>`;
    const collapse = document.createElement("div");
    collapse.className = "tech-collapse";
    const inner = document.createElement("div");
    inner.className = "tech-collapse-inner";
    collapse.appendChild(inner);
    tech.appendChild(collapse);
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
    inner.appendChild(table);

    /* the single-factor attacks, in technical form */
    const atk = report.attacks;
    if (atk && atk.photo && atk.photo.n) {
      const head = document.createElement("p");
      head.className = "hint";
      head.style.margin = "18px 0 8px";
      head.innerHTML =
        `<strong>Single-factor attacks</strong> — each defeats exactly one ` +
        `modality, so the false-accept rate above cannot see them. ` +
        `Judged against the same gate.`;
      inner.appendChild(head);

      const at = document.createElement("table");
      at.innerHTML =
        "<thead><tr><th>attack</th><th>attempts</th><th>got in</th>" +
        "<th>rate</th><th>face score</th><th>typing score</th></tr></thead>" +
        "<tbody></tbody>";
      const atb = at.querySelector("tbody");
      const rows = [
        ["photo", "Stolen photo of the victim"],
        ["rhythm", "Stolen typing template"],
      ];
      rows.forEach(([key, label]) => {
        const v = atk[key];
        if (!v || !v.n) return;
        const tr = document.createElement("tr");
        tr.innerHTML =
          `<td><strong>${label}</strong></td><td>${v.n}</td>` +
          `<td>${v.accepted}</td><td><strong>${fmtP(v.rate)}</strong></td>` +
          `<td>${v.mean_face_cos.toFixed(3)}</td>` +
          `<td>${v.mean_rhythm.toFixed(3)}</td>`;
        atb.appendChild(tr);
      });
      inner.appendChild(at);
    }
    out.appendChild(tech);

    let note = null;
    if (fused && fused.ok) {
      note = document.createElement("p");
      note.className = "hint";
      const isSet = Math.abs(fused.eer_thr - report.cfg_threshold) < 1e-9;
      note.innerHTML = isSet
        ? `The cut-off in use (${report.cfg_threshold}) is the recommended one.`
        : `Recommended cut-off for the combined check: <code>${fused.eer_thr}</code>. ` +
          `The system is currently using <code>${report.cfg_threshold}</code>.`;
      inner.appendChild(note);
    }

    if (charts) {
      const row = document.createElement("div");
      row.className = "chart-row";
      const img1 = document.createElement("img");
      img1.className = "chart";
      img1.src = charts.roc; img1.alt = "How well each check separates the real person from someone else";
      const img2 = document.createElement("img");
      img2.className = "chart";
      img2.src = charts.dist; img2.alt = "Score distributions for the real person and for impostors";
      row.append(img1, img2);
      out.appendChild(row);
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
      collapse.classList.toggle("open", !open);
    });
  }
})();
