/**
 * ui-ref.js — Cheat sheet de conjugaison et panneau de conjugaison
 *             complète (bouton 👁 sur chaque carte).
 *
 * Dépend de   : data.js, i18n.js, tts.js, core.js
 * Expose      : buildRef, buildFullConj, startFullTimer
 */
'use strict';

/* ════════════════════════════════════════════
   UI — Cheat sheet
   ════════════════════════════════════════════ */
function buildRef(verbOverride) {
  var grid = DOM.refGrid;
  var sel = verbOverride || getSelectedVerbs();
  grid.innerHTML = '';
  var DATA = VERB_DATA;
  var labelMap = {
    present:'Presente do Indicativo', pret:'Pretérito Perfeito Simples',
    imperf:'Pretérito Imperfeito', fut:'Futuro do Presente',
    cond:'Futuro do Pretérito', subj:'Presente do Subjuntivo'
  };
  var _rs = document.querySelector('#refDetails>summary');
  var isB2mode = ACTIVE_TENSES.length === 6;
  if (_rs) {
    _rs.textContent = isB2mode
      ? '📋 Conjugação Básico 2 — Português do Brasil'
      : '📋 Conjugaisons — ' + labelMap[currentTense];
  }
  var ROWS_FULL = [{s:'eu',k:'eu'},{s:'você',k:'você'},{s:'ele / ela / a gente',k:'ele'},{s:'nós',k:'nós'},{s:'vocês / eles / elas',k:'vocês'}];
  var ROWS_SHORT= [{s:'eu',k:'eu'},{s:'você',k:'você'},{s:'ele…',k:'ele'},{s:'nós',k:'nós'},{s:'vocês…',k:'vocês'}];
  var showAll = false;
  var bar = document.createElement('div');
  bar.className = 'ref-toggle-bar';
  var hintSpan = document.createElement('span');
  hintSpan.className = 'ref-toggle-hint';
  hintSpan.textContent = I18n.tf('toggle_click_hint','👆 {n} temps').replace('{n}',(ACTIVE_TENSES.length===6?'6':'3'));
  var btn = document.createElement('span');
  btn.className = 'ref-toggle-btn';
  btn.textContent = I18n.tf('toggle_n_tenses','▼ {n} temps').replace('{n}',ACTIVE_TENSES.length===6?'6':'3');
  bar.appendChild(hintSpan); bar.appendChild(btn);
  setTimeout(function() { hintSpan.style.opacity='0'; }, 5000);
  grid.appendChild(bar);
  var catWrap = document.createElement('div');
  grid.appendChild(catWrap);

  function renderVerbCards() {
    catWrap.innerHTML = '';
    var b2Open = ACTIVE_TENSES.length === 6;
    var tenses = showAll ? (b2Open ? ACTIVE_TENSES : ACTIVE_TENSES.slice(0,3)) : [currentTense];
    /* Accordéons fermés si > 6 verbes (plusieurs catégories) */
    var autoOpen = sel.length <= 6;
    VERB_CATEGORIES.forEach(function(cat) {
      var cv = cat.verbs.filter(function(v) { return sel.indexOf(v) !== -1; });
      if (!cv.length) return;
      var details = document.createElement('details');
      details.className = 'ref-group';
      if (autoOpen) details.open = true;
      var summary = document.createElement('summary');
      summary.className = 'ref-group-summary';
      summary.innerHTML = I18n.tf('cat_'+cat.id, cat.label) + '<span class="ref-group-count">' + cv.length + '</span>';
      details.appendChild(summary);
      var vg = document.createElement('div');
      vg.className = 'ref-verb-grid' + (tenses.length > 1 ? ' single-col' : '');
      cv.forEach(function(verb) {
        var div = document.createElement('div');
        div.className = 'ref-verb';
        var ROWS = tenses.length > 1 ? ROWS_SHORT : ROWS_FULL;
        if (tenses.length === 1) {
          var D = DATA[tenses[0]] || VERBS;
          var rows = ROWS.map(function(r) {
            return '<tr><td>' + r.s + '</td><td>' + (D[verb] ? D[verb][r.k] : '—') + '</td></tr>';
          }).join('');
          div.innerHTML = '<h4>' + displayVerb(verb) + '</h4><p class="ref-translation">' + (I18n.verbTr(verb)||'') + '</p>' +
            '<table><tbody>' + rows + '</tbody></table>';
        } else if (tenses.length === 6) {
          var transHdr = '<h4>' + displayVerb(verb) + '</h4><p class="ref-translation">' + (I18n.verbTr(verb)||'') + '</p>';
          var tables = [ACTIVE_TENSES.slice(0,3), ACTIVE_TENSES.slice(3,6)].map(function(grp) {
            var hdrs2 = grp.map(function(t) { return '<th>' + TENSE_LABELS_SHORT[t] + '</th>'; }).join('');
            var rows2 = ROWS.map(function(r) {
              var vals = grp.map(function(t) { return '<td>' + (DATA[t]&&DATA[t][verb] ? DATA[t][verb][r.k] : '—') + '</td>'; }).join('');
              return '<tr><td>' + r.s + '</td>' + vals + '</tr>';
            }).join('');
            return '<table class="ref-verb-table"><thead><tr><th></th>' + hdrs2 + '</tr></thead><tbody>' + rows2 + '</tbody></table>';
          }).join('<div style="height:6px"></div>');
          div.innerHTML = transHdr + tables;
        } else {
          var transHdr2 = '<h4>' + displayVerb(verb) + '</h4><p class="ref-translation">' + (I18n.verbTr(verb)||'') + '</p>';
          var hdrs = tenses.map(function(t) { return '<th>' + TENSE_LABELS_SHORT[t] + '</th>'; }).join('');
          var rows2b = ROWS.map(function(r) {
            var vals = tenses.map(function(t) { return '<td>' + (DATA[t]&&DATA[t][verb] ? DATA[t][verb][r.k] : '—') + '</td>'; }).join('');
            return '<tr><td>' + r.s + '</td>' + vals + '</tr>';
          }).join('');
          div.innerHTML = transHdr2 + '<table class="ref-verb-table"><thead><tr><th></th>' + hdrs + '</tr></thead><tbody>' + rows2b + '</tbody></table>';
        }
        vg.appendChild(div);
      });
      details.appendChild(vg);
      catWrap.appendChild(details);
    });
  }

  bar.addEventListener('click', function() {
    showAll = !showAll;
    var nb = ACTIVE_TENSES.length === 6 ? '6' : '3';
    btn.textContent = showAll ? I18n.tf('toggle_1_tense','▲ 1 temps') : (I18n.tf('toggle_n_tenses','▼ {n} temps').replace('{n}',nb));
    btn.classList.toggle('active', showAll);
    hintSpan.textContent = showAll ? I18n.tf('toggle_all_shown','Tous les temps affichés') : (I18n.tf('toggle_click_hint','👆 {n} temps').replace('{n}',nb));
    renderVerbCards();
  });
  renderVerbCards();
}

/* ════════════════════════════════════════════
   UI — Conjugaison complète (bouton 👁)
   ════════════════════════════════════════════ */
function buildFullConj(verb, panelId) {
  var panel = document.getElementById(panelId);
  panel.innerHTML = '';
  /* État 3 positions : 'one' | 'three' | 'six' */
  var _view = 'one';
  var showAll = false;
  var timerBar = document.createElement('div');
  timerBar.className = 'conj-timer-bar';
  timerBar.id = panelId + '-timer';
  var titleDiv = document.createElement('div');
  titleDiv.className = 'full-conj-title';
  var hintEl = document.createElement('div');
  hintEl.className = 'conj-toggle-hint';
  hintEl.textContent = I18n.tf('toggle_click_hint','👆 {n} temps').replace('{n}',(ACTIVE_TENSES.length===6?'6':'3'));
  setTimeout(function() { hintEl.classList.add('hint-faded'); }, 5000);
  var tableWrap = document.createElement('div');

  function renderTable() {
    tableWrap.innerHTML = ''; /* ← vider avant chaque rendu */
    var DATA = VERB_DATA;
    var isB2mode = ACTIVE_TENSES.length === 6;
    var tenses = showAll ? ACTIVE_TENSES : [currentTense];
    var expandLabel = _view === 'one'   ? '1 temps → 3 temps' :
                      _view === 'three' ? '3 temps → 6 temps' : '6 temps → 1 temps';
    titleDiv.innerHTML = displayVerb(verb) +
      ' <span class="title-expand">' + expandLabel + '</span>' +
      '<span style="margin-left:auto;font-size:0.68rem;font-weight:300;opacity:0.75">' + (I18n.verbTr(verb)||'') + '</span>';
    /* Largeur fixe : panel-wide seulement à 6 tenses */
    if (tenses.length === 6) panel.classList.add('panel-wide');
    else panel.classList.remove('panel-wide');
    if (tenses.length === 6) {
      [ACTIVE_TENSES.slice(0,3), ACTIVE_TENSES.slice(3,6)].forEach(function(group, gi) {
        var t2 = document.createElement('table');
        t2.className = 'full-conj-table three-col';
        t2.style.marginBottom = gi === 0 ? '8px' : '0';
        var th2 = document.createElement('thead');
        var hr2 = document.createElement('tr');
        hr2.appendChild(document.createElement('th'));
        group.forEach(function(t) { var th=document.createElement('th'); th.textContent=TENSE_LABELS_SHORT[t]||t; hr2.appendChild(th); });
        th2.appendChild(hr2); t2.appendChild(th2);
        var tb2 = document.createElement('tbody');
        PRON_ROWS.forEach(function(r, ri) {
          var row=document.createElement('tr');
          var td0=document.createElement('td'); td0.textContent=r.short; row.appendChild(td0);
          var key=PRON_KEYS[ri];
          group.forEach(function(t) { var td=document.createElement('td'); td.textContent=DATA[t]&&DATA[t][verb]?DATA[t][verb][key]:'—'; row.appendChild(td); });
          tb2.appendChild(row);
        });
        t2.appendChild(tb2); tableWrap.appendChild(t2);
      });
      return;
    }
    var table=document.createElement('table');
    table.className='full-conj-table'+(tenses.length>1?' three-col':'');
    if (tenses.length>1) panel.classList.add('panel-wide');
    else panel.classList.remove('panel-wide');
    var thead=document.createElement('thead');
    var hrow=document.createElement('tr');
    hrow.appendChild(document.createElement('th'));
    var labels=tenses.length>1?TENSE_LABELS_SHORT:TENSE_LABELS;
    tenses.forEach(function(t) { var th=document.createElement('th'); th.textContent=labels[t]||t; hrow.appendChild(th); });
    thead.appendChild(hrow); table.appendChild(thead);
    var tbody=document.createElement('tbody');
    PRON_ROWS.forEach(function(p,i) {
      var tr=document.createElement('tr'); tr.className='pron-row';
      var td=document.createElement('td');
      td.innerHTML = tenses.length>1
        ? '<span class="pron-short">'+p.short+'</span>'
        : '<span class="pron-short">'+p.short+'</span><span class="pron-full">'+p.full+'</span>';
      tr.appendChild(td);
      var key=PRON_KEYS[i];
      tenses.forEach(function(t) { var cell=document.createElement('td'); cell.textContent=(DATA[t]&&DATA[t][verb])?DATA[t][verb][key]:'—'; tr.appendChild(cell); });
      tbody.appendChild(tr);
      if (tenses.length>1) return;
      tr.addEventListener('click', function(e) {
        e.stopPropagation();
        if (tr.classList.contains('pron-expanded')) {
          tr.classList.remove('pron-expanded');
          timerBar.style.width='0%';
        } else {
          tbody.querySelectorAll('.pron-expanded').forEach(function(r) { r.classList.remove('pron-expanded'); });
          tr.classList.add('pron-expanded');
          startFullTimer(timerBar, function() { tr.classList.remove('pron-expanded'); timerBar.style.width='0%'; });
        }
        /* TTS : lit la forme */
        if (TTS.isEnabled() && DATA[currentTense][verb]) {
          TTS.speakForm(DATA[currentTense][verb][key]);
        }
      });
    });
    table.appendChild(tbody);
    tableWrap.innerHTML=''; tableWrap.appendChild(table);
  }

  titleDiv.addEventListener('click', function(e) {
    e.stopPropagation();
    _view = _view === 'one' ? 'three' : _view === 'three' ? 'six' : 'one';
    var _prev = ACTIVE_TENSES.slice();
    ACTIVE_TENSES = _view === 'six'   ? TENSES_ALL.slice() :
                    _view === 'three' ? TENSES_B1.slice()  : [currentTense];
    showAll = (_view !== 'one');
    renderTable();
    ACTIVE_TENSES = _prev;
  });
  renderTable();
  panel.appendChild(timerBar); panel.appendChild(titleDiv); panel.appendChild(hintEl); panel.appendChild(tableWrap);
  document.addEventListener('click', function() {
    panel.querySelector('tbody') && panel.querySelectorAll('.pron-expanded').forEach(function(r) { r.classList.remove('pron-expanded'); });
    timerBar.style.width='0%';
  });
}

function startFullTimer(bar, onDone) {
  var DELAY=5000, start=performance.now(), rafId;
  function tick(now) {
    var p=Math.max(0,100-((now-start)/DELAY*100));
    bar.style.width=p+'%';
    if (p>0) rafId=requestAnimationFrame(tick); else onDone();
  }
  rafId=requestAnimationFrame(tick);
  return rafId;
}

