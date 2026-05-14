/**
 * mode-erreurs.js — Exercice ciblé sur les mauvais scores.
 *
 * DÉCLENCHEMENT :
 *   Case "Travailler mes erreurs" cochée → listener 'change' (init.js)
 *   → checkAndOpen() vérifie les stats → ouvre modal 2 étapes
 *
 * MODAL 2 ÉTAPES :
 *   Étape 1 — Périmètre verbes : sélection actuelle | groupe | tous
 *   Étape 2 — Temps : un temps choisi | tous les temps
 *
 * FILTRE :
 *   Stats.getBadPairs(verbPool, tenses, threshold=0)
 *   Paires verb×tense dont score moyen < 0 → appliqué à l'exercice
 *   Si aucune paire → message "Bravo, tout est bon !"
 *
 * VERROUILLAGE :
 *   Overlay mePanelLock + meChipLock masquent le panneau de sélection
 *   pendant le mode. Déverrouillé par deactivate() (case décochée).
 *
 * API publique : checkAndOpen, close, deactivate, nextStep, prevStep,
 *   selectScope, selectGroup, selectTenseMode, selectTense,
 *   startFiltered, updateCheckboxState
 *
 * Expose : ModeErreurs (IIFE global)
 */
'use strict';

var ModeErreurs = (function () {

  var _s = {
    active: false, scope: null, groupKey: null, groupLabel: '',
    tenseMode: null, tenseKey: null,
  };
  var BAD_THRESHOLD = 0;

  /* ── Ouverture ── */
  function checkAndOpen() {
    var verbStats = null;
    try { verbStats = Stats.getVerbStats(); } catch (e) {}
    if (!verbStats || !Object.keys(verbStats).length) {
      var cb = document.getElementById('modeErreursCheck');
      if (cb) cb.checked = false;
      _showNoDataHint();
      return false;
    }
    _resetState();
    try { _buildGroupPicker(); } catch(e) { console.warn('[ModeErreurs] buildGroupPicker', e); }
    try { _buildTensePicker(); } catch(e) { console.warn('[ModeErreurs] buildTensePicker', e); }
    _showStep(1);
    var modal = document.getElementById('modeErreursModal');
    if (!modal) { console.warn('[ModeErreurs] modal introuvable #modeErreursModal'); return false; }
    modal.style.display = 'flex';
    return true;
  }

  function _hideModal() {
    var modal = document.getElementById('modeErreursModal');
    if (modal) modal.style.display = 'none';
  }

  function close() {
    _hideModal();
    var cb = document.getElementById('modeErreursCheck');
    if (cb) cb.checked = false;
    deactivate();
  }

  function deactivate() {
    _s.active = false;
    _unlockPanel();
  }

  /* ── Navigation ── */
  function nextStep() {
    if (!_s.scope) return;
    _buildBreadcrumb();
    _showStep(2);
  }

  function prevStep() {
    var bravoEl = document.getElementById('meStepBravo');
    if (bravoEl && bravoEl.style.display !== 'none') { _showStep(2); return; }
    _s.tenseMode = null; _s.tenseKey = null;
    _clearTenseUI();
    _showStep(1);
  }

  function _showStep(n) {
    ['meStep1','meStep2','meStepBravo'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    var map = {1:'meStep1', 2:'meStep2', bravo:'meStepBravo'};
    var el = document.getElementById(map[n] || 'meStep1');
    if (el) el.style.display = 'block';
  }

  /* ── Étape 1 — Verbes ── */
  function selectScope(type, cardEl) {
    if (type !== 'group') {
      var gp = document.getElementById('meGroupPicker');
      if (gp) gp.style.display = 'none';
      _s.scope = type; _s.groupKey = null; _s.groupLabel = '';
      document.querySelectorAll('.me-scope-card').forEach(function(c) { c.classList.remove('selected'); });
      if (cardEl) cardEl.classList.add('selected');
    } else {
      var gp2 = document.getElementById('meGroupPicker');
      if (gp2) gp2.style.display = (gp2.style.display === 'none' ? 'block' : 'none');
    }
    _updateNextBtn();
  }

  function selectGroup(key, label, btnEl) {
    _s.scope = 'group'; _s.groupKey = key; _s.groupLabel = label;
    document.querySelectorAll('.me-group-btn').forEach(function(b) { b.classList.remove('active'); });
    if (btnEl) btnEl.classList.add('active');
    var sub = document.querySelector('#meScopeGroupCard .me-scope-sub');
    if (sub) sub.textContent = label;
    document.querySelectorAll('.me-scope-card').forEach(function(c) { c.classList.remove('selected'); });
    var gc = document.getElementById('meScopeGroupCard');
    if (gc) gc.classList.add('selected');
    _updateNextBtn();
  }

  function _buildGroupPicker() {
    var picker = document.getElementById('meGroupPicker');
    if (!picker) return;
    picker.innerHTML = '';

    /* Niveaux */
    var levelRow = document.createElement('div');
    levelRow.className = 'me-group-row';
    Object.keys(LEVELS || {}).sort(function(a,b){return +a-+b;}).forEach(function(k) {
      if (parseInt(k) < 1) return;
      var btn = document.createElement('button');
      btn.className = 'me-group-btn me-nivel-btn';
      btn.textContent = 'Nível ' + k;
      var v = LEVELS[k] && LEVELS[k].verbs ? LEVELS[k].verbs : [];
      btn.title = v.slice(0,4).join(', ') + (v.length > 4 ? '…' : '');
      btn.addEventListener('click', function(e) { e.stopPropagation(); selectGroup('nivel_'+k,'Nível '+k,btn); });
      levelRow.appendChild(btn);
    });
    picker.appendChild(levelRow);

    /* Séparateur */
    var sep = document.createElement('div');
    sep.className = 'me-group-sep';
    picker.appendChild(sep);

    /* Catégories */
    var catRow = document.createElement('div');
    catRow.className = 'me-group-row me-group-cats';
    (VERB_CATEGORIES || []).forEach(function(cat) {
      var btn = document.createElement('button');
      btn.className = 'me-group-btn';
      btn.textContent = I18n.tf('cat_'+cat.id, cat.label);
      btn.addEventListener('click', function(e) { e.stopPropagation(); selectGroup('cat_'+cat.id, btn.textContent, btn); });
      catRow.appendChild(btn);
    });
    var allIrrBtn = document.createElement('button');
    allIrrBtn.className = 'me-group-btn me-all-irr-btn';
    allIrrBtn.textContent = I18n.tf('cat_all_irr','Tous les irréguliers');
    allIrrBtn.addEventListener('click', function(e) { e.stopPropagation(); selectGroup('all_irr', allIrrBtn.textContent, allIrrBtn); });
    catRow.appendChild(allIrrBtn);
    picker.appendChild(catRow);
  }

  function _updateNextBtn() {
    var btn = document.getElementById('meBtnNext');
    if (btn) btn.disabled = !_s.scope;
  }

  /* ── Étape 2 — Temps ── */
  function selectTenseMode(mode, sectionEl) {
    _s.tenseMode = mode;
    var tb = document.getElementById('meTenseButtons');
    if (tb) tb.style.display = (mode === 'pick') ? 'flex' : 'none';
    if (mode === 'all') { _s.tenseKey = null; _clearTenseHighlight(); }
    document.querySelectorAll('.me-tense-section').forEach(function(s) { s.classList.remove('selected'); });
    if (sectionEl) sectionEl.classList.add('selected');
    _updateStartBtn();
  }

  function selectTense(key, btnEl) {
    _s.tenseKey = key; _s.tenseMode = 'pick';
    document.querySelectorAll('.me-tense-btn').forEach(function(b) { b.classList.remove('active'); });
    if (btnEl) btnEl.classList.add('active');
    document.querySelectorAll('.me-tense-section').forEach(function(s) { s.classList.remove('selected'); });
    var ps = document.getElementById('meTensePickSection');
    if (ps) ps.classList.add('selected');
    _updateStartBtn();
  }

  function _buildTensePicker() {
    var container = document.getElementById('meTenseButtons');
    if (!container) return;
    container.innerHTML = '';
    var labels = {
      present: I18n.tf('tense_btn_present','Présent'),
      pret   : I18n.tf('tense_btn_pret',   'Passé'),
      imperf : I18n.tf('tense_btn_imperf', 'Imparfait'),
      fut    : I18n.tf('tense_btn_fut',    'Futur'),
      cond   : I18n.tf('tense_btn_cond',   'Conditionnel'),
      subj   : I18n.tf('tense_btn_subj',   'Subjonctif'),
    };
    (TENSES_ALL || ['present','pret','imperf','fut','cond','subj']).forEach(function(key) {
      var btn = document.createElement('button');
      btn.className = 'me-tense-btn';
      btn.dataset.tense = key;
      btn.textContent = labels[key] || key;
      btn.addEventListener('click', function(e) { e.stopPropagation(); selectTense(key, btn); });
      container.appendChild(btn);
    });
  }

  function _buildBreadcrumb() {
    var el = document.getElementById('meBreadcrumb');
    if (!el) return;
    var label = _s.scope === 'current' ? I18n.tf('me_scope_current','Ma sélection')
              : _s.scope === 'all'     ? I18n.tf('me_scope_all','Tous les verbes')
              : _s.groupLabel;
    el.textContent = '← ' + label;
  }

  function _clearTenseHighlight() {
    document.querySelectorAll('.me-tense-btn').forEach(function(b) { b.classList.remove('active'); });
  }

  function _clearTenseUI() {
    _clearTenseHighlight();
    document.querySelectorAll('.me-tense-section').forEach(function(s) { s.classList.remove('selected'); });
    var tb = document.getElementById('meTenseButtons');
    if (tb) tb.style.display = 'none';
  }

  function _updateStartBtn() {
    var btn = document.getElementById('meBtnStart');
    if (btn) btn.disabled = !(_s.tenseMode === 'all' || (_s.tenseMode === 'pick' && _s.tenseKey));
  }

  /* ── Filtrage et démarrage ── */
  function startFiltered() {
    var verbPool = _getVerbPool();
    var tenses   = (_s.tenseMode === 'all') ? TENSES_ALL.slice() : [_s.tenseKey];
    var badPairs = [];
    try { badPairs = Stats.getBadPairs(verbPool, tenses, BAD_THRESHOLD); } catch(e) {}

    if (!badPairs.length) { _showStep('bravo'); return; }

    var badVMap = {}, badTMap = {};
    badPairs.forEach(function(p) { badVMap[p.verb] = true; badTMap[p.tense] = true; });
    var badVerbs  = Object.keys(badVMap);
    var badTenses = tenses.filter(function(t) { return badTMap[t]; });

    try {
      selectedVerbs = badVerbs;
      if (typeof updateConfigCount === 'function') updateConfigCount();
      if (typeof buildConfig       === 'function') buildConfig();
    } catch(e) {}

    if (badTenses.length === 1) {
      try { if (typeof switchTense === 'function') switchTense(badTenses[0]); } catch(e) {}
    } else {
      try {
        currentTense  = badTenses[0];
        ACTIVE_TENSES = badTenses;
        if (typeof updateTenseChip  === 'function') updateTenseChip(badTenses[0]);
        if (typeof closeTensePicker === 'function') closeTensePicker();
      } catch(e) {}
    }

    _s.active = true;
    _hideModal();
    _lockPanel();
    try { markSessionStarted(); } catch(e) {}
    try { startExercise(); } catch(e) { console.warn('[ModeErreurs] startExercise', e); }
    var sb = document.getElementById('statsBtnRow');
    if (sb) sb.style.display = '';
  }

  function _getVerbPool() {
    if (_s.scope === 'current') return selectedVerbs ? selectedVerbs.slice() : VERB_NAMES.slice();
    if (_s.scope === 'all')     return VERB_NAMES.slice();
    if (_s.scope === 'group')   return _verbsForKey(_s.groupKey);
    return VERB_NAMES.slice();
  }

  function _verbsForKey(key) {
    if (!key) return VERB_NAMES.slice();
    if (key.indexOf('nivel_') === 0) {
      var n = key.replace('nivel_','');
      var lv = LEVELS && (LEVELS[n] || LEVELS[+n]);
      return lv && lv.verbs ? lv.verbs.slice() : VERB_NAMES.slice();
    }
    if (key === 'all_irr') {
      return ['irreg','er_irr','ir_irr'].reduce(function(acc, id) {
        var cat = (VERB_CATEGORIES||[]).find(function(c){return c.id===id;});
        return cat ? acc.concat(cat.verbs) : acc;
      }, []);
    }
    if (key.indexOf('cat_') === 0) {
      var catId = key.replace('cat_','');
      var cat = (VERB_CATEGORIES||[]).find(function(c){return c.id===catId;});
      return cat ? cat.verbs.slice() : VERB_NAMES.slice();
    }
    return VERB_NAMES.slice();
  }

  /* ── Panneau verrou ── */
  function _lockPanel() {
    var pL = document.getElementById('mePanelLock');
    var cL = document.getElementById('meChipLock');
    if (pL) pL.style.display = 'flex';
    if (cL) cL.style.display = 'flex';
  }
  function _unlockPanel() {
    var pL = document.getElementById('mePanelLock');
    var cL = document.getElementById('meChipLock');
    if (pL) pL.style.display = 'none';
    if (cL) cL.style.display = 'none';
  }

  /* ── Utilitaires ── */
  function _resetState() {
    _s.scope=null; _s.groupKey=null; _s.groupLabel='';
    _s.tenseMode=null; _s.tenseKey=null;
    document.querySelectorAll('.me-scope-card').forEach(function(c){c.classList.remove('selected');});
    _clearTenseUI();
    var sub=document.querySelector('#meScopeGroupCard .me-scope-sub');
    if(sub) sub.textContent='';
    _updateNextBtn();
  }

  function _showNoDataHint() {
    var label = document.getElementById('modeErreursLabel');
    if (!label) return;
    label.style.color = 'var(--incorrect,#c94040)';
    setTimeout(function(){label.style.color='';}, 2200);
  }

  function updateCheckboxState() {
    var label = document.getElementById('modeErreursLabel');
    if (!label) return;
    var verbStats = null;
    try { verbStats = Stats.getVerbStats(); } catch(e) {}
    var hasData = verbStats && Object.keys(verbStats).length > 0;
    label.classList.toggle('me-disabled', !hasData);
    var cb = document.getElementById('modeErreursCheck');
    if (cb) cb.disabled = !hasData;
    label.title = hasData ? '' : 'Lance d\'abord quelques exercices';
  }

  return {
    checkAndOpen: checkAndOpen, close: close, deactivate: deactivate,
    nextStep: nextStep, prevStep: prevStep,
    selectScope: selectScope, selectGroup: selectGroup,
    selectTenseMode: selectTenseMode, selectTense: selectTense,
    startFiltered: startFiltered, updateCheckboxState: updateCheckboxState,
  };

}());
