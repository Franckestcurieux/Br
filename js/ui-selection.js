/**
 * ui-selection.js — Sélection des verbes, commutation des temps
 *                   et construction du panneau de configuration.
 *
 * Dépend de   : data.js, i18n.js, core.js, engine.js (buildRef via switchTense)
 * Expose      : switchTense, updateTitle, *               applySelection, applyLevel, applyGrupo, applyThemeSemantic,
 *               buildConfig, updateGroupCheckbox, updateConfigCount
 */
'use strict';

/* ════════════════════════════════════════════
   TEMPS & TITRE
   ════════════════════════════════════════════ */
function switchTense(tense) {
  if (tense === currentTense) return;
  currentTense = tense;
  document.querySelectorAll('.tense-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.tense === tense);
  });
  updateTitle();
  exercises = []; state = 'idle';
  DOM.cardsArea.innerHTML = '';
  var s = document.getElementById('scoreFinal');
  if (s) s.remove();
  ACTIVE_TENSES = [tense]; /* patchTableauToggle gère ACTIVE_TENSES dans le Tableau */
  /* Mettre à jour le chip et fermer le picker */
  if (typeof updateTenseChip  === 'function') updateTenseChip(tense);
  if (typeof closeTensePicker === 'function') closeTensePicker();

  var ref = DOM.refDetails;
  if (ref && ref.open) buildRef();
}

function updateTitle() {
  var isB2 = TENSES_B2.indexOf(currentTense) !== -1;
  var _bl = document.getElementById('basicoLabel');
  if (_bl) _bl.textContent = 'Básico ' + (isB2 ? '2' : '1');
}

/* toggleBasico2 supprimé — chip sélecteur remplace les deux barres */

/* ════════════════════════════════════════════
   SÉLECTION DES VERBES
   ════════════════════════════════════════════ */
function applySelection(verbs) {
  selectedVerbs = verbs === null ? null : verbs.slice();
  document.querySelectorAll('.verb-checkbox').forEach(function(cb) {
    cb.checked = verbs === null || verbs.indexOf(cb.value) !== -1;
  });
  var _rd = DOM.refDetails;
  if (_rd && _rd.open) buildRef();
  updateConfigCount();
  VERB_CATEGORIES.forEach(function(cat) {
    var g = document.getElementById('cat-' + cat.id);
    if (!g) return;
    var p = g.closest('.config-group');
    if (!p) return;
    var cbs = p.querySelectorAll('.verb-checkbox');
    var t = cbs.length;
    var c = [].filter.call(cbs, function(cb) { return cb.checked; }).length;
    if (c === 0)      { g.checked = false; g.indeterminate = false; }
    else if (c === t) { g.checked = true;  g.indeterminate = false; }
    else              { g.checked = false; g.indeterminate = true;  }
  });
  updateConfigCount();
}

function applyLevel(n) {
  var level = LEVELS[n] || LEVELS[String(n)];
  if (!level) return;
  fadeHint('.selection-header');
  currentLevel = n;
  applySelection(level.verbs);
  document.querySelectorAll('.level-btn').forEach(function(b) {
    b.classList.toggle('active', parseInt(b.dataset.level) === n);
  });
  document.querySelectorAll('.theme-btn').forEach(function(b) { b.classList.remove('active'); });
}

function applyGrupo(id) {
  if (id === 'all_irr') {
    var v = ['irreg','er_irr','ir_irr'].flatMap(function(x) {
      var g = VERB_CATEGORIES.find(function(c) { return c.id === x; });
      return g ? g.verbs : [];
    });
    fadeHint('.selection-header');
    applySelection(v);
    document.querySelectorAll('.grupo-btn').forEach(function(b) { b.classList.remove('active'); });
    var btn = document.querySelector('.grupo-btn[onclick*="all_irr"]');
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.level-btn,.theme-sem-btn').forEach(function(b) { b.classList.remove('active'); });
    return;
  }
  var cat = VERB_CATEGORIES.find(function(c) { return c.id === id; });
  if (!cat) return;
  fadeHint('.selection-header');
  applySelection(cat.verbs);
  document.querySelectorAll('.grupo-btn').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('onclick').includes("'" + id + "'"));
  });
  document.querySelectorAll('.level-btn,.theme-sem-btn').forEach(function(b) { b.classList.remove('active'); });
}

function applyThemeSemantic(id) {
  var t = THEMES_SEMANTIC.find(function(t) { return t.id === id; });
  if (!t) return;
  fadeHint('.selection-header');
  applySelection(t.verbs);
  document.querySelectorAll('.theme-sem-btn').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('onclick').includes("'" + id + "'"));
  });
  document.querySelectorAll('.level-btn,.grupo-btn').forEach(function(b) { b.classList.remove('active'); });
}

/* ════════════════════════════════════════════
   UI — Panneau "Verbos a trabalhar"
   ════════════════════════════════════════════ */
function buildConfig() {
  var body = DOM.configBody;
  body.innerHTML = '';
  VERB_CATEGORIES.forEach(function(cat) {
    var group = document.createElement('div');
    group.className = 'config-group';
    var header = document.createElement('div');
    header.className = 'config-group-header';
    var allCb = document.createElement('input');
    allCb.type = 'checkbox'; allCb.id = 'cat-' + cat.id; allCb.checked = true;
    allCb.addEventListener('change', function() {
      group.querySelectorAll('.verb-checkbox').forEach(function(cb) { cb.checked = allCb.checked; });
      selectedVerbs = [...document.querySelectorAll('.verb-checkbox:checked')].map(function(cb) { return cb.value; });
      updateConfigCount();
      if (DOM.refDetails && DOM.refDetails.open) buildRef();
    });
    var allLabel = document.createElement('label');
    allLabel.htmlFor = 'cat-' + cat.id;
    allLabel.innerHTML = I18n.tf('cat_'+cat.id, cat.label);
    header.appendChild(allCb); header.appendChild(allLabel);
    group.appendChild(header);
    var rowsWrap = document.createElement('div');
    rowsWrap.className = 'config-verb-rows';
    group.appendChild(rowsWrap);
    cat.verbs.forEach(function(verb) {
      var row = document.createElement('div'); row.className = 'config-verb-row';
      var cb = document.createElement('input');
      cb.type='checkbox'; cb.className='verb-checkbox'; cb.id='verb-'+verb; cb.value=verb;
      cb.checked = selectedVerbs === null || selectedVerbs.indexOf(verb) !== -1;
      cb.addEventListener('change', function() {
        currentLevel = null;
        selectedVerbs = [...document.querySelectorAll('.verb-checkbox:checked')].map(function(cb) { return cb.value; });
        document.querySelectorAll('.level-btn,.theme-btn').forEach(function(b) { b.classList.remove('active'); });
        updateGroupCheckbox(cat, group, allCb);
        updateConfigCount();
        if (DOM.refDetails && DOM.refDetails.open) buildRef();
      });
      var lbl = document.createElement('label');
      lbl.htmlFor = 'verb-' + verb;
      lbl.innerHTML = '<span>' + displayVerb(verb) + '</span><span class="config-verb-fr">' + (I18n.verbTr(verb) || '') + '</span>';
      row.appendChild(cb); row.appendChild(lbl);
      rowsWrap.appendChild(row);
    });
    body.appendChild(group);
  });
  updateConfigCount();
}

function updateGroupCheckbox(cat, group, allCb) {
  var cbs = group.querySelectorAll('.verb-checkbox');
  var c = [].filter.call(cbs, function(cb) { return cb.checked; }).length;
  if (c === 0)           { allCb.checked=false; allCb.indeterminate=false; }
  else if (c===cbs.length){ allCb.checked=true;  allCb.indeterminate=false; }
  else                   { allCb.checked=false; allCb.indeterminate=true;  }
}

function updateConfigCount() {
  var n = getSelectedVerbs().length;
  var el = DOM.configCount;
  if (!el) return;
  el.innerHTML = n === 0
    ? "<span style='font-style:italic'>" + I18n.tf('config_none','⚠ Sélectionne au moins 1 verbe !') + "</span>"
    : '<strong>' + n + '</strong> verbe' + (n>1?'s':'') + ' sélectionné' + (n>1?'s':'') +
      (n < 5 ? ' <em>(les exercices piocheront dans ces ' + n + ' verbes)</em>' : '');
}

