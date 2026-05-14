# 🇧🇷 Conjugação PT — Entraîneur de conjugaison du portugais brésilien
# 🇧🇷 Conjugação PT — Brazilian Portuguese Conjugation Trainer

> **Version actuelle / Current version :** Thêta 02  
> **Auteur / Author :** Franck Mignot — 2025-2026  
> **Licence / License :** Usage personnel / Personal use  
> **PWA :** Fonctionne hors-ligne / Works offline  

---

## 🇫🇷 FRANÇAIS

### Description

Application web progressive (PWA) d'entraînement à la conjugaison du portugais brésilien. Développée itérativement au fil de ~150 versions depuis l'alpha jusqu'au thêta. Conçue pour un usage mobile-first, hors-ligne, sans compte, sans serveur.

L'app cible les niveaux Básico 1 et Básico 2, avec 134 verbes, 6 temps, et trois modes d'exercice distincts.

### Fonctionnalités

| Onglet | Description |
|--------|-------------|
| 🎲 **Exercer** | Saisir la forme conjuguée d'après le verbe, le temps et le pronom |
| 🎧 **Écoute** | Identifier verbe + temps + pronom à partir d'une forme entendue (TTS) |
| 📊 **Stats** | Statistiques par verbe, temps, pronom. Mode erreurs ciblé |
| 📋 **Tableau** | Tableau de conjugaison des verbes sélectionnés |
| 📖 **Référence** | Aide grammaticale et règles de conjugaison |

### Architecture des fichiers

```
conjugacao-pt/
│
├── index.html              Point d'entrée unique de la SPA
├── privacy.html            Politique de confidentialité (6 langues)
├── style.css               Styles globaux + composants
├── nav.css                 Layout SPA : header, bottomNav, pages
├── stats.css               Styles spécifiques à l'onglet Stats
├── service-worker.js       Cache offline (stratégie cache-first)
├── manifest.json           Manifeste PWA (icônes, couleurs, display)
│
├── js/
│   ├── data.js             Chargement async de verbs.json + meta.json + hints.json
│   │                       → peuple VERB_DATA, VERB_NAMES, LEVELS, THEMES_SEMANTIC…
│   ├── core.js             État global, constantes, pool de verbes
│   ├── i18n.js             Internationalisation : 6 langues, clés ui.*
│   ├── engine.js           Moteur d'exercice : rendu, vérification, score
│   ├── stats.js            localStorage : scores par verb×tense×pronoun
│   ├── stats-ui.js         Rendu de l'onglet Stats (graphes, tableaux)
│   ├── tts.js              Synthèse vocale (Web Speech API)
│   ├── voice.js            Détection voix pt-BR, aide à l'installation
│   ├── router.js           Navigation SPA entre 5 pages (fade 180ms)
│   ├── init.js             Bootstrap, listeners, glue entre modules
│   ├── ui-selection.js     Panneau de sélection verbes (niveaux, groupes, thèmes)
│   ├── ui-ref.js           Rendu de la page Référence
│   ├── mode-erreurs.js     Mode exercice ciblé sur les erreurs (modal 2 étapes)
│   ├── ecoute.js           Onglet Écoute : identification de formes conjuguées
│   └── splash.js           Écran de chargement initial
│
└── data/
    ├── verbs.json          134 verbes × 6 temps × 9 pronoms
    │                       Structure : VERB_DATA[tense][verb][pronoun] = "forme"
    ├── meta.json           Niveaux 1-6, catégories, thèmes sémantiques, métadonnées temps
    ├── hints.json          Astuces grammaticales par verbe
    └── locales/
        ├── fr.json         Français (langue de l'interface par défaut)
        ├── en.json         Anglais
        ├── pt-BR.json      Portugais brésilien
        ├── es.json         Espagnol
        ├── de.json         Allemand
        └── it.json         Italien
```

### Structure des données clés

#### verbs.json
```json
{
  "falar": {
    "fr": "parler",
    "display": "falar",
    "reg": { "present": true, "pret": true, ... },
    "present": { "eu": "falo", "você": "fala", "ele": "fala",
                 "nós": "falamos", "vocês": "falam", ... },
    "pret": { ... },
    ...
  }
}
```
⚠️ **Important :** `VERB_DATA` en mémoire est réindexé **par temps** :  
`VERB_DATA[tense][verb][pronoun]` — ex. `VERB_DATA['present']['falar']['eu']` → `"falo"`

#### Système de score (stats.js)
- Clé localStorage : `conjugacao_v2_scores`
- Format : `verb|tense|pronoun` → `{ ok, ko, score, lastSeen }`
- Score : `+1` bonne réponse, `-3` erreur, clamped entre `-15` et `+10`
- "Mauvais score" = score moyen < 0 (utilisé par `getBadPairs()`)

#### PRONOUN_GROUPS (core.js)
```js
[
  [{ pronoun:'eu',    key:'eu'    }],
  [{ pronoun:'você',  key:'você'  }],
  [{ pronoun:'ele',   key:'ele'   }, { pronoun:'ela', key:'ele' }, { pronoun:'a gente', key:'ele' }],
  [{ pronoun:'nós',   key:'nós'   }],
  [{ pronoun:'vocês', key:'vocês' }, { pronoun:'eles', key:'vocês' }, { pronoun:'elas', key:'vocês' }]
]
```
Le `key` est l'index dans `verbs.json`. Le `pronoun` est l'affichage UI.

### Lancer en local

```bash
cd conjugacao-pt/
python3 -m http.server 8080
# → http://localhost:8080
```

⚠️ Le service worker ne s'active qu'en HTTPS ou `localhost`. Ne pas ouvrir `index.html` directement dans le navigateur (protocole `file://`).

### Déployer sur GitHub Pages

1. Copier tous les fichiers dans un repo GitHub
2. Activer GitHub Pages (Settings → Pages → Branch: main / root)
3. L'URL `https://username.github.io/repo/` devient l'URL de l'app
4. Pour les stores : utiliser `https://username.github.io/repo/privacy.html` comme Privacy Policy URL

### Internationalisation

Toutes les chaînes UI sont dans `data/locales/{lang}.json`, sous la clé `ui`.  
Accès : `I18n.tf('ma_cle', 'valeur par défaut')` — jamais de texte hardcodé dans le JS.  
Nouvelles clés à ajouter dans les **6 fichiers** simultanément.

### Service Worker — stratégie de cache

- Nom du cache versionné (ex. `conjugacao-pt-theta02`) — à **incrémenter à chaque déploiement**
- Stratégie : cache-first pour les assets statiques
- `skipWaiting()` + `clients.claim()` : activation immédiate du nouveau SW
- Registration avec `?v=VERSION` pour forcer le re-fetch du fichier SW lui-même

---

## 🇬🇧 ENGLISH

### Description

A Progressive Web App (PWA) for training Brazilian Portuguese verb conjugation. Developed iteratively through ~150 versions from alpha to theta. Designed mobile-first, offline-capable, no account, no server.

Targets Básico 1 and Básico 2 levels, covering 134 verbs, 6 tenses, and three distinct exercise modes.

### Features

| Tab | Description |
|-----|-------------|
| 🎲 **Exercer** | Type the conjugated form given verb, tense and pronoun |
| 🎧 **Écoute** | Identify verb + tense + pronoun from a spoken conjugated form (TTS) |
| 📊 **Stats** | Statistics by verb, tense, pronoun. Targeted error-based drill mode |
| 📋 **Tableau** | Conjugation table for the current verb/tense selection |
| 📖 **Référence** | Grammar help and conjugation rules |

### Key Data Structure

#### VERB_DATA memory layout (after loading)
```js
VERB_DATA[tense][verb][pronoun] → "conjugated form"
// Example:
VERB_DATA['present']['falar']['eu'] // → "falo"
VERB_DATA['pret']['ser']['nós']     // → "fomos"
```
This is **not** the same as `verbs.json` on disk (which is indexed by verb first).  
`data.js` re-indexes on load. Always use `VERB_DATA[tense][verb]`, never `VERB_DATA[verb][tense]`.

#### Score system
- `+1` correct answer, `-3` mistake, clamped `[-15, +10]`
- A score < 0 means the form is considered "weak" — targeted by `getBadPairs()`

### Running locally

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

The service worker only activates on HTTPS or localhost — do not open `index.html` directly via `file://`.

### Deploying

1. Push all files to a GitHub repo
2. Enable GitHub Pages (Settings → Pages → Branch: main / root)
3. The PWA is live at `https://username.github.io/repo/`

### Adding a new JS module

1. Create `js/mymodule.js` with an IIFE returning a public API object
2. Add `<script defer src="js/mymodule.js?v=..."></script>` in `index.html`
3. Add `'js/mymodule.js'` to the SW cache list in `service-worker.js`
4. Call from `router.js` `_onPageEnter()` if page-specific init is needed

### Adding i18n keys

Add to **all 6** `data/locales/*.json` under the `ui` object — same key, translated value.  
Never hardcode UI strings in JS. Use `I18n.tf('key', 'fallback')`.

### Version naming convention

Greek alphabet, incremental:  
`alpha` → `beta` → `gamma` → `delta` → `epsilon` → `zeta` → `eta` → `thêta` → `iota` → …  
Sub-versions: `thêta 01`, `thêta 02`, etc.  
Service Worker cache name mirrors the version: `conjugacao-pt-theta02`.

---

## 📋 Version History (summary)

| Version | Key features |
|---------|-------------|
| alpha–delta | Core exercise engine, basic verb data, score system |
| epsilon | Stats panel, reference page, PWA shell |
| zeta | UI polish, TTS integration, voice picker |
| eta | Mode erreurs (error targeting), Écoute tab (listening mode) |
| thêta 01 | Nav labels, page title bar, privacy policy |
| thêta 02 | Horizontal scroll lock, autocomplete disable |

Full detail: see `VERSION.log`

---

## 🔒 Privacy

No data collection. No server. No account.  
All exercise statistics stay on the user's device (localStorage).  
Full policy: [`privacy.html`](./privacy.html)


---

## ⚠️ Bug connu — Voix iOS (PWA / Web Speech API)
## ⚠️ Known Issue — iOS Voices (PWA / Web Speech API)

### 🇫🇷 Français

**Problème :** Sur iOS, `speechSynthesis.getVoices()` n'expose PAS toutes les voix installées sur l'appareil. Seules les voix légères pré-installées sont accessibles (ex: Luciana standard). Les voix Enhanced (haute qualité, ~40-230 Mo) et les voix Siri ne sont jamais retournées par l'API, même si elles sont correctement installées via Réglages → Accessibilité → Contenu énoncé → Voix.

**Cause :** Comportement délibéré d'Apple, confirmé par un employé Apple sur les forums développeurs. Ce n'est pas un bug en cours de correction — c'est une restriction intentionnelle. Apple réserve les voix haute qualité aux apps natives (Swift/Objective-C via `AVSpeechSynthesizer`). Toutes les apps sur iOS utilisent WebKit, donc Chrome, Firefox et Safari sont tous affectés de la même façon.

**Impact sur cette app :** La voix Felipe (pt-BR masculin, haute qualité) n'est pas accessible en PWA sur iOS. Seule Luciana (pt-BR féminin, qualité standard) est disponible. Sur Android, le problème n'existe pas — `getVoices()` retourne toutes les voix installées.

**Workarounds tentés et documentés :**
- Retries échelonnés (300ms → 20s) ✅ aide pour les voix lentes à charger
- `visibilitychange` listener pour relancer la détection au retour au premier plan ✅
- Utterance silencieuse au démarrage (wake-up iOS Enhanced voices) ✅ aide parfois
- Matching fuzzy des noms de voix (ex: "Felipe (Enhanced)" ≠ "Felipe") ✅ corrigé
- Drapeaux 🇧🇷/🇵🇹 dans le picker pour distinguer pt-BR de pt-PT ✅

**Solution définitive :** Passer en app native Swift et utiliser `AVSpeechSynthesizer` — toutes les voix installées sont alors accessibles. Prévu pour la version 2.0.

---

### 🇬🇧 English

**Issue:** On iOS, `speechSynthesis.getVoices()` does NOT expose all voices installed on the device. Only lightweight pre-installed voices are accessible (e.g. standard Luciana). Enhanced voices (high quality, ~40–230 MB) and Siri voices are never returned by the API, even when properly installed via Settings → Accessibility → Spoken Content → Voices.

**Root cause:** Deliberate Apple behavior, confirmed by an Apple employee on the developer forums. This is NOT a bug being fixed — it is an intentional restriction. Apple reserves high-quality voices for native apps (Swift/Objective-C via `AVSpeechSynthesizer`). All iOS browsers use WebKit, so Chrome, Firefox and Safari are equally affected.

**Impact on this app:** The Felipe voice (pt-BR male, high quality) is not accessible in PWA mode on iOS. Only Luciana (pt-BR female, standard quality) is available. On Android, this issue does not exist — `getVoices()` returns all installed voices.

**Workarounds tried and documented:**
- Staggered retries (300ms → 20s) ✅ helps for slowly-loading voices
- `visibilitychange` listener to re-trigger detection on app resume ✅
- Silent utterance at startup (wake-up for iOS Enhanced voices) ✅ sometimes helps
- Fuzzy voice name matching (e.g. "Felipe (Enhanced)" ≠ "Felipe") ✅ fixed
- 🇧🇷/🇵🇹 flags in picker to distinguish pt-BR from pt-PT ✅

**Definitive fix:** Move to native Swift app using `AVSpeechSynthesizer` — all installed voices are then accessible. Planned for version 2.0.
