# ParcAuto — Gestion de parc automobile

Application web de gestion de flotte automobile : véhicules, conducteurs,
entretiens et carburant, avec tableau de bord, alertes d'échéances et
statistiques. **Aucune installation, aucune compilation** — du HTML/CSS/JS
pur. Les données sont stockées localement dans le navigateur (`localStorage`).

![Stack](https://img.shields.io/badge/stack-HTML%20%2F%20CSS%20%2F%20JS%20vanilla-2563eb)

## Démarrage

### Option 1 — ouvrir directement
Double-cliquez sur **`index.html`**. L'application se lance dans votre
navigateur par défaut.

### Option 2 — serveur local (recommandé)
Un petit serveur statique Node est fourni. Depuis le dossier du projet :

```bash
node .claude/serve.js
```

Puis ouvrez <http://localhost:5180>.

## Fonctionnalités

| Module | Description |
|---|---|
| **Tableau de bord** | Indicateurs clés (parc, disponibilité, maintenance, coûts), alertes d'échéances (assurance / contrôle technique), répartition du parc, entretiens récents. |
| **Véhicules** | Liste filtrable, fiche détaillée (avec historique d'entretien et pleins), création / modification / suppression. Suivi des échéances d'assurance et de contrôle technique. |
| **Conducteurs** | Annuaire du personnel, permis et catégories, affectation des véhicules. |
| **Entretiens** | Suivi des interventions (vidange, révision, réparation…), statut, coût, prestataire. Filtres par véhicule et statut. |
| **Carburant** | Enregistrement des pleins, coût total, volume et prix moyen au litre. |

- 🔎 Recherche et filtres sur chaque liste
- 🔔 Alertes automatiques pour les échéances à 30 jours ou dépassées
- 💾 Persistance locale (aucun serveur, aucune base de données requise)
- 📱 Interface responsive (mobile / bureau)
- 🇫🇷 Interface entièrement en français

> Un jeu de données de démonstration est chargé au premier lancement.
> Le bouton **« Réinitialiser les données »** (en bas du menu) le restaure
> à tout moment.

## Structure du projet

```
parc auto/
├── index.html          Page principale (structure + points de montage)
├── css/
│   └── styles.css      Thème, mise en page, composants, icônes (SVG inline)
├── js/
│   ├── utils.js        Formatage (€, dates, km), helpers DOM
│   ├── store.js        Couche de données : CRUD + persistance + seed
│   ├── components.js   Modale, toasts, confirmation, constructeur de formulaire
│   ├── views.js        Rendu des pages (dashboard, véhicules, conducteurs…)
│   └── app.js          Routeur (hash) et initialisation
├── .claude/
│   └── serve.js        Serveur statique de développement (optionnel)
└── README.md
```

## Architecture

- **Sans dépendance** : tout est écrit en JavaScript natif, chargé via des
  balises `<script>` classiques (fonctionne donc aussi en `file://`).
- **Données** : une seule clé `localStorage` (`parcauto.db.v2`) contient les
  collections `vehicules`, `conducteurs`, `entretiens`, `carburants`.
  `store.js` expose une API CRUD (`Store.all/get/add/update/remove/reset`)
  avec intégrité référentielle (la suppression d'un véhicule supprime ses
  entretiens et pleins ; la suppression d'un conducteur libère ses véhicules).
- **Vues** : chaque page est une fonction `(view, actions) → { title, subtitle }`
  routée par le hash de l'URL (`#/dashboard`, `#/vehicules`, …).

## Évolutions possibles

- Export CSV / PDF des listes et rapports
- Backend (API + base de données) pour le multi-utilisateur
- Authentification et rôles
- Rappels par e-mail pour les échéances
