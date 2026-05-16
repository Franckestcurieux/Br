# 🇧🇷 Verbos — Entraîneur de conjugaison du portugais brésilien
# 🇧🇷 Verbos — Brazilian Portuguese Conjugation Trainer

> **Version :** 1.0.2  
> **Date :** 2026-05-16  
> **Auteur / Author :** Dr Franck Mignot — 2026  
> **Licence / License :** [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)  
> **PWA :** Fonctionne hors-ligne / Works offline  
> **Site :** https://franckestcurieux.github.io/Br/

---

## 🇫🇷 FRANÇAIS

### Description

**Verbos** est une application web progressive (PWA) d'entraînement à la conjugaison du portugais brésilien. Conçue pour un usage mobile-first, hors-ligne, sans compte, sans serveur, sans publicité.

Cible les niveaux Básico 1 et Básico 2 : 106+ verbes, 6 temps, 3 modes d'exercice. Interface disponible en 9 langues.

### Fonctionnalités

| Onglet | Description |
|--------|-------------|
| 🎯 **Exercer** | Saisir la forme conjuguée d'après le verbe, le temps et le pronom |
| 🎧 **Écoute** | Identifier verbe + temps + pronom à partir d'une forme entendue (TTS) |
| 📊 **Stats** | Statistiques par verbe, temps, pronom. Mode erreurs ciblé |
| 📋 **Tableau** | Tableau de conjugaison des verbes sélectionnés |
| 📖 **Référence** | Aide grammaticale et règles de conjugaison |
| ⚙️ **Config** | Langue, voix TTS, vérification des mises à jour |

### Architecture des fichiers

```
Verbos/
├── index.html              Point d'entrée unique de la SPA
├── privacy.html            Politique de confidentialité (9 langues)
├── ref-fr.html             Référence grammaticale hors-ligne
├── style.css / nav.css / stats.css
├── service-worker.js       Cache offline (cache-first)
├── manifest.json           Manifeste PWA
├── version.json            Version + changelog (système de MAJ)
│
├── js/
│   ├── data.js             Chargement verbs.json + meta.json + hints.json
│   ├── core.js             État global, constantes, pool de verbes
│   ├── i18n.js             Internationalisation 9 langues
│   ├── engine.js           Moteur d'exercice : rendu, vérification, score
│   ├── stats.js / stats-ui.js
│   ├── tts.js              Web Speech API + pont Swift AVSpeechSynthesizer
│   ├── updater.js          Vérification des mises à jour via version.json
│   ├── voice.js            Détection voix pt-BR, aide installation
│   ├── router.js           Navigation SPA 6 pages
│   ├── init.js             Bootstrap et glue entre modules
│   ├── ui-selection.js     Sélection verbes (niveaux, groupes, thèmes)
│   ├── ui-ref.js           Page Référence
│   ├── mode-erreurs.js     Mode drill sur les erreurs
│   ├── ecoute.js           Onglet Écoute
│   └── splash.js           Écran d'accueil (bypass si < 1h d'inactivité)
│
└── data/
    ├── verbs.json          106+ verbes × 6 temps × 9 pronoms
    ├── meta.json           Niveaux, catégories, thèmes sémantiques
    ├── hints.json          Astuces grammaticales
    └── locales/            fr, en, pt-BR, es, de, it, nl, da, no
```

### Structure des données clés

```js
// VERB_DATA en mémoire : réindexé PAR TEMPS par data.js
VERB_DATA[tense][verb][pronoun] → "forme conjuguée"
// ⚠️ Jamais VERB_DATA[verb][tense] — c'est l'inverse

VERB_DATA['present']['falar']['eu']  // → "falo"
VERB_DATA['pret']['ser']['nós']      // → "fomos"
```

Score : `+1` bonne réponse, `-3` erreur, clamped `[-15, +10]`.  
Clé localStorage : `conjugacao_v2_scores` → `verb|tense|pronoun` → `{ ok, ko, score }`

### Système de mises à jour

`version.json` contient la version actuelle et le changelog.  
`updater.js` le vérifie une fois par jour via `raw.githubusercontent.com`.  
Bandeau vert = à jour · orange = MAJ disponible · rouge = MAJ critique (`"critical": true`).

### Pont Swift / AVSpeechSynthesizer

`tts.js` détecte automatiquement la coque Swift :

```js
// Présent → app Swift (voix neurales premium)
window.webkit?.messageHandlers?.tts
// Absent  → PWA classique (Web Speech API)
```

Transparent : aucune modification manuelle selon l'environnement.

### Lancer en local

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

⚠️ Le service worker ne s'active qu'en HTTPS ou localhost (pas via `file://`).

### Convention de versioning

Semantic versioning depuis 1.0.0 : `MAJOR.MINOR.PATCH`  
À chaque release, mettre à jour :
- `APP_VERSION` dans `index.html`
- `LOCAL_VERSION` dans `js/updater.js`
- `CACHE_NAME` dans `service-worker.js` → `verbos-X.Y.Z`
- `version.json` → version, date, heure, notes

---

## 🇬🇧 ENGLISH

### Description

**Verbos** is a Progressive Web App (PWA) for Brazilian Portuguese verb conjugation training. Mobile-first, offline-capable, no account, no server, no ads. 106+ verbs, 6 tenses, 3 exercise modes. 9-language interface.

### Features

| Tab | Description |
|-----|-------------|
| 🎯 **Exercer** | Type the conjugated form given verb, tense and pronoun |
| 🎧 **Écoute** | Identify verb + tense + pronoun from a spoken form |
| 📊 **Stats** | Per-verb/tense/pronoun stats. Error-targeting drill |
| 📋 **Tableau** | Full conjugation table |
| 📖 **Référence** | Grammar rules and conjugation help |
| ⚙️ **Config** | Language, voice, update checks |

### Key data structure

```js
VERB_DATA[tense][verb][pronoun] → "conjugated form"
// NOT VERB_DATA[verb][tense] ← wrong
```

### Update system

`version.json` at repo root holds version + changelog.  
`updater.js` checks it daily. `"critical": true` triggers a red urgent banner.

### Swift bridge

`tts.js` auto-detects the Swift wrapper and routes TTS to `AVSpeechSynthesizer` (premium neural voices). Falls back to Web Speech API in browser/PWA mode. Fully automatic.

### Adding a JS module

1. Create `js/module.js` with an IIFE + public API
2. Add `<script defer src="js/module.js?v=VERSION">` in `index.html`
3. Add `'./js/module.js?v=VERSION'` to SW cache list

### Adding i18n keys

Add to **all 9** `data/locales/*.json` under `ui`.  
Use `I18n.tf('key', 'fallback')` — never hardcode UI strings.

---

## 📋 Historique / Version History

| Version | Points clés / Key features |
|---------|---------------------------|
| alpha – delta | Moteur, données, score |
| epsilon | Stats, Référence, shell PWA |
| zeta | UI, TTS, sélecteur voix |
| eta | Mode erreurs, Écoute |
| thêta | Navbar, confidentialité |
| iota | Multi-fichiers, 9 langues, TTS avancé |
| **1.0.0** | **Version stable — Verbos** |
| **1.0.1** | Mises à jour (version.json), licence CC BY-NC-SA 4.0 |
| **1.0.2** | Pont Swift/AVSpeechSynthesizer, voix neurales, bypass splash 1h |

---

## 🔒 Confidentialité / Privacy

Aucune collecte. Aucun serveur. Aucun compte. Aucune pub.  
No collection. No server. No account. No ads.  
Stats stored locally only — [`privacy.html`](./privacy.html)

---

## ⚠️ Voix iOS / iOS Voice Issue

**🇫🇷** Sur iOS, Web Speech API n'expose pas les voix Enhanced/Siri (restriction Apple délibérée). En mode PWA, seules les voix légères sont accessibles. **Solution :** l'app Swift native utilise `AVSpeechSynthesizer` et accède aux voix neurales premium.

**🇬🇧** On iOS, Web Speech API intentionally restricts access to Enhanced/Siri voices. PWA mode only gets standard voices. **Fix:** the native Swift app uses `AVSpeechSynthesizer` for full premium voice access.

---

## 📄 Licence

**© Dr Franck Mignot 2026 — [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)**

- **BY** : citer l'auteur / credit the author
- **NC** : non commercial uniquement / non-commercial only
- **SA** : mêmes conditions / same license

Projet pédagogique partagé librement. / Educational project, freely shared.
