/**
 * core.js — État global, constantes et utilitaires fondamentaux.
 *
 * Dépend de   : data.js (VERB_DATA, VERB_NAMES, VERB_CATEGORIES, LEVELS,
 *               THEMES_SEMANTIC, DISPLAY_NAMES, TENSES_ALL, TENSES_B1)
 * Expose      : DOM, exercises, state, currentTense, currentLevel,
 *               configBuilt, selectedVerbs, sessionStarted, voiceTestedOk,
 *               B2_TENSES, ACTIVE_TENSES, PRONOUN_GROUPS,
 *               TENSE_LABELS, TENSE_LABELS_SHORT, PRON_ROWS, PRON_KEYS,
 *               displayVerb, getRegLabel, validateData, refreshTenseLabels,
 *               getConj, pickPronoun, normalise, correct,
 *               getSelectedVerbs, generateExercises
 */
'use strict';

/* ════════════════════════════════════════════
   UTILITAIRES — Helpers & affichage
   ════════════════════════════════════════════ */

/** Retourne le nom d'affichage d'un verbe (ex: dancar → dançar). */
function displayVerb(v) {
  return DISPLAY_NAMES[v] || v;
}

/**
 * Génère un badge HTML de régularité pour un verbe.
 * Affiche ✓/✗ par temps selon la table REGULARITY de data.js.
 */
function getRegLabel(verb) {
  var r = REGULARITY[verb];
  if (!r) return '';
  var active = TENSES_META.concat(TENSES_META_B2).filter(function(t) {
    return r[t.key] !== undefined;
  });
  var allOk = active.every(function(t) { return r[t.key]; });
  var allKo = active.every(function(t) { return !r[t.key]; });
  if (allOk) return '<span class="reg-info"><span class="reg-ok">✓ régulier aux ' + active.length + ' temps</span></span>';
  if (allKo) return '<span class="reg-info"><span class="reg-ko">✗ irrégulier aux ' + active.length + ' temps</span></span>';
  var badges = active.map(function(t) {
    return r[t.key]
      ? '<span class="reg-ok">✓ ' + t.label + '</span>'
      : '<span class="reg-ko">✗ ' + t.label + '</span>';
  }).join(' · ');
  return '<span class="reg-info">' + badges + '</span>';
}

/**
 * Vérifie la complétude des données de conjugaison au démarrage.
 * Log un warning console pour chaque forme manquante.
 */
function validateData() {
  var pronouns = ['eu','você','ele','ela','a gente','nós','vocês','eles','elas'];
  var missing = 0;
  VERB_NAMES.forEach(function(verb) {
    TENSES_ALL.forEach(function(tense) {
      var table = VERB_DATA[tense];
      if (!table[verb]) { console.warn('[validateData] Conjugaison manquante : ' + verb + ' / ' + tense); missing++; return; }
      pronouns.forEach(function(p) {
        if (!table[verb][p]) { console.warn('[validateData] Forme manquante : ' + verb + ' / ' + tense + ' / ' + p); missing++; }
      });
    });
  });
  if (missing === 0) console.log('[validateData] ✅ Toutes les conjugaisons sont présentes.');
  else console.warn('[validateData] ⚠️ ' + missing + ' forme(s) manquante(s).');
}

/* ════════════════════════════════════════════
   ÉTAT DE L'APPLICATION
   ════════════════════════════════════════════ */

var DOM           = {};        /* Cache des éléments DOM fréquemment utilisés  */
var exercises     = [];        /* Exercices en cours                            */
var state         = 'idle';    /* 'idle' | 'active' | 'checked' | 'revealed'   */
var currentLevel  = null;      /* Niveau sélectionné (1-6) ou null             */
var configBuilt   = false;     /* true après construction du panneau Verbos    */
var selectedVerbs = null;      /* null = tous les verbes, sinon tableau filtré */

/**
 * Retourne la traduction d'un verbe dans la langue UI courante.
 * Fallback : français si la langue n'est pas disponible.
 * Utilise TRANSLATIONS[verb] qui est maintenant un objet {fr:'...', en:'...'}
 */
function getTranslation(verb) {
  var t = TRANSLATIONS && TRANSLATIONS[verb];
  if (!t) return '';
  if (typeof t === 'string') return t; /* legacy */
  var lang = (typeof I18n !== 'undefined' && I18n.getLang) ? I18n.getLang() : 'fr';
  return t[lang] || t['fr'] || t['en'] || '';
}
var currentTense  = 'present'; /* Temps actif                                  */
var sessionStarted = false;    /* true après le premier exercice lancé         */
var voiceTestedOk  = false;    /* true si l'utilisateur a testé la voix TTS   */

var B2_TENSES     = ['fut', 'cond', 'subj'];
var ACTIVE_TENSES = ['present', 'pret', 'imperf']; /* Étendu à 6 si Básico 2 actif */

/**
 * Groupes de pronoms : variantes partageant la même conjugaison.
 * Ex : ele / ela / a gente → clé 'ele'.
 */
var PRONOUN_GROUPS = [
  [{ pronoun:'eu',      key:'eu'    }],
  [{ pronoun:'você',    key:'você'  }],
  [{ pronoun:'ele',     key:'ele'   }, { pronoun:'ela', key:'ele' }, { pronoun:'a gente', key:'ele' }],
  [{ pronoun:'nós',     key:'nós'   }],
  [{ pronoun:'vocês',   key:'vocês' }, { pronoun:'eles', key:'vocês' }, { pronoun:'elas', key:'vocês' }]
];

/* Labels des temps — mis à jour par refreshTenseLabels() via i18n */
var TENSE_LABELS = {
  present:'Présent', pret:'Passé composé', imperf:'Imparfait',
  fut:'Futur', cond:'Conditionnel', subj:'Subjonctif'
};
var TENSE_LABELS_SHORT = {
  present:'Prés.', pret:'Parf.', imperf:'Imparf.',
  fut:'Fut.', cond:'Cond.', subj:'Subj.'
};

/** Met à jour TENSE_LABELS et TENSE_LABELS_SHORT depuis les strings i18n chargées. */
function refreshTenseLabels() {
  ['present','pret','imperf','fut','cond','subj'].forEach(function(k) {
    var long = I18n.t('tense_'+k); if (long) TENSE_LABELS[k]       = long;
    var sh   = I18n.t('ts_'+k);    if (sh)   TENSE_LABELS_SHORT[k] = sh;
  });
}

/** Lignes de pronoms pour les tableaux de la cheat sheet et du bouton 👁. */
var PRON_ROWS = [
  { short:'eu',     full:'eu'                  },
  { short:'você',   full:'você'                },
  { short:'ele…',   full:'ele / ela / a gente' },
  { short:'nós',    full:'nós'                 },
  { short:'vocês…', full:'vocês / eles / elas' }
];
var PRON_KEYS = ['eu','você','ele','nós','vocês'];

/* ════════════════════════════════════════════
   FONCTIONS UTILITAIRES
   ════════════════════════════════════════════ */

/** Retourne la forme conjuguée du verbe v au pronom p pour le temps courant. */
function getConj(v, p) {
  return (VERB_DATA[currentTense] || VERBS)[v][p];
}

/** Tire un pronom au hasard en respectant les proportions des groupes. */
function pickPronoun() {
  var g = PRONOUN_GROUPS[Math.floor(Math.random() * PRONOUN_GROUPS.length)];
  return g[Math.floor(Math.random() * g.length)];
}

/** Normalise une chaîne pour la comparaison (trim + minuscules). */
function normalise(s) { return s.trim().toLowerCase(); }

/** Retourne true si la réponse a correspond à la conjugaison attendue du verbe v au pronom p. */
function correct(v, p, a) {
  return normalise(a) === normalise(getConj(v, p));
}

/** Retourne la liste des verbes actifs (checkboxes si panneau construit, sinon sélection rapide). */
function getSelectedVerbs() {
  if (configBuilt) return [...document.querySelectorAll('.verb-checkbox:checked')].map(function(cb) { return cb.value; });
  return selectedVerbs || VERB_NAMES.slice();
}

/* ════════════════════════════════════════════
   EXERCICES — Génération aléatoire
   ════════════════════════════════════════════ */

/**
 * Génère 5 exercices aléatoires sans répétition du couple verbe×pronom.
 * Si le pool contient moins de 5 verbes, les verbes peuvent se répéter
 * mais jamais avec le même pronom.
 */
function generateExercises() {
  var pool = getSelectedVerbs();
  if (!pool.length) pool = VERB_NAMES.slice();

  function pickVerb(exclude) {
    var available = pool.filter(function(v) { return exclude.indexOf(v) === -1; });
    if (!available.length) available = pool.slice();
    return available[Math.floor(Math.random() * available.length)];
  }

  var r = [], used = new Set();
  var attempts = 0;
  while (r.length < 5 && attempts < 50) {
    attempts++;
    var v = pool.length >= 5
      ? pickVerb(r.map(function(e) { return e.verb; }))
      : pool[Math.floor(Math.random() * pool.length)];
    var p = pickPronoun();
    var dupKey = v + '|' + p.key;
    if (!used.has(dupKey)) {
      used.add(dupKey);
      r.push({ verb: v, pronoun: p.pronoun, key: p.key, recorded: false });
    }
  }
  return r;
}
