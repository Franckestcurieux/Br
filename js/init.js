/**
 * init.js — Initialisation epsilon 12 (patch race condition)
 *
 * FIX : app:data-ready peut être dispatché AVANT que init.js s'exécute
 * (cache SW très rapide). splash.js pose window._appDataReady=true dès
 * qu'il capte l'event. init.js vérifie ce flag et appelle _setupApp()
 * immédiatement si besoin, sinon attend l'event normalement.
 */
'use strict';

/* ── Lancer le splash immédiatement ── */
Splash.init();

/* ════════════════════════════════════════════
   CONFIG MODAL
   ════════════════════════════════════════════ */
function openConfigModal() {
  var m = document.getElementById('configModal');
  if (m) m.style.display = 'flex';
  try { updateVoicePicker(); } catch(_e) {}
}
function closeConfigModal(e) {
  if (e && e.target !== document.getElementById('configModal')) return;
  var m = document.getElementById('configModal');
  if (m) m.style.display = 'none';
}

/* ════════════════════════════════════════════
   TENSE PICKER
   ════════════════════════════════════════════ */
function openTensePicker() {
  updateTenseChip(currentTense);
  var m = document.getElementById('tensePickerModal');
  if (m) m.style.display = 'flex';
}

function closeTensePicker(e) {
  if (e && e.target !== document.getElementById('tensePickerModal')) return;
  var m = document.getElementById('tensePickerModal');
  if (m) m.style.display = 'none';
}

/* cycleTenseMode supprimé — bouton 1/3/6 retiré de l'UI */

/* ════════════════════════════════════════════
   TOGGLE TABLEAU 3 ÉTATS : 1 → 3 → 6 → 1
   Intercepte le bouton binaire de buildRef()
   et lui donne un vrai cycle à 3 positions.
   ════════════════════════════════════════════ */
var _tableauState = 'one';

function patchTableauToggle() {
  var rg = document.getElementById('refGrid');
  if (!rg) return;
  var btn = rg.querySelector('.ref-toggle-btn');
  if (!btn || btn._patched) return;

  /* Cloner pour supprimer les listeners originaux */
  var fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);
  fresh._patched = true;

  function _label() {
    if (_tableauState === 'one')   return I18n.tf('tableau_show_3','1 temps → 3 temps');
    if (_tableauState === 'three') return I18n.tf('tableau_show_6','3 temps → 6 temps');
    return I18n.tf('tableau_show_1','6 temps → 1 temps');
  }
  fresh.textContent = _label();

  fresh.addEventListener('click', function() {
    _tableauState = _tableauState === 'one'   ? 'three' :
                    _tableauState === 'three' ? 'six'   : 'one';

    ACTIVE_TENSES = _tableauState === 'six'   ? TENSES_ALL.slice() :
                    _tableauState === 'three' ? TENSES_B1.slice() :
                    [currentTense];

    var rd = document.getElementById('refDetails');
    if (rd) rd.open = true;
    buildRef(); /* repart avec showAll=false (1 temps) */

    /* ── Clic SYNCHRONE : avant que le MutationObserver ne patche ── */
    if (_tableauState !== 'one') {
      var newTog = rg.querySelector('.ref-toggle-btn');
      if (newTog && !newTog._patched) newTog.click(); /* showAll=true */
    }

    /* Ouvrir les groupes + re-patcher (légère attente pour le rendu) */
    setTimeout(function() {
      if (rd) rd.open = true;
      rg.querySelectorAll('.ref-group').forEach(function(d) { d.open = true; });
      patchTableauToggle();
    }, 80);
  });
}

function updateTenseChip(tense) {
  /* Lire les libellés depuis les boutons du modal */
  var btn  = document.querySelector('.tense-picker-btn[data-tense="' + tense + '"]');
  var cPt  = document.getElementById('tenseChipPt');
  var cFr  = document.getElementById('tenseChipFr');
  if (btn && cPt) cPt.textContent = btn.querySelector('.tpb-pt').textContent;
  if (btn && cFr) cFr.textContent = btn.querySelector('.tpb-fr').textContent;
  /* Marquer le bouton actif dans le modal */
  document.querySelectorAll('.tense-picker-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.tense === tense);
  });
}

/* ════════════════════════════════════════════
   TOOLTIPS GRUPO & TEMA
   ════════════════════════════════════════════ */
function toggleTemaInfo(e, id) {
  e.stopPropagation();
  var tip = document.getElementById('tip-' + id);
  if (!tip) return;
  document.querySelectorAll('.tema-tooltip.open').forEach(function(t) { if (t !== tip) t.classList.remove('open'); });
  tip.classList.toggle('open');
  if (tip.classList.contains('open')) {
    var theme = THEMES_SEMANTIC.find(function(t) { return t.id === id; });
    if (theme) {
      tip.innerHTML = theme.verbs.map(function(v) {
        return '<div class="tema-tooltip-verb"><span class="tema-tooltip-pt">' + displayVerb(v) + '</span><span class="tema-tooltip-fr">' + (I18n.verbTr(v) || '') + '</span></div>';
      }).join('');
    }
  }
}

function toggleGrupoInfo(e, id) {
  e.stopPropagation();
  var tip = document.getElementById('gtip-' + id);
  if (!tip) return;
  document.querySelectorAll('.grupo-tooltip.open').forEach(function(t) { if (t !== tip) t.classList.remove('open'); });
  tip.classList.toggle('open');
  if (tip.classList.contains('open')) {
    var verbs;
    if (id === 'all_irr') {
      verbs = ['irreg','er_irr','ir_irr'].flatMap(function(x) {
        var g = VERB_CATEGORIES.find(function(c) { return c.id === x; }); return g ? g.verbs : [];
      });
    } else {
      var cat = VERB_CATEGORIES.find(function(c) { return c.id === id; });
      verbs = cat ? cat.verbs : [];
    }
    tip.innerHTML = verbs.map(function(v) {
      return '<div class="grupo-tooltip-verb"><span class="grupo-tooltip-pt">' + displayVerb(v) + '</span><span class="grupo-tooltip-fr">' + (I18n.verbTr(v) || '') + '</span></div>';
    }).join('');
  }
}

/* ════════════════════════════════════════════
   COMPTEURS DE GROUPES
   ════════════════════════════════════════════ */
function updateGroupCounts() {
  VERB_CATEGORIES.forEach(function(cat) {
    var btn = document.querySelector('[onclick="applyGrupo(\'' + cat.id + '\')"]');
    if (!btn) return;
    var span = btn.querySelector('.grupo-btn-count');
    if (span) span.textContent = '(' + cat.verbs.length + ')';
  });
  var allIrrBtn = document.querySelector('[onclick="applyGrupo(\'all_irr\')"]');
  if (allIrrBtn) {
    var s = allIrrBtn.querySelector('.grupo-btn-count');
    if (s) {
      var all = new Set(['irreg','er_irr','ir_irr'].flatMap(function(id) {
        var c = VERB_CATEGORIES.find(function(x) { return x.id === id; }); return c ? c.verbs : [];
      }));
      s.textContent = all.size;
    }
  }
  THEMES_SEMANTIC.forEach(function(theme) {
    var btn = document.querySelector('[onclick="applyThemeSemantic(\'' + theme.id + '\')"]');
    if (!btn) return;
    var span = btn.querySelector('.grupo-btn-count');
    if (span) span.textContent = '(' + theme.verbs.length + ')';
  });
}

function fadeHint(selector) {
  var el = document.querySelector(selector);
  if (el && !el.classList.contains('hint-faded')) el.classList.add('hint-faded');
}

function markSessionStarted() {
  if (!sessionStarted) {
    sessionStarted = true;
    /* btnStart2 garde toujours "Começar" — seul btnRestart dit "Recomeçar" */
    var sub = I18n.tf('btn_restart_sub', 'Recommencer');
    var br = document.getElementById('btnRestart');
    if (br) br.innerHTML = '🔄 Recomeçar<span class="btn-sub">' + sub + '</span>';
  }
}

function switchSelTab(tab, btn) {
  document.querySelectorAll('.sel-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.sel-panel').forEach(function(p) { p.classList.remove('active'); });
  btn.classList.add('active');
  var panel = document.getElementById('panel-' + tab);
  if (panel) panel.classList.add('active');
  if (tab === 'verbos' && !configBuilt) {
    buildConfig();
    configBuilt = true;
  }
}

/* ════════════════════════════════════════════
   BARRE D'INSTALLATION PWA
   ════════════════════════════════════════════ */
function initInstallBar() {
  if (window.navigator.standalone === true) return;
  var bar=document.getElementById('installBar'),desc=document.getElementById('installDesc'),
      title=document.getElementById('installTitle'),btn=document.getElementById('installBtn'),
      closeBtn=document.getElementById('installClose');
  if (!bar) return;
  var ua=navigator.userAgent.toLowerCase(),isIOS=/iphone|ipad|ipod/.test(ua),
      isSafari=/safari/.test(ua)&&!/chrome/.test(ua),deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredPrompt=e;btn.style.display='block';});
  btn.addEventListener('click',function(){if(deferredPrompt){deferredPrompt.prompt();deferredPrompt.userChoice.then(function(r){if(r.outcome==='accepted')dismiss();deferredPrompt=null;});}});
  if(isIOS&&isSafari){title.textContent=I18n.tf('install_title_ios',"Installer sur l'écran d'accueil");desc.innerHTML=I18n.tf('install_desc_ios',"1️⃣ Les <strong>3 points</strong> → 2️⃣ <span class='ib-badge'>⬆️ Partager</span> → 3️⃣ <strong>« Sur l'écran d'accueil »</strong>");bar.classList.add('ios-mode');}
  setTimeout(function(){bar.style.display='flex';},1000);
  setTimeout(dismiss,18000);
  function dismiss(){bar.classList.add('hiding');setTimeout(function(){bar.style.display='none';bar.classList.remove('hiding');},320);}
  closeBtn.addEventListener('click',dismiss);
}

/* ════════════════════════════════════════════
   INFO PANEL NIVEAUX
   ════════════════════════════════════════════ */
function buildLevelInfoPanel() {
  var p = document.getElementById('levelInfoPanel');
  if (!p) return;
  p.innerHTML = [
    {n:1,d:I18n.tf('level_1_desc','ser · morar · ter · ir · falar')},
    {n:2,d:I18n.tf('level_2_desc','+ estar · gostar')},
    {n:3,d:I18n.tf('level_3_desc','+ poder · querer · fazer · comer · beber')},
    {n:4,d:I18n.tf('level_4_desc','+ vir · saber · dizer · ver · preferir · abrir')},
    {n:5,d:I18n.tf('level_5_desc','Irréguliers & Importants + principaux réguliers')},
    {n:6,d:I18n.tf('level_n_verbs','Tous les {n} verbes').replace('{n}',VERB_NAMES.length)}
  ].map(function(r){return '<div class="level-info-row"><span class="level-info-num">'+r.n+'</span><span class="level-info-verbs">'+r.d+'</span></div>';}).join('');
}

/* ════════════════════════════════════════════
   SETUP PRINCIPAL — appelé quand les données sont prêtes
   (immédiatement si window._appDataReady, sinon via event)
   ════════════════════════════════════════════ */
function _setupApp() {

  /* Cache DOM */
  DOM = {
    cardsArea:   document.getElementById('cardsArea'),
    refDetails:  document.getElementById('refDetails'),
    refGrid:     document.getElementById('refGrid'),
    configBody:  document.getElementById('configBody'),
    configCount: document.getElementById('configCount'),
    btnStart2:   document.getElementById('btnStart2'),
    btnRestart:  document.getElementById('btnRestart'),
    btnCheck:    document.getElementById('btnCheck'),
    btnReveal:   document.getElementById('btnReveal'),
  };

  buildLevelInfoPanel();
  buildVowelAltMap();
  refreshTenseLabels();
  try { validateData();      } catch(e) { console.warn('validateData',e); }
  try { buildConfig(); configBuilt=true; } catch(e) { console.warn('buildConfig',e); }
  try { buildRef();          } catch(e) { console.warn('buildRef',e); }
  try {
    applyLevel(1);
    /* Sélection visuelle du niveau 1 par défaut */
    var lvlBtns = document.querySelectorAll('.level-btn');
    if (lvlBtns.length) {
      lvlBtns.forEach(function(b) { b.classList.remove('active'); });
      lvlBtns[0].classList.add('active');
    }
  } catch(e) { console.warn('applyLevel',e); }

  /* Garantir que les boutons de contrôle sont cachés au démarrage */
  var _cb = document.getElementById('controlsBottom');
  var _ho = document.getElementById('hintsOptionRow');
  if (_cb) _cb.style.display = 'none';
  if (_ho) _ho.style.display = 'none';
  try { updateGroupCounts(); } catch(e) { console.warn('updateGroupCounts',e); }
  try { updateVoiceStatus(); } catch(e) { console.warn('updateVoiceStatus',e); }
  try { initInstallBar();    } catch(e) { console.warn('installBar',e); }

  /* Préférence hints */
  (function(){
    var saved=null;
    try{saved=localStorage.getItem('conjugacao_hints');}catch(_e){}
    var cb=document.getElementById('hintsToggle');
    if(cb&&saved==='0')cb.checked=false;
  })();

  setTimeout(function(){try{updateVoiceInstallBtn();}catch(_e){}},1000);
  setTimeout(function(){try{updateVoiceInstallBtn();}catch(_e){}},3000);
  setTimeout(function(){fadeHint('.selection-header');},60000);

  /* ── Começar ── */
  DOM.btnStart2.addEventListener('click', function() {
    markSessionStarted();
    startExercise();
  });
  DOM.btnRestart.addEventListener('click', function() { DOM.btnStart2.click(); });

  /* ── Mode erreurs : ouvrir modal au cochage, déverrouiller au décochage ── */
  (function() {
    var meCb = document.getElementById('modeErreursCheck');
    if (meCb) {
      meCb.addEventListener('change', function() {
        if (this.checked) {
          try { ModeErreurs.checkAndOpen(); } catch(_e) { console.warn('[ModeErreurs]', _e); }
        } else {
          try { ModeErreurs.deactivate(); } catch(_e) {}
        }
      });
    }
  })();
  DOM.btnCheck.addEventListener('click', function() {
    checkAnswers();
    setTimeout(function() { try { ModeErreurs.updateCheckboxState(); } catch(_e) {} }, 400);
  });
  DOM.btnReveal.addEventListener('click', function() {
    revealAnswers();
    setTimeout(function() { try { ModeErreurs.updateCheckboxState(); } catch(_e) {} }, 400);
  });

  /* ── Tense chip : géré par openTensePicker() + switchTense() directement ── */

  /* ── Levels ── */
  document.getElementById('levelsBar').addEventListener('click', function(e) {
    var btn = e.target.closest('.level-btn'); if (!btn) return; applyLevel(parseInt(btn.dataset.level));
  });

  /* ── Cheat sheet dans onglet Tabela ── */
  if (DOM.refDetails) {
    DOM.refDetails.addEventListener('toggle', function() { if (this.open) buildRef(); });
  }

  /* ── Clavier Enter ── */
  DOM.cardsArea.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter') return;
    var idx = parseInt(e.target.dataset.index, 10); if (isNaN(idx)) return;
    if (idx < exercises.length - 1) { var n = document.getElementById('input-'+(idx+1)); if(n) n.focus(); }
    else { checkAnswers(); }
  });

  /* ── Hint cards ── */
  DOM.cardsArea.addEventListener('click', function(e) {
    var btn = e.target.closest('.hint-btn'); if (!btn) return;
    var idx = btn.dataset.vidx;
    var panel = document.getElementById('uhint-'+idx); if (!panel) return;
    var isOpen = panel.classList.toggle('open'); btn.classList.toggle('active', isOpen);
    if (isOpen && !panel.dataset.built) {
      var ex = exercises[parseInt(idx,10)]; if (!ex) return;
      var tr = I18n.verbTr(ex.verb)||'', reg = getRegLabel(ex.verb), vh = I18n.verbHint(ex.verb)||VERB_HINTS[ex.verb]||'';
      panel.innerHTML = '<div class="uhint-tr">'+tr+(reg?' \u00a0\u2014\u00a0 '+reg:'')+'</div>'+(vh?'<hr class="uhint-sep"><div class="uhint-detail">'+vh+'</div>':'');
      panel.dataset.built='1';
    }
  });

  /* ── Level info ── */
  document.getElementById('levelInfoToggle').addEventListener('click', function() {
    var p=document.getElementById('levelInfoPanel');
    var open=p.classList.toggle('open'); this.classList.toggle('active',open);
    if(open) try{buildLevelInfoPanel();}catch(_e){}
  });

  /* ── Fermer tooltips ── */
  document.addEventListener('click', function() {
    document.querySelectorAll('.tema-tooltip.open, .grupo-tooltip.open').forEach(function(t){t.classList.remove('open');});
  });

  /* ── Bouton aide ── */
  (function(){
    var helpBtn=document.getElementById('helpBtn'), helpPanel=document.getElementById('helpPanel'), helpTimer=null;
    if(!helpBtn||!helpPanel) return;
    helpBtn.addEventListener('click', function(){
      var isOpen=helpPanel.style.display!=='none';
      if(isOpen){helpPanel.style.display='none';helpBtn.classList.remove('active');clearTimeout(helpTimer);}
      else{helpPanel.style.display='block';helpBtn.classList.add('active');clearTimeout(helpTimer);helpTimer=setTimeout(function(){helpPanel.style.display='none';helpBtn.classList.remove('active');},30000);}
    });
  })();

  /* ── Mode erreurs ── */
  try { ModeErreurs.updateCheckboxState(); } catch(_e) {}

  updateLangBtns();
  updateTenseChip('present'); /* chip initial */
  configBuilt = true;
  console.log('[Init] _setupApp() done ✅');
}

/* ════════════════════════════════════════════
   DÉCLENCHEMENT via App.Boot
   App.whenReady appelle _setupApp immédiatement si
   les données sont déjà prêtes, sinon met en queue.
   Garanti sans race condition.
   ════════════════════════════════════════════ */
console.log('[Init] registering _setupApp via App.whenReady');
App.whenReady('data', function () {
  console.log('[Init] _setupApp() triggered by App.Boot ✅');
  _setupApp();
});

/* patchFullConjToggle supprimé — 3 états gérés directement dans ui-ref.js */

/* ════════════════════════════════════════════
   LANGUE
   ════════════════════════════════════════════ */
function updateLangBtns() {
  var lang = I18n.getLang();
  document.querySelectorAll('.lang-card').forEach(function(b) { b.classList.toggle('active', b.dataset.lang===lang); });
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key=el.getAttribute('data-i18n'), val=I18n.t(key); if(val!==null) el.textContent=val;
  });
}

function applyI18nToDom() {
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key=el.getAttribute('data-i18n'), val=I18n.t(key); if(val!==null) el.textContent=val;
  });
  if(DOM&&DOM.refDetails&&DOM.refDetails.open) buildRef();
  updateConfigCount();
  try{updateVoiceInstallBtn();}catch(_e){}
  updateLangBtns();
  (function(){
    var pairs=[['btnCheck','btn_check_bilingual','Vérifier'],['btnReveal','btn_reveal_bilingual','Corriger'],['btnRestart','btn_restart_sub','Recommencer'],['btnStart2','btn_start_sub','Commencer']];
    pairs.forEach(function(p){var el=document.getElementById(p[0]);if(!el)return;var s=el.querySelector('.btn-sub');if(s)s.textContent=I18n.tf(p[1],p[2]);});
  })();
}


/* ════════════════════════════════════════════
   ONGLET RÉFÉRENCE — Contenu par langue
   ════════════════════════════════════════════ */
var REF_TEXTS = {
  fr: null,
  'en': {
    title: "The Anti-Manual",
    sub: "Only in French — for now",
    desc: "The Anti-Manual for Brazilian Portuguese does not start with grammar rules. It starts with what you already know — the patterns of your own language — and builds bridges toward Brazilian Portuguese.\n\nThose bridges are specific to each language pair. The French version exists because French is the author’s native language: shared nasal vowels, a living subjunctive, Latin-rooted vocabulary — bridges particular to French.\n\nAn English speaker’s bridges would look different: a vast Latin vocabulary via the Norman conquest, but rhythmically and grammatically a much steeper climb. Building those bridges authentically requires a native speaker.\n\nThe Anti-Manual for English speakers is a dream in progress. If you’re a native English-speaking Lusophile and you’d like to help — this space is yours."
  },
  'de': {
    title: "Das Anti-Handbuch",
    sub: "Bisher nur auf Französisch",
    desc: "Das Anti-Handbuch für brasilianisches Portugiesisch beginnt nicht mit Grammatikregeln. Es beginnt mit dem, was du bereits weißt — den Mustern deiner Muttersprache — und baut von dort aus Brücken in Richtung Brasilianisch.\n\nDiese Brücken sind sprachpaarbezogen. Die französische Fassung existiert, weil Französisch die Muttersprache des Autors ist: geteilte Nasalvokale, ein lebendiger Konjunktiv, lateinisches Erbwortschatz — Brücken, die dem Französischen eigen sind.\n\nDie Brücken vom Deutschen aus wären andere: die gemeinsame germanische Rhythmik, der Aspektunterschied zwischen Perfekt und Präteritum, die präzise Wortbildung. Solche Verbindungen können nur von jemandem authentisch gelegt werden, der Deutsch von innen kennt.\n\nEine deutsche Fassung ist ein Traum — und vielleicht eine Einladung."
  },
  'nl': {
    title: "Het Anti-Handboek",
    sub: "Voorlopig alleen in het Frans",
    desc: "Het Anti-Handboek voor Braziliaans Portugees begint niet bij grammaticaregels. Het begint bij wat je al weet — de patronen van je eigen taal — en bouwt van daaruit bruggen richting het Braziliaans.\n\nDie bruggen zijn taalpaarbezonden. De Franse versie bestaat omdat Frans de moedertaal van de auteur is: gedeelde nasaalklinkers, een levendig aanvoegende wijs, een Latijns erfgoed — bruggen die specifiek zijn voor het Frans.\n\nDe bruggen vanuit het Nederlands zouden er heel anders uitzien: de vertrouwde geslachtsonderscheidingen, de werkwoordsclusters, de gemeenschappelijke Latijnse woordenschat via kerk en humanisme. Zulke verbindingen kunnen alleen authentiek worden gelegd door iemand die het Nederlands van binnenuit kent.\n\nEen Nederlandse versie is een droom — en misschien een uitnodiging."
  },
  'es': {
    title: "El Anti-Manual",
    sub: "Por ahora, solo en francés",
    desc: "El Anti-Manual de portugués brasileño no empieza con reglas gramaticales. Empieza con lo que ya sabes — los patrones de tu propia lengua — y construye puentes hacia el brasileño.\n\nEsos puentes son específicos de cada par de lenguas. La versión francesa existe porque el francés es la lengua materna del autor: vocales nasales compartidas, un subjuntivo vivo, vocabulario de raíz latina — puentes propios del francés.\n\nPara un hispanohablante, los puentes serían particulares — y también los riesgos: la proximidad es tan grande que el peligro es el portuñol, esa frontera delgada que lo cambia todo. Solo un hablante nativo del español podría construir esos puentes con autenticidad.\n\nUna versión en español está en la mente del autor — y quizás en la tuya."
  },
  'it': {
    title: "L'Anti-Manuale",
    sub: "Per ora, solo in francese",
    desc: "L'Anti-Manuale per il portoghese brasiliano non inizia dalle regole grammaticali. Inizia da ciò che sai già — i modelli della tua lingua — e costruisce ponti verso il brasiliano.\n\nQuesti ponti sono specifici di ogni coppia di lingue. La versione francese esiste perché il francese è la lingua madre dell'autore: vocali nasali condivise, un congiuntivo vivo, un lessico di radice latina — ponti propri del francese.\n\nPer un italofono, i ponti sarebbero unici: la vicinanza latina, la musicalità simile, le trappole dei falsi amici. Solo un parlante nativo dell'italiano potrebbe costruire queste connessioni con autenticità.\n\nUna versione italiana è nei sogni dell'autore — e forse nei tuoi."
  },
  'pt-BR': {
    title: "O Anti-Manual",
    sub: "Uma nota para falantes nativos",
    desc: "Este aplicativo foi criado para quem aprende o português brasileiro a partir de outra língua — francês, inglês, alemão. O Anti-Manual não existe em português, porque ele é justamente uma ponte entre línguas, e não se constrói uma ponte para a própria casa.\n\nMas se você é brasileiro e quer praticar a conjugação — seja como estudante ou simplesmente por prazer — o aplicativo funciona perfeitamente para isso. Os verbos são os mesmos para todo mundo."
  },
  'da': {
    title: "Anti-Manualen",
    sub: "Foreløbig kun på fransk",
    desc: "Anti-Manualen til brasiliansk portugisisk starter ikke med grammatikregler. Den starter med det, du allerede ved — mønstrene i dit eget sprog — og bygger broer mod brasiliansk.\n\nDisse broer er sprogspar-specifikke. Den franske version eksisterer, fordi fransk er forfatterens modersmaal: fælles nasalvokaler, et levende konjunktiv, et latinsk ordforrraad — broer der er særlige for franskmand.\n\nBroerne fra dansk ville se helt anderledes ud: de fælles germanske rytmer, verbernes aspekt, den latinske arv via kirken og humanismen. Disse forbindelser kan kun lægges autentisk af én, der kender dansk indefra.\n\nEn dansk version er en drøm — og måske en invitation."
  },
  'no': {
    title: "Anti-Manualen",
    sub: "Foreløpig bare på fransk",
    desc: "Anti-Manualen for brasiliansk portugisisk begynner ikke med grammatikkregler. Den begynner med det du allerede kan — mønstrene i ditt eget språk — og bygger broer mot brasiliansk.\n\nDisse broene er spesifikke for hvert språkpar. Den franske versjonen finnes fordi fransk er forfatterens morsmaal: felles nasalvokaler, et levende konjunktiv, et latinsk ordforrraad — broer som er særegne for fransktalende.\n\nBroene fra norsk ville sett helt annerledes ut: den felles germanske rytmen, verbenes aspekt, den latinske arven via kirken. Disse forbindelsene kan bare legges autentisk av en som kjenner norsk innenfra.\n\nEn norsk versjon er en drøm — og kanskje en invitasjon."
  }
};

function updateRefPage() {
  var lang = (typeof I18n !== 'undefined') ? I18n.getLang() : 'fr';
  /* Afficher/masquer les blocs */
  document.querySelectorAll('[data-lang-show]').forEach(function(el) {
    el.style.display = (el.dataset.langShow === lang) ? 'block' : 'none';
  });
  document.querySelectorAll('[data-lang-hide]').forEach(function(el) {
    el.style.display = (el.dataset.langHide === lang) ? 'none' : 'block';
  });
  /* Remplir le contenu pour les autres langues */
  if (lang !== 'fr') {
    var t = REF_TEXTS[lang] || REF_TEXTS['en'];
    var el;
    el = document.getElementById('refOtherTitle'); if (el) el.textContent = t.title;
    el = document.getElementById('refOtherSub');   if (el) el.textContent = t.sub;
    el = document.getElementById('refOtherDesc');  if (el) el.textContent = t.desc;
  }
}

/* ════════════════════════════════════════════
   SÉLECTEUR DE VOIX
   ════════════════════════════════════════════ */
function refreshVoicePicker() {
  /* Appelé à l'ouverture du dropdown — force une re-détection des voix */
  if (!window.speechSynthesis) return;
  var voices = window.speechSynthesis.getVoices();
  /* Si les voix ont changé depuis la dernière fois, reconstruire */
  updateVoicePicker();
  /* Déclencher aussi une re-init TTS au cas où une nouvelle voix est apparue */
  try {
    window.speechSynthesis.getVoices(); /* force flush sur certains navigateurs */
    setTimeout(updateVoicePicker, 200);  /* re-check après 200ms */
  } catch(_e) {}
}

function updateVoicePicker() {
  var row = document.getElementById('voicePickerRow');
  var sel = document.getElementById('voicePickerSelect');
  if (!row || !sel) return;

  /* ── Mode Swift : voix AVSpeechSynthesizer ── */
  if (typeof TTS !== 'undefined' && TTS.isNativeSwift && TTS.isNativeSwift()) {
    var swiftVoices = window._swiftVoices || [];
    if (!swiftVoices.length) {
      /* Demander les voix si pas encore reçues */
      TTS.requestSwiftVoices();
      return;
    }
    var savedId = '';
    try { savedId = localStorage.getItem('verbos_swift_voice') || ''; } catch(_e) {}

    /* Masquer l'avertissement Safari — non applicable en mode natif */
    var warn = document.getElementById('voicePickerWarning');
    if (warn) warn.style.display = 'none';

    sel.innerHTML = swiftVoices.map(function(v) {
      var qualBadge = v.quality === 'premium'  ? ' ⭐ premium'  :
                      v.quality === 'enhanced' ? ' ★ enhanced'  : '';
      var langTag   = v.language === 'pt-BR' ? ' 🇧🇷' : ' 🇵🇹';
      var label     = '✓ ' + v.name + langTag + qualBadge;
      var selected  = (v.identifier === savedId) ? ' selected' : '';
      return '<option value="' + v.identifier + '"' + selected + '>' + label + '</option>';
    }).join('');

    row.style.display = 'flex';
    return;
  }

  /* ── Mode Web Speech API classique ── */
  if (!window.speechSynthesis) return;

  var voices = window.speechSynthesis.getVoices()
    .filter(function(v) { return v.lang.toLowerCase().startsWith('pt'); });
  if (!voices.length) { return; }

  var saved = '';
  try { saved = localStorage.getItem('conjugacao_voice') || ''; } catch(_e) {}

  var isApple = /iP(hone|ad|od)/.test(navigator.userAgent) ||
                (navigator.userAgent.includes('Mac') && 'ontouchend' in document) ||
                (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent));

  var warn = document.getElementById('voicePickerWarning');
  if (warn) warn.style.display = isApple ? '' : 'none';

  sel.innerHTML = voices.map(function(v) {
    var installed = v.localService !== false;
    var langTag   = v.lang === 'pt-BR' ? ' 🇧🇷 pt-BR' : ' 🇵🇹 ' + v.lang;
    var label     = (installed ? '✓ ' : '⬇ ') + v.name + langTag + (v.default ? ' ★' : '');
    var selected  = (v.name === saved) ? ' selected' : '';
    return '<option value="' + v.name + '"' + selected + '>' + label + '</option>';
  }).join('');

  row.style.display = 'flex';
}

function selectVoice(value) {
  /* ── Mode Swift : value = identifier AVSpeech ── */
  if (typeof TTS !== 'undefined' && TTS.isNativeSwift && TTS.isNativeSwift()) {
    var swiftVoices = window._swiftVoices || [];
    var sv = swiftVoices.find(function(v) { return v.identifier === value; });
    TTS.selectSwiftVoice(value, sv ? sv.name : value);
    /* Test immédiat */
    TTS.speakDirect('Olá');
    return;
  }

  /* ── Mode Web Speech API classique ── */
  var name = value;
  try { localStorage.setItem('conjugacao_voice', name); } catch(_e) {}
  var voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  var v = voices.find(function(v) { return v.name === name; });
  if (v) {
    window._selectedVoice = v;
  }
  if (TTS && TTS.isEnabled()) {
    var utt = new SpeechSynthesisUtterance('Olá');
    utt.lang = 'pt-BR'; utt.rate = 0.85;
    if (v) utt.voice = v;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  }
}

/* Voix Swift reçues depuis TTSBridge */
document.addEventListener('tts:swift-voices-ready', function() {
  try { updateVoicePicker(); } catch(_e) {}
  try { updateVoiceInstallBtn(); } catch(_e) {}
});

document.addEventListener('tts:voices-ready', function() {
  /* Synchroniser _selectedVoice avec la voix TTS courante */
  try {
    var v = TTS.getCurrentVoice ? TTS.getCurrentVoice() : null;
    if (v) window._selectedVoice = v;
  } catch(_e) {}
  try{updateVoiceInstallBtn();}catch(_e){}
  try{updateVoiceStatus();}catch(_e){}
  try{updateVoicePicker();}catch(_e){}
});

document.addEventListener('i18n:change', function() {
  try { updateLangBtns(); } catch(e) { console.warn('i18n updateLangBtns', e); }
  try { applyI18nToDom(); } catch(e) { console.warn('i18n applyI18nToDom', e); }
  /* Reconstruire les éléments générés dynamiquement */
  try { buildConfig(); }       catch(e) { console.warn('i18n buildConfig', e); }
  try { buildRef(); }          catch(e) { console.warn('i18n buildRef', e); }
  /* Réinitialiser le flag built des thèmes Écoute */
  try {
    var ecTheme = document.getElementById('ecThemeBtns');
    if (ecTheme) delete ecTheme.dataset.built;
    Ecoute.onPageEnter();
  } catch(e) { console.warn('i18n Ecoute', e); }
  /* Reconstruire le panneau stats si visible */
  try {
    var sp = document.getElementById('statsPanel');
    if (sp && sp.style.display !== 'none') buildStatsPanel();
  } catch(e) {}
});

/* ════════════════════════════════════════════
   RETOUR SPLASH APRÈS 30 MIN D'INACTIVITÉ
   ════════════════════════════════════════════ */
(function() {
  var IDLE_MS = 30 * 60 * 1000; /* 30 minutes */
  var _idleTimer = null;

  function resetIdleTimer() {
    clearTimeout(_idleTimer);
    _idleTimer = setTimeout(function() {
      /* Fermer l'overlay Anti-Manuel si ouvert */
      try { closeAntiManuel(); } catch(e) {}
      /* Revenir au splash */
      try {
        var splash = document.getElementById('splash');
        if (splash) {
          splash.classList.remove('splash-exit');
          splash.style.display = 'flex';
          splash.style.opacity = '1';
          /* Revenir à l'onglet Exercer */
          if (typeof Router !== 'undefined') Router.go('exercer');
        }
      } catch(e) {}
    }, IDLE_MS);
  }

  /* Écouter toute interaction utilisateur */
  ['touchstart','touchend','click','keydown','scroll'].forEach(function(ev) {
    document.addEventListener(ev, resetIdleTimer, { passive: true });
  });

  resetIdleTimer(); /* démarrer au chargement */
})();
