/**
 * stats.js — Module de données statistiques.
 *
 * Stocke en localStorage :
 *   conjugacao_v2_scores — scores par verbe × temps × pronom
 *   conjugacao_v2_errors — liste des dernières erreurs avec contexte
 *
 * Système de points : +1 bonne réponse, -3 erreur.
 * Plafond : [-15 ; +10].
 *
 * Expose : Stats (objet global)
 */
'use strict';

var Stats = (function() {

  var SCORES_KEY = 'conjugacao_v2_scores';
  var ERRORS_KEY = 'conjugacao_v2_errors';
  var MAX_ERRORS = 500;
  var SCORE_MIN  = -15;
  var SCORE_MAX  = 10;

  /* ── Persistance ── */

  /** Charge les scores depuis localStorage. Retourne {} en cas d'erreur. */
  function loadScores() {
    try { return JSON.parse(localStorage.getItem(SCORES_KEY) || '{}'); }
    catch(e) { return {}; }
  }

  /** Persiste les scores en localStorage. */
  function saveScores(data) {
    try { localStorage.setItem(SCORES_KEY, JSON.stringify(data)); }
    catch(e) { console.warn('[Stats] Erreur écriture scores:', e); }
  }

  /** Charge la liste d'erreurs depuis localStorage. Retourne [] en cas d'erreur. */
  function loadErrors() {
    try { return JSON.parse(localStorage.getItem(ERRORS_KEY) || '[]'); }
    catch(e) { return []; }
  }

  /** Persiste la liste d'erreurs en localStorage. */
  function saveErrors(data) {
    try { localStorage.setItem(ERRORS_KEY, JSON.stringify(data)); }
    catch(e) { console.warn('[Stats] Erreur écriture erreurs:', e); }
  }

  /** Plafonne une valeur entre SCORE_MIN et SCORE_MAX. */
  function clamp(v) { return Math.min(SCORE_MAX, Math.max(SCORE_MIN, v)); }

  /* ── Enregistrement d'une réponse ── */

  /**
   * Enregistre une réponse — appelé une seule fois par exercice (flag recorded).
   *
   * @param {string}  verb      - clé du verbe (ex: 'ser')
   * @param {string}  tense     - temps actif (ex: 'present')
   * @param {string}  pronoun   - clé pronom (eu / você / ele / nós / vocês)
   * @param {boolean} isCorrect
   * @param {string}  given     - ce que l'élève a tapé
   * @param {string}  correct   - forme attendue
   */
  function record(verb, tense, pronoun, isCorrect, given, correct) {
    /* Score */
    var scores = loadScores();
    var key = verb + '|' + tense + '|' + pronoun;
    if (!scores[key]) scores[key] = { ok: 0, ko: 0, score: 0, lastSeen: null };
    var entry = scores[key];
    if (isCorrect) {
      entry.ok++;
      entry.score = clamp(entry.score + 1);
    } else {
      entry.ko++;
      entry.score = clamp(entry.score - 3);
    }
    entry.lastSeen = new Date().toISOString().slice(0, 10);
    saveScores(scores);

    /* Mémorisation de la première erreur seulement */
    if (!isCorrect) {
      var errors = loadErrors();
      errors.unshift({
        verb: verb, tense: tense, pronoun: pronoun,
        given: given, correct: correct,
        date: new Date().toISOString()
      });
      if (errors.length > MAX_ERRORS) errors = errors.slice(0, MAX_ERRORS);
      saveErrors(errors);
    }
  }

  /* ── Lecture des données ── */

  /**
   * Retourne les statistiques agrégées par verbe.
   * Résultat : { verbKey: { ok, ko, avgScore, tried } }
   * avgScore = moyenne des scores de toutes les entrées verb×tense×pronoun.
   * null si le verbe n'a jamais été tenté.
   */
  function getVerbStats() {
    var scores = loadScores();
    var result = {};
    Object.keys(scores).forEach(function(k) {
      var verb = k.split('|')[0];
      if (!result[verb]) result[verb] = { ok: 0, ko: 0, scoreSum: 0, tried: 0 };
      result[verb].ok       += scores[k].ok;
      result[verb].ko       += scores[k].ko;
      result[verb].scoreSum += scores[k].score;
      result[verb].tried++;
    });
    Object.keys(result).forEach(function(v) {
      var r = result[v];
      r.avgScore = r.tried > 0 ? Math.round(r.scoreSum / r.tried) : null;
      delete r.scoreSum; /* champ interne, non exposé */
    });
    return result;
  }

  /**
   * Retourne les statistiques agrégées par temps.
   * Résultat : { tenseKey: { ok, ko, avgScore, tried } }
   */
  function getTenseStats() {
    var scores = loadScores();
    var result = {};
    Object.keys(scores).forEach(function(k) {
      var tense = k.split('|')[1];
      if (!result[tense]) result[tense] = { ok: 0, ko: 0, scoreSum: 0, tried: 0 };
      result[tense].ok       += scores[k].ok;
      result[tense].ko       += scores[k].ko;
      result[tense].scoreSum += scores[k].score;
      result[tense].tried++;
    });
    Object.keys(result).forEach(function(t) {
      var r = result[t];
      r.avgScore = r.tried > 0 ? Math.round(r.scoreSum / r.tried) : null;
      delete r.scoreSum;
    });
    return result;
  }

  /**
   * Retourne les statistiques agrégées par pronom.
   * Résultat : { pronounKey: { ok, ko, avgScore, tried } }
   */
  function getPronounStats() {
    var scores = loadScores();
    var result = {};
    Object.keys(scores).forEach(function(k) {
      var pronoun = k.split('|')[2];
      if (!result[pronoun]) result[pronoun] = { ok: 0, ko: 0, scoreSum: 0, tried: 0 };
      result[pronoun].ok       += scores[k].ok;
      result[pronoun].ko       += scores[k].ko;
      result[pronoun].scoreSum += scores[k].score;
      result[pronoun].tried++;
    });
    Object.keys(result).forEach(function(p) {
      var r = result[p];
      r.avgScore = r.tried > 0 ? Math.round(r.scoreSum / r.tried) : null;
      delete r.scoreSum;
    });
    return result;
  }

  /**
   * Retourne les dernières erreurs mémorisées (toutes si n omis).
   * Chaque entrée : { verb, tense, pronoun, given, correct, date }
   */
  function getErrors(n) {
    var errors = loadErrors();
    return n ? errors.slice(0, n) : errors;
  }

  /** Réinitialise scores et erreurs. */
  function reset() {
    localStorage.removeItem(SCORES_KEY);
    localStorage.removeItem(ERRORS_KEY);
  }

  /**
   * Retourne les paires {verb, tense} dont le score moyen < threshold.
   * Filtrées sur verbPool et tenses si fournis (null = pas de filtre).
   * threshold par défaut : 0  (score négatif = mauvais)
   */
  function getBadPairs(verbPool, tenses, threshold) {
    if (threshold === undefined) threshold = 0;
    var scores = loadScores();
    var vtMap  = {};

    Object.keys(scores).forEach(function(k) {
      var parts = k.split('|');
      var verb = parts[0], tense = parts[1];
      if (verbPool && verbPool.indexOf(verb)  === -1) return;
      if (tenses   && tenses.indexOf(tense)   === -1) return;
      var key2 = verb + '|' + tense;
      if (!vtMap[key2]) vtMap[key2] = { verb: verb, tense: tense, sum: 0, n: 0 };
      vtMap[key2].sum += scores[k].score;
      vtMap[key2].n++;
    });

    return Object.keys(vtMap)
      .map(function(k)    { return vtMap[k]; })
      .filter(function(p) { return p.n > 0 && (p.sum / p.n) < threshold; })
      .map(function(p)    { return { verb: p.verb, tense: p.tense }; });
  }

  /* ── API publique ── */
  return {
    record         : record,
    getVerbStats   : getVerbStats,
    getTenseStats  : getTenseStats,
    getPronounStats: getPronounStats,
    getErrors      : getErrors,
    getBadPairs    : getBadPairs,
    reset          : reset
  };

})();
