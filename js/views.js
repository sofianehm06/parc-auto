/* ===================================================================
   views.js — rendu des pages
   Chaque vue : function(view, actions) -> { title, subtitle }
     view    = conteneur de contenu (#view)
     actions = conteneur des boutons de la barre supérieure
   Exposé via window.Views
   =================================================================== */
(function () {
  "use strict";
  const { esc, money, money2, num, km, date, dateLong, daysUntil, relativeDays, initials, colorFor, norm } = U;
  const { toast, confirmDialog, formModal, openModal, button } = UI;

  /* ---------- Petits fragments réutilisables ----------------------- */
  function badge(label, cls) { return `<span class="badge ${cls}">${esc(label)}</span>`; }

  function addBtn(label, onClick) {
    const b = document.createElement("button");
    b.className = "btn";
    b.innerHTML = `<span class="ico" style="--m:var(--icon-plus)"></span> ${esc(label)}`;
    b.onclick = onClick;
    return b;
  }

  function vehCell(v) {
    return `<div class="veh-cell">
      <span class="veh-ico"></span>
      <div>
        <div class="cell-strong">${esc(v.marque)} ${esc(v.modele)}</div>
        <div class="cell-sub">${esc(v.type)} · ${esc(String(v.annee || "—"))}</div>
      </div>
    </div>`;
  }
  function plate(immat) { return `<span class="plate">${esc(immat)}</span>`; }

  function avatar(name) {
    const init = initials(...String(name).split(/\s+/));
    return `<span class="avatar" style="background:${colorFor(name)}">${esc(init)}</span>`;
  }

  /** Étiquette d'échéance colorée selon l'urgence */
  function dueTag(prefix, iso) {
    if (!iso) return `<span class="cell-sub">${prefix} —</span>`;
    const d = daysUntil(iso);
    let cls = "b-slate", txt = date(iso);
    if (d < 0) { cls = "b-red"; txt = "Expiré"; }
    else if (d <= 30) { cls = "b-amber"; }
    return `<div style="margin:2px 0"><span class="cell-sub" style="display:inline-block;width:42px">${prefix}</span> ${badge(txt, cls)}</div>`;
  }

  function emptyRow(cols, msg) {
    return `<tr><td colspan="${cols}"><div class="empty-mini">${esc(msg)}</div></td></tr>`;
  }

  function selectOptionsVehicules() {
    return Store.all("vehicules")
      .sort((a, b) => (a.marque + a.modele).localeCompare(b.marque + b.modele))
      .map(v => ({ value: v.id, label: `${v.marque} ${v.modele} · ${v.immatriculation}` }));
  }
  function selectOptionsConducteurs() {
    return Store.all("conducteurs")
      .sort((a, b) => a.nom.localeCompare(b.nom))
      .map(c => ({ value: c.id, label: `${c.prenom} ${c.nom}` }));
  }

  /* =================================================================
     TABLEAU DE BORD
     ================================================================= */
  function dashboard(view) {
    const vehicules = Store.all("vehicules");
    const conducteurs = Store.all("conducteurs");
    const entretiens = Store.all("entretiens");
    const carburants = Store.all("carburants");

    const total = vehicules.length;
    const countBy = (s) => vehicules.filter(v => v.statut === s).length;
    const dispo = countBy("disponible");
    const maint = countBy("en_maintenance");
    const condActifs = conducteurs.filter(c => c.statut === "actif").length;

    const year = new Date().getFullYear();
    const coutEntretienAnnee = U.sum(entretiens.filter(e => (e.date || "").startsWith(String(year))), e => e.cout);

    // Alertes (assurance / contrôle technique)
    const alertes = [];
    vehicules.forEach(v => {
      [["Assurance", v.assuranceExpiration, "--icon-shield"], ["Contrôle technique", v.controleExpiration, "--icon-calendar"]]
        .forEach(([label, iso, ico]) => {
          if (!iso) return;
          const d = daysUntil(iso);
          if (d <= 30) {
            alertes.push({
              days: d, icon: ico,
              tone: d < 0 ? "tone-red" : "tone-amber",
              title: `${label} — ${v.marque} ${v.modele}`,
              sub: `${v.immatriculation} · échéance ${date(iso)}`,
              when: d < 0 ? "Expiré" : relativeDays(iso),
              whenCls: d < 0 ? "tone-red" : "tone-amber"
            });
          }
        });
    });
    alertes.sort((a, b) => a.days - b.days);

    // Répartition par statut (donut)
    const palette = { disponible: "#16a34a", en_mission: "#0284c7", en_maintenance: "#d97706", hors_service: "#dc2626" };
    let acc = 0; const segs = [];
    Store.STATUTS_VEHICULE.forEach(s => {
      const n = countBy(s.value);
      const from = total ? (acc / total) * 100 : 0;
      acc += n;
      const to = total ? (acc / total) * 100 : 0;
      if (n > 0) segs.push(`${palette[s.value]} ${from}% ${to}%`);
    });
    const gradient = segs.length ? `conic-gradient(${segs.join(",")})` : "conic-gradient(#e2e8f0 0 100%)";

    // Répartition par carburant (barres)
    const parCarburant = {};
    vehicules.forEach(v => { parCarburant[v.carburant] = (parCarburant[v.carburant] || 0) + 1; });
    const carbRows = Object.entries(parCarburant).sort((a, b) => b[1] - a[1]);
    const maxCarb = Math.max(1, ...carbRows.map(r => r[1]));

    // Entretiens récents
    const recents = entretiens.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);

    const kpi = (tone, ico, value, label, sub) => `
      <div class="kpi">
        <div class="kpi-ico ${tone}" style="--m:var(${ico})"></div>
        <div class="kpi-meta">
          <div class="kpi-value">${value}</div>
          <div class="kpi-label">${esc(label)}</div>
          ${sub ? `<div class="kpi-sub ${tone.replace("tone-", "")==="slate"?"muted":""}" style="color:${subColor(tone)}">${sub}</div>` : ""}
        </div>
      </div>`;

    function subColor(tone) {
      return { "tone-blue": "#0369a1", "tone-green": "#15803d", "tone-amber": "#b45309", "tone-red": "#b91c1c", "tone-violet": "#6d28d9", "tone-slate": "#64748b" }[tone] || "#64748b";
    }

    view.innerHTML = `
      <div class="kpi-grid">
        ${kpi("tone-blue", "--icon-car", total, "Véhicules au parc", `${vehicules.filter(v=>v.statut!=="hors_service").length} en service`)}
        ${kpi("tone-green", "--icon-car", dispo, "Disponibles", total ? `${Math.round(dispo/total*100)}% du parc` : "")}
        ${kpi("tone-amber", "--icon-wrench", maint, "En maintenance", entretiens.filter(e=>e.statut==="en_cours").length + " intervention(s) en cours")}
        ${kpi("tone-violet", "--icon-users", condActifs, "Conducteurs actifs", `${conducteurs.length} au total`)}
        ${kpi("tone-slate", "--icon-euro", money(coutEntretienAnnee), "Entretien " + year, "Coût cumulé")}
        ${kpi("tone-red", "--icon-alert", alertes.length, "Alertes", "Échéances à surveiller")}
      </div>

      <div class="dash-grid">
        <div class="card">
          <div class="card-head"><h3>Alertes & échéances</h3><span class="muted">assurance · contrôle technique</span></div>
          <div class="card-body">
            <div class="alert-list">
              ${alertes.length ? alertes.map(a => `
                <div class="alert-item">
                  <div class="alert-badge ${a.tone}" style="--m:var(${a.icon})"></div>
                  <div class="alert-text">
                    <div class="t">${esc(a.title)}</div>
                    <div class="s">${esc(a.sub)}</div>
                  </div>
                  <div class="alert-when" style="color:${subColor(a.whenCls)}">${esc(a.when)}</div>
                </div>`).join("")
                : `<div class="empty-mini">Aucune échéance imminente. Tout est à jour ✅</div>`}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>Répartition du parc</h3></div>
          <div class="card-body">
            <div class="donut-wrap">
              <div class="donut" style="background:${gradient}">
                <div class="donut-center"><div class="n">${total}</div><div class="l">véhicules</div></div>
              </div>
              <div class="legend">
                ${Store.STATUTS_VEHICULE.map(s => `
                  <div class="legend-item">
                    <span class="legend-dot" style="background:${palette[s.value]}"></span>
                    ${esc(s.label)}
                    <span class="val">${countBy(s.value)}</span>
                  </div>`).join("")}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="dash-grid-3">
        <div class="card">
          <div class="card-head"><h3>Entretiens récents</h3></div>
          <div class="card-body" style="padding:0">
            <div class="table-scroll">
              <table class="data">
                <thead><tr><th>Véhicule</th><th>Type</th><th>Date</th><th class="text-right">Coût</th><th>Statut</th></tr></thead>
                <tbody>
                  ${recents.length ? recents.map(e => {
                    const v = Store.get("vehicules", e.vehiculeId);
                    const st = Store.refStatutEntretien(e.statut);
                    return `<tr>
                      <td class="cell-strong">${v ? esc(v.marque + " " + v.modele) : "—"}</td>
                      <td>${esc(e.type)}</td>
                      <td class="nowrap">${date(e.date)}</td>
                      <td class="text-right cell-strong">${money(e.cout)}</td>
                      <td>${badge(st.label, st.badge)}</td>
                    </tr>`;
                  }).join("") : emptyRow(5, "Aucun entretien enregistré.")}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>Répartition par carburant</h3></div>
          <div class="card-body">
            <div class="bars">
              ${carbRows.map(([k, n]) => `
                <div class="bar-row">
                  <div class="bar-top"><span>${esc(k)}</span><b>${n}</b></div>
                  <div class="bar-track"><div class="bar-fill" style="width:${Math.round(n / maxCarb * 100)}%"></div></div>
                </div>`).join("")}
            </div>
          </div>
        </div>
      </div>
    `;

    return { title: "Tableau de bord", subtitle: "Vue d'ensemble du parc automobile" };
  }

  /* =================================================================
     VÉHICULES
     ================================================================= */
  function vehiculeFields() {
    return [
      { name: "immatriculation", label: "Immatriculation", type: "text", required: true, placeholder: "AB-123-CD" },
      { name: "statut", label: "Statut", type: "select", required: true, options: Store.STATUTS_VEHICULE },
      { name: "marque", label: "Marque", type: "text", required: true, placeholder: "Renault" },
      { name: "modele", label: "Modèle", type: "text", required: true, placeholder: "Clio" },
      { name: "annee", label: "Année", type: "number", min: 1980, max: 2100, placeholder: "2021" },
      { name: "type", label: "Type", type: "select", options: Store.TYPES_VEHICULE, placeholder: "—" },
      { name: "carburant", label: "Carburant", type: "select", options: Store.CARBURANTS, placeholder: "—" },
      { name: "kilometrage", label: "Kilométrage", type: "number", min: 0, placeholder: "45000" },
      { name: "dateAcquisition", label: "Date d'acquisition", type: "date" },
      { name: "conducteurId", label: "Conducteur affecté", type: "select", options: selectOptionsConducteurs(), placeholder: "Aucun" },
      { name: "assuranceExpiration", label: "Échéance assurance", type: "date" },
      { name: "controleExpiration", label: "Échéance contrôle technique", type: "date" },
      { name: "notes", label: "Notes", type: "textarea", colSpan: true, placeholder: "Observations…" }
    ];
  }

  function vehicules(view, actions) {
    let q = "", fStatut = "";

    actions.appendChild(addBtn("Ajouter un véhicule", () => openVehiculeForm()));

    view.innerHTML = `
      <div class="toolbar">
        <div class="search"><input type="search" id="v-search" placeholder="Rechercher (marque, modèle, immatriculation…)" /></div>
        <select class="filter-select" id="v-statut">
          <option value="">Tous les statuts</option>
          ${Store.STATUTS_VEHICULE.map(s => `<option value="${s.value}">${esc(s.label)}</option>`).join("")}
        </select>
      </div>
      <div class="table-wrap"><div class="table-scroll">
        <table class="data">
          <thead><tr>
            <th>Véhicule</th><th>Immatriculation</th><th>Carburant</th>
            <th class="text-right">Kilométrage</th><th>Conducteur</th><th>Échéances</th><th>Statut</th><th></th>
          </tr></thead>
          <tbody id="v-body"></tbody>
        </table>
      </div></div>`;

    const body = U.qs("#v-body", view);

    function refresh() {
      let rows = Store.all("vehicules");
      if (fStatut) rows = rows.filter(v => v.statut === fStatut);
      if (q) {
        const nq = norm(q);
        rows = rows.filter(v => norm(`${v.marque} ${v.modele} ${v.immatriculation} ${v.type}`).includes(nq));
      }
      rows.sort((a, b) => a.marque.localeCompare(b.marque) || a.modele.localeCompare(b.modele));

      if (!rows.length) { body.innerHTML = emptyRow(8, "Aucun véhicule ne correspond."); return; }

      body.innerHTML = rows.map(v => {
        const st = Store.refStatutVehicule(v.statut);
        const cond = v.conducteurId ? Store.conducteurNom(v.conducteurId) : "";
        return `<tr data-id="${v.id}">
          <td>${vehCell(v)}</td>
          <td>${plate(v.immatriculation)}</td>
          <td>${esc(v.carburant || "—")}</td>
          <td class="text-right nowrap">${km(v.kilometrage)}</td>
          <td>${cond ? `<div class="veh-cell">${avatar(cond)}<span>${esc(cond)}</span></div>` : `<span class="cell-sub">Non affecté</span>`}</td>
          <td>${dueTag("Assur.", v.assuranceExpiration)}${dueTag("CT", v.controleExpiration)}</td>
          <td>${badge(st.label, st.badge)}</td>
          <td><div class="row-actions">
            <button class="act act-view" data-act="view" title="Détails"></button>
            <button class="act act-edit" data-act="edit" title="Modifier"></button>
            <button class="act act-del danger" data-act="del" title="Supprimer"></button>
          </div></td>
        </tr>`;
      }).join("");
    }

    body.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const id = btn.closest("tr").dataset.id;
      const act = btn.dataset.act;
      if (act === "view") openVehiculeDetail(id);
      else if (act === "edit") openVehiculeForm(id);
      else if (act === "del") deleteVehicule(id, refresh);
    });

    U.qs("#v-search", view).addEventListener("input", U.debounce((e) => { q = e.target.value; refresh(); }, 180));
    U.qs("#v-statut", view).addEventListener("change", (e) => { fStatut = e.target.value; refresh(); });

    function openVehiculeForm(id) {
      const existing = id ? Store.get("vehicules", id) : null;
      const defaults = { statut: "disponible", carburant: "Essence", type: "Berline", annee: new Date().getFullYear() };
      formModal({
        title: existing ? "Modifier le véhicule" : "Nouveau véhicule",
        wide: true,
        fields: vehiculeFields(),
        values: existing || defaults,
        submitLabel: existing ? "Enregistrer" : "Ajouter",
        onSubmit: (data) => {
          if (existing) { Store.update("vehicules", id, data); toast("Véhicule mis à jour."); }
          else { Store.add("vehicules", data); toast("Véhicule ajouté."); }
          refresh();
        }
      });
    }

    refresh();
    return { title: "Véhicules", subtitle: "Gestion de la flotte" };
  }

  function deleteVehicule(id, after) {
    const v = Store.get("vehicules", id);
    confirmDialog({
      title: "Supprimer le véhicule",
      message: `Supprimer définitivement « ${v.marque} ${v.modele} » (${v.immatriculation}) ? Les entretiens et pleins associés seront également supprimés.`,
      confirmLabel: "Supprimer"
    }).then(ok => { if (ok) { Store.remove("vehicules", id); toast("Véhicule supprimé.", "info"); after && after(); } });
  }

  function openVehiculeDetail(id) {
    const v = Store.get("vehicules", id);
    if (!v) return;
    const st = Store.refStatutVehicule(v.statut);
    const cond = v.conducteurId ? Store.conducteurNom(v.conducteurId) : "Non affecté";
    const hist = Store.all("entretiens").filter(e => e.vehiculeId === id).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const pleins = Store.all("carburants").filter(f => f.vehiculeId === id).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const coutTotal = U.sum(hist, e => e.cout);

    const item = (k, val) => `<div class="detail-item"><div class="k">${k}</div><div class="v">${val}</div></div>`;

    const body = document.createElement("div");
    body.innerHTML = `
      <div class="detail-head">
        <span class="veh-ico" style="width:52px;height:52px"></span>
        <div>
          <h2 style="font-size:20px">${esc(v.marque)} ${esc(v.modele)}</h2>
          <div style="margin-top:6px">${plate(v.immatriculation)} &nbsp; ${badge(st.label, st.badge)}</div>
        </div>
      </div>
      <div class="detail-grid" style="margin-top:18px">
        ${item("Type", esc(v.type || "—"))}
        ${item("Année", esc(String(v.annee || "—")))}
        ${item("Carburant", esc(v.carburant || "—"))}
        ${item("Kilométrage", km(v.kilometrage))}
        ${item("Conducteur", esc(cond))}
        ${item("Acquisition", date(v.dateAcquisition))}
        ${item("Assurance", dueTagInline(v.assuranceExpiration))}
        ${item("Contrôle technique", dueTagInline(v.controleExpiration))}
        ${item("Coût entretien total", money(coutTotal))}
      </div>
      ${v.notes ? `<div class="detail-section-title">Notes</div><p class="muted" style="margin:0">${esc(v.notes)}</p>` : ""}

      <div class="detail-section-title">Historique d'entretien (${hist.length})</div>
      <div class="table-wrap"><div class="table-scroll"><table class="data">
        <thead><tr><th>Date</th><th>Type</th><th>Prestataire</th><th class="text-right">Coût</th><th>Statut</th></tr></thead>
        <tbody>${hist.length ? hist.map(e => {
          const es = Store.refStatutEntretien(e.statut);
          return `<tr><td class="nowrap">${date(e.date)}</td><td>${esc(e.type)}</td><td>${esc(e.prestataire || "—")}</td><td class="text-right cell-strong">${money(e.cout)}</td><td>${badge(es.label, es.badge)}</td></tr>`;
        }).join("") : emptyRow(5, "Aucun entretien.")}</tbody>
      </table></div></div>

      <div class="detail-section-title">Pleins de carburant (${pleins.length})</div>
      <div class="table-wrap"><div class="table-scroll"><table class="data">
        <thead><tr><th>Date</th><th class="text-right">Litres</th><th class="text-right">Coût</th><th class="text-right">Kilométrage</th></tr></thead>
        <tbody>${pleins.length ? pleins.map(f => `<tr><td class="nowrap">${date(f.date)}</td><td class="text-right">${num(f.litres)} L</td><td class="text-right cell-strong">${money2(f.cout)}</td><td class="text-right nowrap">${km(f.kilometrage)}</td></tr>`).join("") : emptyRow(4, "Aucun plein.")}</tbody>
      </table></div></div>
    `;

    const footer = document.createElement("div");
    footer.style.display = "contents";
    const close = button("Fermer", "btn btn-ghost");
    close.onclick = UI.closeModal;
    footer.append(close);

    openModal({ title: "Détails du véhicule", bodyEl: body, footerEl: footer, wide: true });
  }

  function dueTagInline(iso) {
    if (!iso) return '<span class="muted">—</span>';
    const d = daysUntil(iso);
    if (d < 0) return `${date(iso)} ${badge("Expiré", "b-red")}`;
    if (d <= 30) return `${date(iso)} ${badge(relativeDays(iso), "b-amber")}`;
    return date(iso);
  }

  /* =================================================================
     CONDUCTEURS
     ================================================================= */
  function conducteurs(view, actions) {
    let q = "", fStatut = "";
    actions.appendChild(addBtn("Ajouter un conducteur", () => openForm()));

    view.innerHTML = `
      <div class="toolbar">
        <div class="search"><input type="search" id="c-search" placeholder="Rechercher un conducteur…" /></div>
        <select class="filter-select" id="c-statut">
          <option value="">Tous les statuts</option>
          ${Store.STATUTS_CONDUCTEUR.map(s => `<option value="${s.value}">${esc(s.label)}</option>`).join("")}
        </select>
      </div>
      <div class="table-wrap"><div class="table-scroll">
        <table class="data">
          <thead><tr><th>Conducteur</th><th>Permis</th><th>Téléphone</th><th>Email</th><th>Véhicule affecté</th><th>Statut</th><th></th></tr></thead>
          <tbody id="c-body"></tbody>
        </table>
      </div></div>`;

    const body = U.qs("#c-body", view);

    function refresh() {
      let rows = Store.all("conducteurs");
      if (fStatut) rows = rows.filter(c => c.statut === fStatut);
      if (q) { const nq = norm(q); rows = rows.filter(c => norm(`${c.prenom} ${c.nom} ${c.email} ${c.telephone}`).includes(nq)); }
      rows.sort((a, b) => a.nom.localeCompare(b.nom));

      if (!rows.length) { body.innerHTML = emptyRow(7, "Aucun conducteur ne correspond."); return; }

      const vehParCond = U.groupBy(Store.all("vehicules").filter(v => v.conducteurId), v => v.conducteurId);

      body.innerHTML = rows.map(c => {
        const st = Store.refStatutConducteur(c.statut);
        const name = `${c.prenom} ${c.nom}`;
        const vehs = vehParCond.get(c.id) || [];
        const vehLabel = vehs.length ? vehs.map(v => `${v.marque} ${v.modele}`).join(", ") : "";
        return `<tr data-id="${c.id}">
          <td><div class="veh-cell">${avatar(name)}<div><div class="cell-strong">${esc(name)}</div><div class="cell-sub">Permis ${esc(c.categorie || "—")}</div></div></div></td>
          <td class="nowrap">${esc(c.permis || "—")}</td>
          <td class="nowrap">${esc(c.telephone || "—")}</td>
          <td>${esc(c.email || "—")}</td>
          <td>${vehLabel ? esc(vehLabel) : `<span class="cell-sub">—</span>`}</td>
          <td>${badge(st.label, st.badge)}</td>
          <td><div class="row-actions">
            <button class="act act-edit" data-act="edit" title="Modifier"></button>
            <button class="act act-del danger" data-act="del" title="Supprimer"></button>
          </div></td>
        </tr>`;
      }).join("");
    }

    body.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]"); if (!btn) return;
      const id = btn.closest("tr").dataset.id;
      if (btn.dataset.act === "edit") openForm(id);
      else if (btn.dataset.act === "del") {
        const c = Store.get("conducteurs", id);
        confirmDialog({ title: "Supprimer le conducteur", message: `Supprimer « ${c.prenom} ${c.nom} » ? Les véhicules affectés seront libérés.`, confirmLabel: "Supprimer" })
          .then(ok => { if (ok) { Store.remove("conducteurs", id); toast("Conducteur supprimé.", "info"); refresh(); } });
      }
    });

    U.qs("#c-search", view).addEventListener("input", U.debounce(e => { q = e.target.value; refresh(); }, 180));
    U.qs("#c-statut", view).addEventListener("change", e => { fStatut = e.target.value; refresh(); });

    function openForm(id) {
      const existing = id ? Store.get("conducteurs", id) : null;
      formModal({
        title: existing ? "Modifier le conducteur" : "Nouveau conducteur",
        fields: [
          { name: "prenom", label: "Prénom", type: "text", required: true },
          { name: "nom", label: "Nom", type: "text", required: true },
          { name: "permis", label: "N° de permis", type: "text", placeholder: "0512345678" },
          { name: "categorie", label: "Catégorie", type: "select", options: Store.CATEGORIES_PERMIS, placeholder: "—" },
          { name: "telephone", label: "Téléphone", type: "tel", placeholder: "06 12 34 56 78" },
          { name: "email", label: "Email", type: "email", placeholder: "prenom.nom@odisef.fr" },
          { name: "statut", label: "Statut", type: "select", required: true, options: Store.STATUTS_CONDUCTEUR }
        ],
        values: existing || { statut: "actif", categorie: "B" },
        submitLabel: existing ? "Enregistrer" : "Ajouter",
        onSubmit: (data) => {
          if (existing) { Store.update("conducteurs", id, data); toast("Conducteur mis à jour."); }
          else { Store.add("conducteurs", data); toast("Conducteur ajouté."); }
          refresh();
        }
      });
    }

    refresh();
    return { title: "Conducteurs", subtitle: "Personnel et permis de conduire" };
  }

  /* =================================================================
     ENTRETIENS
     ================================================================= */
  function entretiens(view, actions) {
    let q = "", fStatut = "", fVeh = "";
    actions.appendChild(addBtn("Planifier un entretien", () => openForm()));

    view.innerHTML = `
      <div class="toolbar">
        <div class="search"><input type="search" id="e-search" placeholder="Rechercher (type, prestataire…)" /></div>
        <select class="filter-select" id="e-veh"><option value="">Tous les véhicules</option>
          ${selectOptionsVehicules().map(o => `<option value="${o.value}">${esc(o.label)}</option>`).join("")}
        </select>
        <select class="filter-select" id="e-statut"><option value="">Tous les statuts</option>
          ${Store.STATUTS_ENTRETIEN.map(s => `<option value="${s.value}">${esc(s.label)}</option>`).join("")}
        </select>
      </div>
      <div class="table-wrap"><div class="table-scroll">
        <table class="data">
          <thead><tr><th>Véhicule</th><th>Type</th><th>Date</th><th class="text-right">Kilométrage</th><th>Prestataire</th><th class="text-right">Coût</th><th>Statut</th><th></th></tr></thead>
          <tbody id="e-body"></tbody>
        </table>
      </div></div>`;

    const body = U.qs("#e-body", view);

    function refresh() {
      let rows = Store.all("entretiens");
      if (fVeh) rows = rows.filter(e => e.vehiculeId === fVeh);
      if (fStatut) rows = rows.filter(e => e.statut === fStatut);
      if (q) { const nq = norm(q); rows = rows.filter(e => norm(`${e.type} ${e.prestataire} ${e.description}`).includes(nq)); }
      rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

      if (!rows.length) { body.innerHTML = emptyRow(8, "Aucun entretien ne correspond."); return; }

      body.innerHTML = rows.map(e => {
        const v = Store.get("vehicules", e.vehiculeId);
        const st = Store.refStatutEntretien(e.statut);
        return `<tr data-id="${e.id}">
          <td>${v ? `<div class="cell-strong">${esc(v.marque)} ${esc(v.modele)}</div><div class="cell-sub">${esc(v.immatriculation)}</div>` : `<span class="cell-sub">Véhicule supprimé</span>`}</td>
          <td class="cell-strong">${esc(e.type)}</td>
          <td class="nowrap">${date(e.date)}</td>
          <td class="text-right nowrap">${e.kilometrage ? km(e.kilometrage) : "—"}</td>
          <td>${esc(e.prestataire || "—")}</td>
          <td class="text-right cell-strong">${money(e.cout)}</td>
          <td>${badge(st.label, st.badge)}</td>
          <td><div class="row-actions">
            <button class="act act-edit" data-act="edit" title="Modifier"></button>
            <button class="act act-del danger" data-act="del" title="Supprimer"></button>
          </div></td>
        </tr>`;
      }).join("");
    }

    body.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]"); if (!btn) return;
      const id = btn.closest("tr").dataset.id;
      if (btn.dataset.act === "edit") openForm(id);
      else if (btn.dataset.act === "del") {
        confirmDialog({ title: "Supprimer l'entretien", message: "Supprimer cette intervention ?", confirmLabel: "Supprimer" })
          .then(ok => { if (ok) { Store.remove("entretiens", id); toast("Entretien supprimé.", "info"); refresh(); } });
      }
    });

    U.qs("#e-search", view).addEventListener("input", U.debounce(e => { q = e.target.value; refresh(); }, 180));
    U.qs("#e-veh", view).addEventListener("change", e => { fVeh = e.target.value; refresh(); });
    U.qs("#e-statut", view).addEventListener("change", e => { fStatut = e.target.value; refresh(); });

    function openForm(id) {
      const existing = id ? Store.get("entretiens", id) : null;
      formModal({
        title: existing ? "Modifier l'entretien" : "Nouvel entretien",
        wide: true,
        fields: [
          { name: "vehiculeId", label: "Véhicule", type: "select", required: true, options: selectOptionsVehicules(), placeholder: "Sélectionner…" },
          { name: "type", label: "Type d'intervention", type: "select", required: true, options: Store.TYPES_ENTRETIEN },
          { name: "date", label: "Date", type: "date", required: true },
          { name: "statut", label: "Statut", type: "select", required: true, options: Store.STATUTS_ENTRETIEN },
          { name: "kilometrage", label: "Kilométrage", type: "number", min: 0 },
          { name: "cout", label: "Coût (€)", type: "number", min: 0, step: "0.01" },
          { name: "prestataire", label: "Prestataire / garage", type: "text", colSpan: true, placeholder: "Garage Central" },
          { name: "description", label: "Description", type: "textarea", colSpan: true }
        ],
        values: existing || { date: U.todayISO(), statut: "planifie", type: "Révision", cout: 0 },
        submitLabel: existing ? "Enregistrer" : "Ajouter",
        onSubmit: (data) => {
          if (existing) { Store.update("entretiens", id, data); toast("Entretien mis à jour."); }
          else { Store.add("entretiens", data); toast("Entretien enregistré."); }
          refresh();
        }
      });
    }

    refresh();
    return { title: "Entretiens", subtitle: "Maintenance et réparations" };
  }

  /* =================================================================
     CARBURANT
     ================================================================= */
  function carburant(view, actions) {
    let q = "", fVeh = "";
    actions.appendChild(addBtn("Ajouter un plein", () => openForm()));

    const all = Store.all("carburants");
    const totalLitres = U.sum(all, f => f.litres);
    const totalCout = U.sum(all, f => f.cout);
    const prixMoyen = totalLitres ? totalCout / totalLitres : 0;

    view.innerHTML = `
      <div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr))">
        <div class="kpi"><div class="kpi-ico tone-blue" style="--m:var(--icon-fuel)"></div><div class="kpi-meta"><div class="kpi-value">${num(totalLitres)} L</div><div class="kpi-label">Volume total</div></div></div>
        <div class="kpi"><div class="kpi-ico tone-slate" style="--m:var(--icon-euro)"></div><div class="kpi-meta"><div class="kpi-value">${money(totalCout)}</div><div class="kpi-label">Coût total</div></div></div>
        <div class="kpi"><div class="kpi-ico tone-amber" style="--m:var(--icon-gauge)"></div><div class="kpi-meta"><div class="kpi-value">${money2(prixMoyen)}</div><div class="kpi-label">Prix moyen / litre</div></div></div>
        <div class="kpi"><div class="kpi-ico tone-violet" style="--m:var(--icon-fuel)"></div><div class="kpi-meta"><div class="kpi-value">${all.length}</div><div class="kpi-label">Pleins enregistrés</div></div></div>
      </div>
      <div class="toolbar">
        <div class="search"><input type="search" id="f-search" placeholder="Rechercher…" /></div>
        <select class="filter-select" id="f-veh"><option value="">Tous les véhicules</option>
          ${selectOptionsVehicules().map(o => `<option value="${o.value}">${esc(o.label)}</option>`).join("")}
        </select>
      </div>
      <div class="table-wrap"><div class="table-scroll">
        <table class="data">
          <thead><tr><th>Véhicule</th><th>Date</th><th class="text-right">Litres</th><th class="text-right">Coût</th><th class="text-right">Prix/L</th><th class="text-right">Kilométrage</th><th>Conducteur</th><th></th></tr></thead>
          <tbody id="f-body"></tbody>
        </table>
      </div></div>`;

    const body = U.qs("#f-body", view);

    function refresh() {
      let rows = Store.all("carburants");
      if (fVeh) rows = rows.filter(f => f.vehiculeId === fVeh);
      if (q) {
        const nq = norm(q);
        rows = rows.filter(f => {
          const v = Store.get("vehicules", f.vehiculeId);
          const c = f.conducteurId ? Store.conducteurNom(f.conducteurId) : "";
          return norm(`${v ? v.marque + " " + v.modele + " " + v.immatriculation : ""} ${c}`).includes(nq);
        });
      }
      rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

      if (!rows.length) { body.innerHTML = emptyRow(8, "Aucun plein ne correspond."); return; }

      body.innerHTML = rows.map(f => {
        const v = Store.get("vehicules", f.vehiculeId);
        const cond = f.conducteurId ? Store.conducteurNom(f.conducteurId) : "";
        const prixL = f.litres ? f.cout / f.litres : 0;
        return `<tr data-id="${f.id}">
          <td>${v ? `<div class="cell-strong">${esc(v.marque)} ${esc(v.modele)}</div><div class="cell-sub">${esc(v.immatriculation)}</div>` : `<span class="cell-sub">Véhicule supprimé</span>`}</td>
          <td class="nowrap">${date(f.date)}</td>
          <td class="text-right">${num(f.litres)} L</td>
          <td class="text-right cell-strong">${money2(f.cout)}</td>
          <td class="text-right">${money2(prixL)}</td>
          <td class="text-right nowrap">${f.kilometrage ? km(f.kilometrage) : "—"}</td>
          <td>${cond ? esc(cond) : `<span class="cell-sub">—</span>`}</td>
          <td><div class="row-actions">
            <button class="act act-edit" data-act="edit" title="Modifier"></button>
            <button class="act act-del danger" data-act="del" title="Supprimer"></button>
          </div></td>
        </tr>`;
      }).join("");
    }

    body.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]"); if (!btn) return;
      const id = btn.closest("tr").dataset.id;
      if (btn.dataset.act === "edit") openForm(id);
      else if (btn.dataset.act === "del") {
        confirmDialog({ title: "Supprimer le plein", message: "Supprimer cet enregistrement ?", confirmLabel: "Supprimer" })
          .then(ok => { if (ok) { Store.remove("carburants", id); toast("Plein supprimé.", "info"); rerender(); } });
      }
    });

    U.qs("#f-search", view).addEventListener("input", U.debounce(e => { q = e.target.value; refresh(); }, 180));
    U.qs("#f-veh", view).addEventListener("change", e => { fVeh = e.target.value; refresh(); });

    function rerender() { carburant(view, clearActions(actions)); }

    function openForm(id) {
      const existing = id ? Store.get("carburants", id) : null;
      formModal({
        title: existing ? "Modifier le plein" : "Nouveau plein",
        fields: [
          { name: "vehiculeId", label: "Véhicule", type: "select", required: true, options: selectOptionsVehicules(), placeholder: "Sélectionner…" },
          { name: "date", label: "Date", type: "date", required: true },
          { name: "litres", label: "Litres", type: "number", min: 0, step: "0.01", required: true },
          { name: "cout", label: "Coût (€)", type: "number", min: 0, step: "0.01", required: true },
          { name: "kilometrage", label: "Kilométrage", type: "number", min: 0 },
          { name: "conducteurId", label: "Conducteur", type: "select", options: selectOptionsConducteurs(), placeholder: "—" }
        ],
        values: existing || { date: U.todayISO(), litres: 0, cout: 0 },
        submitLabel: existing ? "Enregistrer" : "Ajouter",
        onSubmit: (data) => {
          if (existing) { Store.update("carburants", id, data); toast("Plein mis à jour."); }
          else { Store.add("carburants", data); toast("Plein enregistré."); }
          rerender();
        }
      });
    }

    refresh();
    return { title: "Carburant", subtitle: "Suivi des pleins et de la consommation" };
  }

  function clearActions(actions) { actions.innerHTML = ""; return actions; }

  window.Views = { dashboard, vehicules, conducteurs, entretiens, carburant };
})();
