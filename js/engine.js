/**
 * engine.js — Moteur d'exercice : rendu des cartes, vérification,
 *             analyse des erreurs et affichage du score.
 *
 * Dépend de   : data.js, i18n.js, tts.js, core.js, stats.js
 * Expose      : startExercise, renderCards,
 *               checkAnswers, revealAnswers, showScore,
 *               buildVowelAltMap, levenshtein,
 *               analyzeError, buildErrorHint,
 *               PRON_DISPLAY, VERBS_VOWEL_ALT
 */
'use strict';

function startExercise() {
  /* Nettoyer le panneau de score précédent immédiatement */
  var _old = document.getElementById('scoreFinal');
  if (_old) _old.remove();
  var _cb = document.getElementById('controlsBottom');
  if (_cb) _cb.style.marginTop = '';
  /* Afficher la case "indices" */
  var _ho = document.getElementById('hintsOptionRow');
  if (_ho) _ho.style.display = '';
  var cb = document.getElementById('controlsBottom');
  if (cb) cb.style.display = '';
  exercises = generateExercises();
  state = 'active';
  var _sh = document.querySelector('.start-hint');
  if (_sh) { fadeHint('.start-hint'); _sh.classList.add('hidden'); }
  renderCards();
  setTimeout(function() {
    var f = document.querySelector('.card-input');
    if (f) f.focus();
  }, 350);
}

/* ════════════════════════════════════════════
   RENDU DES CARTES
   ════════════════════════════════════════════ */
function renderCards() {
  var area = DOM.cardsArea;
  area.innerHTML = '';
  if (!exercises.length) return;
  var grid = document.createElement('div');
  grid.className = 'cards-grid';
  exercises.forEach(function(ex, i) {
    var card = document.createElement('div');
    card.className = 'card';
    card.id = 'card-' + i;

    /* Badge erreur retiré de l'affichage initial */
    var errorBadge = '';

    card.innerHTML =
      '<div class="card-left">' +
        (function(){var s=I18n.tf('exercise_n','Exercice {n}/{total}').replace('{n}',i+1).replace('{total}',exercises.length);return '<span class="card-num">'+s+'</span>';})() + errorBadge +
        '<div class="card-prompt">' +
          '<span class="pronoun-tag">' + ex.pronoun + '</span>' +
          '<span class="plus-sign">+</span>' +
          '<span class="verb-infinitive">' + displayVerb(ex.verb) + '</span>' +
          '<span style="display:inline-flex;gap:5px;align-items:center">' +
            '<button class="hint-btn" data-vidx="' + i + '" title="Traduction &amp; aide">?</button>' +
            '<button class="full-btn" data-fidx="' + i + '" title="Voir toutes les conjugaisons">👁️</button>' +
            (TTS.isAvailable() ? '<button class="tts-verb-btn" data-form="' + getConj(ex.verb, ex.key || ex.pronoun) + '" data-pron="' + ex.pronoun + '" title="Écouter">🔊</button>' : '') +
          '</span>' +
        '</div>' +
        '<div class="unified-hint" id="uhint-' + i + '"></div>' +
        '<div class="card-input-row">' +
          '<input class="card-input" id="input-' + i + '" type="text" autocomplete="off" data-form-type="other" autocorrect="off" autocapitalize="off" spellcheck="false" inputmode="latin" ' + 'placeholder="' + I18n.tf('placeholder_form','forme conjuguée…') + '"' + ' data-index="' + i + '">' +
          '<span class="feedback-icon" id="icon-' + i + '"></span>' +
        '</div>' +
        '<div id="hint-' + i + '"></div>' +
        '<div class="full-conj-panel" id="full-' + i + '"></div>' +
      '</div>';
    grid.appendChild(card);

    /* Listener bouton 👁 */
    var fBtn = card.querySelector('.full-btn');
    if (fBtn) {
      fBtn.addEventListener('click', (function(idx, ex) {
        return function(e) {
          e.stopPropagation();
          var panel = document.getElementById('full-' + idx);
          buildFullConj(ex.verb, 'full-' + idx);
          panel.classList.toggle('open');
          this.classList.toggle('active');
        };
      })(i, ex));
    }

    /* Listener bouton 🔊 */
    var tBtn = card.querySelector('.tts-verb-btn');
    if (tBtn) {
      tBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        TTS.speakDirect(this.dataset.pron + '… ' + this.dataset.form);
      });
    }
  });
  area.appendChild(grid);
}

/* ════════════════════════════════════════════
   VÉRIFICATION, RÉVÉLATION & ANALYSE D'ERREURS
   ════════════════════════════════════════════ */

/** Correspondance clé pronoun → affichage pédagogique */
var PRON_DISPLAY = {
  'eu':    'eu',
  'você':  'você',
  'ele':   'ele / ela / a gente',
  'nós':   'nós',
  'vocês': 'vocês / eles / elas'
};

/** Verbes avec alternance vocalique eu↔ele au présent (calculé au boot) */
var VERBS_VOWEL_ALT = {};
function buildVowelAltMap() {
  /* Tableau de paires [forme-ele, forme-eu] — tableau car 'e' a deux cibles
     ('e'→'i' : mentir/sentir/servir  ET  'e'→'a' : saber-sei/sabe).
     Un objet ne peut pas avoir deux fois la même clé. */
  var VPAIRS = [
    ['e','i'], ['i','e'], ['o','u'], ['u','o'],   /* alternances classiques */
    ['ê','e'], ['ô','o'],                          /* ê↔e, ô↔o  (ler, ver) */
    ['a','e'], ['e','a']                           /* a↔e (saber: sei/sabe) */
  ];
  var present = VERB_DATA && VERB_DATA.present;
  if (!present) return;
  Object.keys(present).forEach(function(verb) {
    var eu  = (present[verb].eu  || '').toLowerCase();
    var ele = (present[verb].ele || '').toLowerCase();
    if (!eu || !ele) return;
    var lcp = 0;
    while (lcp < eu.length && lcp < ele.length && eu[lcp] === ele[lcp]) lcp++;
    if (lcp >= Math.min(eu.length, ele.length)) return;
    if (VPAIRS.some(function(p) { return p[0] === ele[lcp] && p[1] === eu[lcp]; }))
      VERBS_VOWEL_ALT[verb] = true;
  });
}

/** Distance de Levenshtein (insensible aux accents en amont) */
function levenshtein(a, b) {
  var m = a.length, n = b.length, i, j;
  var dp = [];
  for (i = 0; i <= m; i++) {
    dp[i] = [i];
    for (j = 1; j <= n; j++) dp[i][j] = (i === 0) ? j : 0;
  }
  for (i = 1; i <= m; i++) {
    for (j = 1; j <= n; j++) {
      dp[i][j] = (a[i-1] === b[j-1])
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]);
    }
  }
  return dp[m][n];
}

/**
 * Analyse la nature d'une erreur de conjugaison.
 * @param {string} verb   - clé du verbe
 * @param {string} tense  - temps actif
 * @param {string} key    - clé pronom (eu/você/ele/nós/vocês)
 * @param {string} answer - réponse de l'élève (non normalisée)
 * @returns {{ type, matchTense?, matchKey? }}
 */
function analyzeError(verb, tense, key, answer) {
  var norm  = function(s) { return s.trim().toLowerCase(); };
  var strip = function(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
  var sa = norm(answer);
  if (!sa) return { type: 'empty' };

  var correctForm = VERB_DATA[tense] && VERB_DATA[tense][verb]
                  ? VERB_DATA[tense][verb][key] : null;
  if (!correctForm) return { type: 'unknown' };
  var sc = norm(correctForm);

  /* Cas accent uniquement — déjà traité, ne pas dupliquer */
  if (strip(sa) === strip(sc)) return { type: 'accent' };

  /* Chercher la forme saisie dans toutes les conjugaisons du verbe */
  var KEYS = ['eu','você','ele','nós','vocês'];
  for (var ti = 0; ti < TENSES_ALL.length; ti++) {
    var t = TENSES_ALL[ti];
    var data = VERB_DATA[t];
    if (!data || !data[verb]) continue;
    for (var ki = 0; ki < KEYS.length; ki++) {
      var p = KEYS[ki];
      var form = norm(data[verb][p] || '');
      if (form && form === sa) {
        var sameTense  = (t === tense);
        var samePerson = (p === key);
        var base = { studentAns: sa, correctForm: sc };
        if (sameTense  && !samePerson) return Object.assign({ type: 'wrong_person', matchTense: t, matchKey: p }, base);
        if (!sameTense && samePerson)  return Object.assign({ type: 'wrong_tense',  matchTense: t, matchKey: p }, base);
        if (!sameTense && !samePerson) return Object.assign({ type: 'wrong_both',   matchTense: t, matchKey: p }, base);
      }
    }
  }

  /* Analyse de proximité : seuil relatif (max 40% du mot) pour éviter
     les faux positifs sur mots courts (ex: vim vs vão = 67% ≠ proche) */
  var dist = levenshtein(sa, sc);
  var wordLen = Math.max(sa.length, sc.length);
  if (dist > 0 && dist <= 2 && wordLen > 0 && (dist / wordLen) <= 0.40) {
    /* Trouver le préfixe commun (LCP) */
    var lcp = 0;
    while (lcp < sa.length && lcp < sc.length && sa[lcp] === sc[lcp]) lcp++;
    /* Trouver le suffixe commun (LCS) */
    var lcs = 0;
    var maxSuf = Math.min(sa.length - lcp, sc.length - lcp);
    while (lcs < maxSuf && sa[sa.length-1-lcs] === sc[sc.length-1-lcs]) lcs++;
    /* Parties en erreur */
    var wrongPart  = sa.slice(lcp, lcs > 0 ? sa.length  - lcs : sa.length);
    var rightPart  = sc.slice(lcp, lcs > 0 ? sc.length  - lcs : sc.length);
    var ctxBefore  = sc.slice(0, lcp);
    var ctxAfter   = lcs > 0 ? sc.slice(sc.length - lcs) : '';
    var relPos = Math.max(sa.length, sc.length) > 0 ? lcp / Math.max(sa.length, sc.length) : 0;
    var closeType = relPos < 0.45 ? 'close_stem' : 'close_ending';
    var closeHints = [];
    /* Alternance vocalique : signaler si pertinent + erreur en début de mot */
    if (closeType === 'close_stem' && VERBS_VOWEL_ALT[verb]) {
      closeHints.push('vowel_alternation');
    }
    return {
      type: closeType,
      wrongPart: wrongPart, rightPart: rightPart,
      ctxBefore: ctxBefore, ctxAfter: ctxAfter,
      hints: closeHints
    };
  }

  return { type: 'unknown' };
}

/**
 * Génère le HTML de l'indice d'erreur localisé.
 * Retourne null si pas d'indice utile.
 */
function buildErrorHint(analysis, tense, key) {
  if (!analysis || analysis.type === 'unknown' || analysis.type === 'empty'
                || analysis.type === 'accent') return null;

  var tL  = TENSE_LABELS_SHORT[tense]              || tense;
  var mTL = analysis.matchTense
          ? (TENSE_LABELS_SHORT[analysis.matchTense] || analysis.matchTense)
          : '';
  var mPD = analysis.matchKey ? (PRON_DISPLAY[analysis.matchKey] || analysis.matchKey) : '';
  var aPD = PRON_DISPLAY[key] || key;

  var msg;
  switch (analysis.type) {
    case 'wrong_person':
      msg = I18n.tf('err_wrong_person', '✓ Bon temps — forme de {person}, pas {asked}')
        .replace('{person}', '<strong>' + mPD + '</strong>')
        .replace('{asked}',  '<strong>' + aPD + '</strong>');
      break;
    case 'wrong_tense':
      msg = I18n.tf('err_wrong_tense', '✓ Bonne personne — c\'est le {tense}')
        .replace('{tense}',      '<strong>' + mTL + '</strong>')
        .replace('{askedTense}', '<strong>' + tL  + '</strong>');
      break;
    case 'wrong_both':
      msg = I18n.tf('err_wrong_both', 'Forme de {person} au {tense}')
        .replace('{person}', '<strong>' + mPD + '</strong>')
        .replace('{tense}',  '<strong>' + mTL + '</strong>');
      break;
    case 'close_stem':
    case 'close_ending': {
      var _b = analysis.ctxBefore || '';
      var _a = analysis.ctxAfter  || '';
      var _parts = _b && _a ? _b + '…' + _a
                 : _b       ? _b + '…'
                 : _a       ? '…' + _a : null;
      if (_parts) {
        msg = I18n.tf('err_correct_parts', 'Tu avais bien : {parts}')
              .replace('{parts}', '<strong class="err-correct-parts">' + _parts + '</strong>');
      } else {
        var _zk = analysis.type === 'close_stem' ? 'err_zone_start' : 'err_zone_end';
        msg = I18n.tf(_zk, analysis.type === 'close_stem' ? 'Début' : 'Fin') + ' — vérifie';
      }
      break;
    }
    default: return null;
  }

  /* Pour wrong_person/tense/both : calculer l'ellipsis de contexte
     en comparant la saisie à la forme correcte si dispo */
  if ((analysis.type === 'wrong_person' || analysis.type === 'wrong_tense' || analysis.type === 'wrong_both')
      && analysis.studentAns && analysis.correctForm) {
    var _sa = analysis.studentAns, _sc = analysis.correctForm;
    var _lcp = 0;
    while (_lcp < _sa.length && _lcp < _sc.length && _sa[_lcp] === _sc[_lcp]) _lcp++;
    var _lcs = 0, _ms = Math.min(_sa.length - _lcp, _sc.length - _lcp);
    while (_lcs < _ms && _sa[_sa.length-1-_lcs] === _sc[_sc.length-1-_lcs]) _lcs++;
    var _before = _sc.slice(0, _lcp);
    var _after  = _lcs ? _sc.slice(_sc.length - _lcs) : '';
    var _ellip  = _before && _after ? _before + '…' + _after
                : _before ? _before + '…'
                : _after  ? '…' + _after : null;
    /* Ajouter l'ellipsis seulement si elle apporte une info (pas juste "…") */
    if (_ellip && _ellip !== '…') {
      analysis._ellipCtx = _ellip;
    }
  }

  /* Accumuler les blocs HTML */
  var parts = ['<span class="err-line2">' + msg + '</span>'];

  /* Contexte ellipsis pour wrong_* */
  if (analysis._ellipCtx) {
    parts.push('<span class="err-sub">→ tu avais bien : <strong class="err-correct-parts">'
      + analysis._ellipCtx + '</strong></span>');
  }

  /* Hints secondaires (concaténation) */
  var hints = analysis.hints || [];
  hints.forEach(function(h) {
    if (h === 'vowel_alternation') {
      parts.push(
        '<span class="err-sub">' + I18n.tf("err_vowel_alt", "💡 As-tu pensé à l\u2019alternance vocalique ?") + '</span>'
      );
    }
  });

  return parts.join('') || null;
}



function checkAnswers() {
  if (!exercises.length) { startExercise(); return; }
  /* Mémoriser le choix hints */
  var _ht2 = document.getElementById('hintsToggle');
  if (_ht2) { try { localStorage.setItem('conjugacao_hints', _ht2.checked ? '1' : '0'); } catch (_e) { /* ignore */ } }
  state = 'checked';
  var score = 0;
  exercises.forEach(function(ex, i) {
    var input = document.getElementById('input-' + i);
    var card  = document.getElementById('card-' + i);
    var icon  = document.getElementById('icon-' + i);
    var hint  = document.getElementById('hint-' + i);
    if (!input) return;
    var val = input.value.trim();
    var expected = getConj(ex.verb, ex.key || ex.pronoun);
    if (!val) {
      card.className = 'card';
      icon.textContent = '';
      hint.innerHTML = "<span class='answer-hint'>" + I18n.tf('ans_missing','⚠ Réponse manquante') + "</span>";
      return;
    }
    var isCorrect = correct(ex.verb, ex.key || ex.pronoun, val);
    /* Enregistrement dans les statistiques — une seule fois par exercice */
    if (!ex.recorded) {
      Stats.record(ex.verb, currentTense, ex.key || ex.pronoun,
                   isCorrect, val, expected);
      ex.recorded = true;
    }

    if (isCorrect) {
      score++;
      card.className = 'card correct';
      input.className = 'card-input is-correct';
      icon.textContent = '✅';
      icon.classList.add('pop');
      hint.innerHTML = '';
    } else {
      card.className = 'card';  /* pas de fond rouge — juste un ✗ discret */
      input.className = 'card-input is-incorrect';
      icon.textContent = '✗';  /* croix sobre, pas ❌ géant */
      icon.classList.add('pop');
      var strip = function(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); };
      var onlyAccent = strip(normalise(val)) === strip(normalise(expected));
      var analysis = analyzeError(ex.verb, currentTense, ex.key || ex.pronoun, val);
      var diagHtml = buildErrorHint(analysis, currentTense, ex.key || ex.pronoun);
      /* Ligne 1 : Ce n'est pas ça (ou message accent) */
      var line1;
      if (onlyAccent) {
        var cnt = function(s) { return (s.normalize('NFD').match(/[\u0300-\u036f]/g)||[]).length; };
        line1 = cnt(val) < cnt(expected)
          ? I18n.tf('ans_accent_miss','Il manque un accent')
          : I18n.tf('ans_accent_extra','Il y a un accent en trop');
      } else {
        line1 = I18n.tf('ans_ce_nest_pas_ca',"Ce n'est pas ça");
      }
      hint.innerHTML =
        '<div class="err-block">' +
          '<span class="err-line1">' + line1 + '</span>' +
          (diagHtml || '') +
        '</div>';
    }
    setTimeout(function() { icon.classList.remove('pop'); }, 400);
  });
  showScore(score, exercises.length);
}

function revealAnswers() {
  if (!exercises.length) { startExercise(); return; }
  state = 'revealed';
  exercises.forEach(function(ex, i) {
    var input = document.getElementById('input-' + i);
    var card  = document.getElementById('card-' + i);
    var icon  = document.getElementById('icon-' + i);
    var hint  = document.getElementById('hint-' + i);
    if (!input) return;
    var expected = getConj(ex.verb, ex.key || ex.pronoun);
    card.className = 'card revealed';
    input.value = expected;
    input.className = 'card-input is-revealed';
    input.disabled = true;
    icon.textContent = '💡';
    hint.innerHTML = '<span style="font-size:0.82rem;color:var(--blue-accent);font-style:italic">' + I18n.tf('ans_revealed','Réponse correcte') + '</span>';
  });
  var s = document.getElementById('scoreFinal');
  if (s) s.remove();
}

function showScore(score, total) {
  var old = document.getElementById('scoreFinal');
  if (old) old.remove();
  var pct = total > 0 ? score / total : 0;
  var msg;
  if (score === total)   msg = I18n.tf('score_perfect','Perfeito! 🏆');
  else if (pct >= 0.8)  msg = I18n.tf('score_great','Muito bom! 🎶');
  else if (pct >= 0.6)  msg = I18n.tf('score_good','Bem! 👍');
  else if (pct >= 0.4)  msg = I18n.tf('score_ok','Pas mal!');
  else if (score > 0)   msg = I18n.tf('score_low','Courage! 🌱');
  else                  msg = I18n.tf('score_zero','Não desanima! 💪');
  var el = document.createElement('div');
  el.id = 'scoreFinal';
  el.className = 'score-final';
  el.innerHTML =
    '<div class="big-score">' + score + '/' + total + '</div>' +
    '<div class="score-label">' + I18n.tf(score>1?'score_p':'score_s','réponses') + '</div>' +
    '<div class="score-message">' + msg + '</div>' +
    '';
  DOM.cardsArea.appendChild(el);
  /* Espace entre score et boutons */
  var cb = document.getElementById('controlsBottom');
  if (cb) cb.style.marginTop = '12px';
}


