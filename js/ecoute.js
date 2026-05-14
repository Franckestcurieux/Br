/**
 * ecoute.js — Onglet Écoute : identifier une forme conjuguée entendue.
 *
 * ═══════════════════════════════════════════════════════════
 * FLUX UTILISATEUR
 * ═══════════════════════════════════════════════════════════
 *
 *   [Setup]
 *     └─ Choisir : pronom (Éludé/Énoncé), niveau ou thème, temps
 *     └─ Clic "Commencer"
 *
 *   [Question] — auto-play TTS à l'arrivée
 *     └─ Mode Éludé  : choisir pronom + verbe + temps
 *     └─ Mode Énoncé : choisir verbe + temps seulement
 *     └─ Clic "Valider"
 *
 *   [Résultat]
 *     ├─ Tout correct → [Question suivante] + [✍️ Écrire optionnel]
 *     └─ Erreur       → [🔊 Réécouter] [🔄 Réessayer] [💡 Voir la réponse]
 *
 * ═══════════════════════════════════════════════════════════
 * ÉTAT INTERNE (_s / variables privées)
 * ═══════════════════════════════════════════════════════════
 *
 *   _q            — question courante { verb, tense, pKey, pronoun, form, validKeys, verbChoices }
 *   _ans          — réponses utilisateur { pKey, verb, tense }
 *   _pronounMode  — 'enonce' | 'elide'  (persisté localStorage 'ec_pronounMode')
 *   _ecLevel      — 0=tous, 1-6=niveau  (persisté localStorage 'ec_level')
 *   _ecTheme      — id thème | null     (persisté localStorage 'ec_theme')
 *   _ecTenses     — tableau de clés     (persisté localStorage 'ec_tenses')
 *
 * ═══════════════════════════════════════════════════════════
 * STRUCTURE DE VERB_DATA — PIÈGE CRITIQUE
 * ═══════════════════════════════════════════════════════════
 *
 *   VERB_DATA[tense][verb][pronoun] → "forme conjuguée"
 *   Exemple : VERB_DATA['present']['falar']['eu'] → "falo"
 *
 *   ⚠️  Ce n'est PAS VERB_DATA[verb][tense][pronoun] !
 *   data.js réindexe verbs.json (indexé par verbe) en mémoire par temps.
 *
 * ═══════════════════════════════════════════════════════════
 * FORMES AMBIGUËS
 * ═══════════════════════════════════════════════════════════
 *
 *   Ex: "fala" → você ET ele/ela ont la même forme au présent.
 *   → validKeys contient tous les pKey qui donnent la même forme.
 *   → Les boutons "vocês" ET "eles/elas" partagent le pKey 'vocês' :
 *     les deux sont acceptés quand le correct est 'vocês'.
 *
 * ═══════════════════════════════════════════════════════════
 * API PUBLIQUE (appelée depuis HTML ou router.js)
 * ═══════════════════════════════════════════════════════════
 *
 *   start()           — démarre depuis le setup
 *   play()            — (re)joue la forme via TTS.speakDirect()
 *   validate()        — vérifie les réponses
 *   retry()           — remet la question à zéro + rejoue
 *   showAnswer()      — révèle la forme correcte
 *   nextQuestion()    — génère et affiche la question suivante
 *   backToSetup()     — retour au panneau de sélection
 *   verifyWriting()   — vérifie la saisie optionnelle
 *   setLevel(n)       — sélectionne le niveau (0=tous)
 *   toggleTense(t)    — active/désactive un temps
 *   setPronounMode(m) — 'enonce' | 'elide'
 *   onPageEnter()     — appelé par Router lors de la navigation vers cette page
 *
 * Expose : Ecoute (objet global, IIFE pattern)
 */
'use strict';

var Ecoute = (function () {

  /* ── État ── */
  var _q    = null;            /* question courante */
  var _ans  = {};              /* {pKey, verb, tense} */
  var _pronounMode = 'enonce'; /* 'enonce' | 'elide' — défaut: Énoncé */
  var _ecLevel  = 1;           /* 0 = tous, 1-6 = niveau — défaut: Nív 1 */
  var _ecTheme  = null;        /* id du thème sélectionné, null = par niveau */
  var _ecTenses = ['present']; /* temps sélectionnés (multi) — défaut: Présent */

  try {
    /* Charger depuis localStorage uniquement si l'utilisateur a déjà modifié */
    var _lsMode = localStorage.getItem('ec_pronounMode');
    if (_lsMode) _pronounMode = _lsMode; /* sinon garde 'enonce' (défaut) */
    var _lsLevel = localStorage.getItem('ec_level');
    if (_lsLevel !== null) _ecLevel = parseInt(_lsLevel); /* sinon garde 1 (défaut) */
    var st = localStorage.getItem('ec_tenses');
    if (st) _ecTenses = JSON.parse(st); /* sinon garde ['present'] (défaut) */
  } catch(e) {}

  /* ══════════════════════════════════════════════
     GÉNÉRATION DE QUESTION
     ══════════════════════════════════════════════ */

  function _build() {
    var verbs   = _verbPool();
    var tenses  = _ecTenses.length ? _ecTenses.slice() : ['present'];
    if (!verbs.length || !tenses.length) return null;

    /* Choisir verbe + temps valides */
    var verb, tense, attempts = 0;
    do {
      verb  = verbs[~~(Math.random() * verbs.length)];
      tense = tenses[~~(Math.random() * tenses.length)];
      attempts++;
    } while ((!VERB_DATA || !VERB_DATA[tense] || !VERB_DATA[tense][verb]) && attempts < 30);
    if (!VERB_DATA || !VERB_DATA[tense] || !VERB_DATA[tense][verb]) return null;

    /* Pronom aléatoire */
    var pGroup = PRONOUN_GROUPS[~~(Math.random() * PRONOUN_GROUPS.length)];
    var pEntry = pGroup[~~(Math.random() * pGroup.length)];
    var pKey   = pEntry.key;
    var form   = VERB_DATA[tense][verb][pKey];

    /* Tous les pKeys valides pour cette forme */
    var validKeys = (PRON_KEYS || ['eu','você','ele','nós','vocês']).filter(function(pk) {
      return VERB_DATA[tense][verb][pk] === form;
    });

    /* 8 choix de verbes : correct + 7 distracteurs */
    var others = verbs.filter(function(v) { return v !== verb; });
    _shuffle(others);
    var choices = [verb].concat(others.slice(0, 7));
    _shuffle(choices);

    return { verb: verb, tense: tense, pKey: pKey,
             pronoun: pEntry.pronoun, form: form,
             validKeys: validKeys, verbChoices: choices };
  }

  function _verbPool() {
    var all = (typeof VERB_NAMES !== 'undefined' && VERB_NAMES.length)
              ? VERB_NAMES
              : (VERB_DATA && VERB_DATA.present ? Object.keys(VERB_DATA.present) : []);

    /* Priorité thème > niveau */
    if (_ecTheme && typeof THEMES_SEMANTIC !== 'undefined') {
      var th = THEMES_SEMANTIC.find(function(t) { return t.id === _ecTheme; });
      if (th && th.verbs && th.verbs.length) return th.verbs.slice();
    }

    if (_ecLevel === 0) return all.slice();

    var lv = LEVELS && (LEVELS[_ecLevel] || LEVELS[String(_ecLevel)]);
    if (lv && lv.verbs && lv.verbs.length) return lv.verbs.slice();

    return all.slice();
  }

  function _shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = ~~(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* ══════════════════════════════════════════════
     SESSION
     ══════════════════════════════════════════════ */

  function start() {
    var setup = document.getElementById('ecSetup');
    var ex    = document.getElementById('ecExercise');
    if (setup) setup.style.display = 'none';
    if (ex)    ex.style.display    = 'block';
    _nextQuestion();
  }

  function _nextQuestion() {
    _q   = _build();
    _ans = {};
    if (!_q) { _showError(); return; }
    /* Mémoriser le pool pour le Tableau */
    /* Mémoriser les verbes de CETTE question pour le Tableau */
    try {
      if (_q && _q.verbChoices) window._ecouteVerbs = _q.verbChoices.slice();
    } catch(e) {}
    _renderQuestion();
    setTimeout(play, 450);
  }

  function _showError() {
    console.warn('[Ecoute] pool vide — aucun verbe disponible pour cette sélection');
    backToSetup();
  }

  /* ══════════════════════════════════════════════
     TTS
     ══════════════════════════════════════════════ */

  function play() {
    if (!_q) return;
    var text = (_pronounMode === 'enonce' ? _q.pronoun + ' ' : '') + _q.form;
    /* speakDirect bypasse le toggle TTS — toujours jouer en mode écoute */
    try {
      if (TTS.speakDirect) { TTS.speakDirect(text); }
      else { TTS.speak(text); }
    } catch(e) { console.warn('[Ecoute] TTS error', e); }
  }

  /* ══════════════════════════════════════════════
     RENDU — QUESTION
     ══════════════════════════════════════════════ */

  var _PRON_LABELS = { eu:'eu', você:'você', ele:'ele / ela', nós:'nós', vocês:'vocês' };
  var _TENSE_LABELS = {
    present:'Présent', pret:'Passé', imperf:'Imparfait',
    fut:'Futur', cond:'Conditionnel', subj:'Subjonctif'
  };

  function _renderQuestion() {
    var qs  = document.getElementById('ecQuestions');
    var res = document.getElementById('ecResult');
    if (qs)  qs.style.display  = 'block';
    if (res) res.style.display = 'none';

    /* Bloc pronom visible seulement en mode éludé */
    var pb = document.getElementById('ecQPronoun');
    if (pb) pb.style.display = (_pronounMode === 'elide') ? '' : 'none';

    _buildPronounBtns();
    _buildVerbBtns();
    _buildTenseBtns();
    _updateValidateBtn();
    /* Reset scroll — parcourir toute la hiérarchie */
    function _resetScroll() {
      window.scrollTo(0, 0);
      document.body.scrollLeft = 0;
      document.documentElement.scrollLeft = 0;
      var el = document.getElementById('ecExercise');
      while (el) { if (el.scrollLeft) el.scrollLeft = 0; el = el.parentElement; }
    }
    _resetScroll();
    requestAnimationFrame(function() {
      _resetScroll();
      requestAnimationFrame(function() {
        _resetScroll();
        setTimeout(_resetScroll, 100); /* filet de sécurité iOS */
      });
    });

    /* Tap sur Valider grisé → flash les sections manquantes */
    var vBtn = document.getElementById('ecValidateBtn');
    if (vBtn && !vBtn._flashListenerAdded) {
      vBtn._flashListenerAdded = true;
      vBtn.addEventListener('click', function() {
        if (this.disabled) _onValidateTapDisabled();
      });
    }
  }

  function _buildPronounBtns() {
    var c = document.getElementById('ecPronounBtns');
    if (!c) return;
    c.innerHTML = '';
    /* 6 boutons : eles/elas ajouté comme variante de vocês */
    var PRON_BTNS = [
      {label:'eu',          pkey:'eu'},
      {label:'você',        pkey:'você'},
      {label:'ele / ela',   pkey:'ele'},
      {label:'nós',         pkey:'nós'},
      {label:'vocês',       pkey:'vocês'},
      {label:'eles / elas', pkey:'vocês', variant:'eleselas'},
    ];
    PRON_BTNS.forEach(function(p) {
      var btn = _choiceBtn(p.label, 'ec-pron-btn');
      btn.dataset.key = p.pkey;
      btn.dataset.variant = p.variant || '';
      btn.addEventListener('click', function() { selectPronoun(p.pkey, btn); });
      c.appendChild(btn);
    });
  }

  function _buildVerbBtns() {
    var c = document.getElementById('ecVerbBtns');
    if (!c || !_q) return;
    c.innerHTML = '';
    _q.verbChoices.forEach(function(v) {
      var btn = _choiceBtn('', 'ec-verb-btn');
      var fr  = getTranslation(v);
      btn.innerHTML = '<span class="ec-cb-pt">' + v + '</span>' +
                      (fr ? '<span class="ec-cb-fr">· ' + fr + '</span>' : '');
      btn.dataset.verb = v;
      btn.addEventListener('click', function() { selectVerb(v); });
      c.appendChild(btn);
    });
  }

  function _buildTenseBtns() {
    var c = document.getElementById('ecTenseBtns');
    if (!c) return;
    c.innerHTML = '';
    _ecTenses.forEach(function(t) {
      var btn = _choiceBtn(I18n.tf('tense_btn_' + t, _TENSE_LABELS[t] || t), 'ec-tense-btn');
      btn.dataset.tense = t;
      btn.addEventListener('click', function() { selectTense(t); });
      c.appendChild(btn);
    });
  }

  function _choiceBtn(text, cls) {
    var btn = document.createElement('button');
    btn.className = 'ec-choice-btn ' + (cls || '');
    btn.textContent = text;
    return btn;
  }

  /* ══════════════════════════════════════════════
     SÉLECTION
     ══════════════════════════════════════════════ */

  function selectPronoun(pk, btnEl) {
    _ans.pKey = pk;
    /* Désélectionner tout puis sélectionner uniquement ce bouton */
    document.querySelectorAll('#ecPronounBtns .ec-choice-btn').forEach(function(b) {
      b.classList.remove('selected');
    });
    if (btnEl) btnEl.classList.add('selected');
    _updateValidateBtn();
  }

  function selectVerb(v) {
    _ans.verb = v;
    _highlight('#ecVerbBtns .ec-choice-btn', 'verb', v);
    _updateValidateBtn();
  }

  function selectTense(t) {
    _ans.tense = t;
    _highlight('#ecTenseBtns .ec-choice-btn', 'tense', t);
    _updateValidateBtn();
  }

  function _highlight(sel, dataKey, val) {
    document.querySelectorAll(sel).forEach(function(b) {
      b.classList.toggle('selected', b.dataset[dataKey] === val);
    });
  }

  function _updateValidateBtn() {
    var btn = document.getElementById('ecValidateBtn');
    if (!btn) return;
    var needPronoun = _pronounMode === 'elide' && !_ans.pKey;
    var needVerb    = !_ans.verb;
    var needTense   = !_ans.tense;
    var ready = !needPronoun && !needVerb && !needTense;
    btn.disabled = !ready;

    /* Indication textuelle de ce qui manque */
    var hint = document.getElementById('ecValidateHint');
    if (!ready && hint) {
      var missing = [];
      if (needPronoun) missing.push(I18n.tf('ecoute_who','Qui parle ?'));
      if (needVerb)    missing.push(I18n.tf('ecoute_which_verb','Quel verbe ?'));
      if (needTense)   missing.push(I18n.tf('ecoute_which_tense','Quel temps ?'));
      hint.textContent = missing.join('  ·  ');
      hint.style.display = '';
    } else if (hint) {
      hint.style.display = 'none';
    }
  }

  function _onValidateTapDisabled() {
    /* Flash les sections incomplètes */
    if (_pronounMode === 'elide' && !_ans.pKey) _flashSection('ecQPronoun');
    if (!_ans.verb)  _flashSection('ecVerbBtns');
    if (!_ans.tense) _flashSection('ecTenseBtns');
  }

  function _flashSection(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add('ec-flash');
    setTimeout(function() { el.classList.remove('ec-flash'); }, 600);
  }

  /* ══════════════════════════════════════════════
     VALIDATION
     ══════════════════════════════════════════════ */

  function validate() {
    if (!_q || !_ans.verb || !_ans.tense) return;

    var pOk = _pronounMode === 'enonce' ||
              _q.validKeys.indexOf(_ans.pKey) !== -1;
    var vOk = _ans.verb  === _q.verb;
    var tOk = _ans.tense === _q.tense;

    /* Enregistrer dans les stats */
    try {
      var sk = _pronounMode === 'enonce' ? _q.pKey :
               (_ans.pKey || _q.pKey);
      Stats.record(_q.verb, _q.tense, sk, pOk && vOk && tOk, _ans.verb + '/' + _ans.tense, _q.verb + '/' + _q.tense);
    } catch(e) {}

    _renderResult(pOk, vOk, tOk);
  }

  /* ══════════════════════════════════════════════
     RENDU — RÉSULTAT
     ══════════════════════════════════════════════ */

  function _renderResult(pOk, vOk, tOk) {
    var qs  = document.getElementById('ecQuestions');
    var res = document.getElementById('ecResult');
    if (qs)  qs.style.display  = 'none';
    if (res) res.style.display = 'block';

    /* Réinitialiser toutes les zones */
    var actionsEl = document.getElementById('ecResultActions');
    if (actionsEl) actionsEl.innerHTML = '';
    var wz = document.getElementById('ecWriteZone');
    if (wz) wz.style.display = 'none';

    var ct = document.getElementById('ecResultContent');
    if (!ct) return;

    var allOk = pOk && vOk && tOk;
    var html  = '';

    /* Ligne pronom (mode éludé seulement) */
    if (_pronounMode === 'elide') {
      var validDisp = [];
      _q.validKeys.forEach(function(pk) {
        validDisp.push(_PRON_LABELS[pk] || pk);
        if (pk === 'vocês') validDisp.push('eles / elas');
      });
      /* Erreur : montrer la réponse de l'utilisateur sans révéler le bon pronom */
      var pronValue = pOk
        ? validDisp.join(' / ')                        /* correct → afficher */
        : (_PRON_LABELS[_ans.pKey] || _ans.pKey || '?'); /* faux → réponse user */
      html += _row(pOk, I18n.tf('ecoute_who','Qui ?'), pronValue, '');
    }

    /* Ligne verbe — afficher user si faux, correct si juste */
    var fr = getTranslation(_q.verb) ? ' · ' + getTranslation(_q.verb) : '';
    var verbValue = vOk
      ? (_q.verb + fr)
      : (_ans.verb || '?');
    html += '<div id="ecResRowVerb">' +
            _row(vOk, I18n.tf('ecoute_verb','Verbe'), verbValue, '') +
            '</div>';

    /* Ligne temps — afficher user si faux, correct si juste */
    var tLabel     = I18n.tf('tense_btn_' + _q.tense,    _TENSE_LABELS[_q.tense]   || _q.tense);
    var tUserLabel = _ans.tense
      ? I18n.tf('tense_btn_' + _ans.tense, _TENSE_LABELS[_ans.tense] || _ans.tense)
      : '?';
    var tenseValue = tOk ? tLabel : tUserLabel;
    html += '<div id="ecResRowTense">' +
            _row(tOk, I18n.tf('ecoute_tense','Temps'), tenseValue, '') +
            '</div>';

    ct.innerHTML = html;

    /* Actions selon résultat */
    if (allOk) {
      /* Succès : bouton suivant + proposer d'écrire (sans révéler la réponse) */
      if (actionsEl) actionsEl.innerHTML =
        '<button class="btn ec-next-btn" id="ecNextBtn" onclick="Ecoute.nextQuestion()">' +
        I18n.tf('ecoute_next','Question suivante →') + '</button>' +
        '<button class="ec-btn-change" onclick="Ecoute.backToSetup()">' +
        I18n.tf('ecoute_change','⚙️ Changer') + '</button>';
      _setupWriteZone();
    } else {
      /* Erreur : réessayer ou voir la réponse */
      if (actionsEl) actionsEl.innerHTML =
        '<div class="ec-retry-actions">' +
        '<button class="ec-btn-relisten" onclick="Ecoute.play()">🔊</button>' +
        '<button class="ec-btn-retry"  onclick="Ecoute.retry()">'       + I18n.tf('ecoute_retry','🔄 Réessayer')      + '</button>' +
        '<button class="ec-btn-answer" onclick="Ecoute.showAnswer()">'  + I18n.tf('ecoute_show_answer','💡 Voir la réponse') + '</button>' +
        '</div>' +
        '<button class="ec-btn-change" onclick="Ecoute.backToSetup()">' + I18n.tf('ecoute_change','⚙️ Changer') + '</button>';
    }
  }

  function _row(ok, label, value, extra) {
    return '<div class="ec-res-row ' + (ok ? 'ec-ok' : 'ec-ko') + '">' +
      '<span class="ec-res-icon">' + (ok ? '✅' : '❌') + '</span>' +
      '<span class="ec-res-label">' + label + '</span>' +
      '<span class="ec-res-val">'   + value  + '</span>' +
      (extra || '') + '</div>';
  }

  /* ══════════════════════════════════════════════
     PHASE ÉCRITURE
     ══════════════════════════════════════════════ */

  function _setupWriteZone() {
    var zone = document.getElementById('ecWriteZone');
    var inp  = document.getElementById('ecWriteInput');
    var hint = document.getElementById('ecWriteHint');
    var vbtn = document.getElementById('ecWriteVerifyBtn');
    if (!zone || !inp) return;

    /* Choisir le pronom à afficher */
    var displayKey = _pronounMode === 'enonce' ? _q.pKey :
      (_ans.pKey && _q.validKeys.indexOf(_ans.pKey) !== -1 ? _ans.pKey : _q.pKey);
    var pronEl = document.getElementById('ecWritePronoun');
    if (pronEl) pronEl.textContent = _PRON_LABELS[displayKey] || displayKey;

    inp.value = '';
    inp.dataset.pkey = displayKey;
    inp.className = 'ec-write-input';
    if (hint) hint.style.display = 'none';
    if (vbtn) vbtn.disabled = true;
    zone.classList.remove('ec-write-done');
    zone.style.display = '';

    inp.oninput = function() { if (vbtn) vbtn.disabled = !this.value.trim(); };
    inp.onkeydown = function(e) { if (e.key === 'Enter' && this.value.trim()) verifyWriting(); };
  }

  function verifyWriting() {
    var inp  = document.getElementById('ecWriteInput');
    var hint = document.getElementById('ecWriteHint');
    var vbtn = document.getElementById('ecWriteVerifyBtn');
    var zone = document.getElementById('ecWriteZone');
    if (!inp || !_q) return;

    var typed    = inp.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    var pKey     = inp.dataset.pkey || _q.pKey;
    var expected = (VERB_DATA[_q.tense][_q.verb][pKey] || '').toLowerCase()
                     .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    var ok = typed === expected;

    inp.classList.toggle('ec-write-correct',   ok);
    inp.classList.toggle('ec-write-incorrect', !ok);

    if (hint) {
      hint.textContent = ok ? '' : VERB_DATA[_q.tense][_q.verb][pKey];
      hint.style.display = ok ? 'none' : '';
    }
    if (vbtn) vbtn.disabled = true;
    if (zone) zone.classList.add('ec-write-done');

    /* Afficher le bouton suivant après vérification */
    var actionsEl = document.getElementById('ecResultActions');
    if (actionsEl && !actionsEl.querySelector('.ec-next-btn')) {
      var nextBtn = document.createElement('button');
      nextBtn.className = 'btn ec-next-btn';
      nextBtn.style.marginTop = '10px';
      nextBtn.innerHTML = I18n.tf('ecoute_next','Question suivante →');
      nextBtn.addEventListener('click', function() { Ecoute.nextQuestion(); });
      actionsEl.appendChild(nextBtn);
    }
  }

  /* ══════════════════════════════════════════════
     NAVIGATION
     ══════════════════════════════════════════════ */

  function retry() {
    var res = document.getElementById('ecResult');
    if (res) res.style.display = 'none';
    _ans = {};
    _renderQuestion(); /* rebuild complet des boutons */
    setTimeout(play, 200);
  }

  function showAnswer() {
    /* Révéler la forme + mettre à jour les rows verb/tense avec ✅ */
    var actionsEl = document.getElementById('ecResultActions');

    /* Mettre à jour la ligne verbe si elle était fausse */
    var vRow = document.getElementById('ecResRowVerb');
    if (vRow) {
      var fr = getTranslation(_q.verb) ? ' · ' + getTranslation(_q.verb) : '';
      vRow.innerHTML = _row(true, I18n.tf('ecoute_verb','Verbe'), _q.verb + fr, '');
    }

    /* Mettre à jour la ligne temps si elle était fausse */
    var tRow = document.getElementById('ecResRowTense');
    if (tRow) {
      var tLabel = I18n.tf('tense_btn_' + _q.tense, _TENSE_LABELS[_q.tense] || _q.tense);
      tRow.innerHTML = _row(true, I18n.tf('ecoute_tense','Temps'), tLabel, '');
    }

    /* Afficher pronom + forme conjuguée + bouton suivant */
    var pronDisp = _q.validKeys.map(function(pk) {
      var parts = [_PRON_LABELS[pk] || pk];
      if (pk === 'vocês') parts.push('eles / elas');
      return parts.join(' / ');
    }).join(' · ');
    var answerHtml =
      '<div class="ec-res-form">' +
      '<span class="ec-res-pron">' + pronDisp + '</span> ' +
      '<span class="ec-res-word">' + _q.form + '</span></div>' +
      '<button class="btn ec-next-btn" onclick="Ecoute.nextQuestion()">' +
      I18n.tf('ecoute_next','Question suivante →') + '</button>';
    if (actionsEl) actionsEl.innerHTML = answerHtml;
  }

  function nextQuestion() {
    try { TTS.stop(); } catch(e) {}
    _nextQuestion();
  }

  function backToSetup() {
    var setup = document.getElementById('ecSetup');
    var ex    = document.getElementById('ecExercise');
    if (setup) setup.style.display = '';
    if (ex)    ex.style.display    = 'none';
  }

  /* ══════════════════════════════════════════════
     PRONOUN MODE TOGGLE
     ══════════════════════════════════════════════ */

  function setPronounMode(mode) {
    _pronounMode = mode;
    try { localStorage.setItem('ec_pronounMode', mode); } catch(e) {}
    document.querySelectorAll('.ec-mode-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    /* Mettre à jour le bloc pronom si déjà en question */
    var pb = document.getElementById('ecQPronoun');
    if (pb) pb.style.display = (mode === 'elide') ? '' : 'none';
  }

  /* ══════════════════════════════════════════════
     SÉLECTION AUTONOME
     ══════════════════════════════════════════════ */

  function setLevel(n, btnEl) {
    _ecLevel = n;
    _ecTheme = null;
    try { localStorage.setItem('ec_level', n); } catch(e) {}
    try { localStorage.removeItem('ec_theme'); } catch(e) {}
    document.querySelectorAll('.ec-level-btn').forEach(function(b) {
      b.classList.toggle('active', parseInt(b.dataset.level) === n);
    });
    document.querySelectorAll('.ec-theme-btn').forEach(function(b) {
      b.classList.remove('active');
    });
    _updateStartBtn();
  }

  function setTheme(id, btnEl) {
    _ecTheme = id;
    _ecLevel = 0;
    try { localStorage.setItem('ec_theme', id); localStorage.setItem('ec_level', '0'); } catch(e) {}
    document.querySelectorAll('.ec-theme-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.theme === id);
    });
    document.querySelectorAll('.ec-level-btn').forEach(function(b) {
      b.classList.remove('active');
    });
    _updateStartBtn();
  }

  function toggleTense(t, btnEl) {
    var idx = _ecTenses.indexOf(t);
    if (idx === -1) {
      _ecTenses.push(t);
    } else if (_ecTenses.length > 1) {
      _ecTenses.splice(idx, 1);
    }
    try { localStorage.setItem('ec_tenses', JSON.stringify(_ecTenses)); } catch(e) {}
    document.querySelectorAll('.ec-tense-setup-btn').forEach(function(b) {
      b.classList.toggle('active', _ecTenses.indexOf(b.dataset.tense) !== -1);
    });
    _updateStartBtn();
  }

  function _updateStartBtn() {
    var btn = document.getElementById('ecStartBtn');
    if (btn) btn.disabled = !_ecTenses.length;
  }

  /* ══════════════════════════════════════════════
     INIT (appelé par Router à l'entrée de la page)
     ══════════════════════════════════════════════ */

  function onPageEnter() {
    /* Charger thème depuis localStorage si existant */
    try {
      var st = localStorage.getItem('ec_theme');
      if (st) { _ecTheme = st; _ecLevel = 0; }
    } catch(e) {}

    /* Construire les boutons thèmes dynamiquement */
    _buildThemeBtns();

    /* Sync toggle pronom */
    document.querySelectorAll('.ec-mode-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.mode === _pronounMode);
    });
    /* Sync boutons niveau */
    document.querySelectorAll('.ec-level-btn').forEach(function(b) {
      b.classList.toggle('active', !_ecTheme && parseInt(b.dataset.level) === _ecLevel);
    });
    /* Sync boutons thèmes */
    document.querySelectorAll('.ec-theme-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.theme === _ecTheme);
    });
    /* Sync boutons temps */
    document.querySelectorAll('.ec-tense-setup-btn').forEach(function(b) {
      b.classList.toggle('active', _ecTenses.indexOf(b.dataset.tense) !== -1);
    });
    _updateStartBtn();
  }

  function _buildThemeBtns() {
    var c = document.getElementById('ecThemeBtns');
    if (!c || c.dataset.built || typeof THEMES_SEMANTIC === 'undefined') return;
    c.dataset.built = '1';
    c.innerHTML = '';
    THEMES_SEMANTIC.forEach(function(th) {
      var btn = document.createElement('button');
      btn.className = 'ec-theme-btn';
      btn.dataset.theme = th.id;
      btn.textContent = I18n.tf('theme_' + th.id + '_desc', th.label || th.id);
      btn.addEventListener('click', function() { setTheme(th.id, btn); });
      c.appendChild(btn);
    });
  }

  /* ── API publique ── */
  return {
    isActive  : function() { return !!_q && !!_q.verb; },
    /* Appelés depuis HTML */
    start         : start,
    play          : play,
    validate      : validate,
    retry         : retry,
    showAnswer    : showAnswer,
    nextQuestion  : nextQuestion,
    backToSetup   : backToSetup,
    setLevel      : setLevel,
    toggleTense   : toggleTense,
    setPronounMode: setPronounMode,
    verifyWriting : verifyWriting,
    /* Appelé par Router */
    onPageEnter   : onPageEnter,
  };

}());
