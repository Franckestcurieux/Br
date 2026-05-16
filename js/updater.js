/**
 * updater.js — Verbos 1.0.2
 * Vérification des mises à jour via version.json sur GitHub.
 *
 * CONFIGURATION : remplace VERSION_JSON_URL par l'URL raw GitHub du fichier version.json.
 * Exemple : https://raw.githubusercontent.com/tonpseudo/verbos/main/version.json
 *
 * © Dr Franck Mignot 2026 — CC BY-NC-SA 4.0
 */
'use strict';

var Updater = (function () {

  /* ── À CONFIGURER ── */
  var VERSION_JSON_URL = 'https://raw.githubusercontent.com/Franckestcurieux/Br/main/version.json';

  /* ── Version locale (doit correspondre à version.json sur GitHub) ── */
  var LOCAL_VERSION = '1.0.2';

  /* ── Intervalle min entre deux vérifications : 24h ── */
  var CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
  var LS_LAST_CHECK  = 'verbos_update_lastCheck';
  var LS_LAST_RESULT = 'verbos_update_lastResult';

  var _status = null;   /* null | 'up-to-date' | 'available' | 'critical' | 'error' */
  var _remote = null;   /* objet version.json si disponible */

  /* ════════════════════════════════════════════
     CHECK
     ════════════════════════════════════════════ */
  function check(force) {
    var now = Date.now();
    var lastCheck = parseInt(localStorage.getItem(LS_LAST_CHECK) || '0', 10);

    if (!force && (now - lastCheck) < CHECK_INTERVAL_MS) {
      /* Utiliser le résultat en cache */
      var cached = localStorage.getItem(LS_LAST_RESULT);
      if (cached) {
        try {
          var obj = JSON.parse(cached);
          _status = obj.status;
          _remote = obj.remote;
          _notifyAll();
          return Promise.resolve(_status);
        } catch (e) { /* cache corrompu, on refetch */ }
      }
    }

    return fetch(VERSION_JSON_URL, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        _remote = data;
        localStorage.setItem(LS_LAST_CHECK, String(Date.now()));

        if (data.version === LOCAL_VERSION) {
          _status = 'up-to-date';
        } else if (data.critical) {
          _status = 'critical';
        } else {
          _status = 'available';
        }

        localStorage.setItem(LS_LAST_RESULT, JSON.stringify({ status: _status, remote: _remote }));
        _notifyAll();
        return _status;
      })
      .catch(function (err) {
        console.warn('[Updater] Vérification impossible :', err.message);
        _status = 'error';
        _notifyAll();
        return 'error';
      });
  }

  /* ════════════════════════════════════════════
     CALLBACKS
     ════════════════════════════════════════════ */
  var _listeners = [];

  function onResult(cb) { _listeners.push(cb); }

  function _notifyAll() {
    _listeners.forEach(function (cb) {
      try { cb(_status, _remote); } catch (e) {}
    });
  }

  /* ════════════════════════════════════════════
     HELPERS
     ════════════════════════════════════════════ */
  function getLocalVersion()  { return LOCAL_VERSION; }
  function getStatus()        { return _status; }
  function getRemote()        { return _remote; }

  /* ════════════════════════════════════════════
     BANDEAU SPLASH — appelé par splash.js
     ════════════════════════════════════════════ */
  function renderSplashBanner() {
    var el = document.getElementById('updateBanner');
    if (!el) return;
    if (!_status || _status === 'error' || _status === 'up-to-date') {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    el.className = 'update-banner update-banner--' + _status;
    var icon    = _status === 'critical' ? '🔴' : '🟠';
    var remote  = _remote || {};
    var url     = remote.download_url || '#';
    var version = remote.version || '?';
    el.innerHTML =
      '<span class="ub-icon">' + icon + '</span>' +
      '<span class="ub-text">' +
        (_status === 'critical'
          ? 'Mise à jour <strong>critique</strong> disponible'
          : 'Nouvelle version disponible') +
        ' — v' + version +
      '</span>' +
      '<a class="ub-link" href="' + url + '" target="_blank">Télécharger</a>';
  }

  /* ════════════════════════════════════════════
     PANNEAU CONFIG — appelé par init.js ou ui
     ════════════════════════════════════════════ */
  function renderConfigPanel() {
    var el = document.getElementById('updateConfigPanel');
    if (!el) return;

    var statusLabel, statusClass;
    if (_status === 'up-to-date') {
      statusLabel = '✅ Vous êtes à jour';
      statusClass = 'upd-ok';
    } else if (_status === 'available') {
      statusLabel = '🟠 Mise à jour disponible — v' + ((_remote && _remote.version) || '?');
      statusClass = 'upd-available';
    } else if (_status === 'critical') {
      statusLabel = '🔴 Mise à jour critique — v' + ((_remote && _remote.version) || '?');
      statusClass = 'upd-critical';
    } else if (_status === 'error') {
      statusLabel = '⚠️ Vérification impossible (hors ligne ?)';
      statusClass = 'upd-error';
    } else {
      statusLabel = '— Non vérifié';
      statusClass = 'upd-idle';
    }

    /* Changelog */
    var changelogHtml = '';
    if (_remote && _remote.changelog && _remote.changelog.length) {
      _remote.changelog.forEach(function (entry) {
        var badge = entry.critical
          ? '<span class="upd-badge upd-badge--crit">Critique</span>'
          : '<span class="upd-badge upd-badge--minor">Mineure</span>';
        var notes = (entry.notes || []).map(function (n) {
          return '<li>' + n + '</li>';
        }).join('');
        changelogHtml +=
          '<div class="upd-cl-entry">' +
            '<div class="upd-cl-header">v' + entry.version +
              (entry.codename ? ' <em>(' + entry.codename + ')</em>' : '') +
              ' — ' + (entry.date || '') + ' ' + badge +
            '</div>' +
            '<ul class="upd-cl-notes">' + notes + '</ul>' +
          '</div>';
      });
    }

    var downloadBtn = (_status === 'available' || _status === 'critical') && _remote && _remote.download_url
      ? '<a class="upd-dl-btn" href="' + _remote.download_url + '" target="_blank">Télécharger la nouvelle version</a>'
      : '';

    el.innerHTML =
      '<div class="upd-status ' + statusClass + '">' + statusLabel + '</div>' +
      '<div class="upd-version-local">Version installée : v' + LOCAL_VERSION + '</div>' +
      downloadBtn +
      (changelogHtml
        ? '<details class="upd-changelog"><summary>Historique des versions</summary>' + changelogHtml + '</details>'
        : '');
  }

  /* Init automatique au chargement */
  function init() {
    check(false).then(function () {
      renderSplashBanner();
      renderConfigPanel();
    });
    onResult(function () {
      renderSplashBanner();
      renderConfigPanel();
    });
  }

  return {
    init          : init,
    check         : check,
    onResult      : onResult,
    getStatus     : getStatus,
    getLocalVersion: getLocalVersion,
    getRemote     : getRemote,
    renderConfigPanel: renderConfigPanel
  };
}());
