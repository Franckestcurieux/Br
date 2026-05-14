/**
 * router.js — Navigation SPA (Single Page Application).
 *
 * Gère la transition entre les 5 pages de l'app :
 *   exercer | ecoute | progres | tabela | reference
 *
 * Chaque changement de page :
 *   1. Fade-out de la page courante (180ms)
 *   2. Masque l'ancienne, affiche la nouvelle
 *   3. Met à jour le bottomNav (onglet actif)
 *   4. Affiche/masque la barre de titre verte (#pageTitle)
 *   5. Appelle _onPageEnter(page) pour les initialisations spécifiques
 *
 * Expose : Router.go(page), Router.getCurrent()
 *
 * ⚠️  Pour ajouter une page :
 *      1. Ajouter l'ID dans _titles{}
 *      2. Ajouter le div#page-{id} dans index.html
 *      3. Ajouter le bouton nav dans #bottomNav
 *      4. Gérer l'init dans _onPageEnter() si nécessaire
 */
'use strict';

/**
 * router.js — SPA navigation.
 *
 * 3 pages : exercer | progres | reference
 * Transitions : fondu (fade) 180ms
 * Expose : Router.go(page), Router.getCurrent()
 */
'use strict';

var Router = (function () {

  var _current = 'exercer';
  var _previous = null; /* page précédente — utilisé pour Tableau sync */

  var _titles = {
    exercer:   null,                /* badge Básico géré par updateTitle() */
    progres:   '📊\u2002Progrès',
    tabela:    '📋\u2002Conjugaisons',
    reference: '📖\u2002Référence',
    config:    '⚙️\u2002Config',
    ecoute:    '🎧\u2002Écoute'
  };

  /* ── Navigation vers une page ── */
  function go(page) {
    if (page === _current) return;
    if (!document.getElementById('page-' + page)) return;

    var oldEl = document.getElementById('page-' + _current);
    var newEl = document.getElementById('page-' + page);

    /* Fade out */
    oldEl.classList.add('page-fade-out');

    setTimeout(function () {
      oldEl.classList.remove('active', 'page-fade-out');
      newEl.classList.add('active');

      _previous = _current;
      _current  = page;
      _updateNav(page);
      _updateHeader(page);
      _onPageEnter(page);

      /* Remonter en haut de page */
      var container = document.getElementById('pagesContainer');
      if (container) container.scrollTop = 0;
    }, 180);
  }

  /* ── Mettre à jour le bottom nav ── */
  function _updateNav(page) {
    document.querySelectorAll('#bottomNav .nav-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.page === page);
    });
  }

  /* ── Mettre à jour le header ── */
  function _updateHeader(page) {
    var bar  = document.getElementById('pageTitle');
    var text = document.getElementById('pageTitleText');
    if (!bar || !text) return;
    var title = _titles[page];
    if (title) {
      text.textContent = title;
      bar.style.display = '';
    } else {
      bar.style.display = 'none'; /* pas de titre sur Exercer */
    }
  }

  /* ── Actions au chargement d'une page ── */
  function _onPageEnter(page) {
    if (page === 'config') {
      try { updateLangBtns(); updateVoiceStatus(); updateVoiceInstallBtn(); } catch(e) {}
    }
    if (page === 'ecoute') {
      try { Ecoute.onPageEnter(); } catch(e) {}
    }
    if (page === 'progres') {
      try { var panel = document.getElementById('statsPanel'); if (panel) panel.style.display=''; buildStatsPanel(); } catch(e) {}
    }
    if (page === 'reference') {
      if (typeof updateRefPage === 'function') updateRefPage();
    }
    if (page === 'tabela') {
      /* Déterminer les verbes à afficher — hors try/catch pour voir les erreurs */
      /* Verbes Écoute → Tableau : utiliser _ecouteVerbs (verbes de la question courante) */
      var _verbsForTableau = null;
      if (_previous === 'ecoute' && window._ecouteVerbs && window._ecouteVerbs.length) {
        _verbsForTableau = window._ecouteVerbs.slice();
        selectedVerbs    = _verbsForTableau;
      }

      /* Construire le tableau — appel direct sans try/catch */
      var _rd = document.getElementById('refDetails');
      if (_rd) _rd.open = true;
      buildRef(_verbsForTableau);

      /* Post-rendu : ouvrir les groupes seulement si peu de verbes */
      var _rg = document.getElementById('refGrid');
      setTimeout(function() {
        if (_rd) _rd.open = true;
        var _autoOpen = !_verbsForTableau || _verbsForTableau.length <= 6;
        if (_autoOpen && _rg) {
          _rg.querySelectorAll('.ref-group').forEach(function(d) { d.open = true; });
        }
        if (typeof patchTableauToggle === 'function') patchTableauToggle();
      }, 80);

      if (_rg && !_rg._tabelaObs) {
        _rg._tabelaObs = new MutationObserver(function() {
          _rg.querySelectorAll('.ref-group:not([open])').forEach(function(d) { d.open = true; });
          if (typeof patchTableauToggle === 'function') patchTableauToggle();
        });
        _rg._tabelaObs.observe(_rg, { childList: true, subtree: true });
      }
    }
  }

  function getCurrent() { return _current; }

  return { go: go, getCurrent: getCurrent };

}());
