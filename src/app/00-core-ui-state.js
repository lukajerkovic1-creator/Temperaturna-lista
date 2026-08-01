// ============================================================
  // MODULE: 00-core-ui-state.js
  // Source module; tools/build-offline-html.js inlines modules for offline use.
  // ============================================================
(() => {
  'use strict';

  // ============================================================
  // VERZIJA APLIKACIJE — jedini izvor istine
  // ============================================================
  const APP_VERSION = '__BUILD_METADATA_APP_VERSION__';
  const APP_BUILD_SHA = '__BUILD_METADATA_BUILD_SHA__';
  const PARSER_VERSION = 'temperaturna-lista-parser-v2';
  const PARSER_PROVENANCE_SCHEMA = 'temperaturna-lista-parser-provenance-v1';
  window.__TEMPERATURNA_LISTA_BUILD_SHA__ = APP_BUILD_SHA;

  // Production clinical mode is deliberately fail-closed. Development-only
  // capabilities can be enabled only by the Playwright/local QA bootstrap:
  // localhost + ?qa=... + an explicit init-script flag before app startup.
  const CLINICAL_RUNTIME_POLICY = Object.freeze({
    productionClinicalMode: true,
    disabledCapabilities: Object.freeze({
      adminDashboard: true,
      adminShortcut: true,
      parserTestCapture: true,
      therapySpeechInput: true,
      fhirClipboard: true
    })
  });

  const LOCAL_QA_RUNTIME_ENABLED = (() => {
    const hostname = String(window.location?.hostname || '').toLowerCase();
    const isLocalhost = hostname === '127.0.0.1' || hostname === 'localhost';
    const qaSearchEnabled = /(?:^|[?&])qa=/.test(String(window.location?.search || ''));
    return isLocalhost && qaSearchEnabled && window.__TEMPERATURNA_LISTA_ENABLE_QA_HOOKS__ === true;
  })();

  function isLocalQaRuntime() {
    return LOCAL_QA_RUNTIME_ENABLED;
  }

  function isProductionClinicalMode() {
    return CLINICAL_RUNTIME_POLICY.productionClinicalMode && !isLocalQaRuntime();
  }

  function isCapabilityEnabled(capability) {
    if (!isProductionClinicalMode()) return true;
    return CLINICAL_RUNTIME_POLICY.disabledCapabilities[capability] !== true;
  }

  function blockProductionOnlyControl(element, message) {
    if (!element) return;
    element.hidden = true;
    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('data-production-disabled', 'true');
    if ('disabled' in element) element.disabled = true;
    if (message) element.title = message;
  }

  function applyProductionClinicalSafetyGate() {
    const productionMode = isProductionClinicalMode();
    document.documentElement.dataset.runtimeMode = productionMode ? 'clinical-production' : 'local-qa';
    if (!productionMode) return;

    blockProductionOnlyControl(
      document.getElementById('adminToggleBtn'),
      'Administratorski i servisni alati nisu dio produkcijskog kliničkog načina.'
    );
    blockProductionOnlyControl(
      document.getElementById('audioAdvancedSection'),
      'Audio unos terapije nije odobren u produkcijskom kliničkom načinu.'
    );
    blockProductionOnlyControl(
      document.getElementById('copyFhirBundleBtn'),
      'Kopiranje FHIR podataka u clipboard nije odobreno u produkcijskom kliničkom načinu.'
    );
    blockProductionOnlyControl(
      document.getElementById('parserTestPanel'),
      'Parser testovi dostupni su samo u lokalnom QA načinu sa sintetičkim podacima.'
    );
  }

  window.__TEMPERATURNA_LISTA_RUNTIME_POLICY__ = Object.freeze({
    policy: CLINICAL_RUNTIME_POLICY,
    isLocalQaRuntime,
    isProductionClinicalMode,
    isCapabilityEnabled
  });

  // Sync into <title> and footer-note immediately at startup
  document.title = `Temperaturna lista – offline ${APP_VERSION}`;
  const _vNote = document.getElementById('appVersionNote');
  if (_vNote) _vNote.textContent = `Verzija: ${APP_VERSION} · build ${APP_BUILD_SHA}. ${_vNote.textContent}`;

  function applyAccessibilityLabels() {
    const labels = {
      adminFieldSelect: 'Odaberi tekstualno polje za kalibraciju',
      fieldAlign: 'Poravnanje teksta u odabranom okviru',
      fieldVisible: 'Vidljivost odabranog okvira na ispisu',
      nudgeStep: 'Korak pomaka za kalibraciju u pikselima',
      resetCalibrationBtn: 'Vrati zadanu kalibraciju svih okvira',
      saveCalibrationEmbeddedBtn: 'Servisni izvoz offline HTML aplikacije s ugrađenom kalibracijom',
      saveCalibrationBtn: 'Spremi postavke ispisa online',
      loadCalibrationBtn: 'Učitaj kalibraciju iz JSON datoteke',
      runBuiltInParserTestsBtn: 'Pokreni ugrađene testove parsera',
      runParserTestBtn: 'Testiraj parser na upisanom OHBP tekstu',
      clearParserTestBtn: 'Očisti tekst i rezultate testa parsera',
      loadParserRegressionFileBtn: 'Učitaj JSON datoteku s regresijskim testovima',
      runParserRegressionBtn: 'Pokreni regresijski test parsera',
      generateParserRegressionBtn: 'Generiraj i pokreni 300 pseudo OHBP testova',
      loadCapturedParserTestsBtn: 'Učitaj lokalno spremljene Ctrl Alt P testove parsera',
      downloadCapturedParserTestsBtn: 'Preuzmi lokalno spremljene Ctrl Alt P testove parsera',
      followUpControlDate: 'Datum kontrole iz ambulantnog nalaza',
      followUpControl: 'Kontrola i laboratoriji za kontrolu',
      showFollowUpControlOnList: 'Prikaži kontrolu na temperaturnoj listi',
      downloadParserRegressionCasesBtn: 'Preuzmi JSON regresijskih testova',
      downloadParserRegressionReportJsonBtn: 'Preuzmi izvještaj regresije kao JSON',
      downloadParserRegressionReportCsvBtn: 'Preuzmi izvještaj regresije kao CSV',
      canvas1: 'Živi pregled prve stranice temperaturne liste',
      canvas2: 'Živi pregled druge stranice temperaturne liste'
    };
    Object.entries(labels).forEach(([id, label]) => {
      const el = document.getElementById(id);
      if (!el || el.getAttribute('aria-label')) return;
      el.setAttribute('aria-label', label);
    });
    ['canvas1', 'canvas2'].forEach((id) => {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      canvas.setAttribute('role', 'img');
    });
  }
  applyAccessibilityLabels();
  applyProductionClinicalSafetyGate();

  // ============================================================
  // OSNOVNE POSTAVKE
  // ============================================================
  const PAGE = Object.freeze({
    // Koordinatni sustav kalibracije i živog pregleda ostaje 1754 × 1241 px.
    // Nemoj mijenjati ove vrijednosti jer su na njima temeljena postojeća admin podešavanja.
    widthPx: 1754,
    heightPx: 1241,
    // Ispis se renderira na 300 DPI za A4 landscape: 297 × 210 mm ≈ 3508 × 2480 px.
    printWidthPx: 3508,
    printHeightPx: 2480,
    printDpi: 300,
    // Predložak koji je priložen odgovara A4 landscape omjeru.
    widthMm: 297,
    heightMm: 210,
    fileNames: {
      patientData: 'temperaturna_lista_podatci.json',
      calibration: 'temperaturna_lista_kalibracija.json',
      calibratedApp: `temperaturna_lista_offline_${APP_VERSION}.html`
    }
  });

  const ADMISSION_MARKER = Object.freeze({
    enabled: true,
    radius: 4,
    stemHeight: 14,
    offsetAboveDate: 12,
    color: '#000000',
    opacity: 0.28
  });

  // ============================================================
  // PODLOGE
  // Ovdje se po potrebi mogu zamijeniti tri zasebne podloge.
  // Trenutno su sve tri postavljene na istu čistu podlogu.
  // ============================================================
  const CLEAN_BACKGROUND_ASSET_URL = new URL('assets/temperature-list-background.jpg', document.baseURI).href;
  // Posvjetljivanje podloge: 0.30 = 30% bijelog sloja preko originalne slike.
  const BACKGROUND_LIGHTEN_OPACITY = 0.30;

  document.documentElement.style.setProperty(
    '--preview-bg',
    `linear-gradient(rgba(255,255,255,${BACKGROUND_LIGHTEN_OPACITY}), rgba(255,255,255,${BACKGROUND_LIGHTEN_OPACITY})), url("${CLEAN_BACKGROUND_ASSET_URL}")`
  );

  const BACKGROUND_SOURCES = {
    page1Anchor1: CLEAN_BACKGROUND_ASSET_URL,
    page1Anchor2: CLEAN_BACKGROUND_ASSET_URL,
    page2Anchor1: CLEAN_BACKGROUND_ASSET_URL
  };

  // ============================================================
  // ZADANA KALIBRACIJA
  // Koordinate su namjerno organizirane odvojeno za sva 3 prikaza.
  // ============================================================
  // Ako je aplikacija spremljena preko gumba “Spremi postavke u HTML aplikaciju”,
  // ovdje će biti ugrađena zadnja kalibracija. Na novom računalu aplikacija je učitava
  // bez zasebne JSON datoteke.
  const EMBEDDED_CALIBRATION = {
  "version": "v163_chronic_th_dash_boundary",
  "exportedAt": "2026-05-14T10:32:00Z",
  "calibration": {
    "page1Anchor1": {
      "patientHeader": {
        "x": 727,
        "y": 171,
        "width": 610,
        "height": 32,
        "fontSize": 28,
        "lineHeight": 36,
        "textAlign": "left",
        "visible": true
      },
      "diagnosis": {
        "x": 105,
        "y": 638,
        "width": 250,
        "height": 92,
        "fontSize": 21,
        "lineHeight": 26,
        "textAlign": "left",
        "visible": true
      },
      "ohbpTherapyBox": {
        "x": 103,
        "y": 1027,
        "width": 237,
        "height": 131,
        "fontSize": 19,
        "lineHeight": 16,
        "textAlign": "left",
        "visible": true
      },
      "labBox1Days": [
        {
          "x": 367,
          "y": 721,
          "width": 86,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 24,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 587,
          "y": 520,
          "width": 86,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 24,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 802,
          "y": 520,
          "width": 86,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 24,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1018,
          "y": 520,
          "width": 86,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 24,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1232,
          "y": 520,
          "width": 86,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 24,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1447,
          "y": 520,
          "width": 88,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 24,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1555,
          "y": 520,
          "width": 91,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 24,
          "textAlign": "left",
          "visible": true
        }
      ],
      "labBox2Days": [
        {
          "x": 476,
          "y": 718,
          "width": 101,
          "height": 264,
          "fontSize": 18,
          "lineHeight": 24,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 681,
          "y": 520,
          "width": 101,
          "height": 264,
          "fontSize": 18,
          "lineHeight": 24,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 896,
          "y": 520,
          "width": 102,
          "height": 264,
          "fontSize": 18,
          "lineHeight": 24,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1112,
          "y": 520,
          "width": 100,
          "height": 264,
          "fontSize": 18,
          "lineHeight": 24,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1326,
          "y": 520,
          "width": 101,
          "height": 264,
          "fontSize": 18,
          "lineHeight": 24,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1447,
          "y": 700,
          "width": 88,
          "height": 250,
          "fontSize": 18,
          "lineHeight": 24,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1555,
          "y": 700,
          "width": 91,
          "height": 250,
          "fontSize": 18,
          "lineHeight": 24,
          "textAlign": "left",
          "visible": true
        }
      ],
      "labBox3Days": [
        {
          "x": 366,
          "y": 1049,
          "width": 321,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 587,
          "y": 998,
          "width": 195,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 802,
          "y": 998,
          "width": 196,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1018,
          "y": 998,
          "width": 194,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1232,
          "y": 998,
          "width": 195,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1447,
          "y": 998,
          "width": 88,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1555,
          "y": 998,
          "width": 91,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        }
      ],
      "labBox4Days": [
        {
          "x": 585,
          "y": 718,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 790,
          "y": 520,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1006,
          "y": 520,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1220,
          "y": 520,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1435,
          "y": 520,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1543,
          "y": 700,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1654,
          "y": 700,
          "width": 88,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        }
      ],
      "dates": [
        {
          "x": 370,
          "y": 214,
          "width": 199,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 585,
          "y": 214,
          "width": 199,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 800,
          "y": 214,
          "width": 200,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1016,
          "y": 214,
          "width": 198,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1230,
          "y": 214,
          "width": 199,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1445,
          "y": 214,
          "width": 92,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1553,
          "y": 214,
          "width": 95,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        }
      ],
      "therapy": [
        {
          "x": 372,
          "y": 338,
          "width": 316,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 587,
          "y": 338,
          "width": 315,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 802,
          "y": 338,
          "width": 316,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1018,
          "y": 338,
          "width": 314,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1232,
          "y": 338,
          "width": 296,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1447,
          "y": 338,
          "width": 182,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1555,
          "y": 338,
          "width": 180,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        }
      ],
      "hospitalDays": [
        {
          "x": 370,
          "y": 240,
          "width": 199,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 585,
          "y": 240,
          "width": 199,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 800,
          "y": 240,
          "width": 200,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1016,
          "y": 240,
          "width": 198,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1230,
          "y": 240,
          "width": 199,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1445,
          "y": 240,
          "width": 92,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1553,
          "y": 240,
          "width": 95,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        }
      ],
      "radiologyDays": [
        {
          "x": 709,
          "y": 718,
          "width": 600,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 914,
          "y": 520,
          "width": 600,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1130,
          "y": 520,
          "width": 600,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1344,
          "y": 520,
          "width": 386,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1310,
          "y": 520,
          "width": 420,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1310,
          "y": 520,
          "width": 420,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1310,
          "y": 520,
          "width": 420,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        }
      ],
      "allergiesBox": {
        "x": 105,
        "y": 338,
        "width": 250,
        "height": 56,
        "fontSize": 19,
        "lineHeight": 23,
        "textAlign": "left",
        "visible": true
      }
    },
    "page1Anchor2": {
      "patientHeader": {
        "x": 722,
        "y": 172,
        "width": 610,
        "height": 32,
        "fontSize": 31,
        "lineHeight": 35,
        "textAlign": "left",
        "visible": true
      },
      "diagnosis": {
        "x": 105,
        "y": 637,
        "width": 250,
        "height": 92,
        "fontSize": 21,
        "lineHeight": 25,
        "textAlign": "left",
        "visible": true
      },
      "ohbpTherapyBox": {
        "x": 106,
        "y": 1008,
        "width": 195,
        "height": 54,
        "fontSize": 19,
        "lineHeight": 16,
        "textAlign": "left",
        "visible": true
      },
      "labBox1Days": [
        {
          "x": 372,
          "y": 520,
          "width": 86,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 371,
          "y": 697,
          "width": 86,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 584,
          "y": 698,
          "width": 86,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 802,
          "y": 701,
          "width": 86,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1013,
          "y": 702,
          "width": 86,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1232,
          "y": 699,
          "width": 86,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1448,
          "y": 701,
          "width": 88,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        }
      ],
      "labBox2Days": [
        {
          "x": 466,
          "y": 520,
          "width": 101,
          "height": 264,
          "fontSize": 18,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 469,
          "y": 698,
          "width": 101,
          "height": 264,
          "fontSize": 18,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 684,
          "y": 697,
          "width": 101,
          "height": 264,
          "fontSize": 18,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 900,
          "y": 700,
          "width": 102,
          "height": 264,
          "fontSize": 18,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1113,
          "y": 705,
          "width": 100,
          "height": 264,
          "fontSize": 18,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1331,
          "y": 700,
          "width": 101,
          "height": 250,
          "fontSize": 18,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1553,
          "y": 702,
          "width": 88,
          "height": 250,
          "fontSize": 18,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        }
      ],
      "labBox3Days": [
        {
          "x": 372,
          "y": 998,
          "width": 195,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 367,
          "y": 1060,
          "width": 325,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 585,
          "y": 1061,
          "width": 322,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 799,
          "y": 1061,
          "width": 317,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1015,
          "y": 1058,
          "width": 320,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1223,
          "y": 1060,
          "width": 315,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1446,
          "y": 1063,
          "width": 299,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        }
      ],
      "labBox4Days": [
        {
          "x": 575,
          "y": 520,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 578,
          "y": 698,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 793,
          "y": 697,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1010,
          "y": 700,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1221,
          "y": 705,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1440,
          "y": 700,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1649,
          "y": 702,
          "width": 93,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        }
      ],
      "dates": [
        {
          "x": 370,
          "y": 214,
          "width": 199,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 371,
          "y": 214,
          "width": 199,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 586,
          "y": 214,
          "width": 200,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 802,
          "y": 216,
          "width": 198,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1017,
          "y": 217,
          "width": 199,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1232,
          "y": 217,
          "width": 198,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1446,
          "y": 217,
          "width": 204,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        }
      ],
      "therapy": [
        {
          "x": 372,
          "y": 338,
          "width": 314,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 25,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 372,
          "y": 339,
          "width": 315,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 25,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 583,
          "y": 338,
          "width": 315,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 25,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 800,
          "y": 338,
          "width": 314,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 25,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1014,
          "y": 336,
          "width": 305,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 25,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1230,
          "y": 337,
          "width": 309,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 25,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1438,
          "y": 338,
          "width": 307,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 25,
          "textAlign": "left",
          "visible": true
        }
      ],
      "hospitalDays": [
        {
          "x": 370,
          "y": 240,
          "width": 199,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 371,
          "y": 240,
          "width": 199,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 586,
          "y": 240,
          "width": 200,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 802,
          "y": 242,
          "width": 198,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1017,
          "y": 243,
          "width": 199,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1232,
          "y": 243,
          "width": 198,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1446,
          "y": 243,
          "width": 204,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        }
      ],
      "radiologyDays": [
        {
          "x": 699,
          "y": 520,
          "width": 600,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 702,
          "y": 697,
          "width": 600,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 917,
          "y": 697,
          "width": 600,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1134,
          "y": 700,
          "width": 596,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1345,
          "y": 702,
          "width": 385,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1310,
          "y": 699,
          "width": 420,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1310,
          "y": 701,
          "width": 420,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        }
      ],
      "allergiesBox": {
        "x": 105,
        "y": 338,
        "width": 250,
        "height": 56,
        "fontSize": 19,
        "lineHeight": 23,
        "textAlign": "left",
        "visible": true
      }
    },
    "page2Anchor1": {
      "patientHeader": {
        "x": 724,
        "y": 170,
        "width": 610,
        "height": 32,
        "fontSize": 31,
        "lineHeight": 35,
        "textAlign": "left",
        "visible": true
      },
      "diagnosis": {
        "x": 1446,
        "y": 108,
        "width": 250,
        "height": 92,
        "fontSize": 20,
        "lineHeight": 24,
        "textAlign": "left",
        "visible": false
      },
      "ohbpTherapyBox": {
        "x": 102,
        "y": 382,
        "width": 195,
        "height": 54,
        "fontSize": 13,
        "lineHeight": 16,
        "textAlign": "left",
        "visible": false
      },
      "labBox1Days": [
        {
          "x": 372,
          "y": 520,
          "width": 86,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 587,
          "y": 520,
          "width": 86,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 802,
          "y": 520,
          "width": 86,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1018,
          "y": 520,
          "width": 86,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1232,
          "y": 520,
          "width": 86,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1447,
          "y": 520,
          "width": 88,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1555,
          "y": 520,
          "width": 91,
          "height": 172,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        }
      ],
      "labBox2Days": [
        {
          "x": 466,
          "y": 520,
          "width": 101,
          "height": 264,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 681,
          "y": 520,
          "width": 101,
          "height": 264,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 896,
          "y": 520,
          "width": 102,
          "height": 264,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1112,
          "y": 520,
          "width": 100,
          "height": 264,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1326,
          "y": 520,
          "width": 101,
          "height": 264,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1447,
          "y": 700,
          "width": 88,
          "height": 250,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1555,
          "y": 700,
          "width": 91,
          "height": 250,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        }
      ],
      "labBox3Days": [
        {
          "x": 372,
          "y": 998,
          "width": 195,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 587,
          "y": 998,
          "width": 195,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 802,
          "y": 998,
          "width": 196,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1018,
          "y": 998,
          "width": 194,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1232,
          "y": 998,
          "width": 195,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1447,
          "y": 998,
          "width": 88,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1555,
          "y": 998,
          "width": 91,
          "height": 132,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        }
      ],
      "labBox4Days": [
        {
          "x": 575,
          "y": 520,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 790,
          "y": 520,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1006,
          "y": 520,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1220,
          "y": 520,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1435,
          "y": 520,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1543,
          "y": 700,
          "width": 112,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        },
        {
          "x": 1654,
          "y": 700,
          "width": 88,
          "height": 96,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": false
        }
      ],
      "dates": [
        {
          "x": 370,
          "y": 214,
          "width": 199,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 585,
          "y": 214,
          "width": 199,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 800,
          "y": 214,
          "width": 200,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1016,
          "y": 214,
          "width": 198,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1230,
          "y": 214,
          "width": 199,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1445,
          "y": 214,
          "width": 92,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1553,
          "y": 214,
          "width": 95,
          "height": 34,
          "fontSize": 22,
          "lineHeight": 26,
          "textAlign": "center",
          "visible": true
        }
      ],
      "therapy": [
        {
          "x": 362,
          "y": 338,
          "width": 324,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 587,
          "y": 338,
          "width": 315,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 802,
          "y": 338,
          "width": 316,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1018,
          "y": 338,
          "width": 313,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1232,
          "y": 338,
          "width": 293,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1447,
          "y": 338,
          "width": 182,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1555,
          "y": 338,
          "width": 194,
          "height": 182,
          "fontSize": 21,
          "lineHeight": 23,
          "textAlign": "left",
          "visible": true
        }
      ],
      "hospitalDays": [
        {
          "x": 370,
          "y": 240,
          "width": 199,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 585,
          "y": 240,
          "width": 199,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 800,
          "y": 240,
          "width": 200,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1016,
          "y": 240,
          "width": 198,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1230,
          "y": 240,
          "width": 199,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1445,
          "y": 240,
          "width": 92,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        },
        {
          "x": 1553,
          "y": 240,
          "width": 95,
          "height": 28,
          "fontSize": 20,
          "lineHeight": 24,
          "textAlign": "center",
          "visible": true
        }
      ],
      "radiologyDays": [
        {
          "x": 699,
          "y": 520,
          "width": 600,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 914,
          "y": 520,
          "width": 600,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1130,
          "y": 520,
          "width": 600,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1344,
          "y": 520,
          "width": 386,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1310,
          "y": 520,
          "width": 420,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1310,
          "y": 520,
          "width": 420,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        },
        {
          "x": 1310,
          "y": 520,
          "width": 420,
          "height": 42,
          "fontSize": 18,
          "lineHeight": 22,
          "textAlign": "left",
          "visible": true
        }
      ],
      "allergiesBox": {
        "x": 1446,
        "y": 338,
        "width": 250,
        "height": 56,
        "fontSize": 19,
        "lineHeight": 23,
        "textAlign": "left",
        "visible": false
      }
    }
  }
};

  const DAY_BOUNDS = [362, 577, 792, 1008, 1222, 1437, 1545, 1656];
  // Kontrola iz ambulantnog nalaza mora vizualno biti u zoni standardnog laboratorija,
  // a ne u gornjoj terapijskoj zoni. Ako laboratorijski okvir iz kalibracije ima prenizak
  // Y iz starijih verzija, kontrola se spušta barem do ove razine.
  const FOLLOW_UP_CONTROL_DEFAULT_LAB_Y = 700;
  const VITAL_SIGNS_DEFAULT_Y = 1142;
  const VITAL_SIGNS_URINE_GAP = 4;
  const URINE_LAB_DEFAULT_Y = 790;
  const URINE_LAB_GAP_AFTER_LABS = 8;
  const MICROBIOLOGY_FONT_SIZE = 18;
  const MICROBIOLOGY_LINE_HEIGHT = 22;
  const MICROBIOLOGY_AFTER_URINE_GAP = 6;
  const MICROBIOLOGY_FONT_WEIGHT = '900';
  const HEMOCULTURE_FONT_SIZE = 22;
  const HEMOCULTURE_LINE_HEIGHT = 26;
  const HEMOCULTURE_GAP_ABOVE_LAB = 8;
  const PATIENT_ORIGIN_OFFSET_BELOW_ALLERGIES = Math.round(PAGE.heightPx / PAGE.heightMm * 20);

  const MICROBIOLOGY_SAMPLE_DEFS = Object.freeze([
    { key: 'microHemocultures', shortLabel: 'HKx2', position: 'hemocultures' },
    { key: 'microUrineCulture', shortLabel: 'Urinokultura', position: 'urine' },
    { key: 'microStoolBacteriology', shortLabel: 'Stolica bakt.', position: 'stool' },
    { key: 'microStoolCdiff', shortLabel: 'Stolica na Cl. diff.', position: 'stool' },
    { key: 'microStoolVirology', shortLabel: 'Stolica virusološki', position: 'stool' }
  ]);

  function buildDateFields() {
    return DAY_BOUNDS.slice(0, -1).map((left, i) => ({
      x: left + 8,
      y: 214,
      width: DAY_BOUNDS[i + 1] - left - 16,
      height: 34,
      fontSize: 22,
      lineHeight: 26,
      textAlign: 'center',
      visible: true
    }));
  }

  function buildHospitalDayFields() {
    return buildDateFields().map((dateField) => ({
      x: dateField.x,
      y: dateField.y + 28,
      width: dateField.width,
      height: 28,
      fontSize: 20,
      lineHeight: 24,
      textAlign: 'center',
      visible: true
    }));
  }

  function buildTherapyFields() {
    return DAY_BOUNDS.slice(0, -1).map((left, i) => ({
      x: left + 10,
      y: 338,
      width: DAY_BOUNDS[i + 1] - left - 18,
      height: 182,
      fontSize: 20,
      lineHeight: 24,
      textAlign: 'left',
      visible: true
    }));
  }

  function buildVitalSignsDayFields(visible = true) {
    return buildDateFields().map((dateField) => ({
      // Vitalni parametri se ispisuju samo za dan prijema.
      // Lijevi rub je poravnat s datumom tog dana; donji rub je neposredno iznad donjeg ruba liste.
      x: dateField.x,
      y: VITAL_SIGNS_DEFAULT_Y,
      width: dateField.width,
      height: 68,
      fontSize: 18,
      lineHeight: 22,
      textAlign: 'left',
      visible
    }));
  }

  function buildFollowUpControlDayFields(visible = true) {
    return buildLabDayFields(1, visible).map((labField) => ({
      // Kontrola iz ambulantnog nalaza ispisuje se u stupcu stvarnog datuma kontrole.
      // Položaj je vezan uz normalni laboratorijski okvir tog dana, da gornji rub bude
      // u istoj visini kao standardni laboratorij, a ne u gornjoj terapijskoj zoni.
      x: labField.x,
      y: Math.max(Number(labField.y || 0), FOLLOW_UP_CONTROL_DEFAULT_LAB_Y),
      width: labField.width,
      height: Math.max(Number(labField.height || 0), 118),
      fontSize: 18,
      lineHeight: 22,
      textAlign: 'left',
      visible
    }));
  }

  function buildOhbpTherapyField(visible = true) {
    return {
      // Zaseban okvir na 1. stranici, u lijevom terapijskom prostoru predloška.
      // Može se precizno pomaknuti i promijeniti u admin načinu kao ostali okviri.
      x: 102,
      y: 382,
      width: 195,
      height: 54,
      fontSize: 13,
      lineHeight: 16,
      textAlign: 'left',
      visible
    };
  }

  function buildAllergiesField(visible = true) {
    return {
      // v163: kronična terapija prepoznaje i anamnezički “Th - …”; v162: parser granice za radiologiju prije ABS/(aK) i dijagnozu prije postavljanja UK; v161: zaseban okvir alergija u gornjem lijevom kvadrantu.
      // Lijevi rub poravnat je s dijagnozama, a gornji rub s kroničnom terapijom.
      x: 105,
      y: 338,
      width: 250,
      height: 56,
      fontSize: 19,
      lineHeight: 23,
      textAlign: 'left',
      visible
    };
  }

  function buildPatientOriginFieldFromAllergies(allergyField, visible = true) {
    const base = allergyField || buildAllergiesField(visible);
    return {
      x: Number(base.x || 0),
      y: Number(base.y || 0) + Number(base.height || 0) + PATIENT_ORIGIN_OFFSET_BELOW_ALLERGIES,
      width: Number(base.width || 250),
      height: 54,
      fontSize: Number(base.fontSize || 19),
      lineHeight: Number(base.lineHeight || 23),
      textAlign: base.textAlign || 'left',
      visible
    };
  }

  function buildPatientOriginField(visible = true) {
    return buildPatientOriginFieldFromAllergies(buildAllergiesField(visible), visible);
  }

  function buildLabDayFields(boxNumber, includeLabs) {
    return DAY_BOUNDS.slice(0, -1).map((left, i) => {
      const right = DAY_BOUNDS[i + 1];
      const columnWidth = right - left;
      const innerLeft = left + 10;
      const innerWidth = Math.max(70, columnWidth - 20);
      const compactPair = columnWidth < 170;

      if (boxNumber === 1) {
        return {
          x: innerLeft,
          y: 520,
          width: compactPair ? innerWidth : Math.min(86, Math.floor(innerWidth * 0.46)),
          height: 172,
          fontSize: 20,
          lineHeight: 24,
          textAlign: 'left',
          visible: includeLabs
        };
      }

      if (boxNumber === 2 || boxNumber === 4) {
        const box1Width = compactPair ? innerWidth : Math.min(86, Math.floor(innerWidth * 0.46));
        const box2X = compactPair ? innerLeft : innerLeft + box1Width + 8;
        const box2Y = compactPair ? 700 : 520;
        const box2Width = compactPair ? innerWidth : Math.max(70, innerWidth - box1Width - 8);
        if (boxNumber === 2) {
          return {
            x: box2X,
            y: box2Y,
            width: box2Width,
            height: compactPair ? 250 : 264,
            fontSize: 20,
            lineHeight: 24,
            textAlign: 'left',
            visible: includeLabs
          };
        }
        const coagX = box2X + box2Width + 8;
        return {
          x: coagX,
          y: box2Y,
          width: Math.max(76, Math.min(112, PAGE.widthPx - 12 - coagX)),
          height: 96,
          fontSize: 20,
          lineHeight: 24,
          textAlign: 'left',
          visible: includeLabs
        };
      }

      return {
        x: innerLeft,
        y: URINE_LAB_DEFAULT_Y,
        width: innerWidth,
        height: 132,
        fontSize: 20,
        lineHeight: 24,
        textAlign: 'left',
        visible: includeLabs
      };
    });
  }

  function buildRadiologyDayFields(visible = true) {
    return DAY_BOUNDS.slice(0, -1).map((left, i) => {
      const right = DAY_BOUNDS[i + 1];
      const columnWidth = right - left;
      const innerLeft = left + 10;
      const innerWidth = Math.max(70, columnWidth - 20);
      const compactPair = columnWidth < 170;
      const lab1Width = compactPair ? innerWidth : Math.min(86, Math.floor(innerWidth * 0.46));
      const lab2X = compactPair ? innerLeft : innerLeft + lab1Width + 8;
      const lab2Width = compactPair ? innerWidth : Math.max(70, innerWidth - lab1Width - 8);
      const preferredX = compactPair ? innerLeft + 74 : lab2X + lab2Width + 14;
      const preferredWidth = compactPair ? 360 : 560;
      const minWidth = compactPair ? 220 : 300;
      const maxRight = PAGE.widthPx - 24;
      const width = Math.min(preferredWidth, Math.max(minWidth, maxRight - preferredX));
      const x = preferredX + width > maxRight ? Math.max(362, maxRight - width) : preferredX;
      return {
        // RTG/UZV je zadano u zoni laboratorija, neposredno desno od laboratorijskih stupaca.
        // Ako postoji ugrađena kalibracija, precizne koordinate se uzimaju iz labBox1/2/4 za svaki dan.
        x,
        y: compactPair ? 700 : 720,
        width,
        height: 54,
        fontSize: 20,
        lineHeight: 24,
        textAlign: 'left',
        visible
      };
    });
  }

  function buildLayoutBase(includeDiagnosis) {
    return {
      patientHeader: {
        x: 610,
        y: 151,
        width: 610,
        height: 32,
        fontSize: 30,
        lineHeight: 34,
        textAlign: 'left',
        visible: true
      },
      diagnosis: {
        x: 1446,
        y: 108,
        width: 250,
        height: 92,
        fontSize: 20,
        lineHeight: 24,
        textAlign: 'left',
        visible: includeDiagnosis
      },
      allergiesBox: buildAllergiesField(includeDiagnosis),
      patientOriginBox: buildPatientOriginField(includeDiagnosis),
      ohbpTherapyBox: buildOhbpTherapyField(includeDiagnosis),
      labBox1Days: buildLabDayFields(1, includeDiagnosis),
      labBox2Days: buildLabDayFields(2, includeDiagnosis),
      labBox3Days: buildLabDayFields(3, includeDiagnosis),
      labBox4Days: buildLabDayFields(4, includeDiagnosis),
      radiologyDays: buildRadiologyDayFields(includeDiagnosis),
      vitalSignsDays: buildVitalSignsDayFields(includeDiagnosis),
      followUpControlDays: buildFollowUpControlDayFields(true),
      dates: buildDateFields(),
      hospitalDays: buildHospitalDayFields(),
      therapy: buildTherapyFields()
    };
  }

  const DEFAULT_COORDS = {
    page1Anchor1: buildLayoutBase(true),
    page1Anchor2: buildLayoutBase(true),
    page2Anchor1: buildLayoutBase(false)
  };

  function shiftDayFieldsOneColumnLeft(fields) {
    return fields.map((field, index) => {
      if (index === 0) return { ...field };
      const previousColumn = fields[index - 1];
      return {
        ...field,
        x: previousColumn.x,
        width: previousColumn.width
      };
    });
  }

  // Na 1. stranici s prijemom od utorka nadalje podloga vizualno pomiče stupce ulijevo:
  // utorak koristi prvi vidljivi stupac, srijeda drugi itd.
  // Zato laboratorijska polja za page1Anchor2 ostaju vezana uz stvarni dan u tjednu,
  // ali njihove koordinate moraju biti jedan stupac lijevo kako bi sjedila uz prikazani datum.
  DEFAULT_COORDS.page1Anchor2.labBox1Days = shiftDayFieldsOneColumnLeft(DEFAULT_COORDS.page1Anchor2.labBox1Days);
  DEFAULT_COORDS.page1Anchor2.labBox2Days = shiftDayFieldsOneColumnLeft(DEFAULT_COORDS.page1Anchor2.labBox2Days);
  DEFAULT_COORDS.page1Anchor2.labBox3Days = shiftDayFieldsOneColumnLeft(DEFAULT_COORDS.page1Anchor2.labBox3Days);
  DEFAULT_COORDS.page1Anchor2.labBox4Days = shiftDayFieldsOneColumnLeft(DEFAULT_COORDS.page1Anchor2.labBox4Days);
  DEFAULT_COORDS.page1Anchor2.radiologyDays = shiftDayFieldsOneColumnLeft(DEFAULT_COORDS.page1Anchor2.radiologyDays);
  DEFAULT_COORDS.page1Anchor2.followUpControlDays = shiftDayFieldsOneColumnLeft(DEFAULT_COORDS.page1Anchor2.followUpControlDays);

  // Dodatne sitne razlike između prikaza već su odvojene i spremne za kalibraciju.
  DEFAULT_COORDS.page1Anchor2.patientHeader.x = 610;
  DEFAULT_COORDS.page2Anchor1.patientHeader.x = 610;

  const STORAGE_KEYS = Object.freeze({
    calibration: 'temperaturna_lista_kalibracija_v10', // v10: v161 dodan okvir alergija; v162 parser korekcije ne mijenjaju kalibraciju.
    patientDraft: 'temperaturna_lista_pacijent_sifrirani_draft_v2',
    legacyPatientDraft: 'temperaturna_lista_pacijent_autosave_v1',
    therapyCsv: 'temperaturna_lista_lijekovi_csv_v1',
    therapyExceptions: 'temperaturna_lista_lijekovi_iznimke_v1',
    legacyTherapyAutocompleteUsage: 'temperaturna_lista_kronicna_terapija_autocomplete_ucestalost_v1',
    therapyFavoritesPersonalCache: 'temperaturna_lista_osobne_terapije_cache_v1',
    therapyFavoritesSharedCache: 'temperaturna_lista_zajednicke_terapije_cache_v1',
    therapyFavoritesMigration: 'temperaturna_lista_terapije_migracija_v1',
    diagnosisAutocompleteUsage: 'temperaturna_lista_dijagnoze_autocomplete_ucestalost_v1',
    parserTestCaptures: 'temperaturna_lista_parser_test_cases_v1',
    operationalAudit: 'temperaturna_lista_operativni_audit_v1'
  });
  let activePersonalSuggestionsStorageUserId = 'local';

  function normalizePersonalStorageUserId(value) {
    return String(value || 'local')
      .replace(/[^A-Za-z0-9_-]/g, '_')
      .slice(0, 80) || 'local';
  }

  function getPersonalSuggestionsStorageKey(baseKey) {
    const userId = normalizePersonalStorageUserId(activePersonalSuggestionsStorageUserId);
    return userId === 'local' ? baseKey : `${baseKey}__user_${userId}`;
  }

  const PATIENT_DRAFT_SCHEMA_VERSION = 2;
  const PATIENT_DRAFT_ENCRYPTION_SCHEMA = 'temperaturna-lista-encrypted-patient-draft-v1';
  const DOWNTIME_BACKUP_SCHEMA = 'temperaturna-lista-encrypted-downtime-backup-v2';
  const DOWNTIME_BACKUP_PAYLOAD_SCHEMA = 'temperaturna-lista-downtime-backup-payload-v1';
  const LEGACY_CLEARTEXT_DOWNTIME_BACKUP_SCHEMA = 'temperaturna-lista-downtime-backup-v1';
  const CLINICAL_RECORD_SCHEMA = 'temperaturna-lista-clinical-record-v1';
  const FHIR_EXPORT_SCHEMA = 'temperaturna-lista-fhir-export-v1';
  const FHIR_VERSION = '4.0.1';
  const FHIR_EXPERIMENTAL_TAG_SYSTEM = 'urn:temperaturna-lista:fhir:CodeSystem/export-status';
  const FHIR_PROFILE_BASE = 'urn:temperaturna-lista:fhir:StructureDefinition';
  const FHIR_RESOURCE_PROFILES = Object.freeze({
    Bundle: `${FHIR_PROFILE_BASE}:bundle-experimental-v1`,
    Patient: `${FHIR_PROFILE_BASE}:patient-experimental-v1`,
    Encounter: `${FHIR_PROFILE_BASE}:encounter-experimental-v1`,
    Condition: `${FHIR_PROFILE_BASE}:condition-experimental-v1`,
    AllergyIntolerance: `${FHIR_PROFILE_BASE}:allergy-intolerance-experimental-v1`,
    MedicationStatement: `${FHIR_PROFILE_BASE}:medication-statement-experimental-v1`,
    Observation: `${FHIR_PROFILE_BASE}:observation-experimental-v1`,
    DiagnosticReport: `${FHIR_PROFILE_BASE}:diagnostic-report-experimental-v1`,
    Provenance: `${FHIR_PROFILE_BASE}:provenance-experimental-v1`
  });
  const PARSER_TEST_SANITIZER_VERSION = 'parser-test-sanitizer-v1';
  const RETENTION_POLICY = Object.freeze({
    patientDays: 90,
    localDraftHours: 12,
    parserTestDays: 30,
    auditDays: 3650
  });
  const PATIENT_DRAFT_STORAGE_MODES = Object.freeze({
    DISABLED: 'disabled',
    ENCRYPTED_LOCAL: 'encrypted-local'
  });
  const PATIENT_DRAFT_TTL_MS = RETENTION_POLICY.localDraftHours * 60 * 60 * 1000;
  const PATIENT_DRAFT_PBKDF2_ITERATIONS = 120000;
  const DOWNTIME_BACKUP_MIN_PASSPHRASE_LENGTH = 12;
  const PATIENT_DRAFT_SAVE_DEBOUNCE_MS = 650;
  const FIREBASE_PATIENT_AUTO_SAVE_DEBOUNCE_MS = 1800;
  const FIREBASE_PATIENT_RETENTION_DAYS = RETENTION_POLICY.patientDays;
  const PARSER_TEST_CAPTURE_LOCAL_LIMIT = 200;
  const LOCAL_PATIENT_STORAGE_ONLY = true;
  const PATIENT_MODES = Object.freeze({
    OUTPATIENT: 'outpatient',
    WARD: 'ward'
  });
  const DEFAULT_PATIENT_MODE = PATIENT_MODES.WARD;
  const PATIENT_MODE_LABELS = Object.freeze({
    [PATIENT_MODES.OUTPATIENT]: 'Ambulantni pacijent',
    [PATIENT_MODES.WARD]: 'Odjelni pacijent'
  });

  const FIREBASE_SDK_VERSION = '12.14.0';
  const FIREBASE_PATIENTS_COLLECTION = 'patients';
  const FIREBASE_PATIENT_AUDIT_EVENTS_COLLECTION = 'patientAuditEvents';
  const FIREBASE_USER_PROFILES_COLLECTION = 'userProfiles';
  const FIREBASE_PARSER_TEST_CASES_COLLECTION = 'parserTestCases';
  const FIREBASE_APP_CONFIG_COLLECTION = 'appConfig';
  const FIREBASE_PRINT_CALIBRATION_CONFIG_ID = 'printCalibration';
  const FIREBASE_PRINT_CALIBRATION_SCHEMA = 'temperaturna-lista-print-calibration-v1';
  const FIREBASE_PATIENT_AUDIT_SCHEMA = 'temperaturna-lista-audit-v1';
  const FIREBASE_PATIENT_CONFLICT_EVENTS = Object.freeze({
    DETECTED: 'patient.conflictDetected',
    MERGED: 'patient.conflictMerged',
    SAVED_AS_COPY: 'patient.conflictSavedAsCopy'
  });
  const FIREBASE_PATIENT_STATUSES = Object.freeze({
    ACTIVE: 'active',
    DELETED: 'deleted'
  });
  const FIREBASE_LOGIN_GATE_SESSION_KEY = 'temperaturna_lista_firebase_login_gate_dismissed_v1';
  const FIREBASE_SMOKE_CLIENT_GLOBAL = '__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__';
  const CLINICAL_ACCESS_MODEL_VERSION = 'organization-ward-role-v1';
  const CLINICAL_PARTITION_PREFIX = 'clinical-v1';
  const DEFAULT_CLINICAL_ORGANIZATION_ID = 'temperaturna-lista-dev';
  const DEFAULT_CLINICAL_ROLE = 'clinician';
  const CLINICAL_PATIENT_ACCESS_ROLES = Object.freeze(['clinician', 'physician', 'nurse', 'admin']);
  const CLINICAL_ARCHIVE_MANAGER_ROLES = Object.freeze(['admin']);
  const SUPER_ADMIN_EMAILS = Object.freeze(['luka.jerkovic1@gmail.com']);
  const FIREBASE_CONFIG = Object.freeze({
    apiKey: 'AIzaSyBaYql6bCSQO-2t0Qkkt46zHLapO_cFZAY',
    authDomain: 'temperaturna-lista-dev.firebaseapp.com',
    projectId: 'temperaturna-lista-dev',
    storageBucket: 'temperaturna-lista-dev.firebasestorage.app',
    messagingSenderId: '560087577992',
    appId: '1:560087577992:web:daf7c708859a447c1ab63d'
  });

  const DIAGNOSIS_AUTOCOMPLETE_PREFIX_RE = /^\s*(?:[-\u2013\u2014*\u2022]+|\d+[.)]|\b(?:dg|dijagnoza)\b\s*[:.\-\u2013\u2014]?)\s*/i;

  const FIELD_LABELS = {
    patientHeader: 'Ime i prezime + godište',
    diagnosis: 'Dijagnoza',
    allergiesBox: 'Alergije na lijekove',
    patientOriginBox: 'Od kuda je pacijent',
    ohbpTherapyBox: 'Terapija u OHBP-u na listi',
    labBox1Days: 'Laboratorij 1',
    labBox2Days: 'Laboratorij 2',
    labBox3Days: 'Laboratorij urin',
    labBox4Days: 'Laboratorij koagulacija',
    radiologyDays: 'Radiologija RTG/UZV',
    vitalSignsDays: 'Vitalni parametri',
    followUpControlDays: 'Kontrola',
    therapy: 'Kronična terapija',
    hospitalDays: 'Redni broj dana hospitalizacije'
  };

  const LAYOUT_LABELS = {
    page1Anchor1: '1. stranica / anchor1',
    page1Anchor2: '1. stranica / anchor2',
    page2Anchor1: '2. stranica / anchor1'
  };

  const els = {
    appRoot: document.getElementById('appRoot'),
    fullName: document.getElementById('fullName'),
    birthYear: document.getElementById('birthYear'),
    diagnosis: document.getElementById('diagnosis'),
    diagnosisAutocompleteBox: document.getElementById('diagnosisAutocompleteBox'),
    allergies: document.getElementById('allergies'),
    patientOrigin: document.getElementById('patientOrigin'),
    therapy: document.getElementById('therapy'),
    therapyAutocompleteBox: document.getElementById('therapyAutocompleteBox'),
    medicationAutocompleteDisclaimer: document.getElementById('medicationAutocompleteDisclaimer'),
    medicationSafetyPanel: document.getElementById('medicationSafetyPanel'),
    medicationSafetySummary: document.getElementById('medicationSafetySummary'),
    medicationSafetyDetails: document.getElementById('medicationSafetyDetails'),
    therapyFavoritesSettings: document.getElementById('therapyFavoritesSettings'),
    therapyFavoritesSyncStatus: document.getElementById('therapyFavoritesSyncStatus'),
    personalTherapyFavoritesList: document.getElementById('personalTherapyFavoritesList'),
    sharedTherapyFavoritesList: document.getElementById('sharedTherapyFavoritesList'),
    personalTherapyFavoriteForm: document.getElementById('personalTherapyFavoriteForm'),
    sharedTherapyFavoriteForm: document.getElementById('sharedTherapyFavoriteForm'),
    personalTherapyFavoriteName: document.getElementById('personalTherapyFavoriteName'),
    personalTherapyFavoriteStrength: document.getElementById('personalTherapyFavoriteStrength'),
    personalTherapyFavoriteFormText: document.getElementById('personalTherapyFavoriteFormText'),
    personalTherapyFavoriteRegimen: document.getElementById('personalTherapyFavoriteRegimen'),
    personalTherapyFavoritePreview: document.getElementById('personalTherapyFavoritePreview'),
    personalTherapyFavoriteCancelBtn: document.getElementById('personalTherapyFavoriteCancelBtn'),
    sharedTherapyFavoriteName: document.getElementById('sharedTherapyFavoriteName'),
    sharedTherapyFavoriteStrength: document.getElementById('sharedTherapyFavoriteStrength'),
    sharedTherapyFavoriteFormText: document.getElementById('sharedTherapyFavoriteFormText'),
    sharedTherapyFavoriteRegimen: document.getElementById('sharedTherapyFavoriteRegimen'),
    sharedTherapyFavoritePreview: document.getElementById('sharedTherapyFavoritePreview'),
    sharedTherapyFavoriteCancelBtn: document.getElementById('sharedTherapyFavoriteCancelBtn'),
    exportPersonalTherapyFavoritesBtn: document.getElementById('exportPersonalTherapyFavoritesBtn'),
    importPersonalTherapyFavoritesBtn: document.getElementById('importPersonalTherapyFavoritesBtn'),
    personalTherapyFavoritesInput: document.getElementById('personalTherapyFavoritesInput'),
    exportSharedTherapyFavoritesBtn: document.getElementById('exportSharedTherapyFavoritesBtn'),
    importSharedTherapyFavoritesBtn: document.getElementById('importSharedTherapyFavoritesBtn'),
    sharedTherapyFavoritesInput: document.getElementById('sharedTherapyFavoritesInput'),
    therapyEditor: document.getElementById('therapyEditor'),
    therapyValidationControls: document.getElementById('therapyValidationControls'),
    therapyLoadCsvBtn: document.getElementById('therapyLoadCsvBtn'),
    therapyValidateBtn: document.getElementById('therapyValidateBtn'),
    therapyDeleteNonDrugBtn: document.getElementById('therapyDeleteNonDrugBtn'),
    therapyUndoBtn: document.getElementById('therapyUndoBtn'),
    therapyCsvInput: document.getElementById('therapyCsvInput'),
    therapyCsvStatus: document.getElementById('therapyCsvStatus'),
    chronicTherapyAdmissionWarning: document.getElementById('chronicTherapyAdmissionWarning'),
    therapyValidationResults: document.getElementById('therapyValidationResults'),
    therapySpeechBtn: document.getElementById('therapySpeechBtn'),
    therapySpeechStatus: document.getElementById('therapySpeechStatus'),
    therapyMicState: document.getElementById('therapyMicState'),
    ohbpTherapy: document.getElementById('ohbpTherapy'),
    ohbpTherapySpeechBtn: document.getElementById('ohbpTherapySpeechBtn'),
    ohbpTherapySpeechStatus: document.getElementById('ohbpTherapySpeechStatus'),
    ohbpTherapyMicState: document.getElementById('ohbpTherapyMicState'),
    vitalSigns: document.getElementById('vitalSigns'),
    followUpControlDate: document.getElementById('followUpControlDate'),
    followUpControlDatePicker: document.getElementById('followUpControlDatePicker'),
    followUpControl: document.getElementById('followUpControl'),
    microHemocultures: document.getElementById('microHemocultures'),
    microUrineCulture: document.getElementById('microUrineCulture'),
    microStoolBacteriology: document.getElementById('microStoolBacteriology'),
    microStoolCdiff: document.getElementById('microStoolCdiff'),
    microStoolVirology: document.getElementById('microStoolVirology'),
    labRaw: document.getElementById('labRaw'),
    radiologyRaw: document.getElementById('radiologyRaw'),
    departmentParserPanel: document.getElementById('departmentParserPanel'),
    ohbpPasteBox: document.getElementById('ohbpPasteBox'),
    ohbpParseStatus: document.getElementById('ohbpParseStatus'),
    ambulatoryParserPanel: document.getElementById('ambulatoryParserPanel'),
    ambulatoryPasteBox: document.getElementById('ambulatoryPasteBox'),
    ambulatoryDiagnosis: document.getElementById('ambulatoryDiagnosis'),
    ambulatoryParseBtn: document.getElementById('ambulatoryParseBtn'),
    ambulatoryParserStatus: document.getElementById('ambulatoryParserStatus'),
    ambulatoryRecognizedControl: document.getElementById('ambulatoryRecognizedControl'),
    ambulatoryRecognizedTests: document.getElementById('ambulatoryRecognizedTests'),
    ambulatoryRecognizedDiagnosis: document.getElementById('ambulatoryRecognizedDiagnosis'),
    quickIdentityCard: document.getElementById('quickIdentityCard'),
    quickIdentityStatus: document.getElementById('quickIdentityStatus'),
    quickIdentitySummary: document.getElementById('quickIdentitySummary'),
    quickPrintCard: document.getElementById('quickPrintCard'),
    quickPrintStatus: document.getElementById('quickPrintStatus'),
    quickPrintSummary: document.getElementById('quickPrintSummary'),
    quickPrintChecklist: document.getElementById('quickPrintChecklist'),
    printChecklist: document.getElementById('printChecklist'),
    printChecklistStatus: document.getElementById('printChecklistStatus'),
    patientModeOutpatientBtn: document.getElementById('patientModeOutpatientBtn'),
    patientModeWardBtn: document.getElementById('patientModeWardBtn'),
    admissionDate: document.getElementById('admissionDate'),
    admissionDatePicker: document.getElementById('admissionDatePicker'),
    showTherapyMonday2: document.getElementById('showTherapyMonday2'),
    showDiagnosisOnList: document.getElementById('showDiagnosisOnList'),
    showAllergiesOnList: document.getElementById('showAllergiesOnList'),
    showPatientOriginOnList: document.getElementById('showPatientOriginOnList'),
    showTherapyOnList: document.getElementById('showTherapyOnList'),
    showOhbpTherapyOnList: document.getElementById('showOhbpTherapyOnList'),
    showVitalSignsOnList: document.getElementById('showVitalSignsOnList'),
    showFollowUpControlOnList: document.getElementById('showFollowUpControlOnList'),
    showLabsOnList: document.getElementById('showLabsOnList'),
    showRadiologyOnList: document.getElementById('showRadiologyOnList'),
    newBtn: document.getElementById('newBtn'),
    saveDataBtn: document.getElementById('saveDataBtn'),
    downloadFhirBundleBtn: document.getElementById('downloadFhirBundleBtn'),
    copyFhirBundleBtn: document.getElementById('copyFhirBundleBtn'),
    loadDataBtn: document.getElementById('loadDataBtn'),
    patientDraftStatus: document.getElementById('patientDraftStatus'),
    patientDraftAdvancedStatus: document.getElementById('patientDraftAdvancedStatus'),
    enableEncryptedPatientDraftBtn: document.getElementById('enableEncryptedPatientDraftBtn'),
    restorePatientDraftBtn: document.getElementById('restorePatientDraftBtn'),
    downloadPatientBackupBtn: document.getElementById('downloadPatientBackupBtn'),
    downtimeBackupStatus: document.getElementById('downtimeBackupStatus'),
    downloadDowntimeBackupBtn: document.getElementById('downloadDowntimeBackupBtn'),
    loadDowntimeBackupBtn: document.getElementById('loadDowntimeBackupBtn'),
    clearPatientDraftBtn: document.getElementById('clearPatientDraftBtn'),
    openFirebasePatientDialogBtn: document.getElementById('openFirebasePatientDialogBtn'),
    savePatientTopBtn: document.getElementById('savePatientTopBtn'),
    newPatientEntryBtn: document.getElementById('newPatientEntryBtn'),
    firebasePatientQuickStatus: document.getElementById('firebasePatientQuickStatus'),
    patientSyncStatus: document.getElementById('patientSyncStatus'),
    appAvailabilityStatus: document.getElementById('appAvailabilityStatus'),
    firebasePatientAuthStatus: document.getElementById('firebasePatientAuthStatus'),
    firebasePatientSignInBtn: document.getElementById('firebasePatientSignInBtn'),
    firebasePatientSignOutBtn: document.getElementById('firebasePatientSignOutBtn'),
    firebaseUserPanel: document.getElementById('firebaseUserPanel'),
    firebaseUserPanelToggleBtn: document.getElementById('firebaseUserPanelToggleBtn'),
    firebaseUserPanelBody: document.getElementById('firebaseUserPanelBody'),
    firebaseUserAvatar: document.getElementById('firebaseUserAvatar'),
    firebaseUserPanelName: document.getElementById('firebaseUserPanelName'),
    firebaseUserPanelMeta: document.getElementById('firebaseUserPanelMeta'),
    firebaseUserPanelStatus: document.getElementById('firebaseUserPanelStatus'),
    firebaseUserSwitchBtn: document.getElementById('firebaseUserSwitchBtn'),
    firebaseUserNewBtn: document.getElementById('firebaseUserNewBtn'),
    firebaseUserSignOutBtn: document.getElementById('firebaseUserSignOutBtn'),
    firebaseUserMigrateLegacyPatientsBtn: document.getElementById('firebaseUserMigrateLegacyPatientsBtn'),
    savePatientToFirebaseBtn: document.getElementById('savePatientToFirebaseBtn'),
    refreshFirebasePatientsBtn: document.getElementById('refreshFirebasePatientsBtn'),
    firebasePatientSelect: document.getElementById('firebasePatientSelect'),
    loadPatientFromFirebaseBtn: document.getElementById('loadPatientFromFirebaseBtn'),
    deletePatientFromFirebaseBtn: document.getElementById('deletePatientFromFirebaseBtn'),
    firebaseLoginGate: document.getElementById('firebaseLoginGate'),
    firebaseLoginGateStatus: document.getElementById('firebaseLoginGateStatus'),
    firebaseLoginGateSignInBtn: document.getElementById('firebaseLoginGateSignInBtn'),
    firebaseLoginGateContinueOfflineBtn: document.getElementById('firebaseLoginGateContinueOfflineBtn'),
    firebaseLoginGateNewUserBtn: document.getElementById('firebaseLoginGateNewUserBtn'),
    firebaseRegistrationForm: document.getElementById('firebaseRegistrationForm'),
    firebaseRegisterFirstName: document.getElementById('firebaseRegisterFirstName'),
    firebaseRegisterLastName: document.getElementById('firebaseRegisterLastName'),
    firebaseRegisterDepartment: document.getElementById('firebaseRegisterDepartment'),
    firebaseRegisterEmail: document.getElementById('firebaseRegisterEmail'),
    firebaseRegisterSubmitBtn: document.getElementById('firebaseRegisterSubmitBtn'),
    firebaseRegisterBackBtn: document.getElementById('firebaseRegisterBackBtn'),
    firebasePatientDialog: document.getElementById('firebasePatientDialog'),
    firebasePatientDialogStatus: document.getElementById('firebasePatientDialogStatus'),
    firebasePatientSearchInput: document.getElementById('firebasePatientSearchInput'),
    firebasePatientDialogList: document.getElementById('firebasePatientDialogList'),
    firebasePatientDialogCloseBtn: document.getElementById('firebasePatientDialogCloseBtn'),
    firebasePatientDialogRefreshBtn: document.getElementById('firebasePatientDialogRefreshBtn'),
    firebasePatientDialogSignInBtn: document.getElementById('firebasePatientDialogSignInBtn'),
    firebasePatientDialogOutpatientModeBtn: document.getElementById('firebasePatientDialogOutpatientModeBtn'),
    firebasePatientDialogWardModeBtn: document.getElementById('firebasePatientDialogWardModeBtn'),
    firebasePatientShowArchivedFilter: document.getElementById('firebasePatientShowArchivedFilter'),
    firebasePatientShowArchivedToggle: document.getElementById('firebasePatientShowArchivedToggle'),
    parserProvenancePanel: document.getElementById('parserProvenancePanel'),
    parserProvenanceSummary: document.getElementById('parserProvenanceSummary'),
    parserProvenanceList: document.getElementById('parserProvenanceList'),
    printBtn: document.getElementById('printBtn'),
    dataAdminAdvancedSection: document.getElementById('dataAdminAdvancedSection'),
    dataAdminAdvancedTitle: document.querySelector('#dataAdminAdvancedSection .advanced-section-title'),
    adminServiceBanner: document.getElementById('adminServiceBanner'),
    adminToggleBtn: document.getElementById('adminToggleBtn'),
    adminCloseBtn: document.getElementById('adminCloseBtn'),
    saveCalibrationEmbeddedBtn: document.getElementById('saveCalibrationEmbeddedBtn'),
    saveCalibrationBtn: document.getElementById('saveCalibrationBtn'),
    loadCalibrationBtn: document.getElementById('loadCalibrationBtn'),
    resetCalibrationBtn: document.getElementById('resetCalibrationBtn'),
    loadDataInput: document.getElementById('loadDataInput'),
    securePassphraseDialog: document.getElementById('securePassphraseDialog'),
    securePassphraseForm: document.getElementById('securePassphraseForm'),
    securePassphraseTitle: document.getElementById('securePassphraseTitle'),
    securePassphraseDescription: document.getElementById('securePassphraseDescription'),
    securePassphraseInput: document.getElementById('securePassphraseInput'),
    securePassphraseConfirmGroup: document.getElementById('securePassphraseConfirmGroup'),
    securePassphraseConfirmInput: document.getElementById('securePassphraseConfirmInput'),
    securePassphraseError: document.getElementById('securePassphraseError'),
    securePassphraseCancelBtn: document.getElementById('securePassphraseCancelBtn'),
    securePassphraseSubmitBtn: document.getElementById('securePassphraseSubmitBtn'),
    loadCalibrationInput: document.getElementById('loadCalibrationInput'),
    statusBar: document.getElementById('statusBar'),
    overflowWarningStatus: document.getElementById('overflowWarningStatus'),
    adminPanel: document.getElementById('adminPanel'),
    adminAccessStatus: document.getElementById('adminAccessStatus'),
    adminDashboard: document.getElementById('adminDashboard'),
    adminRefreshDashboardBtn: document.getElementById('adminRefreshDashboardBtn'),
    adminExportReportBtn: document.getElementById('adminExportReportBtn'),
    adminAddUserBtn: document.getElementById('adminAddUserBtn'),
    adminApproveUserBtn: document.getElementById('adminApproveUserBtn'),
    adminEditUserRolesBtn: document.getElementById('adminEditUserRolesBtn'),
    adminDeactivateUserBtn: document.getElementById('adminDeactivateUserBtn'),
    adminDashboardStatus: document.getElementById('adminDashboardStatus'),
    adminMetricUsers: document.getElementById('adminMetricUsers'),
    adminMetricWards: document.getElementById('adminMetricWards'),
    adminMetricPatients: document.getElementById('adminMetricPatients'),
    adminMetricAuditEvents: document.getElementById('adminMetricAuditEvents'),
    adminMetricErrors: document.getElementById('adminMetricErrors'),
    adminUsersTableBody: document.getElementById('adminUsersTableBody'),
    adminAuditList: document.getElementById('adminAuditList'),
    adminErrorList: document.getElementById('adminErrorList'),
    adminUnsavedIndicator: document.getElementById('adminUnsavedIndicator'),
    adminLayoutSelect: document.getElementById('adminLayoutSelect'),
    adminFieldSelect: document.getElementById('adminFieldSelect'),
    nudgeStep: document.getElementById('nudgeStep'),
    fieldX: document.getElementById('fieldX'),
    fieldY: document.getElementById('fieldY'),
    fieldWidth: document.getElementById('fieldWidth'),
    fieldHeight: document.getElementById('fieldHeight'),
    fieldFontSize: document.getElementById('fieldFontSize'),
    fieldLineHeight: document.getElementById('fieldLineHeight'),
    selectAllTextBoxesBtn: document.getElementById('selectAllTextBoxesBtn'),
    adminUndoBtn: document.getElementById('adminUndoBtn'),
    adminRedoBtn: document.getElementById('adminRedoBtn'),
    adminAdvancedToggleBtn: document.getElementById('adminAdvancedToggleBtn'),
    adminAdvancedControls: document.getElementById('adminAdvancedControls'),
    parserTestInput: document.getElementById('parserTestInput'),
    runBuiltInParserTestsBtn: document.getElementById('runBuiltInParserTestsBtn'),
    runParserTestBtn: document.getElementById('runParserTestBtn'),
    clearParserTestBtn: document.getElementById('clearParserTestBtn'),
    parserTestSummary: document.getElementById('parserTestSummary'),
    parserTestResults: document.getElementById('parserTestResults'),
    parserRegressionFileInput: document.getElementById('parserRegressionFileInput'),
    loadParserRegressionFileBtn: document.getElementById('loadParserRegressionFileBtn'),
    runParserRegressionBtn: document.getElementById('runParserRegressionBtn'),
    generateParserRegressionBtn: document.getElementById('generateParserRegressionBtn'),
    loadCapturedParserTestsBtn: document.getElementById('loadCapturedParserTestsBtn'),
    downloadCapturedParserTestsBtn: document.getElementById('downloadCapturedParserTestsBtn'),
    downloadParserRegressionCasesBtn: document.getElementById('downloadParserRegressionCasesBtn'),
    downloadParserRegressionReportJsonBtn: document.getElementById('downloadParserRegressionReportJsonBtn'),
    downloadParserRegressionReportCsvBtn: document.getElementById('downloadParserRegressionReportCsvBtn'),
    parserRegressionSummary: document.getElementById('parserRegressionSummary'),
    parserRegressionResults: document.getElementById('parserRegressionResults'),
    fontMinusBtn: document.getElementById('fontMinusBtn'),
    fontPlusBtn: document.getElementById('fontPlusBtn'),
    lineMinusBtn: document.getElementById('lineMinusBtn'),
    linePlusBtn: document.getElementById('linePlusBtn'),
    fieldAlign: document.getElementById('fieldAlign'),
    fieldVisible: document.getElementById('fieldVisible'),
    canvas1: document.getElementById('canvas1'),
    canvas2: document.getElementById('canvas2'),
    overlay1: document.getElementById('overlay1'),
    overlay2: document.getElementById('overlay2'),
    shell1: document.getElementById('shell1'),
    shell2: document.getElementById('shell2'),
    page1Title: document.getElementById('page1Title'),
    page2Title: document.getElementById('page2Title'),
    previewPageControls: document.getElementById('previewPageControls'),
    previewPrevPagePairBtn: document.getElementById('previewPrevPagePairBtn'),
    previewNextPagePairBtn: document.getElementById('previewNextPagePairBtn'),
    previewPageSlot1Btn: document.getElementById('previewPageSlot1Btn'),
    previewPageSlot2Btn: document.getElementById('previewPageSlot2Btn')
  };

  function moveAutocompletePopupsToBody() {
    [els.diagnosisAutocompleteBox, els.therapyAutocompleteBox].forEach((box) => {
      if (!box || box.parentElement === document.body) return;
      document.body.appendChild(box);
    });
  }

  moveAutocompletePopupsToBody();

  function tunePrintFieldCapacity(calibration) {
    if (!calibration || typeof calibration !== 'object') return calibration;
    const hasVitalSignsOffsetV1 = calibration._vitalSignsOffsetCmV1 === true;
    const hasVitalSignsOffsetV2 = calibration._vitalSignsOffsetCmV2 === true;
    const hasFollowUpControlLabYV1 = calibration._followUpControlLabYV1 === true;
    const hasFollowUpControlLabYV2 = calibration._followUpControlLabYV2 === true;
    const hasFollowUpControlPage2VisibleV1 = calibration._followUpControlPage2VisibleV1 === true;
    const hasFollowUpControlLabYV3 = calibration._followUpControlLabYV3 === true;
    const hasLabRadiologyReadableFontV1 = calibration._labRadiologyReadableFontV1 === true;
    const hasPatientOriginBoxV1 = calibration._patientOriginBoxV1 === true;
    const hasVitalSignsUrineNoOverlapV1 = calibration._vitalSignsUrineNoOverlapV1 === true;
    const hasUrineLabAtOhbpLevelV1 = calibration._urineLabAtOhbpLevelV1 === true;
    const vitalSignsOffsetX = Math.round(PAGE.widthPx / PAGE.widthMm * 10);
    const vitalSignsOffsetY = Math.round(PAGE.heightPx / PAGE.heightMm * 10);
    const layouts = ['page1Anchor1', 'page1Anchor2', 'page2Anchor1'];
    const followUpControlDefaults = buildFollowUpControlDayFields(true);
    const makeFindingsFieldReadable = (field) => {
      if (!field) return;
      field.fontSize = Math.max(Number(field.fontSize || 0), 20);
      field.lineHeight = Math.max(Number(field.lineHeight || 0), 24);
    };
    layouts.forEach((layoutKey) => {
      const layout = calibration[layoutKey];
      if (!layout) return;

      if (layout.patientHeader) {
        layout.patientHeader.width = Math.max(Number(layout.patientHeader.width || 0), 760);
        layout.patientHeader.height = Math.max(Number(layout.patientHeader.height || 0), 72);
      }

      if ((!hasPatientOriginBoxV1 || !layout.patientOriginBox) && layout.allergiesBox) {
        layout.patientOriginBox = buildPatientOriginFieldFromAllergies(layout.allergiesBox, layout.diagnosis?.visible !== false);
      }

      (layout.labBox1Days || []).forEach((field) => {
        if (!field) return;
        field.height = Math.max(Number(field.height || 0), 220);
      });

      (layout.radiologyDays || []).forEach((field) => {
        if (!field) return;
        field.height = Math.max(Number(field.height || 0), 82);
      });

      if (!hasLabRadiologyReadableFontV1) {
        ['labBox1Days', 'labBox2Days', 'labBox3Days', 'labBox4Days', 'radiologyDays'].forEach((fieldListKey) => {
          (layout[fieldListKey] || []).forEach(makeFindingsFieldReadable);
        });
      }

      if (!hasVitalSignsUrineNoOverlapV1) {
        (layout.vitalSignsDays || []).forEach((field) => {
          if (!field) return;
          field.y = Math.max(Number(field.y || 0), VITAL_SIGNS_DEFAULT_Y);
          field.height = Math.max(Number(field.height || 0), 68);
        });
      }

      if (!hasUrineLabAtOhbpLevelV1) {
        const urineY = Number(layout.ohbpTherapyBox?.y ?? URINE_LAB_DEFAULT_Y);
        (layout.labBox3Days || []).forEach((field) => {
          if (!field) return;
          field.y = urineY;
          field.height = Math.max(Number(field.height || 0), 96);
        });
      }

      if (!hasFollowUpControlLabYV2 || !hasFollowUpControlPage2VisibleV1 || !hasFollowUpControlLabYV3) {
        if (!Array.isArray(layout.followUpControlDays)) layout.followUpControlDays = [];
        const layoutLabDefaults = Array.isArray(layout.labBox1Days) && layout.labBox1Days.length
          ? layout.labBox1Days
          : followUpControlDefaults;
        followUpControlDefaults.forEach((defaultField, index) => {
          if (!defaultField) return;
          const labField = layoutLabDefaults[index] || defaultField;
          const field = layout.followUpControlDays[index] || {};
          layout.followUpControlDays[index] = {
            ...field,
            x: Number(labField.x ?? defaultField.x),
            y: Math.max(Number(labField.y ?? defaultField.y), FOLLOW_UP_CONTROL_DEFAULT_LAB_Y),
            width: Number(labField.width ?? defaultField.width),
            height: Math.max(Number(field.height || 0), Number(labField.height || 0), defaultField.height),
            fontSize: Number(field.fontSize || labField.fontSize || defaultField.fontSize),
            lineHeight: Number(field.lineHeight || labField.lineHeight || defaultField.lineHeight),
            textAlign: field.textAlign || labField.textAlign || defaultField.textAlign,
            visible: true
          };
        });
      }

      if (!hasVitalSignsOffsetV2) {
        (layout.vitalSignsDays || []).forEach((field) => {
          if (!field) return;
          if (hasVitalSignsOffsetV1) {
            field.y = Number(field.y || 0) - vitalSignsOffsetY;
          } else {
            // v218: X se više ne pomiče migracijom. Vitalni parametri moraju ostati
            // vodoravno vezani uz isti stupac kao datum prijema; pomiče se samo Y
            // da donji rub ostane neposredno iznad donjeg ruba liste.
            field.y = Number(field.y || 0) + vitalSignsOffsetY;
          }
        });
      }
    });
    delete calibration._vitalSignsOffsetCmV1;
    calibration._vitalSignsOffsetCmV2 = true;
    calibration._followUpControlLabYV1 = true;
    calibration._followUpControlLabYV2 = true;
    calibration._followUpControlPage2VisibleV1 = true;
    calibration._followUpControlLabYV3 = true;
    calibration._labRadiologyReadableFontV1 = true;
    calibration._patientOriginBoxV1 = true;
    calibration._vitalSignsUrineNoOverlapV1 = true;
    calibration._urineLabBelowStandardLabV1 = true;
    calibration._urineLabAtOhbpLevelV1 = true;
    return calibration;
  }

  const state = {
    images: {},
    calibration: tunePrintFieldCapacity(loadCalibrationFromStorage()),
    patientMode: DEFAULT_PATIENT_MODE,
    admin: {
      enabled: false,
      selectedLayout: 'page1Anchor1',
      selectedField: 'patientHeader',
      selectedFields: [],
      selectAllTextBoxes: false,
      undoStack: [],
      redoStack: [],
      advancedVisible: false,
      drag: null,
      sessionStartSnapshot: null,
      savedSnapshot: null
    },
    adminDashboard: {
      loading: false,
      users: [],
      patientRecords: [],
      auditEvents: [],
      errors: [],
      lastLoadedAt: '',
      lastError: ''
    },
    remoteCalibration: {
      loaded: false,
      loading: false,
      saving: false,
      lastLoadedAt: '',
      lastSavedAt: '',
      lastError: ''
    },
    therapyValidation: {
      csvRaw: '',
      csvName: '',
      csvLoadedAt: '',
      aliases: [],
      exactMap: new Map(),
      localExceptions: [],
      lastResults: [],
      undoStack: [],
      livePreviewFrame: null,
      liveValidationEnabled: false,
      liveValidationTimer: null,
      liveValidationRunning: false,
      liteMode: true,
      confirmedLines: new Set()
    },
    therapyAutocomplete: {
      suggestions: [],
      activeIndex: 0,
      activeRegimenOverride: '',
      lineStart: 0,
      lineEnd: 0,
      cursor: 0,
      isCyclingRegimen: false
    },
    therapyFavorites: {
      personal: [],
      shared: [],
      editingPersonalId: '',
      editingSharedId: '',
      initialized: false,
      sync: {
        available: false,
        status: 'local-only',
        lastSyncedAt: '',
        lastError: 'Autentificirani backend za terapijske postavke nije konfiguriran.'
      }
    },
    diagnosisAutocomplete: {
      suggestions: [],
      activeIndex: 0,
      segmentStart: 0,
      segmentEnd: 0,
      cursor: 0,
      usage: loadDiagnosisAutocompleteUsageFromStorage(),
      recordedKeys: new Set()
    },
    firebasePatients: {
      client: null,
      user: null,
      userProfile: null,
      authContext: {
        uid: '',
        email: '',
        displayName: '',
        organizationId: '',
        wardIds: [],
        activeWardId: '',
        roles: [],
        isAuthenticated: false,
        hasValidClinicalContext: false
      },
      records: [],
      initialized: false,
      loading: false,
      profileLoading: false,
      authResolved: false,
      loginGateDismissed: false,
      loginGateMode: 'signin',
      pendingRegistrationProfile: null,
      currentRecordId: '',
      currentRecordVersion: 0,
      currentRecordUpdatedAt: '',
      currentRecordDataHash: '',
      currentRecordBaseData: null,
      autoSaveTimer: null,
      autoSaveInFlight: false,
      autoSavePending: false,
      lastAutoSaveSignature: '',
      lastSaveErrorMessage: '',
      suppressAutoSave: false,
      dialogMode: DEFAULT_PATIENT_MODE,
      showArchived: false,
      dialogReturnFocusTo: null
    },
    patientSyncState: {
      status: 'empty',
      lastSavedAt: '',
      lastSaveTarget: 'none',
      lastError: '',
      currentPatientDocId: '',
      currentPatientVersion: '',
      hasUnsavedChanges: false,
      saveInFlight: false
    },
    appAvailability: {
      networkStatus: navigator.onLine === false ? 'offline' : 'online',
      firebaseStatus: LOCAL_PATIENT_STORAGE_ONLY ? 'disabled' : 'unknown',
      appShellStatus: 'loaded',
      lastSuccessfulFirebaseCheckAt: '',
      lastError: ''
    },
    dragDropCounter: 0,
    parserRegressionCases: [],
    parserRegressionSourceName: '',
    parserRegressionReport: null,
    previewPagePairStart: 1,
    previewTherapyCarryByPair: {},
    previewActiveSlot: 1,
    previewListIndex: 1,
    parserTestCapture: {
      saving: false,
      localCases: []
    },
    parserProvenance: {
      schema: PARSER_PROVENANCE_SCHEMA,
      parserVersion: PARSER_VERSION,
      parserMode: '',
      source: '',
      parsedAt: '',
      sourceTextHash: '',
      fields: {}
    },
    ohbpLastParsedText: '',
    lastLabWarningMessage: '',
    lastTextOverflowWarnings: [],
    printQaForcedTextOverflowWarnings: [],
    statusClearTimer: null,
    previewListCount: 2,
    patientDraft: {
      saveTimer: null,
      lastSavedAt: '',
      suppressSave: false,
      mode: PATIENT_DRAFT_STORAGE_MODES.DISABLED,
      cryptoKey: null,
      expiresAt: '',
      saveInFlight: false,
      pendingSave: false
    },
    speechInput: {
      recognition: null,
      targetId: null,
      isListening: false,
      stopRequestedByUser: false,
      pendingSuggestions: {
        therapy: null,
        ohbpTherapy: null
      },
      guidedSessions: {
        therapy: null,
        ohbpTherapy: null
      }
    }
  };

  let patientDraftSessionPassphrase = '';
  let securePassphraseRequest = null;

  function forceAdminModeOffOnStartup() {
    state.admin.enabled = false;
    state.admin.selectAllTextBoxes = false;
    state.admin.selectedFields = [];
    state.admin.advancedVisible = false;
    state.admin.drag = null;
    state.admin.savedSnapshot = null;
    els.appRoot.classList.remove('admin-on');
    els.adminPanel.classList.remove('visible');
    if (els.adminToggleBtn) {
      els.adminToggleBtn.classList.remove('active-admin');
      els.adminToggleBtn.title = 'Servisni režim / admin kalibracija (Ctrl + Alt + A)';
      els.adminToggleBtn.setAttribute('aria-label', 'Uključi servisni režim');
    }
    updateSelectAllTextBoxesButton();
    updateUndoRedoButtons();
    updateAdminAdvancedControls();
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeDeep(target, source) {
    if (!source || typeof source !== 'object') return target;
    const output = Array.isArray(target) ? target.slice() : { ...target };
    Object.keys(source).forEach((key) => {
      const sourceValue = source[key];
      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        output[key] = mergeDeep(output[key] || {}, sourceValue);
      } else if (Array.isArray(sourceValue)) {
        output[key] = sourceValue.map((item, idx) => {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            const base = Array.isArray(output[key]) ? output[key][idx] || {} : {};
            return mergeDeep(base, item);
          }
          return item;
        });
      } else {
        output[key] = sourceValue;
      }
    });
    return output;
  }

  function getEmbeddedCalibration() {
    if (!EMBEDDED_CALIBRATION || typeof EMBEDDED_CALIBRATION !== 'object') {
      return null;
    }
    return EMBEDDED_CALIBRATION.calibration || EMBEDDED_CALIBRATION;
  }

  function getEmbeddedCalibrationMeta() {
    if (!EMBEDDED_CALIBRATION || typeof EMBEDDED_CALIBRATION !== 'object') {
      return { version: '', exportedAt: '' };
    }
    return {
      version: String(EMBEDDED_CALIBRATION.version || ''),
      exportedAt: String(EMBEDDED_CALIBRATION.exportedAt || '')
    };
  }

  function normalizeStoredCalibrationPayload(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.calibration && typeof parsed.calibration === 'object') {
      return {
        calibration: parsed.calibration,
        embeddedVersion: String(parsed.embeddedVersion || ''),
        embeddedExportedAt: String(parsed.embeddedExportedAt || '')
      };
    }
    // Stariji oblik localStorage zapisa bio je sama kalibracija bez metapodataka.
    return {
      calibration: parsed,
      embeddedVersion: '',
      embeddedExportedAt: ''
    };
  }

  function isStoredCalibrationForThisEmbeddedApp(storedPayload) {
    const embeddedMeta = getEmbeddedCalibrationMeta();
    if (!storedPayload) return false;
    // Novi oblik: localStorage vrijedi samo za isti ugrađeni HTML iz kojeg je nastao.
    // Time se sprječava da novostvoreni HTML s ugrađenom kalibracijom bude pregazen
    // starom kalibracijom iz preglednika.
    if (storedPayload.embeddedExportedAt) {
      return storedPayload.embeddedExportedAt === embeddedMeta.exportedAt;
    }
    // Stari oblik bez metapodataka ne smije imati prednost pred ugrađenom kalibracijom.
    return !getEmbeddedCalibration();
  }

  function loadCalibrationFromStorage() {
    const embedded = getEmbeddedCalibration();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.calibration);
      if (raw) {
        const storedPayload = normalizeStoredCalibrationPayload(JSON.parse(raw));
        if (isStoredCalibrationForThisEmbeddedApp(storedPayload)) {
          return mergeDeep(deepClone(DEFAULT_COORDS), storedPayload.calibration);
        }
      }
      if (embedded) {
        return mergeDeep(deepClone(DEFAULT_COORDS), embedded);
      }
      return deepClone(DEFAULT_COORDS);
    } catch (error) {
      if (embedded) {
        return mergeDeep(deepClone(DEFAULT_COORDS), embedded);
      }
      return deepClone(DEFAULT_COORDS);
    }
  }

  function safeLocalStorageSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('Lokalna pohrana nije dostupna ili je puna; promjena ostaje aktivna samo u memoriji.', error);
      return false;
    }
  }

  function safeLocalStorageGetItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeLocalStorageRemoveItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function safeSessionStorageGetItem(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSessionStorageSetItem(key, value) {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function safeSessionStorageRemoveItem(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      // Ignored: session storage is only used for this tab's login prompt state.
    }
  }

  function buildCalibrationStoragePayload() {
    const embeddedMeta = getEmbeddedCalibrationMeta();
    return {
      storageVersion: 2,
      appVersion: APP_VERSION,
      embeddedVersion: embeddedMeta.version,
      embeddedExportedAt: embeddedMeta.exportedAt,
      savedAt: new Date().toISOString(),
      calibration: state.calibration
    };
  }

  function saveCalibrationToStorage() {
    return safeLocalStorageSetItem(STORAGE_KEYS.calibration, JSON.stringify(buildCalibrationStoragePayload()));
  }

  function clearLocalStorageKeysWithPrefix(prefix) {
    try {
      const keys = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key === prefix || String(key || '').startsWith(`${prefix}__user_`)) keys.push(key);
      }
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      // Local storage may be blocked; in that case there is nothing reliable to clear.
    }
  }

  function capitalizeClinicalTextItem(value) {
    const text = String(value || '');
    return text.replace(/[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/u, (letter) => letter.toLocaleUpperCase('hr-HR'));
  }

  function normalizeClinicalTherapyText(value) {
    return normalizeLineBreaks(value || '')
      .split('\n')
      .map((line) => capitalizeClinicalTextItem(line))
      .join('\n');
  }

  function normalizeClinicalDiagnosisText(value) {
    return normalizeLineBreaks(value || '')
      .split('\n')
      .map((line) => line.split(/([,;]\s*)/).map((part) => /^[,;]\s*$/.test(part) ? part : capitalizeClinicalTextItem(part)).join(''))
      .join('\n');
  }

  function normalizeDiagnosisAutocompleteLine(value) {
    return normalizeClinicalDiagnosisText(String(value || '')
      .replace(DIAGNOSIS_AUTOCOMPLETE_PREFIX_RE, '')
      .replace(/\s+/g, ' ')
      .trim())
      .slice(0, 220);
  }

  function normalizeDiagnosisAutocompleteUsageKey(value) {
    return normalizeDiagnosisLookupKey(value || '').slice(0, 220);
  }

  function normalizeDiagnosisAutocompleteSearchKey(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/\bC\s*\.\s*V\s*\.\s*I\s*\.?/gi, 'CVI')
      .toLowerCase()
      .replace(/[.,;:()\[\]{}]/g, ' ')
      .replace(/[–—-]/g, ' ')
      .replace(/\b(?:dg|dijagnoza)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 220);
  }

  function normalizeDiagnosisAutocompleteUsageRecord(key, value) {
    const rawLine = typeof value === 'object' && value ? value.line : key;
    const cleanLine = normalizeDiagnosisAutocompleteLine(rawLine || key);
    const cleanKey = normalizeDiagnosisAutocompleteUsageKey(cleanLine || rawLine || key);
    const count = Math.max(0, Math.min(9999, Math.floor(Number(typeof value === 'object' && value ? value.count : value) || 0)));
    if (!cleanKey || !cleanLine || count <= 0) return null;
    const lastUsedAt = typeof value === 'object' && value ? String(value.lastUsedAt || '') : '';
    return {
      key: cleanKey,
      record: {
        line: cleanLine,
        count,
        lastUsedAt,
        source: typeof value === 'object' && value?.source === 'custom' ? 'custom' : ''
      }
    };
  }

  function loadDiagnosisAutocompleteUsageFromStorage() {
    clearLocalStorageKeysWithPrefix(STORAGE_KEYS.diagnosisAutocompleteUsage);
    return {};
  }

  function buildDiagnosisAutocompleteUsagePayload() {
    const records = {};
    getDiagnosisAutocompleteStoredSuggestionRecords()
      .sort((a, b) => {
        if (b.record.count !== a.record.count) return b.record.count - a.record.count;
        return (Date.parse(b.record.lastUsedAt || '') || 0) - (Date.parse(a.record.lastUsedAt || '') || 0);
      })
      .slice(0, 300)
      .forEach(({ key, record }) => {
        records[key] = record;
      });
    return {
      storageVersion: 1,
      savedAt: new Date().toISOString(),
      records
    };
  }

  function saveDiagnosisAutocompleteUsageToStorage() {
    const payload = buildDiagnosisAutocompleteUsagePayload();
    if (payload?.records) state.diagnosisAutocomplete.usage = payload.records;
    clearLocalStorageKeysWithPrefix(STORAGE_KEYS.diagnosisAutocompleteUsage);
    if (typeof schedulePersonalAutocompleteProfileSave === 'function') {
      schedulePersonalAutocompleteProfileSave();
    }
    return true;
  }

  const PERSONAL_AUTOCOMPLETE_SCHEMA = 'temperaturna-lista-personal-autocomplete-v1';

  function normalizeDiagnosisAutocompleteUsagePayload(payload = {}) {
    const records = {};
    const source = payload && typeof payload === 'object'
      ? (payload.records && typeof payload.records === 'object' ? payload.records : payload)
      : {};
    Object.entries(source || {})
      .map(([key, value]) => normalizeDiagnosisAutocompleteUsageRecord(key, value))
      .filter(Boolean)
      .sort((a, b) => {
        if (b.record.count !== a.record.count) return b.record.count - a.record.count;
        return (Date.parse(b.record.lastUsedAt || '') || 0) - (Date.parse(a.record.lastUsedAt || '') || 0);
      })
      .slice(0, 300)
      .forEach(({ key, record }) => {
        records[key] = record;
      });
    return records;
  }

  function normalizePersonalAutocompleteProfilePayload(payload = {}) {
    const source = payload && typeof payload === 'object' ? payload : {};
    return {
      schema: PERSONAL_AUTOCOMPLETE_SCHEMA,
      storageVersion: 1,
      savedAt: String(source.savedAt || ''),
      diagnoses: {
        storageVersion: 1,
        savedAt: String(source.diagnoses?.savedAt || source.savedAt || ''),
        records: normalizeDiagnosisAutocompleteUsagePayload(source.diagnoses || {})
      }
    };
  }

  function getPersonalAutocompletePayloadFromProfile(profile = {}) {
    return normalizePersonalAutocompleteProfilePayload(profile?.personalAutocomplete || profile?.personalSuggestions || {});
  }

  function applyPersonalAutocompletePayloadFromProfile(profile = {}) {
    const payload = getPersonalAutocompletePayloadFromProfile(profile);
    state.diagnosisAutocomplete.usage = normalizeDiagnosisAutocompleteUsagePayload(payload.diagnoses || {});
    state.diagnosisAutocomplete.recordedKeys = new Set(Object.keys(state.diagnosisAutocomplete.usage || {}));
    return payload;
  }

  function buildPersonalAutocompleteProfilePayload() {
    return {
      schema: PERSONAL_AUTOCOMPLETE_SCHEMA,
      storageVersion: 1,
      savedAt: new Date().toISOString(),
      diagnoses: buildDiagnosisAutocompleteUsagePayload()
    };
  }

  // ============================================================
  // v168 — VALIDACIJA KRONIČNE TERAPIJE: POJEDNOSTAVLJENI PRIJEDLOZI DOPUNE
  // ============================================================
  const EMBEDDED_THERAPY_CSV_META = Object.freeze({
    fileName: 'lijekovi_RH_HZZO_HALMED_dopune_2026_06_15_aliasi_validacija.csv',
    source: 'HZZO osnovna i dopunska lista lijekova objavljeno 27.05.2026., u primjeni od 15.06.2026.; zadrzana HALMED dopuna za Byol Cor',
    embeddedAt: '2026-06-15T00:00:00+02:00',
    byteSize: 2332731,
    base64Encoding: 'utf-8'
  });
  const EMBEDDED_THERAPY_CSV_BASE64 =
    Array.isArray(window.__TEMPERATURNA_LISTA_THERAPY_CSV_BASE64__)
      ? window.__TEMPERATURNA_LISTA_THERAPY_CSV_BASE64__
      : [];

function decodeTherapyCsvBase64(base64Text) {
    try {
      const binary = atob(String(base64Text || ''));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      if (window.TextDecoder) return new TextDecoder('utf-8').decode(bytes);
      return decodeURIComponent(escape(binary));
    } catch (error) {
      console.warn('Ugrađeni CSV lijekova nije moguće dekodirati.', error);
      return '';
    }
  }

  function getEmbeddedTherapyCsvRaw() {
    if (!EMBEDDED_THERAPY_CSV_BASE64) return '';
    const embeddedBase64 = Array.isArray(EMBEDDED_THERAPY_CSV_BASE64)
      ? EMBEDDED_THERAPY_CSV_BASE64.join('')
      : EMBEDDED_THERAPY_CSV_BASE64;
    return decodeTherapyCsvBase64(embeddedBase64);
  }



