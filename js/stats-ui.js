/**
 * stats-ui.js — Panneau de statistiques de l'élève.
 *
 * Onglets :
 *   Verbes   — score par catégorie (accordéon, régulières fermées par défaut)
 *   Temps    — score par temps verbal
 *   Pronoms  — score par pronom
 *   Erreurs  — liste des dernières erreurs avec corrections
 *
 * Dépend de   : data.js (VERB_CATEGORIES, VERB_DATA), i18n.js,
 *               core.js (TENSE_LABELS, TENSE_LABELS_SHORT, PRON_DISPLAY,
 *               displayVerb), stats.js
 * Expose      : toggleStatsPanel, buildStatsPanel, toggleStatsGroup
 */
'use strict';

/* Verbes modaux (sous-groupe de 'irreg') */
var MODAL_VERBS = ['ser', 'estar', 'ter', 'ir'];

/* État du panneau */
var _statsOpen = false;
var _statsTab  = 'verbs';

/* État des accordéons : null = défaut selon le type */
var _groupOpen = {};

/* ════════════════════════════════════════════
   TOGGLE & NAVIGATION
   ════════════════════════════════════════════ */

function toggleStatsPanel() {
  _statsOpen = !_statsOpen;
  var panel = document.getElementById('statsPanel');
  var btn   = document.getElementById('statsPanelBtn');
  if (!panel) return;
  panel.style.display = _statsOpen ? '' : 'none';
  if (btn) btn.classList.toggle('stats-btn-open', _statsOpen);
  if (_statsOpen) buildStatsPanel();
}

function switchStatsTab(tab) {
  _statsTab = tab;
  buildStatsPanel();
}

/** Bascule l'accordéon d'un groupe et reconstruit le panneau. */
function toggleStatsGroup(id) {
  _groupOpen[id] = !_groupOpen[id];
  buildStatsPanel();
}

/* ════════════════════════════════════════════
   UTILITAIRES VISUELS
   ════════════════════════════════════════════ */

function scoreClass(score) {
  if (score === null) return 'sdt-untried';
  if (score <= -9)   return 'sdt-hard';
  if (score <= -3)   return 'sdt-work';
  if (score <= 0)    return 'sdt-start';
  if (score <= 4)    return 'sdt-good';
  return 'sdt-master';
}

function scoreLabel(score) {
  if (score === null) return I18n.tf('stats_never_tried', 'Non tenté');
  if (score <= -9)    return I18n.tf('stats_hard',        'Difficile');
  if (score <= -3)    return I18n.tf('stats_work',        'À travailler');
  if (score <= 0)     return I18n.tf('stats_start',       'Début');
  if (score <= 4)     return I18n.tf('stats_good',        'En progrès');
  return                     I18n.tf('stats_master',      'Maîtrisé');
}

function scoreDot(score) {
  return '<span class="stats-dot ' + scoreClass(score) + '" title="' + scoreLabel(score) + '"></span>';
}

/** Formate un score pour l'affichage : null→'—', 3→'+3', -5→'-5'. */
function scoreNum(score) {
  if (score === null) return '—';
  return (score > 0 ? '+' : '') + score;
}

function fmtDate(isoStr) {
  var d = new Date(isoStr);
  return (d.getDate()+'').padStart(2,'0') + '/' + ((d.getMonth()+1)+'').padStart(2,'0');
}

/* ════════════════════════════════════════════
   CONSTRUCTION DU PANNEAU
   ════════════════════════════════════════════ */

function buildStatsPanel() {
  var panel = document.getElementById('statsPanel');
  if (!panel) return;

  /* Onglets */
  var tabs = [
    { key:'verbs',    label: I18n.tf('stats_tab_verbs',    'Verbes')  },
    { key:'tenses',   label: I18n.tf('stats_tab_tenses',   'Temps')   },
    { key:'pronouns', label: I18n.tf('stats_tab_pronouns', 'Pronoms') },
    { key:'errors',   label: I18n.tf('stats_tab_errors',   'Erreurs') },
    { key:'help',     label: I18n.tf('stats_tab_help',     '?')       }
  ];
  var tabsHtml = '<div class="stats-tabs">' +
    tabs.map(function(t) {
      return '<button class="stats-tab' + (t.key === _statsTab ? ' active' : '') + '"'
           + ' onclick="switchStatsTab(\'' + t.key + '\')">' + t.label + '</button>';
    }).join('') + '</div>';

  var contentHtml = '';

  /* ── Onglet Verbes ── */
  if (_statsTab === 'verbs') {
    var verbStats = Stats.getVerbStats();

    var irregCat    = VERB_CATEGORIES.find(function(c) { return c.id === 'irreg'; });
    var irregVerbs  = irregCat ? irregCat.verbs : [];
    var modalVerbs  = irregVerbs.filter(function(v) { return MODAL_VERBS.indexOf(v) !== -1; });
    var otherIrrVerbs = irregVerbs.filter(function(v) { return MODAL_VERBS.indexOf(v) === -1; });

    var groups = [
      { id:'modal',    label: I18n.tf('stats_cat_modal','Verbes modaux'),          verbs: modalVerbs,   detail: true,  defaultOpen: true  },
      { id:'other_irr',label: I18n.tf('stats_cat_other_irreg','Irrég. importants'),verbs: otherIrrVerbs,detail: true,  defaultOpen: false },
      { id:'ar',       label: I18n.tf('cat_ar','-AR'),                             verbs: (VERB_CATEGORIES.find(function(c){return c.id==='ar';})||{verbs:[]}).verbs,      detail: false, defaultOpen: false },
      { id:'er_reg',   label: I18n.tf('cat_er_reg','-ER rég.'),                   verbs: (VERB_CATEGORIES.find(function(c){return c.id==='er_reg';})||{verbs:[]}).verbs,  detail: false, defaultOpen: false },
      { id:'er_irr',   label: I18n.tf('cat_er_irr','-ER irrég.'),                 verbs: (VERB_CATEGORIES.find(function(c){return c.id==='er_irr';})||{verbs:[]}).verbs,  detail: true,  defaultOpen: false },
      { id:'ir_reg',   label: I18n.tf('cat_ir_reg','-IR rég.'),                   verbs: (VERB_CATEGORIES.find(function(c){return c.id==='ir_reg';})||{verbs:[]}).verbs,  detail: false, defaultOpen: false },
      { id:'ir_irr',   label: I18n.tf('cat_ir_irr','-IR irrég.'),                 verbs: (VERB_CATEGORIES.find(function(c){return c.id==='ir_irr';})||{verbs:[]}).verbs,  detail: true,  defaultOpen: false }
    ];

    contentHtml = '<div class="stats-verb-groups">' +
      groups.map(function(grp) {
        if (!grp.verbs.length) return '';

        /* Score agrégé */
        var tried = grp.verbs.filter(function(v) { return verbStats[v]; });
        var avgScore = tried.length > 0
          ? Math.round(tried.reduce(function(s, v) { return s + verbStats[v].avgScore; }, 0) / tried.length)
          : null;

        /* État accordéon */
        var isOpen = (_groupOpen[grp.id] !== undefined) ? _groupOpen[grp.id] : grp.defaultOpen;
        var arrow  = isOpen ? '▾' : '▸';

        var html = '<div class="stats-group">';

        /* En-tête cliquable */
        html += '<button class="stats-group-header" onclick="toggleStatsGroup(\'' + grp.id + '\')">'
              + '<span class="stats-group-arrow">' + arrow + '</span>'
              + scoreDot(avgScore)
              + '<span class="stats-group-label">' + grp.label + '</span>'
              + '<span class="stats-group-meta">'
              + '<span class="stats-group-count">' + grp.verbs.length + ' v.</span>'
              + '<span class="stats-group-score ' + scoreClass(avgScore) + '">' + scoreNum(avgScore) + '</span>'
              + '</span>'
              + '</button>';

        /* Détail — visible si accordéon ouvert */
        if (isOpen && grp.detail) {
          html += '<div class="stats-verb-rows">' +
            grp.verbs.map(function(v) {
              var st  = verbStats[v];
              var sc  = st ? st.avgScore : null;
              var total = st ? (st.ok + st.ko) : 0;
              var tr = I18n.verbTr(v) || '';
              return '<div class="stats-verb-row' + (sc === null ? ' untried' : '') + '">'
                + scoreDot(sc)
                + '<span class="stats-verb-name">'
                + '<em>' + displayVerb(v) + '</em>'
                + (tr ? ' <span class="stats-verb-tr">' + tr + '</span>' : '')
                + (total > 0 ? '<span class="stats-verb-sub">' + st.ok + '/' + total + ' ' + I18n.tf('stats_correct_short','correctes') + '</span>' : '')
                + '</span>'
                + '<span class="stats-verb-score ' + scoreClass(sc) + '">' + scoreNum(sc) + '</span>'
                + '</div>';
            }).join('') +
          '</div>';
        } else if (isOpen && !grp.detail) {
          /* Régulières ouvertes : pas de détail par verbe, juste un résumé */
          /* Taux de réussite global (ok total / réponses totales) */
          var totalOk  = tried.reduce(function(s,v){ return s + verbStats[v].ok; }, 0);
          var totalAll = tried.reduce(function(s,v){ return s + verbStats[v].ok + verbStats[v].ko; }, 0);
          var pct = totalAll > 0 ? Math.round(totalOk / totalAll * 100) : null;
          html += '<div class="stats-reg-summary">'
            + (pct !== null
              ? tried.length + '/' + grp.verbs.length + ' tentés &nbsp;·&nbsp; ' + pct + '% réussite'
              : I18n.tf('stats_never_tried','Non tenté'))
            + '</div>';
        }

        html += '</div>';
        return html;
      }).join('') +
    '</div>';
  }

  /* ── Onglet Temps ── */
  else if (_statsTab === 'tenses') {
    var tenseStats = Stats.getTenseStats();
    var tenseOrder = ['present','pret','imperf','fut','cond','subj'];
    contentHtml = '<div class="stats-big-rows">' +
      tenseOrder.map(function(t) {
        var st    = tenseStats[t];
        var sc    = st ? st.avgScore : null;
        var total = st ? (st.ok + st.ko) : 0;
        var pct   = total > 0 ? Math.round(st.ok / total * 100) : null;
        return '<div class="stats-big-row' + (sc === null ? ' untried' : '') + '">'
          + scoreDot(sc)
          + '<span class="stats-row-label">' + I18n.tf('tense_btn_' + t, TENSE_LABELS[t] || t) + '</span>'
          + '<span class="stats-row-right">'
          + (pct !== null ? pct + '% &nbsp;·&nbsp; ' + total + ' rép.' : I18n.tf('stats_never_tried','Non tenté'))
          + '</span>'
          + '<span class="stats-row-score ' + scoreClass(sc) + '">' + scoreNum(sc) + '</span>'
          + '</div>';
      }).join('') +
    '</div>';
  }

  /* ── Onglet Pronoms ── */
  else if (_statsTab === 'pronouns') {
    var pronStats = Stats.getPronounStats();
    var pronOrder = ['eu','você','ele','nós','vocês'];
    contentHtml = '<div class="stats-big-rows">' +
      pronOrder.map(function(p) {
        var st    = pronStats[p];
        var sc    = st ? st.avgScore : null;
        var total = st ? (st.ok + st.ko) : 0;
        var pct   = total > 0 ? Math.round(st.ok / total * 100) : null;
        return '<div class="stats-big-row' + (sc === null ? ' untried' : '') + '">'
          + scoreDot(sc)
          + '<span class="stats-row-label">' + (PRON_DISPLAY[p] || p) + '</span>'
          + '<span class="stats-row-right">'
          + (pct !== null ? pct + '% &nbsp;·&nbsp; ' + total + ' rép.' : I18n.tf('stats_never_tried','Non tenté'))
          + '</span>'
          + '<span class="stats-row-score ' + scoreClass(sc) + '">' + scoreNum(sc) + '</span>'
          + '</div>';
      }).join('') +
    '</div>';
  }

  /* ── Onglet Erreurs ── */
  else if (_statsTab === 'errors') {
    var errors = Stats.getErrors();
    if (!errors.length) {
      contentHtml = '<div class="stats-no-errors">'
        + I18n.tf('stats_no_errors', 'Aucune erreur enregistrée — bravo ! 🎉')
        + '</div>';
    } else {
      contentHtml = '<div class="stats-error-list">'
        + errors.map(function(err) {
            return '<div class="stats-error-row">'
              + '<span class="err-meta">'
              + '<span class="err-date">' + fmtDate(err.date) + '</span>'
              + '<span class="err-tense">' + (TENSE_LABELS_SHORT[err.tense] || err.tense) + '</span>'
              + '</span>'
              + '<span class="err-context">'
              + '<span class="err-verb"><em>' + displayVerb(err.verb) + '</em></span>'
              + ' <span class="err-pron">' + (PRON_DISPLAY[err.pronoun] || err.pronoun) + '</span>'
              + '</span>'
              + '<span class="err-answers">'
              + '<span class="err-given">' + err.given + '</span>'
              + '<span class="err-correct">' + err.correct + '</span>'
              + '</span>'
              + '</div>';
          }).join('')
        + '</div>';
    }
  }

  /* ── Onglet Help ── */
  else if (_statsTab === 'help') {
    var scaleItems = [
      { cls:'sdt-untried', txt: I18n.tf('stats_help_untried','Non tenté — jamais essayé') },
      { cls:'sdt-hard',    txt: I18n.tf('stats_help_hard','Difficile — score ≤ -9') },
      { cls:'sdt-work',    txt: I18n.tf('stats_help_work','À travailler — score de -8 à -3') },
      { cls:'sdt-start',   txt: I18n.tf('stats_help_start','Début — score de -2 à 0') },
      { cls:'sdt-good',    txt: I18n.tf('stats_help_good','En progrès — score de 1 à 4') },
      { cls:'sdt-master',  txt: I18n.tf('stats_help_master','Maîtrisé — score ≥ 5') }
    ];
    contentHtml = '<div class="stats-help">'
      + '<p class="stats-help-title">' + I18n.tf('stats_help_title','Comment sont calculés les scores ?') + '</p>'
      + '<p class="stats-help-intro">' + I18n.tf('stats_help_intro','Chaque exercice vérifié modifie ton score (première tentative uniquement) :') + '</p>'
      + '<ul class="stats-help-points">'
      + '<li class="correct">' + I18n.tf('stats_help_correct','✓ Bonne réponse : +1 point') + '</li>'
      + '<li class="error">'   + I18n.tf('stats_help_error','✗ Erreur : -3 points') + '</li>'
      + '</ul>'
      + '<p class="stats-help-clamp">' + I18n.tf('stats_help_clamp','Le score est limité entre -15 et +10.') + '</p>'
      + '<p class="stats-help-scale-title">' + I18n.tf('stats_help_scale','Échelle de couleurs') + '</p>'
      + '<ul class="stats-help-scale">'
      + scaleItems.map(function(item) {
          return '<li><span class="stats-dot ' + item.cls + '"></span>' + item.txt + '</li>';
        }).join('')
      + '</ul>'
      + '</div>';
  }

  var legendHtml = ''; /* Légende supprimée — remplacée par l'onglet ? */

  var resetHtml = '<div class="stats-footer">'
    + '<button class="stats-reset-btn" onclick="if(confirm(\''
    + I18n.tf('stats_reset_confirm','Effacer toutes les statistiques ?')
    + '\')){ Stats.reset(); _groupOpen={}; buildStatsPanel(); }">'
    + I18n.tf('stats_reset','Réinitialiser') + '</button>'
    + '</div>';

  panel.innerHTML = tabsHtml
    + '<div class="stats-content">' + contentHtml + '</div>'
    + legendHtml
    + resetHtml;
}
