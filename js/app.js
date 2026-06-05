/* ===================================================================
   app.js — routeur (hash) et initialisation
   =================================================================== */
(function () {
  "use strict";
  const { qs, qsa } = U;

  const ROUTES = {
    dashboard:   { label: "Tableau de bord", view: Views.dashboard },
    vehicules:   { label: "Véhicules",       view: Views.vehicules },
    conducteurs: { label: "Conducteurs",     view: Views.conducteurs },
    entretiens:  { label: "Entretiens",      view: Views.entretiens },
    carburant:   { label: "Carburant",       view: Views.carburant }
  };

  const view = qs("#view");
  const actions = qs("#topbar-actions");
  const app = qs("#app");

  function currentRoute() {
    const r = (location.hash.replace(/^#\/?/, "") || "dashboard").split("/")[0];
    return ROUTES[r] ? r : "dashboard";
  }

  function navigate() {
    const route = currentRoute();
    const def = ROUTES[route];

    qsa(".nav-link").forEach(a => a.classList.toggle("active", a.dataset.route === route));

    view.innerHTML = "";
    actions.innerHTML = "";

    let meta = {};
    try {
      meta = def.view(view, actions) || {};
    } catch (err) {
      console.error("[ParcAuto] erreur de rendu :", err);
      view.innerHTML = `<div class="empty"><div class="empty-ico"></div><h3>Une erreur est survenue</h3><p>${U.esc(err.message)}</p></div>`;
    }

    qs("#page-title").textContent = meta.title || def.label;
    qs("#page-subtitle").textContent = meta.subtitle || "";
    window.scrollTo(0, 0);
    app.classList.remove("nav-open");
  }

  function init() {
    // Libellés de navigation
    qsa(".nav-link").forEach(a => {
      const r = a.dataset.route;
      if (ROUTES[r]) a.appendChild(document.createTextNode(ROUTES[r].label));
    });

    // Menu mobile
    qs("#menu-toggle").addEventListener("click", () => app.classList.toggle("nav-open"));
    view.addEventListener("click", () => app.classList.remove("nav-open"));

    // Réinitialisation des données
    qs("#btn-reset").addEventListener("click", () => {
      UI.confirmDialog({
        title: "Réinitialiser les données",
        message: "Restaurer le jeu de données de démonstration ? Toutes vos modifications locales seront perdues.",
        confirmLabel: "Réinitialiser"
      }).then(ok => {
        if (ok) { Store.reset(); navigate(); UI.toast("Données réinitialisées.", "info"); }
      });
    });

    window.addEventListener("hashchange", navigate);

    if (!location.hash) location.replace("#/dashboard");
    navigate();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
