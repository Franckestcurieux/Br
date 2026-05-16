/**
 * tts.js — Synthèse vocale (Text-To-Speech) via Web Speech API.
 *
 * STRUCTURE :
 *   - Détection et chargement de la voix pt-BR au démarrage
 *   - Retries automatiques : 300ms, 800ms, 2s, 4s, 6s, 10s, 20s
 *   - Retry sur visibilitychange (retour au premier plan)
 *   - Matching fuzzy du nom de voix sauvegardé (ignore parenthèses, espèces)
 *   - Wake-up iOS : utterance silencieuse au démarrage pour activer les voix Enhanced
 *
 * DONNÉES PERSISTÉES :
 *   localStorage 'conjugacao_voice'       → nom de la voix choisie
 *   localStorage 'conjugacao_tts_enabled' → '1' si TTS actif
 *
 * ÉVÉNEMENT ÉMIS :
 *   document 'tts:voices-ready' → { hasVoice: bool }
 *   Écouté par init.js pour mettre à jour le picker et synchroniser
 *   window._selectedVoice avec TTS.getCurrentVoice()
 *
 * API publique :
 *   TTS.speak(text)          — parle si TTS activé
 *   TTS.speakDirect(text)    — parle TOUJOURS (bypass toggle) — utilisé par Écoute
 *   TTS.speakForm(text)      — parle à 0.78x (formes conjuguées)
 *   TTS.speakInfinitive(text)— parle à 0.9x (infinitifs)
 *   TTS.toggle()             — active/désactive, retourne le nouvel état
 *   TTS.setEnabled(bool)     — force l'état
 *   TTS.isEnabled()          — retourne bool
 *   TTS.isAvailable()        — Web Speech API disponible ?
 *   TTS.hasVoice()           — voix pt-BR détectée ?
 *   TTS.getVoiceName()       — nom de la voix active
 *   TTS.getCurrentVoice()    — objet SpeechSynthesisVoice actif
 *   TTS.stop()               — coupe la parole en cours
 *
 * ⚠️  PIÈGES CONNUS :
 *   - iOS Safari : les voix Enhanced (Siri) ne sont PAS accessibles via Web Speech API.
 *     Seules Luciana (pt-BR) et Joana (pt-PT) sont généralement exposées.
 *   - VERB_DATA est indexé par TENSE puis par VERB : VERB_DATA[tense][verb][pronoun]
 *     (pas l'inverse — erreur classique lors de l'écriture de nouveau code)
 */
"use strict";var TTS=function(){var e=!1,n=null,t="conjugacao_tts_enabled";function i(t,i){if(e&&window.speechSynthesis){i=i||{},window.speechSynthesis.cancel();var s=new SpeechSynthesisUtterance(t);s.lang="pt-BR",s.rate=i.rate||.85,s.pitch=i.pitch||1,s.volume=i.volume||1,(window._selectedVoice||n)&&(s.voice=window._selectedVoice||n),window.speechSynthesis.speak(s)}}return function(){function i(){var e=window.speechSynthesis.getVoices(),t=n;e.length&&((function(){var saved=localStorage.getItem("conjugacao_voice");if(saved){var sv=e.find(function(v){return v.name===saved;})||e.find(function(v){return v.name.replace(/[^a-zA-Z]/g,"").toLowerCase()===saved.replace(/[^a-zA-Z]/g,"").toLowerCase();});if(sv){n=sv;return;}}n=e.find(function(v){return"pt-BR"===v.lang&&v.default;})||e.find(function(v){return"pt-BR"===v.lang;})||e.find(function(v){return v.lang.startsWith("pt")&&v.default;})||e.find(function(v){return v.lang.startsWith("pt");})||null;})()),n!==t&&document.dispatchEvent(new CustomEvent("tts:voices-ready",{detail:{hasVoice:!!n}}))}window.speechSynthesis&&(e="1"===localStorage.getItem(t),i(),void 0!==window.speechSynthesis.onvoiceschanged&&(window.speechSynthesis.onvoiceschanged=i),(function(){try{var w=new SpeechSynthesisUtterance("");w.volume=0;w.lang="pt-BR";window.speechSynthesis.speak(w);window.speechSynthesis.cancel();}catch(_e){}})(),setTimeout(i,300),setTimeout(i,800),setTimeout(i,2e3),setTimeout(i,4e3),setTimeout(i,6e3),setTimeout(i,1e4),setTimeout(i,2e4),document.addEventListener("visibilitychange",function(){if(!document.hidden)setTimeout(i,400);}))}(),{speak:i,speakForm:function(e){i(e,{rate:.78})},speakInfinitive:function(e){i(e,{rate:.9})},toggle:function(){e=!e;try{localStorage.setItem(t,e?"1":"0")}catch(e){}return e},setEnabled:function(n){e=!!n,localStorage.setItem(t,e?"1":"0")},isEnabled:function(){return e},isAvailable:function(){return!!window.speechSynthesis},hasVoice:function(){return!!n},getVoiceName:function(){return n?n.name:"(voix système)"},stop:function(){window.speechSynthesis&&window.speechSynthesis.cancel()},getCurrentVoice:function(){return n},speakDirect:function(e,t){if(window.speechSynthesis){window.speechSynthesis.cancel();var i=new SpeechSynthesisUtterance(e);i.lang="pt-BR",i.rate=t&&t.rate||.82,n&&(i.voice=n),window.speechSynthesis.speak(i)}}}}();

/* ═══════════════════════════════════════════════════════════════
   PONT SWIFT — AVSpeechSynthesizer (voix neurales Apple)
   Verbos 1.0.2 — © Dr Franck Mignot 2026 — CC BY-NC-SA 4.0

   Ce bloc patch l'API TTS si l'app tourne dans la coque Swift.
   En PWA normale (Safari/Chrome/Android), aucun effet — le
   comportement Web Speech API reste identique.
   ═══════════════════════════════════════════════════════════════ */
(function patchTTSForSwift() {
  'use strict';

  function inSwift() {
    return !!(window.webkit &&
              window.webkit.messageHandlers &&
              window.webkit.messageHandlers.tts);
  }

  /* Conversion taux web (0.78–0.90) → AVSpeech (0.41–0.48) */
  function avRate(webRate) {
    return webRate * 0.53;
  }

  function swiftSpeak(text, rate) {
    window.webkit.messageHandlers.tts.postMessage({
      text : text,
      lang : 'pt-BR',
      rate : avRate(rate || 0.85)
    });
  }

  /* Sauvegarder les méthodes originales */
  var _speak         = TTS.speak;
  var _speakForm     = TTS.speakForm;
  var _speakInfinit  = TTS.speakInfinitive;
  var _speakDirect   = TTS.speakDirect;
  var _stop          = TTS.stop;

  /* Remplacer par les versions avec détection Swift */
  TTS.speak = function(text) {
    if (inSwift()) { swiftSpeak(text, 0.85); return; }
    _speak(text);
  };

  TTS.speakForm = function(text) {
    if (inSwift()) { swiftSpeak(text, 0.78); return; }
    _speakForm(text);
  };

  TTS.speakInfinitive = function(text) {
    if (inSwift()) { swiftSpeak(text, 0.90); return; }
    _speakInfinit(text);
  };

  TTS.speakDirect = function(text, opts) {
    if (inSwift()) { swiftSpeak(text, (opts && opts.rate) || 0.82); return; }
    _speakDirect(text, opts);
  };

  TTS.stop = function() {
    if (inSwift()) {
      window.webkit.messageHandlers.tts.postMessage({ action: 'stop' });
      return;
    }
    _stop();
  };

  TTS.isNativeSwift = inSwift;

  /* ── Voix Swift : réception de la liste depuis TTSBridge ── */
  window.receiveSwiftVoices = function(voices) {
    /* Stocker la liste pour le picker */
    window._swiftVoices = voices || [];
    /* Déclencher le même event que tts:voices-ready pour que init.js réagisse */
    document.dispatchEvent(new CustomEvent('tts:swift-voices-ready', {
      detail: { voices: window._swiftVoices }
    }));
  };

  /* Demander la liste des voix à Swift */
  TTS.requestSwiftVoices = function() {
    if (inSwift()) {
      window.webkit.messageHandlers.tts.postMessage({ action: 'getVoices' });
    }
  };

  /* Sélectionner une voix côté Swift (depuis le picker) */
  TTS.selectSwiftVoice = function(identifier, name) {
    if (!inSwift()) return;
    try { localStorage.setItem('verbos_swift_voice', identifier); } catch(_e) {}
    window.webkit.messageHandlers.tts.postMessage({
      action     : 'selectVoice',
      identifier : identifier,
      name       : name
    });
  };

  /* Si on est dans Swift, demander les voix au démarrage */
  if (inSwift()) {
    /* Délai pour laisser le temps à la WebView d'être prête */
    setTimeout(function() { TTS.requestSwiftVoices(); }, 600);
    setTimeout(function() { TTS.requestSwiftVoices(); }, 1500);
  }


}());
