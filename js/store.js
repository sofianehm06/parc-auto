/* ===================================================================
   store.js — couche de données (persistance localStorage + seed)
   Exposé via window.Store
   =================================================================== */
(function () {
  "use strict";

  const KEY = "parcauto.db.v2";

  /* ---------- Référentiels (listes de valeurs) ---------------------- */
  const STATUTS_VEHICULE = [
    { value: "disponible",     label: "Disponible",      badge: "b-green"  },
    { value: "en_mission",     label: "En mission",      badge: "b-blue"   },
    { value: "en_maintenance", label: "En maintenance",  badge: "b-amber"  },
    { value: "hors_service",   label: "Hors service",    badge: "b-red"    }
  ];
  const TYPES_VEHICULE = ["Berline", "Citadine", "Break", "SUV", "Utilitaire", "Camion", "Fourgon"];
  const CARBURANTS = ["Essence", "Diesel", "Hybride", "Électrique", "GPL"];

  const STATUTS_CONDUCTEUR = [
    { value: "actif",   label: "Actif",   badge: "b-green" },
    { value: "conge",   label: "En congé", badge: "b-amber" },
    { value: "inactif", label: "Inactif", badge: "b-slate" }
  ];
  const CATEGORIES_PERMIS = ["A", "A1", "A2", "B", "BE", "C", "CE", "D", "DE"];

  const TYPES_ENTRETIEN = ["Vidange", "Révision", "Réparation", "Pneumatiques", "Carrosserie", "Contrôle technique", "Autre"];
  const STATUTS_ENTRETIEN = [
    { value: "planifie", label: "Planifié", badge: "b-violet" },
    { value: "en_cours", label: "En cours", badge: "b-amber"  },
    { value: "termine",  label: "Terminé",  badge: "b-green"  }
  ];

  /* ---------- Jeu de données de démonstration ---------------------- */
  function seed() {
    return {
      conducteurs: [
        { id: "c1", nom: "Dupont", prenom: "Martin", permis: "0512345678", categorie: "B", telephone: "06 12 34 56 78", email: "m.dupont@odisef.fr", statut: "actif" },
        { id: "c2", nom: "Bernard", prenom: "Sophie", permis: "0698765432", categorie: "B", telephone: "06 23 45 67 89", email: "s.bernard@odisef.fr", statut: "actif" },
        { id: "c3", nom: "Benali", prenom: "Karim", permis: "0455667788", categorie: "C", telephone: "06 34 56 78 90", email: "k.benali@odisef.fr", statut: "actif" },
        { id: "c4", nom: "Moreau", prenom: "Julie", permis: "0512309876", categorie: "B", telephone: "06 45 67 89 01", email: "j.moreau@odisef.fr", statut: "actif" },
        { id: "c5", nom: "Lefebvre", prenom: "Thomas", permis: "0533445566", categorie: "B", telephone: "06 56 78 90 12", email: "t.lefebvre@odisef.fr", statut: "actif" },
        { id: "c6", nom: "Rousseau", prenom: "Amélie", permis: "0577889900", categorie: "B", telephone: "06 67 89 01 23", email: "a.rousseau@odisef.fr", statut: "actif" },
        { id: "c7", nom: "Garnier", prenom: "Nicolas", permis: "0411223344", categorie: "CE", telephone: "06 78 90 12 34", email: "n.garnier@odisef.fr", statut: "conge" }
      ],
      vehicules: [
        { id: "v1", immatriculation: "AB-123-CD", marque: "Renault", modele: "Clio", annee: 2021, type: "Citadine", carburant: "Essence",     kilometrage: 45200, dateAcquisition: "2021-03-10", statut: "disponible",     conducteurId: "c1", assuranceExpiration: "2026-09-15", controleExpiration: "2026-06-20", notes: "" },
        { id: "v2", immatriculation: "EF-456-GH", marque: "Peugeot", modele: "308",  annee: 2020, type: "Berline",  carburant: "Diesel",      kilometrage: 78600, dateAcquisition: "2020-06-22", statut: "en_mission",     conducteurId: "c2", assuranceExpiration: "2026-06-12", controleExpiration: "2027-02-01", notes: "Trajet régulier Lyon–Marseille." },
        { id: "v3", immatriculation: "IJ-789-KL", marque: "Renault", modele: "Master", annee: 2019, type: "Fourgon", carburant: "Diesel",      kilometrage: 119800, dateAcquisition: "2019-09-05", statut: "disponible",     conducteurId: "c3", assuranceExpiration: "2026-11-30", controleExpiration: "2026-05-20", notes: "" },
        { id: "v4", immatriculation: "MN-012-OP", marque: "Citroën", modele: "Berlingo", annee: 2022, type: "Utilitaire", carburant: "Diesel", kilometrage: 29900, dateAcquisition: "2022-01-18", statut: "en_maintenance", conducteurId: "c4", assuranceExpiration: "2027-01-10", controleExpiration: "2026-07-15", notes: "Réparation freins en cours." },
        { id: "v5", immatriculation: "QR-345-ST", marque: "Tesla", modele: "Model 3", annee: 2023, type: "Berline", carburant: "Électrique",  kilometrage: 15600, dateAcquisition: "2023-04-02", statut: "disponible",     conducteurId: "c5", assuranceExpiration: "2026-08-01", controleExpiration: "2026-12-05", notes: "" },
        { id: "v6", immatriculation: "UV-678-WX", marque: "Volkswagen", modele: "Crafter", annee: 2017, type: "Camion", carburant: "Diesel",  kilometrage: 204500, dateAcquisition: "2017-11-30", statut: "hors_service",   conducteurId: "", assuranceExpiration: "2026-04-01", controleExpiration: "2026-03-15", notes: "En attente de décision : réforme ou réparation moteur." },
        { id: "v7", immatriculation: "YZ-901-AB", marque: "Toyota", modele: "Yaris", annee: 2021, type: "Citadine", carburant: "Hybride",      kilometrage: 52100, dateAcquisition: "2021-07-14", statut: "en_mission",     conducteurId: "c6", assuranceExpiration: "2026-06-28", controleExpiration: "2026-10-10", notes: "" },
        { id: "v8", immatriculation: "CD-234-EF", marque: "Ford", modele: "Transit", annee: 2020, type: "Fourgon", carburant: "Diesel",        kilometrage: 94800, dateAcquisition: "2020-02-28", statut: "disponible",     conducteurId: "", assuranceExpiration: "2026-12-20", controleExpiration: "2026-06-30", notes: "" }
      ],
      entretiens: [
        { id: "en1", vehiculeId: "v2", type: "Vidange",            date: "2026-05-10", kilometrage: 76000,  cout: 95,   prestataire: "Garage Central",  statut: "termine",  description: "Vidange + filtre à huile." },
        { id: "en2", vehiculeId: "v4", type: "Réparation",         date: "2026-06-02", kilometrage: 29800,  cout: 480,  prestataire: "AutoExpert",      statut: "en_cours", description: "Remplacement plaquettes et disques avant." },
        { id: "en3", vehiculeId: "v1", type: "Révision",           date: "2026-04-18", kilometrage: 43000,  cout: 260,  prestataire: "Renault Service", statut: "termine",  description: "Révision des 40 000 km." },
        { id: "en4", vehiculeId: "v3", type: "Pneumatiques",       date: "2026-03-22", kilometrage: 118000, cout: 640,  prestataire: "EuroPneus",       statut: "termine",  description: "4 pneus toutes saisons." },
        { id: "en5", vehiculeId: "v6", type: "Réparation",         date: "2026-02-05", kilometrage: 199000, cout: 2350, prestataire: "Garage Central",  statut: "termine",  description: "Réparation moteur (joint de culasse)." },
        { id: "en6", vehiculeId: "v5", type: "Révision",           date: "2026-06-25", kilometrage: 15500,  cout: 180,  prestataire: "Tesla Center",    statut: "planifie", description: "Contrôle annuel." },
        { id: "en7", vehiculeId: "v8", type: "Vidange",            date: "2026-01-15", kilometrage: 88000,  cout: 110,  prestataire: "AutoExpert",      statut: "termine",  description: "" },
        { id: "en8", vehiculeId: "v7", type: "Contrôle technique", date: "2026-05-28", kilometrage: 51000,  cout: 85,   prestataire: "Contrôle Auto",   statut: "termine",  description: "Contrôle technique favorable." },
        { id: "en9", vehiculeId: "v2", type: "Carrosserie",        date: "2026-06-04", kilometrage: 78400,  cout: 720,  prestataire: "Garage Central",  statut: "en_cours", description: "Réparation aile arrière droite." },
        { id: "en10", vehiculeId: "v4", type: "Révision",          date: "2026-07-01", kilometrage: 30000,  cout: 240,  prestataire: "AutoExpert",      statut: "planifie", description: "Révision après réparation." }
      ],
      carburants: [
        { id: "f1", vehiculeId: "v1", date: "2026-06-01", litres: 38, cout: 72,  kilometrage: 44800, conducteurId: "c1" },
        { id: "f2", vehiculeId: "v2", date: "2026-06-03", litres: 55, cout: 88,  kilometrage: 78200, conducteurId: "c2" },
        { id: "f3", vehiculeId: "v3", date: "2026-05-30", litres: 80, cout: 128, kilometrage: 119500, conducteurId: "c3" },
        { id: "f4", vehiculeId: "v1", date: "2026-05-15", litres: 36, cout: 68,  kilometrage: 44100, conducteurId: "c1" },
        { id: "f5", vehiculeId: "v7", date: "2026-06-02", litres: 30, cout: 54,  kilometrage: 51800, conducteurId: "c6" },
        { id: "f6", vehiculeId: "v8", date: "2026-05-28", litres: 65, cout: 104, kilometrage: 94500, conducteurId: "" },
        { id: "f7", vehiculeId: "v2", date: "2026-05-20", litres: 52, cout: 85,  kilometrage: 77000, conducteurId: "c2" },
        { id: "f8", vehiculeId: "v3", date: "2026-06-04", litres: 78, cout: 125, kilometrage: 120100, conducteurId: "c3" }
      ]
    };
  }

  /* ---------- Persistance ------------------------------------------ */
  let db;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.vehicules) return parsed;
      }
    } catch (e) { console.warn("[Store] lecture impossible :", e); }
    const fresh = seed();
    save(fresh);
    return fresh;
  }

  function save(next) {
    db = next || db;
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { console.error("[Store] sauvegarde impossible :", e); }
  }

  db = load();

  /* ---------- API CRUD --------------------------------------------- */
  function all(coll) { return (db[coll] || []).map(x => Object.assign({}, x)); }
  function get(coll, id) { const r = (db[coll] || []).find(x => x.id === id); return r ? Object.assign({}, r) : null; }

  function add(coll, obj) {
    const rec = Object.assign({}, obj, { id: U.uid() });
    db[coll].push(rec);
    save();
    return rec;
  }

  function update(coll, id, patch) {
    const i = db[coll].findIndex(x => x.id === id);
    if (i === -1) return null;
    db[coll][i] = Object.assign({}, db[coll][i], patch, { id });
    save();
    return db[coll][i];
  }

  function remove(coll, id) {
    db[coll] = db[coll].filter(x => x.id !== id);
    // Intégrité référentielle
    if (coll === "vehicules") {
      db.entretiens = db.entretiens.filter(e => e.vehiculeId !== id);
      db.carburants = db.carburants.filter(f => f.vehiculeId !== id);
    }
    if (coll === "conducteurs") {
      db.vehicules.forEach(v => { if (v.conducteurId === id) v.conducteurId = ""; });
      db.carburants.forEach(f => { if (f.conducteurId === id) f.conducteurId = ""; });
    }
    save();
  }

  function reset() { db = seed(); save(); }

  /* ---------- Aides de résolution ---------------------------------- */
  function conducteurNom(id) {
    const c = get("conducteurs", id);
    return c ? c.prenom + " " + c.nom : "";
  }
  function vehiculeLibelle(id) {
    const v = get("vehicules", id);
    return v ? v.marque + " " + v.modele : "";
  }
  function refStatutVehicule(v) { return STATUTS_VEHICULE.find(s => s.value === v) || { label: v, badge: "b-slate" }; }
  function refStatutConducteur(v) { return STATUTS_CONDUCTEUR.find(s => s.value === v) || { label: v, badge: "b-slate" }; }
  function refStatutEntretien(v) { return STATUTS_ENTRETIEN.find(s => s.value === v) || { label: v, badge: "b-slate" }; }

  window.Store = {
    // collections
    all, get, add, update, remove, reset,
    // résolveurs
    conducteurNom, vehiculeLibelle,
    refStatutVehicule, refStatutConducteur, refStatutEntretien,
    // référentiels
    STATUTS_VEHICULE, TYPES_VEHICULE, CARBURANTS,
    STATUTS_CONDUCTEUR, CATEGORIES_PERMIS,
    TYPES_ENTRETIEN, STATUTS_ENTRETIEN
  };
})();
