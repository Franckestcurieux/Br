/**
 * splash.js — Epsilon 12
 * Langue auto-détectée. Greeting brésilien avec heure naturelle à Rio.
 */
'use strict';

var Splash = (function () {

  var _dataReady  = false;
  var _voiceReady = false;
  var _langChosen = true;
  var _entered    = false;

  /* ════════════════════════════════════════════
     HEURE EN PORTUGAIS BRÉSILIEN
     Arrondie aux bracktes naturels :
     em ponto · e dez · e um quarto · e vinte ·
     e meia · faltam vinte · faltam um quarto ·
     faltam dez · quase
     ════════════════════════════════════════════ */
  function _horaEmPortugues(h, m) {
    var h12 = h % 12 || 12;
    var isMeiaNoite = (h === 0);
    var isMeioDia   = (h === 12);

    /* Arrondi au bracket le plus proche */
    var bracket;
    if      (m <  5) bracket = 0;
    else if (m < 12) bracket = 10;
    else if (m < 18) bracket = 15;
    else if (m < 23) bracket = 20;
    else if (m < 37) bracket = 30;
    else if (m < 43) bracket = 40;
    else if (m < 48) bracket = 45;
    else if (m < 53) bracket = 50;
    else             bracket = 60; /* → heure suivante */

    var hNext    = (h + 1) % 24;
    var h12Next  = hNext % 12 || 12;
    var isNoiteN = (hNext === 0);
    var isDiaN   = (hNext === 12);

    var nomes = ['','uma','duas','três','quatro','cinco','seis',
                 'sete','oito','nove','dez','onze','doze'];

    var curr = isMeiaNoite ? 'meia-noite' : isMeioDia ? 'meio-dia' : nomes[h12];
    var next = isNoiteN    ? 'meia-noite' : isDiaN    ? 'meio-dia' : nomes[h12Next];

    /* Ser au singulier pour meia-noite, meio-dia, uma hora */
    var s    = (isMeiaNoite || isMeioDia || h12 === 1)     ? 'É'  : 'São';
    var sNext= (isNoiteN    || isDiaN    || h12Next === 1)  ? 'É'  : 'São';

    var suf  = (!isMeiaNoite && !isMeioDia) ? (h12 === 1    ? ' hora'  : ' horas') : '';
    var sufN = (!isNoiteN    && !isDiaN)    ? (h12Next === 1 ? ' hora'  : ' horas') : '';

    if (bracket === 60) return sNext + ' quase ' + next + sufN;
    if (bracket === 0)  return s + ' ' + curr + suf;
    if (bracket === 10) return s + ' ' + curr + ' e dez';
    if (bracket === 15) return s + ' ' + curr + ' e um quarto';
    if (bracket === 20) return s + ' ' + curr + ' e vinte';
    if (bracket === 30) return s + ' ' + curr + ' e meia';

    var falta = bracket === 40 ? 'vinte' :
                bracket === 45 ? 'um quarto' : 'dez';
    var prep  = isNoiteN       ? 'para a' :
                isDiaN         ? 'para o' :
                h12Next === 1  ? 'para a' : 'para as';

    return 'Faltam ' + falta + ' ' + prep + ' ' + next;
  }

  /* ════════════════════════════════════════════
     GREETING
     "Estamos no dia 12 de maio."
     "São duas e meia. ☀️ Boa tarde !"
     "🇧🇷 Rio de Janeiro"
     ════════════════════════════════════════════ */
  function _buildGreeting() {
    var el = document.getElementById('splashGreeting');
    if (!el) return;

    /* Heure LOCALE (navigateur) pour le greeting et la date */
    var localNow = new Date();
    var hL = localNow.getHours();
    var mL = localNow.getMinutes();
    var meses = ['janeiro','fevereiro','março','abril','maio','junho',
                 'julho','agosto','setembro','outubro','novembro','dezembro'];
    var dia     = localNow.getDate();
    var mes     = meses[localNow.getMonth()];
    var localExt = _horaEmPortugues(hL, mL);
    var localNum = String(hL).padStart(2,'0') + 'h' + String(mL).padStart(2,'0');
    var greeting = hL >= 6 && hL < 12  ? 'Bom dia'   :
                   hL >= 12 && hL < 18 ? 'Boa tarde' : 'Boa noite';

    /* Heure de RIO (UTC-3) pour la ligne Rio */
    var rioDate = new Date(Date.now() - 3 * 3600 * 1000);
    var hR = rioDate.getUTCHours();
    var mR = rioDate.getUTCMinutes();
    var rioExt = _horaEmPortugues(hR, mR);
    var rioNum = String(hR).padStart(2,'0') + 'h' + String(mR).padStart(2,'0');

    el.innerHTML =
      '<span class="spl-greeting-line">Estamos no dia ' + dia + ' de ' + mes + '.</span>' +
      '<span class="spl-greeting-line">' + localExt + ' — ' + localNum + '. ' + greeting + '.</span>' +
      '<span class="spl-greeting-line spl-greeting-rio">Neste momento no Rio, ' + rioExt + ' (' + rioNum + ').</span>';
  }

  /* ════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════ */
  function init() {
    _buildGreeting();

    App.whenReady('data', function () {
      _setDot('spi-data', 'ok');
      _setDot('spi-i18n', 'ok');
      _dataReady = true;
      _checkAllReady();
    });

    App.whenReady('voices', function () {
      _setDot('spi-voice', 'ok');
      _voiceReady = true;
      _checkAllReady();
    });

    setTimeout(function () {
      if (!_voiceReady) {
        _setDot('spi-voice', 'warn');
        _voiceReady = true;
        _checkAllReady();
      }
    }, 3000);
  }

  function _setDot(id, state) {
    var el = document.getElementById(id); if (!el) return;
    var dot = el.querySelector('.spi-dot'); if (!dot) return;
    dot.classList.remove('spi-ok','spi-warn');
    if (state === 'ok')   dot.classList.add('spi-ok');
    if (state === 'warn') dot.classList.add('spi-warn');
  }

  function _checkAllReady() {
    if (_dataReady && _voiceReady && _langChosen) _showEnterBtn();
  }

  function _showEnterBtn() {
    var checks = document.getElementById('splashChecks');
    if (checks) checks.classList.add('spl-checks-done');
    var btn = document.getElementById('splashEnterBtn');
    if (btn) btn.style.setProperty('display', 'block', 'important');
  }

  function enter() {
    if (_entered) return;
    _entered = true;
    var splash = document.getElementById('splash');
    var shell  = document.getElementById('appShell');
    if (splash) splash.classList.add('splash-exit');
    setTimeout(function () {
      if (splash) splash.style.display = 'none';
      if (shell)  shell.classList.remove('app-shell-hidden');
    }, 370);
  }

  function chooseLang(code) { I18n.switchLang(code); }

  return { init: init, chooseLang: chooseLang, enter: enter };
}());
