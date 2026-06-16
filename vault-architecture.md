# R_Storage — Architecture & Design

> Espace personnel de stockage et consultation de contenus : vidéos, certificats, images, documents. Navigable visuellement. Zéro landing page — l'accueil est le contenu.

---

## Vision

Un file manager web haut de gamme. La densité d'information d'une doc API, la lisibilité visuelle d'un OS moderne. Chaque fichier est prévisualisable directement dans l'interface — pas de téléchargement obligatoire pour voir ce qu'il y a dedans.

---

## Design Tokens

### Palette

| Nom        | Valeur     | Rôle                          |
|------------|------------|-------------------------------|
| `--bg`     | `#0A0A0F`  | Fond global                   |
| `--surface`| `#1A1A24`  | Cards, sidebar                |
| `--border` | `#2A2A38`  | Séparateurs, hover            |
| `--text`   | `#F0EDE6`  | Texte principal               |
| `--muted`  | `#7A7A8A`  | Métadonnées, labels           |
| `--gold`   | `#C8B88A`  | Accent, sélection active      |
| `--red`    | `#E05C5C`  | Vidéos (catégorie)            |
| `--blue`   | `#5C8AE0`  | Documents (catégorie)         |
| `--green`  | `#5CE08A`  | Certificats (catégorie)       |

### Typographie

| Rôle        | Police       | Usage                              |
|-------------|--------------|------------------------------------|
| Utilitaire  | `DM Mono`    | Labels, métadonnées, tailles, dates|
| Interface   | `Inter`      | Noms de fichiers, navigation       |

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');

:root {
  --bg:      #0A0A0F;
  --surface: #1A1A24;
  --border:  #2A2A38;
  --text:    #F0EDE6;
  --muted:   #7A7A8A;
  --gold:    #C8B88A;
  --red:     #E05C5C;
  --blue:    #5C8AE0;
  --green:   #5CE08A;

  --font-ui:   'Inter', sans-serif;
  --font-mono: 'DM Mono', monospace;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

---

## Structure des fichiers

```
R_Storage/
├── index.html          ← Accueil (grille de tous les contenus)
├── css/
│   ├── reset.css
│   ├── tokens.css      ← Variables CSS ci-dessus
│   ├── layout.css      ← Sidebar + grille principale
│   ├── card.css        ← Composant card avec preview
│   ├── preview.css     ← Modale / drawer de preview
│   └── sidebar.css     ← Navigation catégories
├── js/
│   ├── data.js         ← Catalogue JSON des fichiers
│   ├── render.js       ← Injection des cards dans la grille
│   ├── filter.js       ← Filtrage par catégorie / recherche
│   └── preview.js      ← Logique d'ouverture de preview
├── pages/
│   ├── videos.html
│   ├── certificates.html
│   ├── images.html
│   └── documents.html
└── assets/
    ├── thumbnails/     ← Miniatures générées
    └── files/          ← Fichiers réels
```

---

## Layout Global

```
┌──────────────────────────────────────────────────────┐
│  SIDEBAR (220px fixe)  │  ZONE PRINCIPALE (flex)     │
│                        │                             │
│  [ R_Storage ]  ←logo      │  Breadcrumb  +  Searchbar  │
│  ─────────             │  ─────────────────────────  │
│  Tout                  │                             │
│  Vidéos           ●    │  ┌────┐ ┌────┐ ┌────┐      │
│  Certificats      ●    │  │card│ │card│ │card│      │
│  Images           ●    │  └────┘ └────┘ └────┘      │
│  Documents        ●    │  ┌────┐ ┌────┐ ┌────┐      │
│  ─────────             │  │card│ │card│ │card│      │
│  Taille totale         │  └────┘ └────┘ └────┘      │
│  42 fichiers           │                             │
└──────────────────────────────────────────────────────┘
```

La sidebar est `position: fixed`, hauteur `100vh`. La zone principale a `margin-left: 220px` et scroll librement.

---

## Composant Card

La signature visuelle du site. Chaque card est un rectangle avec preview plein-cadre. Au hover, un overlay glisse depuis le bas avec les métadonnées.

```
État normal :
┌──────────────────┐
│                  │
│   [PREVIEW]      │  ← image / frame vidéo / icône doc
│   plein cadre    │
│                  │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│ nom-du-fichier   │  ← Inter 500
│ PDF · 2.4 MB     │  ← DM Mono, muted
└──────────────────┘

État hover (overlay monte) :
┌──────────────────┐
│   [PREVIEW]      │
│   (assombri)     │
│                  │
│ ██████████████ ← overlay #1A1A24 à 92%
│ nom-du-fichier   │
│ PDF · 2.4 MB     │
│ 12 jan. 2025     │
│ [ Voir ] [↓ DL ] │
└──────────────────┘
```

```css
.card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 4/3;
  transition: border-color 200ms ease, transform 200ms ease;
}

.card:hover {
  border-color: var(--gold);
  transform: translateY(-2px);
}

.card__preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card__overlay {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: rgba(26, 26, 36, 0.92);
  padding: 12px 14px;
  transform: translateY(100%);
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(8px);
}

.card:hover .card__overlay {
  transform: translateY(0);
}

.card__name {
  font-family: var(--font-ui);
  font-weight: 500;
  font-size: 13px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card__meta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}
```

---

## Types de preview par catégorie

| Type          | Preview dans card              | Preview plein écran         |
|---------------|--------------------------------|-----------------------------|
| **Image**     | `<img>` object-fit cover       | Lightbox pleine fenêtre     |
| **Vidéo**     | `<video>` premiere frame       | Player HTML5 inline         |
| **Certificat**| Miniature PDF (page 1)         | Viewer PDF (`<iframe>`)     |
| **Document**  | Icône + type + premières lignes| Viewer PDF ou téléchargement|

Pour les PDFs : utiliser `pdf.js` (Mozilla) pour rendre la page 1 en canvas → thumbnail.

---

## Grille principale

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  padding: 24px;
}
```

Responsive naturel : de 1 à 5 colonnes selon la largeur disponible, sans breakpoints manuels.

---

## Sidebar — Navigation

```css
.sidebar {
  position: fixed;
  top: 0; left: 0;
  width: 220px;
  height: 100vh;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 24px 0;
  z-index: 100;
}

.sidebar__logo {
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 500;
  color: var(--gold);
  padding: 0 20px 24px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nav__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 20px;
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--muted);
  border-left: 2px solid transparent;
  cursor: pointer;
  transition: color 150ms, border-color 150ms;
}

.nav__item:hover,
.nav__item.active {
  color: var(--text);
  border-left-color: var(--gold);
  background: rgba(200, 184, 138, 0.06);
}

.nav__dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  margin-left: auto;
}
```

Chaque catégorie a son dot coloré (rouge vidéos, vert certificats, bleu docs, blanc images).

---

## Barre de recherche + Breadcrumb

```
[ R_Storage / Certificats ]          [ 🔍  Rechercher...  ]  [ ≡ Grille · Liste ]
```

```css
.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--bg);
  z-index: 50;
}

.breadcrumb {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--muted);
  flex: 1;
}

.breadcrumb span { color: var(--text); }

.search {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 7px 12px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
  width: 220px;
  outline: none;
  transition: border-color 150ms;
}

.search:focus { border-color: var(--gold); }
```

---

## Modale de preview

Au clic sur une card, une modale s'ouvre (fond sombre `rgba(0,0,0,0.85)`) avec le fichier en plein écran et un panneau de métadonnées à droite.

```
┌────────────────────────────────────────────────────────┐
│  ✕                                                     │
│  ┌──────────────────────────┐  ┌────────────────────┐  │
│  │                          │  │ nom-du-fichier.pdf  │  │
│  │   PREVIEW PLEIN CADRE    │  │ ─────────────────── │  │
│  │   (PDF / Vidéo / Image)  │  │ Type    PDF         │  │
│  │                          │  │ Taille  2.4 MB      │  │
│  │                          │  │ Ajouté  12 jan 2025 │  │
│  └──────────────────────────┘  │ ─────────────────── │  │
│                                 │ [ Télécharger ]     │  │
│                                 └────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## Catalogue de données (data.js)

```js
// js/data.js
const R_Storage = [
  {
    id: "cert-001",
    name: "AWS Solutions Architect",
    category: "certificates",
    type: "pdf",
    size: "1.2 MB",
    date: "2024-11-03",
    path: "assets/files/aws-cert.pdf",
    thumbnail: "assets/thumbnails/aws-cert.jpg"
  },
  {
    id: "vid-001",
    name: "Présentation produit Q4",
    category: "videos",
    type: "mp4",
    size: "84 MB",
    date: "2025-01-15",
    path: "assets/files/pres-q4.mp4",
    thumbnail: "assets/thumbnails/pres-q4.jpg"
  },
  // ...
];
```

Chaque objet est injecté dans la grille par `render.js`. Le filtrage par catégorie et la recherche texte opèrent directement sur ce tableau côté client — pas de backend nécessaire.

---

## Pages par catégorie

Chaque page (`videos.html`, `certificates.html`, etc.) est identique à `index.html` mais avec le filtre de catégorie pré-appliqué au chargement :

```js
// En haut de chaque page catégorie
const ACTIVE_FILTER = 'certificates'; // injecté statiquement
```

Ou via URL : `index.html?cat=certificates` — `filter.js` lit `URLSearchParams` et applique le filtre.

---

## Dépendances externes (CDN uniquement)

| Librairie       | Usage                             |
|-----------------|-----------------------------------|
| `pdf.js` (Mozilla) | Rendu PDF → canvas pour thumbnails et viewer |
| Aucune autre    | Vanilla JS + CSS natif            |

Pas de framework. Pas de bundler. Fichiers statiques purs — hostable sur GitHub Pages, Netlify, ou n'importe quel serveur HTTP.

---

## Checklist d'implémentation

- [ ] `tokens.css` — variables CSS
- [ ] `reset.css` — box-sizing, margin 0
- [ ] `layout.css` — sidebar + main
- [ ] `sidebar.css` — nav items, logo, dot
- [ ] `card.css` — card + overlay hover
- [ ] `preview.css` — modale plein écran
- [ ] `data.js` — catalogue JSON
- [ ] `render.js` — injection cards dans grille
- [ ] `filter.js` — filtrage catégorie + recherche
- [ ] `preview.js` — ouverture / fermeture modale
- [ ] `index.html` — structure HTML principale
- [ ] Pages catégories (`videos`, `certificates`, `images`, `documents`)
- [ ] Intégration `pdf.js` pour thumbnails et viewer PDF

---

*Architecture — R_Storage Personal Storage · v1.0*
