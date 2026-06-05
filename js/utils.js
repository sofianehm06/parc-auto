/* ===================================================================
   utils.js — fonctions utilitaires (formatage, dates, DOM)
   Exposé via window.U
   =================================================================== */
(function () {
  "use strict";

  const fmtMoney = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const fmtMoney2 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
  const fmtNum = new Intl.NumberFormat("fr-FR");

  const U = {
    /** Identifiant unique */
    uid() {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    },

    /* ---------- Formatage ---------- */
    money(n) { return fmtMoney.format(Number(n) || 0); },
    money2(n) { return fmtMoney2.format(Number(n) || 0); },
    num(n) { return fmtNum.format(Number(n) || 0); },
    km(n) { return fmtNum.format(Number(n) || 0) + " km"; },

    /* ---------- Dates ---------- */
    todayISO() { return new Date().toISOString().slice(0, 10); },

    /** "2026-06-06" -> "06/06/2026" */
    date(iso) {
      if (!iso) return "—";
      const d = new Date(iso + "T00:00:00");
      if (isNaN(d)) return "—";
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    },

    /** "2026-06-06" -> "6 juin 2026" */
    dateLong(iso) {
      if (!iso) return "—";
      const d = new Date(iso + "T00:00:00");
      if (isNaN(d)) return "—";
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    },

    /** Nombre de jours entre aujourd'hui et une date ISO (négatif = passé) */
    daysUntil(iso) {
      if (!iso) return Infinity;
      const d = new Date(iso + "T00:00:00");
      const today = new Date(U.todayISO() + "T00:00:00");
      return Math.round((d - today) / 86400000);
    },

    /** Libellé relatif lisible : "dans 12 j", "aujourd'hui", "il y a 3 j" */
    relativeDays(iso) {
      const n = U.daysUntil(iso);
      if (n === 0) return "aujourd'hui";
      if (n === 1) return "demain";
      if (n === -1) return "hier";
      if (n > 0) return "dans " + n + " j";
      return "il y a " + Math.abs(n) + " j";
    },

    /* ---------- Texte ---------- */
    initials(...parts) {
      return parts.filter(Boolean).map(s => s.trim()[0] || "").join("").toUpperCase().slice(0, 2);
    },

    /** Couleur stable dérivée d'une chaîne (pour les avatars) */
    colorFor(str) {
      const palette = ["#2563eb", "#7c3aed", "#0891b2", "#db2777", "#ea580c", "#16a34a", "#ca8a04", "#4f46e5"];
      let h = 0;
      for (let i = 0; i < (str || "").length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
      return palette[h % palette.length];
    },

    /** Échappe le HTML pour l'injection sûre dans innerHTML */
    esc(s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },

    /** Normalise pour la recherche (sans accents, minuscule) */
    norm(s) {
      return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    },

    /* ---------- DOM ---------- */
    qs(sel, root) { return (root || document).querySelector(sel); },
    qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); },

    debounce(fn, ms) {
      let t;
      return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
    },

    /** Somme d'un tableau via un accesseur */
    sum(arr, get) { return arr.reduce((t, x) => t + (Number(get(x)) || 0), 0); },

    /** Regroupe par clé */
    groupBy(arr, get) {
      const m = new Map();
      for (const x of arr) {
        const k = get(x);
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(x);
      }
      return m;
    }
  };

  window.U = U;
})();
