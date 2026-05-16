/**
 * voice.js — Détection et aide à l'installation de la voix portugaise (pt-BR),
 *            diagnostic TTS et panneau de configuration.
 *
 * Dépend de   : i18n.js, tts.js, core.js (voiceTestedOk)
 * Expose      : toggleConfigZone, buildVoiceDebug,
 *               detectPlatform, hasPtVoice, getVoiceInstructions,
 *               testVoice, updateVoiceInstallBtn, updateVoiceStatus,
 *               toggleVoiceHelp, VOICE_STATUS_LABELS
 */
'use strict';

/* ════════════════════════════════════════════
   CONFIGURATION & DIAGNOSTIC VOIX
   ════════════════════════════════════════════ */
/** Bloc de diagnostic TTS — affiché dans le panneau de configuration. */
function buildVoiceDebug() {
  var el = document.getElementById('voiceDebugBlock');
  if (!el) return;
  var voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  var ptVoices = voices.filter(function(v){ return v.lang.toLowerCase().indexOf('pt') === 0; });
  var allLangs = voices.slice(0,8).map(function(v){ return v.lang; }).join(', ');
  var lines = [
    'TTS disponible : ' + (window.speechSynthesis ? 'oui' : 'NON'),
    'Voix totales   : ' + voices.length,
    'Voix pt*       : ' + (ptVoices.length ? ptVoices.map(function(v){return v.lang+' ('+v.name+')';}).join(' | ') : 'AUCUNE'),
    'TTS.hasVoice() : ' + TTS.hasVoice(),
    'TTS.isEnabled(): ' + TTS.isEnabled(),
    'voiceTestedOk  : ' + voiceTestedOk,
    'Premières langues: ' + (allLangs || '(vide)'),
    'UA: ' + navigator.userAgent.slice(0,80)
  ];
  el.style.display = 'block';
  el.textContent = lines.join('\n');
}

function toggleConfigZone() {
  var panel  = document.getElementById('configZonePanel');
  var toggle = document.getElementById('configZoneToggle');
  if (!panel) return;
  var open = panel.classList.toggle('open');
  toggle.classList.toggle('open', open);
  if (open) {
    updateVoiceInstallBtn();
    setTimeout(updateVoiceInstallBtn, 800);
    try { buildVoiceDebug(); } catch (_e) { /* ignore */ }
    setTimeout(function(){ try { buildVoiceDebug(); updateVoiceInstallBtn(); } catch (_e) { /* ignore */ } }, 600);
    setTimeout(function(){ try { buildVoiceDebug(); updateVoiceInstallBtn(); } catch (_e) { /* ignore */ } }, 2000);
  }
}



/* ════════════════════════════════════════════
   AIDE VOIX PORTUGAISE
   ════════════════════════════════════════════ */

/** Détecte la plateforme de l'utilisateur */
function detectPlatform() {
  var ua = navigator.userAgent;
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document)) return 'ipad';
  if (/iPhone|iPod/.test(ua)) return 'iphone';
  if (/Macintosh/.test(ua)) return 'macos';
  if (/Android/.test(ua)) return 'android';
  if (/Windows/.test(ua)) return 'windows';
  return 'desktop';
}

/** Vérifie si une voix portugaise est installée */
function hasPtVoice() {
  /* Utilise TTS.hasVoice() qui est mis à jour après voiceschanged */
  return TTS.hasVoice();
}

/** Retourne les instructions dans la langue courante de l'app */
function getVoiceInstructions(platform, lang) {
  var INST = {
    iphone: {
      fr: "1️⃣ Ouvre <strong>Réglages</strong><br>2️⃣ <strong>Accessibilité</strong> → <strong>Contenu énoncé</strong> → <strong>Voix</strong><br>3️⃣ Choisis <strong>Portugais (Brésil)</strong><br>4️⃣ Appuie sur une voix → ⬇️ pour la télécharger<br><em>La langue de ton téléphone ne change pas !</em>",
      en: "1️⃣ Open <strong>Settings</strong><br>2️⃣ <strong>Accessibility</strong> → <strong>Spoken Content</strong> → <strong>Voices</strong><br>3️⃣ Choose <strong>Portuguese (Brazil)</strong><br>4️⃣ Tap a voice → ⬇️ to download<br><em>Your phone language won't change!</em>",
      de: "1️⃣ <strong>Einstellungen</strong> öffnen<br>2️⃣ <strong>Bedienungshilfen</strong> → <strong>Gesprochene Inhalte</strong> → <strong>Stimmen</strong><br>3️⃣ <strong>Portugiesisch (Brasilien)</strong> wählen<br>4️⃣ Stimme antippen → ⬇️ herunterladen<br><em>Die Telefonsprache ändert sich nicht!</em>",
      es: "1️⃣ Abre <strong>Ajustes</strong><br>2️⃣ <strong>Accesibilidad</strong> → <strong>Contenido hablado</strong> → <strong>Voces</strong><br>3️⃣ Elige <strong>Portugués (Brasil)</strong><br>4️⃣ Toca una voz → ⬇️ para descargar<br><em>¡El idioma de tu teléfono no cambia!</em>",
      it: "1️⃣ Apri <strong>Impostazioni</strong><br>2️⃣ <strong>Accessibilità</strong> → <strong>Contenuto parlato</strong> → <strong>Voci</strong><br>3️⃣ Scegli <strong>Portoghese (Brasile)</strong><br>4️⃣ Tocca una voce → ⬇️ per scaricare<br><em>La lingua del telefono non cambia!</em>",
      'pt-BR': "1️⃣ Abra <strong>Ajustes</strong><br>2️⃣ <strong>Acessibilidade</strong> → <strong>Conteúdo falado</strong> → <strong>Vozes</strong><br>3️⃣ Escolha <strong>Português (Brasil)</strong><br>4️⃣ Toque em uma voz → ⬇️ para baixar<br><em>O idioma do celular não muda!</em>"
    },
    ipad: {
      fr: "1️⃣ Ouvre <strong>Réglages</strong><br>2️⃣ <strong>Accessibilité</strong> → <strong>Contenu énoncé</strong> → <strong>Voix</strong><br>3️⃣ Choisis <strong>Portugais (Brésil)</strong> → ⬇️<br><em>La langue de l'iPad ne change pas !</em>",
      en: "1️⃣ Open <strong>Settings</strong><br>2️⃣ <strong>Accessibility</strong> → <strong>Spoken Content</strong> → <strong>Voices</strong><br>3️⃣ Choose <strong>Portuguese (Brazil)</strong> → ⬇️<br><em>Your iPad language won't change!</em>",
      de: "1️⃣ <strong>Einstellungen</strong> → <strong>Bedienungshilfen</strong> → <strong>Gesprochene Inhalte</strong> → <strong>Stimmen</strong><br>2️⃣ <strong>Portugiesisch (Brasilien)</strong> → ⬇️<br><em>Die iPad-Sprache ändert sich nicht!</em>",
      es: "1️⃣ <strong>Ajustes</strong> → <strong>Accesibilidad</strong> → <strong>Contenido hablado</strong> → <strong>Voces</strong><br>2️⃣ <strong>Portugués (Brasil)</strong> → ⬇️<br><em>El idioma del iPad no cambia.</em>",
      it: "1️⃣ <strong>Impostazioni</strong> → <strong>Accessibilità</strong> → <strong>Contenuto parlato</strong> → <strong>Voci</strong><br>2️⃣ <strong>Portoghese (Brasile)</strong> → ⬇️<br><em>La lingua dell'iPad non cambia!</em>",
      'pt-BR': "1️⃣ <strong>Ajustes</strong> → <strong>Acessibilidade</strong> → <strong>Conteúdo falado</strong> → <strong>Vozes</strong><br>2️⃣ <strong>Português (Brasil)</strong> → ⬇️<br><em>O idioma do iPad não muda!</em>"
    },
    android: {
      fr: "1️⃣ Ouvre <strong>Paramètres</strong><br>2️⃣ <strong>Gestion générale</strong> → <strong>Langue</strong> → <strong>Synthèse vocale</strong><br>3️⃣ Moteur <strong>Google TTS</strong> → ⚙️ Paramètres → <strong>Installer les données vocales</strong><br>4️⃣ Cherche <strong>Portugais (Brésil)</strong> → ⬇️<br><em>La langue du téléphone ne change pas !</em>",
      en: "1️⃣ Open <strong>Settings</strong><br>2️⃣ <strong>General Management</strong> → <strong>Language</strong> → <strong>Text-to-Speech</strong><br>3️⃣ <strong>Google TTS</strong> → ⚙️ → <strong>Install voice data</strong><br>4️⃣ Find <strong>Portuguese (Brazil)</strong> → ⬇️<br><em>Your phone language won't change!</em>",
      de: "1️⃣ <strong>Einstellungen</strong> → <strong>Allgemeine Verwaltung</strong> → <strong>Text-zu-Sprache</strong><br>2️⃣ <strong>Google TTS</strong> → ⚙️ → <strong>Sprachdaten installieren</strong><br>3️⃣ <strong>Portugiesisch (Brasilien)</strong> → ⬇️<br><em>Die Telefonsprache ändert sich nicht!</em>",
      es: "1️⃣ <strong>Ajustes</strong> → <strong>Gestión general</strong> → <strong>Texto a voz</strong><br>2️⃣ <strong>Google TTS</strong> → ⚙️ → <strong>Instalar datos de voz</strong><br>3️⃣ <strong>Portugués (Brasil)</strong> → ⬇️<br><em>El idioma del teléfono no cambia.</em>",
      it: "1️⃣ <strong>Impostazioni</strong> → <strong>Gestione generale</strong> → <strong>Da testo a voce</strong><br>2️⃣ <strong>Google TTS</strong> → ⚙️ → <strong>Installa dati vocali</strong><br>3️⃣ <strong>Portoghese (Brasile)</strong> → ⬇️<br><em>La lingua del telefono non cambia!</em>",
      'pt-BR': "1️⃣ <strong>Configurações</strong> → <strong>Gerenciamento geral</strong> → <strong>Texto para fala</strong><br>2️⃣ <strong>Google TTS</strong> → ⚙️ → <strong>Instalar dados de voz</strong><br>3️⃣ <strong>Português (Brasil)</strong> → ⬇️<br><em>O idioma do celular não muda!</em>"
    },
    macos: {
      fr: "1️⃣ <strong>Réglages Système</strong> → <strong>Accessibilité</strong> → <strong>Contenu énoncé</strong><br>2️⃣ <strong>Voix système</strong> → <strong>Personnaliser</strong><br>3️⃣ Cherche <strong>Portugais (Brésil)</strong> → ⬇️<br><em>La langue du Mac ne change pas !</em>",
      en: "1️⃣ <strong>System Settings</strong> → <strong>Accessibility</strong> → <strong>Spoken Content</strong><br>2️⃣ <strong>System Voice</strong> → <strong>Customize</strong><br>3️⃣ Find <strong>Portuguese (Brazil)</strong> → ⬇️<br><em>Your Mac language won't change!</em>",
      de: "1️⃣ <strong>Systemeinstellungen</strong> → <strong>Bedienungshilfen</strong> → <strong>Gesprochene Inhalte</strong><br>2️⃣ <strong>Systemstimme</strong> → <strong>Anpassen</strong><br>3️⃣ <strong>Portugiesisch (Brasilien)</strong> → ⬇️",
      es: "1️⃣ <strong>Configuración del Sistema</strong> → <strong>Accesibilidad</strong> → <strong>Contenido hablado</strong><br>2️⃣ <strong>Voz del sistema</strong> → <strong>Personalizar</strong><br>3️⃣ <strong>Portugués (Brasil)</strong> → ⬇️",
      it: "1️⃣ <strong>Impostazioni di Sistema</strong> → <strong>Accessibilità</strong> → <strong>Contenuto parlato</strong><br>2️⃣ <strong>Voce di sistema</strong> → <strong>Personalizza</strong><br>3️⃣ <strong>Portoghese (Brasile)</strong> → ⬇️",
      'pt-BR': "1️⃣ <strong>Configurações do Sistema</strong> → <strong>Acessibilidade</strong> → <strong>Conteúdo falado</strong><br>2️⃣ <strong>Voz do sistema</strong> → <strong>Personalizar</strong><br>3️⃣ <strong>Português (Brasil)</strong> → ⬇️"
    },
    windows: {
      fr: "La voix pt-BR dépend du navigateur :<br>• <strong>Chrome/Edge</strong> : utilise les voix Windows.<br>  <strong>Paramètres</strong> → <strong>Heure et langue</strong> → <strong>Langue</strong> → Ajoute <strong>Portugais (Brésil)</strong> (voix seulement, sans changer la langue système)<br>• <strong>Firefox</strong> : utilise les voix Windows aussi.",
      en: "pt-BR voice depends on your browser:<br>• <strong>Chrome/Edge</strong>: uses Windows voices.<br>  <strong>Settings</strong> → <strong>Time & Language</strong> → <strong>Language</strong> → Add <strong>Portuguese (Brazil)</strong> voice pack<br>• <strong>Firefox</strong>: also uses Windows voices.",
      de: "pt-BR Stimme hängt vom Browser ab:<br>• <strong>Chrome/Edge</strong>: nutzt Windows-Stimmen.<br>  <strong>Einstellungen</strong> → <strong>Zeit und Sprache</strong> → <strong>Sprache</strong> → <strong>Portugiesisch (Brasilien)</strong> Sprachpaket hinzufügen",
      es: "La voz pt-BR depende del navegador:<br>• <strong>Chrome/Edge</strong>: usa voces de Windows.<br>  <strong>Configuración</strong> → <strong>Hora e idioma</strong> → <strong>Idioma</strong> → Añadir <strong>Portugués (Brasil)</strong>",
      it: "La voce pt-BR dipende dal browser:<br>• <strong>Chrome/Edge</strong>: usa le voci Windows.<br>  <strong>Impostazioni</strong> → <strong>Ora e lingua</strong> → <strong>Lingua</strong> → Aggiungi <strong>Portoghese (Brasile)</strong>",
      'pt-BR': "A voz pt-BR depende do navegador:<br>• <strong>Chrome/Edge</strong>: usa vozes do Windows.<br>  <strong>Configurações</strong> → <strong>Hora e idioma</strong> → <strong>Idioma</strong> → Adicionar <strong>Português (Brasil)</strong>"
    },
    desktop: {
      fr: "Sur votre navigateur, la disponibilité de la voix pt-BR dépend du système.<br>Essayez <strong>Chrome</strong> ou <strong>Edge</strong> qui ont généralement une bonne prise en charge.",
      en: "Voice availability depends on your OS and browser.<br>Try <strong>Chrome</strong> or <strong>Edge</strong> for best pt-BR support.",
      de: "Die Sprachverfügbarkeit hängt von OS und Browser ab.<br>Empfehlung: <strong>Chrome</strong> oder <strong>Edge</strong>.",
      es: "La disponibilidad de voz depende del sistema.<br>Prueba <strong>Chrome</strong> o <strong>Edge</strong>.",
      it: "La disponibilità della voce dipende dal sistema.<br>Prova <strong>Chrome</strong> o <strong>Edge</strong>.",
      'pt-BR': "A disponibilidade de voz depende do sistema.<br>Recomendamos <strong>Chrome</strong> ou <strong>Edge</strong>."
    }
  };

  var platInst = INST[platform] || INST['desktop'];
  return platInst[lang] || platInst['fr'] || platInst['en'] || '';
}

/** Labels "voix installée / non installée" par langue */
var VOICE_STATUS_LABELS = {
  installed: {
    fr: '✅ Voix portugaise détectée sur cet appareil',
    en: '✅ Portuguese voice detected on this device',
    de: '✅ Portugiesische Stimme auf diesem Gerät gefunden',
    es: '✅ Voz portuguesa detectada en este dispositivo',
    it: '✅ Voce portoghese rilevata su questo dispositivo',
    'pt-BR': '✅ Voz portuguesa detectada neste dispositivo'
  },
  missing: {
    fr: '❌ Aucune voix portugaise trouvée — suis les étapes ci-dessous',
    en: '❌ No Portuguese voice found — follow the steps below',
    de: '❌ Keine portugiesische Stimme gefunden — folge den Schritten',
    es: '❌ No se encontró voz portuguesa — sigue los pasos abajo',
    it: '❌ Nessuna voce portoghese trovata — segui i passaggi',
    'pt-BR': '❌ Nenhuma voz portuguesa encontrada — siga os passos abaixo'
  },
  unavailable: {
    fr: '⚠️ La synthèse vocale n\'est pas disponible sur ce navigateur',
    en: '⚠️ Speech synthesis is not available on this browser',
    de: '⚠️ Sprachsynthese auf diesem Browser nicht verfügbar',
    es: '⚠️ Síntesis de voz no disponible en este navegador',
    it: '⚠️ Sintesi vocale non disponibile su questo browser',
    'pt-BR': '⚠️ Síntese de voz não disponível neste navegador'
  },
  title: {
    fr: '🔊 Installer la voix portugaise (pt-BR)',
    en: '🔊 Install the Portuguese voice (pt-BR)',
    de: '🔊 Portugiesische Stimme installieren (pt-BR)',
    es: '🔊 Instalar la voz portuguesa (pt-BR)',
    it: '🔊 Installare la voce portoghese (pt-BR)',
    'pt-BR': '🔊 Instalar a voz portuguesa (pt-BR)'
  },
  reassure: {
    fr: '💡 Tu n\'as pas besoin de changer la langue de ton appareil.',
    en: '💡 You don\'t need to change your device language.',
    de: '💡 Du musst die Gerätesprache nicht ändern.',
    es: '💡 No necesitas cambiar el idioma de tu dispositivo.',
    it: '💡 Non devi cambiare la lingua del dispositivo.',
    'pt-BR': '💡 Você não precisa mudar o idioma do dispositivo.'
  }
};

/** Construit et affiche/masque le panneau d'aide voix */
/** Test rapide de la voix */
function testVoice() {
  var phrase = I18n.tf('voice_test_phrase','Olá! Vamos praticar português!');
  TTS.speakDirect(phrase);
  voiceTestedOk = true;
  setTimeout(updateVoiceInstallBtn, 400);
}

/** Met à jour le bouton voix dans la config (CTA → confirmé selon détection) */
function updateVoiceInstallBtn() {
  var btn  = document.getElementById('voiceInstallBtn');
  var lbl  = document.getElementById('voiceInstallBtnLabel');
  var test = document.getElementById('voiceTestBtn');
  if (!btn || !lbl) return;

  /* En mode Swift : AVSpeech toujours disponible */
  if (typeof TTS !== 'undefined' && TTS.isNativeSwift && TTS.isNativeSwift()) {
    lbl.textContent = '✅ Voix neurale Apple';
    btn.classList.add('voice-confirmed');
    if (test) test.style.display = '';
    return;
  }

  var hasVoice = hasPtVoice() || voiceTestedOk;
  if (hasVoice) {
    lbl.textContent = I18n.tf('voice_installed', '✅ Voix brésilienne installée');
    btn.classList.add('voice-confirmed');
    if (test) test.style.display = '';
  } else {
    lbl.textContent = I18n.tf('voice_install_btn', 'Installer la voix brésilienne');
    btn.classList.remove('voice-confirmed');
    if (test) test.style.display = 'none';
  }
}

/** Met à jour le badge de statut voix sous les drapeaux */
function updateVoiceStatus() {
  /* Délégué à updateVoiceInstallBtn() */
  updateVoiceInstallBtn();
}

function toggleVoiceHelp() {
  var panel = document.getElementById('voiceHelpPanel');
  var btn   = document.getElementById('voiceInstallBtn');
  if (!panel) return;

  var isOpen = panel.classList.toggle('open');
  btn.classList.toggle('active', isOpen);
  if (!isOpen) return;

  /* ── Mode Swift : afficher les voix neurales disponibles ── */
  if (typeof TTS !== 'undefined' && TTS.isNativeSwift && TTS.isNativeSwift()) {
    var swiftVoices = window._swiftVoices || [];
    var voiceListHtml = swiftVoices.length
      ? swiftVoices.map(function(v) {
          var badge = v.quality === 'premium'  ? ' <span style="color:#e8c84a;font-size:.75em">⭐ premium</span>'  :
                      v.quality === 'enhanced' ? ' <span style="color:#aaa;font-size:.75em">★ enhanced</span>' : '';
          return '<div style="padding:2px 0">✓ <strong>' + v.name + '</strong> ' +
                 (v.language === 'pt-BR' ? '🇧🇷' : '🇵🇹') + badge + '</div>';
        }).join('')
      : '<em>Chargement des voix…</em>';

    panel.innerHTML =
      '<div class="vh-title">🍎 Voix neurales Apple — AVSpeechSynthesizer</div>' +
      '<div class="vh-status vh-ok">✅ Moteur vocal natif Apple actif — qualité premium</div>' +
      '<div class="vh-reassure">💡 Les voix ci-dessous sont celles disponibles sur cet iPhone/iPad.</div>' +
      '<div class="vh-steps">' + voiceListHtml + '</div>' +
      '<div class="vh-reassure" style="margin-top:6px">Pour ajouter des voix : <strong>Réglages → Accessibilité → Contenu énoncé → Voix → Portugais (Brésil)</strong></div>';
    return;
  }

  /* Construit le contenu à la demande */
  var lang     = I18n.getLang();
  var platform = detectPlatform();
  var hasVoice = hasPtVoice() || voiceTestedOk;
  var noSynth  = !window.speechSynthesis;

  var statusLabel = noSynth
    ? (VOICE_STATUS_LABELS.unavailable[lang] || VOICE_STATUS_LABELS.unavailable.fr)
    : hasVoice
      ? (VOICE_STATUS_LABELS.installed[lang] || VOICE_STATUS_LABELS.installed.fr)
      : (VOICE_STATUS_LABELS.missing[lang]   || VOICE_STATUS_LABELS.missing.fr);

  var statusClass = noSynth ? 'vh-warn' : (hasVoice ? 'vh-ok' : 'vh-ko');
  var title       = VOICE_STATUS_LABELS.title[lang]    || VOICE_STATUS_LABELS.title.fr;
  var reassure    = VOICE_STATUS_LABELS.reassure[lang] || VOICE_STATUS_LABELS.reassure.fr;
  var instructions = noSynth ? '' :
    '<div class="vh-steps">' + getVoiceInstructions(platform, lang) + '</div>';

  panel.innerHTML =
    (title ? '<div class="vh-title">' + title + '</div>' : '') +
    '<div class="vh-status ' + statusClass + '">' + statusLabel + '</div>' +
    '<div class="vh-reassure">' + reassure + '</div>' +
    instructions;
}
