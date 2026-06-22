// ============================================================
  // MODULE: 10-therapy-validation.js
  // Source module; tools/build-offline-html.js inlines modules for offline use.
  // ============================================================
const THERAPY_REQUIRED_PATTERNS = Object.freeze({
    dose: /(?:^|\s)(?:\d+(?:[,.]\d+)?\s*(?:mg|g|mcg|µg|ug|ij|IU|ml|mL|mmol|%|kapi?|potisaka?|doza|tbl|tableta|amp|ampula|kaps|kapsula)|\d+\s*\/\s*\d+\s*(?:mg|g|ml|mL))(?:\s|$)/i,
    // v196: shema može sadržavati razlomak (npr. 1/2,0,1). Ne smije se parcijalno prepoznati kao 2,0,1.
    scheme: /(?:\b(?:\d+\s*\/\s*\d+|\d+)\s*[x×]\s*(?:\d+\s*\/\s*\d+|\d+)\b|(?:^|[^\d/])(?:\d+\s*\/\s*\d+|\d+)\s*,\s*(?:\d+\s*\/\s*\d+|\d+)\s*,\s*(?:\d+\s*\/\s*\d+|\d+)(?=$|[^\d/])|(?:^|[^\d/])(?:\d+\s*\/\s*\d+|\d+)\s*-\s*(?:\d+\s*\/\s*\d+|\d+)\s*-\s*(?:\d+\s*\/\s*\d+|\d+)(?=$|[^\d/])|\bpo\s+potrebi\b|\bprema\s+potrebi\b|\bpp\b|\bu\s+slučaju\b|\bnavečer\b|\bujutro\b|\bdnevno\b|\bsvaki\s+dan\b|\bsvakih\s+\d+\s*h\b)/i,
    routeOrForm: /(?:\bp\.?o\.?\b|\bper\s+os\b|\boralno\b|\bna\s+usta\b|\bi\.?v\.?\b|\biv\b|\bintravenski\b|\bi\.?m\.?\b|\bim\b|\bintramuskularno\b|\bs\.?c\.?\b|\bsc\b|\bsupkutano\b|\binh\.?\b|\binhalacij[ae]\b|\binhalacijski\b|\bnebulizacij|\bnazalno\b|\brektalno\b|\bvaginalno\b|\btransdermalno\b|\btopikalno\b|\bkapi\b|\btbl\b|\btableta\b|\btablete\b|\bkaps\b|\bkapsula\b|\bsirup\b|\bamp\b|\bampula\b|\bsprej\b|\bmast\b|\bkrema\b|\bgel\b|\bflaster\b|\bčepić\b|\bsupp\b)/i
  });

  const THERAPY_DATABASE_STALE_AFTER_DAYS = 45;

  const THERAPY_NON_DRUG_PATTERN = /\b(?:kontrola|kontrolni|kontrolirati|vaditi|učiniti|napraviti|dijeta|mirovanje|previjanje|oblog|toaleta|rana|rane|nalaz|nalazi|laboratorij|kks|crp|urin|urinokultura|hemokultura|rtg|uzv|ct|msct|mr|ekg|fizikalna|rehabilitacija|otpust|uputnica|termin|ambulanta|opservacija|obrada|simptomatske\s+mjere|hidracija\s+per\s+os)\b/i;
  const THERAPY_BULLET_PREFIX_RE = /^\s*(?:[-–—*•]+|\d+[.)])\s*/;

  function therapyEscapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function safeHtmlClassToken(value, fallback = '') {
    // Dinamičke klase se ubacuju u HTML predloške samo nakon whitelist provjere.
    const token = String(value || '').trim();
    return /^[a-z0-9_-]{1,48}$/i.test(token) ? token : fallback;
  }

  function therapyNormalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[×]/g, 'x')
      .replace(/[–—]/g, '-')
      .replace(/[.,;:()\[\]{}\/\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function therapyDisplayNameFromRow(row) {
    return row.tvornicki_naziv || row.genericki_naziv || row.naziv || row.naziv_normaliziran || row.naziv_za_validaciju_tvornicki || row.naziv_za_validaciju_genericki || '';
  }

  function parseTherapyHtmlTable(raw) {
    const text = String(raw || '');
    if (!/<\s*table[\s>]/i.test(text) || typeof DOMParser === 'undefined') return [];
    try {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const table = doc.querySelector('table');
      if (!table) return [];
      return Array.from(table.querySelectorAll('tr')).map((tr) => Array.from(tr.children).map((cell) => String(cell.textContent || '').replace(/\s+/g, ' ').trim())).filter((row) => row.some(Boolean));
    } catch (error) {
      return [];
    }
  }

  function detectTherapyCsvDelimiter(text) {
    const firstLine = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).find((line) => line.trim()) || '';
    const candidates = [';', '\t', ','];
    let best = ';';
    let bestCount = -1;
    candidates.forEach((candidate) => {
      const delimiter = candidate === '\t' ? '\t' : candidate;
      const pattern = delimiter === '\t' ? /\t/g : new RegExp('\\' + delimiter, 'g');
      const count = (firstLine.match(pattern) || []).length;
      if (count > bestCount) {
        best = delimiter;
        bestCount = count;
      }
    });
    return best;
  }

  function parseCsvSemicolon(raw) {
    const htmlRows = parseTherapyHtmlTable(raw);
    if (htmlRows.length) return htmlRows;
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    const text = String(raw || '').replace(/^\uFEFF/, '');
    const delimiter = detectTherapyCsvDelimiter(text);
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        row.push(field);
        field = '';
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (ch === '\r' && text[i + 1] === '\n') i += 1;
        row.push(field);
        if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
    row.push(field);
    if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
    return rows;
  }

  function csvRowsToObjects(rows) {
    if (!Array.isArray(rows) || rows.length < 2) return [];
    const headers = rows[0].map((h) => String(h || '').trim());
    return rows.slice(1).map((cells) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = String(cells[i] ?? '').trim(); });
      return obj;
    });
  }

  function therapyRowGet(row, names) {
    const lowerMap = new Map(Object.keys(row || {}).map((key) => [therapyNormalizeText(key), key]));
    for (const name of names) {
      if (Object.prototype.hasOwnProperty.call(row, name)) return String(row[name] || '').trim();
      const key = lowerMap.get(therapyNormalizeText(name));
      if (key) return String(row[key] || '').trim();
    }
    return '';
  }

  function inferTherapyStrengthFromHalmedText(value) {
    const text = String(value || '').replace(/µg/g, 'mcg').replace(/mikrograma?/gi, 'mcg');
    const unit = '(?:mg|g|mcg|ml|mmol|IU|i\\.?j\\.?|%)';
    const pattern = new RegExp('\\b\\d+(?:[,.]\\d+)?\\s*' + unit + '(?:\\s*/\\s*\\d+(?:[,.]\\d+)?\\s*' + unit + ')*', 'i');
    const match = text.match(pattern);
    return match ? match[0].replace(/\s+/g, ' ').replace(/i\.\s*j\.?/i, 'i.j.').trim() : '';
  }

  function inferTherapyBrandFromFullName(value) {
    let text = String(value || '').trim();
    if (!text) return '';
    text = text.replace(/\s+\d+(?:[,.]\d+)?\s*(?:mg|g|mcg|µg|mikrograma?|ml|mmol|IU|i\.?j\.?|%).*$/i, '').trim();
    text = text.replace(/\b(?:filmom\s+oblozene?|filmom\s+obložene?|tablete?|kapsule?|tvrde\s+kapsule|otopina|suspenzija|sirup|mast|krema|gel|kapi|sprej|prasak|prašak).*$/i, '').trim();
    return text;
  }

  function inferTherapyRouteWideFromPackage(value) {
    const text = therapyNormalizeText(value);
    if (/\b(?:kapi za oci|oko|oftalm|ocne kapi)\b/.test(text)) return 'okularno';
    if (/\b(?:kapi za uho|otic|aurikul)\b/.test(text)) return 'aurikularno';
    if (/\b(?:kapi za nos|sprej za nos|nazal)\b/.test(text)) return 'nazalno';
    if (/\b(?:inhal|udis|rasprsivac|raspršivac)\b/.test(text)) return 'inhalacijski';
    if (/\b(?:injekc|infuz|ampul|bočica|bocica|parenteral)\b/.test(text)) return 'parenteralno';
    if (/\b(?:tableta|tbl|kapsula|sirup|oral|peroral|filmom oblozena tableta|filmom obložena tableta)\b/.test(text)) return 'peroralno';
    if (/\b(?:krema|mast|gel|dermal|kozu|koza|flaster)\b/.test(text)) return 'topikalno';
    return '';
  }

  function inferTherapyAllowedRouteTokens(value) {
    const route = therapyNormalizeText(value);
    if (/okularno|kapi za oci|oko/.test(route)) return 'kapi za oči|oko|u oko|okularno';
    if (/aurikularno|uho/.test(route)) return 'kapi za uho|u uho|aurikularno';
    if (/nazalno|nos/.test(route)) return 'kapi za nos|sprej za nos|u nos|nazalno';
    if (/inhal/.test(route)) return 'inh.|inhalacijski|udisati|nebulizacija';
    if (/parenteralno|injekc|infuz/.test(route)) return 'i.v.|iv|intravenozno|i.m.|im|s.c.|sc|supkutano|infuzija|inj.|amp';
    if (/topikalno|dermal/.test(route)) return 'lokalno|topikalno|na kožu|krema|mast|gel|flaster';
    if (/peroralno|oral|tableta|kapsula|sirup/.test(route)) return 'per os|p.o.|po.|oralno|tbl|kaps|sirup';
    return '';
  }

  function mapHalmedRowForTherapy(row) {
    const naziv = therapyRowGet(row, ['Naziv lijeka', 'Lijek', 'Naziv', 'naziv']);
    const djelatna = therapyRowGet(row, ['Djelatna tvar', 'Djelatna/e tvar/i', 'Djelatne tvari', 'genericki_naziv']);
    const oblik = therapyRowGet(row, ['Farmaceutski oblik', 'Farmaceutski oblik lijeka', 'farmaceutski_oblik_izvuceno']);
    const sastav = therapyRowGet(row, ['Sastav', 'sastav']);
    const pakiranje = therapyRowGet(row, ['Pakiranja', 'Pakiranje', 'Opis pakiranja', 'oblik_jacina_pakiranje']);
    const atk = therapyRowGet(row, ['ATK', 'ATK oznaka', 'atk_sifra', 'atk_sifra_puna']);
    const odobrenje = therapyRowGet(row, ['Broj odobrenja', 'Broj odobrenja pakiranja', 'Odobrenje', 'product_id']);
    const status = therapyRowGet(row, ['Status lijeka na tržištu', 'Status pakiranja na tržištu', 'status']);
    const strength = therapyRowGet(row, ['jacina_izvuceno', 'Jačina', 'Jacina']) || inferTherapyStrengthFromHalmedText(`${naziv} ${sastav} ${pakiranje}`);
    const brand = therapyRowGet(row, ['tvornicki_naziv', 'Tvornički naziv']) || inferTherapyBrandFromFullName(naziv);
    const packageText = therapyRowGet(row, ['oblik_jacina_pakiranje']) || [strength, oblik, pakiranje].filter(Boolean).join(' — ');
    const routeWide = therapyRowGet(row, ['put_davanja_siri']) || inferTherapyRouteWideFromPackage(`${oblik} ${pakiranje} ${naziv}`);
    return {
      ...row,
      product_id: odobrenje || row.product_id || naziv,
      naziv: naziv || row.naziv || row.naziv_normaliziran || '',
      naziv_normaliziran: naziv || row.naziv_normaliziran || row.naziv || '',
      genericki_naziv: djelatna || row.genericki_naziv || '',
      tvornicki_naziv: brand || row.tvornicki_naziv || '',
      atk_sifra_puna: atk || row.atk_sifra_puna || row.atk_sifra || '',
      oblik_jacina_pakiranje: packageText || row.oblik_jacina_pakiranje || '',
      farmaceutski_oblik_izvuceno: oblik || row.farmaceutski_oblik_izvuceno || inferTherapyFormFromPackage(packageText || naziv),
      jacina_izvuceno: strength || row.jacina_izvuceno || '',
      put_davanja_siri: routeWide || row.put_davanja_siri || '',
      dozvoljeni_tokeni_puta_davanja: row.dozvoljeni_tokeni_puta_davanja || inferTherapyAllowedRouteTokens(routeWide || oblik || packageText || naziv),
      lista: row.lista || 'HALMED',
      kategorija_za_validaciju: row.kategorija_za_validaciju || 'halmed_lijek',
      status_lijeka_na_trzistu: status || row.status_lijeka_na_trzistu || ''
    };
  }

  function normalizeTherapySourceRows(rows) {
    return rows.map((row) => mapHalmedRowForTherapy(row));
  }

  function buildTherapyAliasIndex(rawCsv) {
    const rows = normalizeTherapySourceRows(csvRowsToObjects(parseCsvSemicolon(rawCsv)));
    const aliases = [];
    const seen = new Set();
    const pushAlias = (rawName, row, type) => {
      const name = String(rawName || '').trim();
      const key = therapyNormalizeText(name);
      if (!key || key.length < 3) return;
      if (/^[+\-*/.,]+$/.test(key)) return;
      // v171/v172: isti tvornički/generički naziv često ima više jačina/pakiranja.
      // Ranije je ključ bio samo naziv+tip pa je npr. Coupet zadržavao samo prvi redak
      // iz CSV-a (10 mg), a 20 mg i 40 mg su se izgubili prije stvaranja padajućeg izbornika.
      // U ključ uključujemo product_id/ATK, jačinu i pakiranje kako bi sve varijante ostale
      // dostupne za prijedloge, uz kasnije dedupliciranje prikazanih standardnih redaka.
      const variantKey = [
        row.product_id || row.atk_sifra_puna || row.atk_hzzo_nastavak || '',
        row.jacina_izvuceno || '',
        row.oblik_jacina_pakiranje || '',
        row.put_davanja_siri || ''
      ].map((part) => therapyNormalizeText(part)).join('::');
      const unique = `${key}::${type || ''}::${variantKey}`;
      if (seen.has(unique)) return;
      seen.add(unique);
      aliases.push({
        key,
        rawName: name,
        displayName: therapyDisplayNameFromRow(row) || name,
        genericName: row.genericki_naziv || '',
        brandName: row.tvornicki_naziv || '',
        type: type || row.tip_naziva || '',
        productId: row.product_id || '',
        strength: row.jacina_izvuceno || '',
        routeTokens: row.dozvoljeni_tokeni_puta_davanja || '',
        routeWide: row.put_davanja_siri || '',
        packageText: row.oblik_jacina_pakiranje || '',
        form: row.farmaceutski_oblik_izvuceno || inferTherapyFormFromPackage(row.oblik_jacina_pakiranje || ''),
        category: row.kategorija_za_validaciju || '',
        atk: row.atk_sifra_puna || row.atk_sifra || row.atk || ''
      });
    };

    rows.forEach((row) => {
      // Alias CSV
      pushAlias(row.naziv_normaliziran || row.naziv, row, row.tip_naziva || 'alias');
      pushAlias(row.naziv, row, row.tip_naziva || 'alias');
      // Main validation CSV
      pushAlias(row.naziv_za_validaciju_tvornicki, row, 'tvornicki');
      pushAlias(row.tvornicki_naziv, row, 'tvornicki');
      pushAlias(row.naziv_za_validaciju_genericki, row, 'genericki');
      pushAlias(row.genericki_naziv, row, 'genericki');
    });

    aliases.sort((a, b) => b.key.length - a.key.length || a.key.localeCompare(b.key, 'hr'));
    const exactMap = new Map();
    aliases.forEach((entry) => {
      if (!exactMap.has(entry.key)) exactMap.set(entry.key, entry);
    });
    return { aliases, exactMap, rowCount: rows.length };
  }

  function loadTherapyExceptionsFromStorage() {
    safeLocalStorageRemoveItem(STORAGE_KEYS.therapyExceptions);
    return [];
  }

  function saveTherapyExceptionsToStorage() {
    safeLocalStorageRemoveItem(STORAGE_KEYS.therapyExceptions);
    return true;
  }

  function loadTherapyCsvFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.therapyCsv);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.csvRaw !== 'string' || !parsed.csvRaw.trim()) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function saveTherapyCsvToStorage(csvRaw, fileName) {
    const payload = {
      appVersion: APP_VERSION,
      savedAt: new Date().toISOString(),
      fileName: String(fileName || 'lijekovi.csv'),
      csvRaw: String(csvRaw || '')
    };
    return safeLocalStorageSetItem(STORAGE_KEYS.therapyCsv, JSON.stringify(payload));
  }

  function parseTherapyDatabaseDate(value) {
    const date = new Date(value || '');
    return Number.isFinite(date.getTime()) ? date : null;
  }

  function formatTherapyDatabaseDate(value) {
    const date = parseTherapyDatabaseDate(value);
    if (!date) return 'nepoznat datum';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}.${month}.${year}.`;
  }

  function getTherapyDatabaseAgeDays(value) {
    const date = parseTherapyDatabaseDate(value);
    if (!date) return null;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.max(0, Math.floor((startOfToday.getTime() - startOfDate.getTime()) / (24 * 60 * 60 * 1000)));
  }

  function buildTherapyDatabaseStatusMessage({ prefix, fileName, loadedAt, aliasCount, extra = '' }) {
    const ageDays = getTherapyDatabaseAgeDays(loadedAt);
    const ageText = ageDays == null ? 'starost nepoznata' : `${ageDays} dana`;
    const stale = ageDays == null || ageDays > THERAPY_DATABASE_STALE_AFTER_DAYS;
    const level = stale ? 'warn' : 'ok';
    const healthLabel = stale ? 'Baza lijekova treba obnovu' : 'Baza lijekova OK';
    const staleText = stale
      ? ` Upozorenje: baza je starija od ${THERAPY_DATABASE_STALE_AFTER_DAYS} dana ili datum nije pouzdan; provjeru terapije smatrati ograničenom dok se baza ne obnovi.`
      : ' Provjera terapije aktivna.';
    return {
      level,
      health: level,
      fileName: fileName || 'lijekovi.csv',
      databaseDate: formatTherapyDatabaseDate(loadedAt),
      ageDays,
      aliasCount,
      stale,
      text: `${healthLabel}: ${prefix} — ${fileName || 'lijekovi.csv'} — datum baze ${formatTherapyDatabaseDate(loadedAt)} (${ageText}), ${aliasCount} naziva/aliasa.${staleText}${extra ? ` ${extra}` : ''}`
    };
  }

  function applyTherapyCsv(rawCsv, fileName, loadedAt, shouldStore = false) {
    const index = buildTherapyAliasIndex(rawCsv);
    if (!index.aliases.length) {
      setTherapyCsvStatus('Greška baze lijekova: CSV nije prepoznat. Očekuje se alias/validacijski CSV ili HALMED Excel/HTML/CSV izvoz s kolonama Naziv lijeka, Djelatna tvar i Farmaceutski oblik.', 'error', {
        health: 'error',
        aliasCount: 0
      });
      return false;
    }
    state.therapyValidation.csvRaw = String(rawCsv || '');
    state.therapyValidation.csvName = String(fileName || 'lijekovi.csv');
    state.therapyValidation.csvLoadedAt = loadedAt || new Date().toISOString();
    state.therapyValidation.aliases = index.aliases;
    state.therapyValidation.exactMap = index.exactMap;
    if (shouldStore) saveTherapyCsvToStorage(rawCsv, fileName);
    const databaseStatus = buildTherapyDatabaseStatusMessage({
      prefix: shouldStore ? 'Ručno učitana baza lijekova' : 'Baza lijekova učitana',
      fileName: state.therapyValidation.csvName,
      loadedAt: state.therapyValidation.csvLoadedAt,
      aliasCount: index.aliases.length
    });
    setTherapyCsvStatus(databaseStatus.text, databaseStatus.level, {
      health: databaseStatus.health,
      fileName: databaseStatus.fileName,
      databaseDate: databaseStatus.databaseDate,
      ageDays: databaseStatus.ageDays,
      aliasCount: databaseStatus.aliasCount,
      stale: databaseStatus.stale,
      source: shouldStore ? 'manual' : 'database'
    });
    return true;
  }

  function setTherapyCsvStatus(message, level = '', details = {}) {
    if (!els.therapyCsvStatus) return;
    const health = details.health || (level === 'ok' || level === 'warn' || level === 'error' ? level : 'unknown');
    els.therapyCsvStatus.textContent = message || '';
    els.therapyCsvStatus.classList.toggle('warn', level === 'warn');
    els.therapyCsvStatus.classList.toggle('ok', level === 'ok');
    els.therapyCsvStatus.classList.toggle('error', level === 'error');
    els.therapyCsvStatus.dataset.healthState = health;
    els.therapyCsvStatus.dataset.databaseFile = details.fileName || '';
    els.therapyCsvStatus.dataset.databaseDate = details.databaseDate || '';
    els.therapyCsvStatus.dataset.ageDays = details.ageDays == null ? '' : String(details.ageDays);
    els.therapyCsvStatus.dataset.aliasCount = details.aliasCount == null ? '' : String(details.aliasCount);
    els.therapyCsvStatus.dataset.stale = details.stale == null ? '' : String(Boolean(details.stale));
    els.therapyCsvStatus.dataset.staleAfterDays = String(THERAPY_DATABASE_STALE_AFTER_DAYS);
    els.therapyCsvStatus.dataset.source = details.source || '';
  }

  function initTherapyCsvValidationStorage() {
    state.therapyValidation.localExceptions = loadTherapyExceptionsFromStorage();
    const stored = loadTherapyCsvFromStorage();
    const embeddedCsv = getEmbeddedTherapyCsvRaw();

    // v173: prethodno spremljeni CSV iz starije verzije može zasjeniti noviji ugrađeni CSV
    // i time skrivati novododane/korigirane jačine lijekova. Zato se po promjeni verzije
    // prednost daje ugrađenoj ažuriranoj bazi. Ručno učitan CSV iz iste verzije i dalje ostaje prioritet.
    if (stored && stored.appVersion === APP_VERSION && applyTherapyCsv(stored.csvRaw, stored.fileName, stored.savedAt, false)) return;

    if (embeddedCsv && applyTherapyCsv(embeddedCsv, EMBEDDED_THERAPY_CSV_META.fileName, EMBEDDED_THERAPY_CSV_META.embeddedAt, false)) {
      const ignoredStored = stored && stored.appVersion !== APP_VERSION;
      const embeddedStatus = buildTherapyDatabaseStatusMessage({
        prefix: 'Ugrađena baza lijekova',
        fileName: EMBEDDED_THERAPY_CSV_META.fileName,
        loadedAt: EMBEDDED_THERAPY_CSV_META.embeddedAt,
        aliasCount: state.therapyValidation.aliases.length,
        extra: ignoredStored ? 'Stari lokalno spremljeni CSV iz prethodne verzije zanemaren je kako ne bi skrivao nove doze.' : ''
      });
      setTherapyCsvStatus(embeddedStatus.text, embeddedStatus.level, {
        health: embeddedStatus.health,
        fileName: embeddedStatus.fileName,
        databaseDate: embeddedStatus.databaseDate,
        ageDays: embeddedStatus.ageDays,
        aliasCount: embeddedStatus.aliasCount,
        stale: embeddedStatus.stale,
        source: 'embedded'
      });
      return;
    }

    if (stored && applyTherapyCsv(stored.csvRaw, stored.fileName, stored.savedAt, false)) return;

    setTherapyCsvStatus('Greška baze lijekova: baza nije automatski učitana — provjera naziva lijeka je ograničena. Provjeri ugrađeni podatkovni blok ili u naprednom načinu uvezi novu bazu.', 'error', {
      health: 'error',
      aliasCount: 0,
      source: 'missing'
    });
  }

  function getTherapyEditorLinesFromStructuredRows() {
    if (!els.therapyEditor) return [];
    const inputs = Array.from(els.therapyEditor.querySelectorAll('.therapy-drug-input'));
    if (!inputs.length) return [];
    const lines = inputs.map((input) => String(input.value || '').replace(/\r\n?/g, '\n').trim());
    while (lines.length > 1 && !lines[lines.length - 1]) lines.pop();
    if (lines.length === 1 && !lines[0]) return [];
    return lines;
  }

  function getTherapyEditorText() {
    if (!els.therapyEditor) return els.therapy?.value || '';
    const structuredLines = getTherapyEditorLinesFromStructuredRows();
    if (structuredLines.length) return normalizeLineBreaks(structuredLines.join('\n'));
    const nodes = Array.from(els.therapyEditor.childNodes || []);
    if (!nodes.length) return '';
    let text = nodes.map((node) => {
      const value = node.innerText ?? node.textContent ?? '';
      return String(value).replace(/\u00a0/g, '');
    }).join('\n');
    text = text.replace(/\n{3,}/g, '\n\n');
    return normalizeLineBreaks(text).trim();
  }

  function getTherapySuggestionsForResult(result) {
    if (!result) return [];
    return Array.isArray(result.suggestions) && result.suggestions.length ? result.suggestions : (result.suggestion ? [result.suggestion] : []);
  }

  function buildTherapyInlineSuggestionSelect(result, index) {
    const suggestions = getTherapySuggestionsForResult(result);
    if (suggestions.length) {
      return `<select class="therapy-drug-select" data-therapy-action="inline-suggestion-select" data-line-index="${index}" aria-label="Odaberi pravi lijek za redak ${index + 1}"><option value="">Odaberi pravi lijek… (${suggestions.length})</option>${suggestions.map((item, suggestionIndex) => `<option value="${suggestionIndex}">${therapyEscapeHtml(String(item).replace(/\n/g, ' ⏎ '))}</option>`).join('')}</select>`;
    }
    if (result && result.status === 'ok') {
      return `<select class="therapy-drug-select" data-line-index="${index}" aria-label="Status retka ${index + 1}" disabled><option>OK</option></select>`;
    }
    if (result && result.kind === 'notDrug') {
      return `<select class="therapy-drug-select" data-line-index="${index}" aria-label="Status retka ${index + 1}" disabled><option>nelijek/uputa</option></select>`;
    }
    return `<select class="therapy-drug-select" data-line-index="${index}" aria-label="Status retka ${index + 1}" disabled><option>bez prijedloga</option></select>`;
  }

  function renderTherapyEditorLines(lines, statuses = []) {
    if (!els.therapyEditor) return;
    const rawList = Array.isArray(lines) ? lines : String(lines || '').split('\n');
    const rows = rawList.map((line) => String(line || '').trim());
    while (rows.length && !rows[rows.length - 1]) rows.pop();
    if (rows.length === 1 && !rows[0]) rows.pop();

    const addRow = `<div class="therapy-drug-item therapy-drug-add-item" data-therapy-add-row="true" draggable="false" title="Upiši novi lijek i pritisni Enter za dodavanje na vrh terapije">
        <span class="therapy-drag-handle therapy-drug-add-icon" aria-hidden="true">＋</span>
        <input class="therapy-new-drug-input" data-therapy-action="new-therapy-input" value="" placeholder="Dodaj novu terapiju" aria-label="Dodaj novu terapiju">
        <select class="therapy-drug-select" disabled aria-label="Uputa za dodavanje terapije"><option>upiši pa Enter</option></select>
        <button type="button" class="therapy-drug-action edit" data-therapy-action="add-new-row" title="Dodaj terapiju" aria-label="Dodaj novu terapiju">↵</button>
        <span aria-hidden="true"></span>
      </div>`;

    const html = rows.map((line, index) => {
      const result = statuses[index] && typeof statuses[index] === 'object' ? statuses[index] : null;
      const statusName = result ? result.status : (typeof statuses[index] === 'string' ? statuses[index] : '');
      const safeStatusName = safeHtmlClassToken(statusName);
      const statusClass = safeStatusName ? ` status-${safeStatusName}` : '';
      const title = result?.message ? ` title="${therapyEscapeHtml(result.message)}"` : '';
      const statusMessage = result && result.kind !== 'blank' && result.status !== 'ok' ? `<div class="therapy-drug-status">${therapyEscapeHtml(result.message || '')}</div>` : '';
      return `<div class="therapy-drug-item${statusClass}" data-line-index="${index}" draggable="false"${title}>
        <button type="button" class="therapy-drag-handle" draggable="true" data-therapy-action="drag-row" data-line-index="${index}" title="Klikni, drži i pomakni lijek gore ili dolje" aria-label="Pomakni redak ${index + 1}">↕</button>
        <input class="therapy-drug-input" data-line-index="${index}" value="${therapyEscapeHtml(String(line || ''))}" placeholder="Upiši lijek, dozu, shemu i put primjene" aria-label="Terapija redak ${index + 1}">
        ${buildTherapyInlineSuggestionSelect(result, index)}
        <button type="button" class="therapy-drug-action edit" data-therapy-action="edit-row" data-line-index="${index}" title="Uredi lijek" aria-label="Uredi redak ${index + 1}">✎</button>
        <button type="button" class="therapy-drug-action delete" data-therapy-action="delete-row" data-line-index="${index}" title="Obriši terapiju" aria-label="Obriši redak ${index + 1}">×</button>
        ${statusMessage}
      </div>`;
    }).join('');
    els.therapyEditor.innerHTML = addRow + html;
    updateTherapyEditorPlaceholder();
  }

  function syncTherapyTextareaFromEditor(shouldDispatch = true) {
    if (!els.therapy || !els.therapyEditor) return;
    const text = getTherapyEditorText();
    if (els.therapy.value !== text) {
      els.therapy.value = text;
      if (shouldDispatch) els.therapy.dispatchEvent(new Event('input', { bubbles: true }));
    }
    updateTherapyEditorPlaceholder();
  }

  function scheduleTherapyLivePreview() {
    if (!els.therapy || !els.therapyEditor) return;
    if (state.therapyValidation.livePreviewFrame) {
      cancelAnimationFrame(state.therapyValidation.livePreviewFrame);
    }
    state.therapyValidation.livePreviewFrame = requestAnimationFrame(() => {
      state.therapyValidation.livePreviewFrame = null;
      syncTherapyTextareaFromEditor(false);
      updateDisplayToggleUi();
      renderAll();
    });
  }


  function getTherapyEditorCaretOffset() {
    const active = document.activeElement;
    if (!els.therapyEditor || !active || !els.therapyEditor.contains(active)) return null;
    if (active.classList && active.classList.contains('therapy-drug-input')) {
      return { type: 'input', index: Number(active.dataset.lineIndex || 0), start: active.selectionStart || 0, end: active.selectionEnd || active.selectionStart || 0 };
    }
    return null;
  }

  function setTherapyEditorCaretOffset(offset) {
    if (!els.therapyEditor || !offset || offset.type !== 'input') return;
    const input = els.therapyEditor.querySelector(`.therapy-drug-input[data-line-index="${offset.index}"]`);
    if (!input) return;
    try {
      input.focus();
      const max = input.value.length;
      input.setSelectionRange(Math.min(offset.start, max), Math.min(offset.end, max));
    } catch (error) {
      // Ako preglednik ne može vratiti fokus, validacija i dalje ostaje funkcionalna.
    }
  }

  function renderTherapyEditorLinesPreservingCaret(lines, statuses = []) {
    const caretOffset = getTherapyEditorCaretOffset();
    renderTherapyEditorLines(lines, statuses);
    if (caretOffset !== null) {
      requestAnimationFrame(() => setTherapyEditorCaretOffset(caretOffset));
    }
  }

  function enableTherapyLiveValidation() {
    state.therapyValidation.liveValidationEnabled = true;
    if (els.therapyValidationControls) els.therapyValidationControls.classList.add('live-validation-on');
  }

  function scheduleTherapyLiveValidation(delay = 450) {
    if (!state.therapyValidation.liveValidationEnabled || state.therapyValidation.liveValidationRunning) return;
    if (state.therapyValidation.liveValidationTimer) clearTimeout(state.therapyValidation.liveValidationTimer);
    state.therapyValidation.liveValidationTimer = setTimeout(() => {
      state.therapyValidation.liveValidationTimer = null;
      if (!state.therapyValidation.liveValidationEnabled) return;
      state.therapyValidation.liveValidationRunning = true;
      try {
        validateTherapyField({ source: 'live' });
      } finally {
        state.therapyValidation.liveValidationRunning = false;
      }
    }, delay);
  }

  function scheduleTherapyPreviewAndOptionalValidation(delay = 450) {
    syncTherapyTextareaFromEditor(false);
    scheduleTherapyLivePreview();
    if (state.therapyValidation.liveValidationEnabled) {
      scheduleTherapyLiveValidation(delay);
    }
  }

  function syncTherapyEditorFromTextarea() {
    if (!els.therapy || !els.therapyEditor) return;
    const text = normalizeLineBreaks(els.therapy.value || '');
    renderTherapyEditorLines(text ? text.split('\n') : []);
  }

  function updateTherapyEditorPlaceholder() {
    if (!els.therapyEditor) return;
    const text = getTherapyEditorText().trim();
    els.therapyEditor.classList.toggle('is-empty', !text);
  }

  function updateTherapyEditorDisabled() {
    if (!els.therapyEditor || !els.showTherapyOnList) return;
    const disabled = !els.showTherapyOnList.checked;
    els.therapyEditor.classList.toggle('is-disabled', disabled);
    els.therapyEditor.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    els.therapyEditor.querySelectorAll('input, select, button').forEach((control) => {
      control.disabled = disabled || (control.classList.contains('therapy-drug-select') && !control.dataset.therapyAction);
    });
  }

  function pushTherapyValidationUndo() {
    if (!els.therapy) return;
    state.therapyValidation.undoStack.push(els.therapy.value || '');
    if (state.therapyValidation.undoStack.length > 20) state.therapyValidation.undoStack.shift();
    updateTherapyUndoButton();
  }

  function updateTherapyUndoButton() {
    if (els.therapyUndoBtn) els.therapyUndoBtn.disabled = state.therapyValidation.undoStack.length === 0;
  }

  function undoTherapyValidationChange() {
    const previous = state.therapyValidation.undoStack.pop();
    if (typeof previous !== 'string') return;
    els.therapy.value = previous;
    syncTherapyEditorFromTextarea();
    updateTherapyUndoButton();
    validateTherapyField();
    renderAll();
    setStatus('Vraćena je zadnja izmjena terapije.');
  }

  function stripTherapyBullet(line) {
    return String(line || '').replace(THERAPY_BULLET_PREFIX_RE, '').trim();
  }

  function cleanTherapyCandidateText(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[•·]+/g, ' ')
      .replace(/^[\s,;:.\-–—[\]{}]+|[\s,;:.\-–—[\]{}]+$/gu, '')
      .replace(/^\((?=[^)]*$)/u, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isTherapyJunkCandidate(value) {
    const text = cleanTherapyCandidateText(value);
    if (!text) return true;
    if (/^[()[\]{}.,;:\/\\\-–—]+$/u.test(text)) return true;
    if (!/[A-Za-zČĆŽŠĐčćžšđ0-9]/u.test(text)) return true;
    if (text.length < 2 && !/\d/.test(text)) return true;
    if (/^(?:i|ili|te|a|uz|po|od|bez|sa|s)$/i.test(text)) return true;
    return false;
  }


  function looksLikeCompleteTherapyItemBeforeBoundary(value) {
    const text = cleanTherapyCandidateText(value);
    if (!text || text.length < 4) return false;
    return lineHasScheme(text) || lineHasRouteOrForm(text) || /\b\d+\s*(?:mg|g|mcg|µg|ug|ij|IU|ml|mL|mmol|%|tbl|tableta|kaps|amp)\b/i.test(text);
  }

  function isLikelyInhalationTherapyStart(value) {
    const text = String(value || '').trim();
    return /^(?:inh\.?|inhalacij[ae]|inhalacijski|nebulizacij[ae])\s+[A-Za-zČĆŽŠĐčćžšđ][A-Za-zČĆŽŠĐčćžšđ0-9+\-/ ]{2,80}(?:\s+\d|\s+po\s+potrebi|\s+dnevno|$)/i.test(text);
  }

  function findNextTherapyBoundaryInSegment(segment) {
    const text = String(segment || '');
    if (!text.trim()) return -1;

    // Ručno unesena inhalacijska terapija često počinje opisno, bez tvorničkog naziva,
    // npr. "... tbl inhalacije ipratropij+salbutamol 2x dnevno".
    const inhalationRe = /\s+(?=(?:inh\.?|inhalacij[ae]|inhalacijski|nebulizacij[ae])\s+[A-Za-zČĆŽŠĐčćžšđ])/gi;
    let inhalationMatch;
    while ((inhalationMatch = inhalationRe.exec(text)) !== null) {
      const idx = inhalationMatch.index + inhalationMatch[0].length;
      if (idx <= 0 || idx >= text.length) continue;
      if (looksLikeCompleteTherapyItemBeforeBoundary(text.slice(0, idx)) && isLikelyInhalationTherapyStart(text.slice(idx))) return idx;
    }

    // Općenito: ako nakon već kompletne stavke počinje novi prepoznat lijek iz baze,
    // razdvoji i bez zareza/točka-zareza.
    if (!state?.therapyValidation?.aliases?.length) return -1;
    const wordRe = /\s+(?=[A-Za-zČĆŽŠĐčćžšđ])/gu;
    let match;
    while ((match = wordRe.exec(text)) !== null) {
      const idx = match.index + match[0].length;
      if (idx <= 0 || idx >= text.length) continue;
      const before = text.slice(0, idx);
      const after = text.slice(idx);
      if (!looksLikeCompleteTherapyItemBeforeBoundary(before)) continue;
      const afterClean = cleanTherapyCandidateText(after);
      if (isTherapyJunkCandidate(afterClean)) continue;
      const therapyMatch = findTherapyMatch(afterClean);
      if (therapyMatch && therapyMatch.type === 'exact') return idx;
    }
    return -1;
  }

  function splitTherapySegmentAtRecognizedBoundaries(segment) {
    const result = [];
    let rest = cleanTherapyCandidateText(segment);
    let guard = 0;
    while (rest && guard < 20) {
      guard += 1;
      const idx = findNextTherapyBoundaryInSegment(rest);
      if (idx < 0) break;
      const left = cleanTherapyCandidateText(rest.slice(0, idx));
      const right = cleanTherapyCandidateText(rest.slice(idx));
      if (!left || !right || left === rest || right === rest) break;
      if (!isTherapyJunkCandidate(left)) result.push(left);
      rest = right;
    }
    if (!isTherapyJunkCandidate(rest)) result.push(rest);
    return result;
  }

  function splitTherapyItemsSmart(value) {
    const source = String(value || '').replace(/\u00a0/g, ' ');
    const items = [];
    let current = '';
    let parenDepth = 0;
    const continuationAfterSeparatorRe = /^(?:tbl\.?|tabl\.?|tableta|tablete|film\s+obl|kaps\.?|caps\.?|kapsula|kapsule|amp\.?|ampula|inj\.?|injekcija|i\.?v\.?|iv|p\.?o\.?|po|per\s+os|s\.?c\.?|sc|i\.?m\.?|im|inh\.?|inhalacijski|udisati|nebulizacija|kapi|kapi\s+za\s+oči|kapi\s+za\s+oci|kapi\s+za\s+uho|kapi\s+za\s+nos|sprej|sirup|mast|krema|gel|flaster|supp\.?|čepić|cepic|ml|mL|mg|g|µg|mcg|ug|ij|iu|ujutro|navečer|navecer|uvečer|uvecer|dnevno|svaki\s+dan|po\s+potrebi|prema\s+potrebi|pp\.?|prije\s+jela|poslije\s+jela|uz\s+obrok|kroz|do|dana|tjedana|mjeseci)\b/i;

    const pushCurrent = () => {
      const cleaned = cleanTherapyCandidateText(current);
      if (!isTherapyJunkCandidate(cleaned)) {
        splitTherapySegmentAtRecognizedBoundaries(cleaned).forEach((item) => {
          if (!isTherapyJunkCandidate(item)) items.push(item);
        });
      }
      current = '';
    };

    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === '\r') continue;
      if (ch === '(' || ch === '[') {
        parenDepth += 1;
        current += ch;
        continue;
      }
      if (ch === ')' || ch === ']') {
        parenDepth = Math.max(0, parenDepth - 1);
        current += ch;
        continue;
      }
      if (ch === '\n' || ch === ';') {
        pushCurrent();
        continue;
      }
      if (ch === ',') {
        if (parenDepth > 0) {
          current += ch;
          continue;
        }
        const prevMatch = current.match(/\S(?=\s*$)/u);
        const prev = prevMatch ? prevMatch[0] : '';
        const after = source.slice(i + 1).trimStart();
        const next = after.charAt(0);
        // Ne dijeli decimalne doze i sheme doziranja: 1,0,0; 1/2,0,1; 2,0 g.
        if (/\d/.test(prev) && /\d/.test(next)) {
          current += ch;
          continue;
        }
        // Ne dijeli nastavke istog retka: ", tbl", ", i.v.", ", po potrebi".
        if (continuationAfterSeparatorRe.test(after)) {
          current += ch;
          continue;
        }
        pushCurrent();
        continue;
      }
      current += ch;
    }
    pushCurrent();
    return items;
  }

  function hasWordLikeBoundary(normalizedLine, key) {
    if (!normalizedLine || !key) return false;
    return normalizedLine === key || normalizedLine.startsWith(`${key} `) || normalizedLine.includes(` ${key} `);
  }

  function findExactTherapyAlias(cleanLine) {
    const normalized = therapyNormalizeText(cleanLine);
    if (!normalized) return null;
    for (const entry of state.therapyValidation.aliases) {
      if (hasWordLikeBoundary(normalized, entry.key)) return entry;
    }
    for (const exception of state.therapyValidation.localExceptions) {
      if (hasWordLikeBoundary(normalized, exception.key)) {
        return { key: exception.key, displayName: exception.name, type: 'lokalna_iznimka', localException: true };
      }
    }
    return null;
  }

  function levenshteinDistance(a, b) {
    a = String(a || '');
    b = String(b || '');
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    const curr = new Array(b.length + 1);
    for (let i = 1; i <= a.length; i += 1) {
      curr[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
    }
    return prev[b.length];
  }

  function similarityScore(a, b) {
    const maxLen = Math.max(String(a).length, String(b).length, 1);
    return 1 - (levenshteinDistance(a, b) / maxLen);
  }

  function candidateNamePrefixes(cleanLine) {
    const normalized = therapyNormalizeText(cleanLine);
    const tokens = normalized.split(' ').filter(Boolean).slice(0, 5);
    const prefixes = [];
    for (let i = Math.min(tokens.length, 5); i >= 1; i -= 1) {
      const prefix = tokens.slice(0, i).join(' ');
      if (prefix.length >= 3) prefixes.push(prefix);
    }
    return prefixes;
  }

  function findFuzzyTherapyAlias(cleanLine) {
    if (!state.therapyValidation.aliases.length) return null;
    const prefixes = candidateNamePrefixes(cleanLine);
    if (!prefixes.length) return null;
    let best = null;
    const firstChar = prefixes[0]?.charAt(0) || '';
    const candidates = state.therapyValidation.aliases.filter((entry) => entry.key.charAt(0) === firstChar || Math.abs(entry.key.length - prefixes[0].length) <= 2);
    const pool = candidates.length ? candidates : state.therapyValidation.aliases;
    for (const prefix of prefixes) {
      for (const entry of pool) {
        if (Math.abs(entry.key.length - prefix.length) > Math.max(5, Math.ceil(prefix.length * 0.45))) continue;
        const score = similarityScore(prefix, entry.key);
        if (!best || score > best.score) best = { entry, score, prefix };
      }
    }
    if (best && best.score >= 0.78) return best;
    return null;
  }

  function findTherapyMatch(cleanLine) {
    const exact = findExactTherapyAlias(cleanLine);
    if (exact) return { type: 'exact', entry: exact, score: 1 };
    const fuzzy = findFuzzyTherapyAlias(cleanLine);
    if (fuzzy) return { type: 'fuzzy', entry: fuzzy.entry, score: fuzzy.score, prefix: fuzzy.prefix };
    return null;
  }

  function lineHasDose(line) {
    const text = String(line || '');
    return THERAPY_REQUIRED_PATTERNS.dose.test(text)
      || /\b\d+\s*[x×]\s*\d+(?:[,.]\d+)?\s*(?:mg|g|mcg|µg|ug|ij|IU|ml|mL|mmol|%)\b/i.test(text);
  }
  function lineHasScheme(line) { return THERAPY_REQUIRED_PATTERNS.scheme.test(line); }
  function lineHasRouteOrForm(line) { return THERAPY_REQUIRED_PATTERNS.routeOrForm.test(line); }

  function extractTherapyRemainderAfterMatchedName(line, match) {
    const clean = stripTherapyBullet(line);
    if (!match || !match.entry) return clean;
    const name = match.type === 'fuzzy' ? match.prefix : match.entry.key;
    const cleanNormalized = therapyNormalizeText(clean);
    if (!name || !cleanNormalized.startsWith(name)) {
      const firstDose = clean.search(/\b\d/);
      return firstDose >= 0 ? clean.slice(firstDose).trim() : clean;
    }
    const rawTokens = clean.split(/\s+/);
    const normalizedTokens = [];
    let cutIndex = 0;
    for (let i = 0; i < rawTokens.length; i += 1) {
      normalizedTokens.push(therapyNormalizeText(rawTokens[i]));
      if (normalizedTokens.join(' ') === name || normalizedTokens.join(' ').length >= name.length) {
        cutIndex = i + 1;
        break;
      }
    }
    return rawTokens.slice(cutIndex).join(' ').trim();
  }


  function getTherapySimplifiedDisplayName(entry) {
    if (!entry) return '';
    const rawName = String(entry.displayName || entry.rawName || entry.brandName || '').replace(/\s+/g, ' ').trim();
    if (!rawName) return '';
    const genericName = String(entry.genericName || '').replace(/\s+/g, ' ').trim();
    const normRaw = therapyNormalizeText(rawName);
    const normGeneric = therapyNormalizeText(genericName);
    // Ako je naziv građen kao generički naziv + proizvođač
    // (npr. "Alopurinol Belupo", "Metformin Pliva", "Ramipril Sandoz"),
    // u prijedlozima želimo ukloniti proizvođača i ostaviti samo klinički naziv lijeka.

    if (genericName && normGeneric && (normRaw === normGeneric || normRaw.startsWith(normGeneric + ' '))) {
      const remainder = normRaw === normGeneric ? '' : rawName.slice(genericName.length).trim();
      const manufacturerRemainderPattern = /^(?:belupo|pharmas|pliva|krka|sandoz|teva|mylan|stada|lek|accord|pfizer|zentiva|hexal|novartis|egis|medis|genera|billev|alkaloid|berlin-chemie|berlin chemie|menarini|sanofi|bayer|merck|glaxosmithkline|gsk|fresenius(?:\s+kabi)?|kabi|braun|b\.?\s?braun|boehringer|abbott|amgen|takeda|viatris|astellas|richter|hameln|replek|orion|noliprel|servier|lupin|sun|hospira|salmed|jgl|salutas)(?:\s+[a-z0-9.+\-/]+)*$/i;
      if (!remainder || manufacturerRemainderPattern.test(remainder)) return genericName;
    }

    // Rezervno: makni čiste pravne/proizvođačke nastavke na kraju naziva.
    return rawName
      .replace(/\s+(?:d\.d\.|d\.o\.o\.|inc\.|gmbh|pharma|pharmas|belupo|pliva|krka|sandoz|teva|mylan|stada|lek|accord|pfizer|zentiva|hexal|novartis|egis|medis|genera|alkaloid|menarini|sanofi|bayer|merck|viatris|jgl|salutas|kabi|fresenius\s+kabi)$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildStandardizedTherapyLine(originalLine, match) {
    if (!match || !match.entry) return '';
    const prefix = originalLine.match(THERAPY_BULLET_PREFIX_RE)?.[0] || '';
    const remainder = extractTherapyRemainderAfterMatchedName(originalLine, match);
    const canonical = getTherapySimplifiedDisplayName(match.entry) || match.entry.displayName || match.entry.rawName || match.entry.key;
    return `${prefix}${canonical}${remainder ? ' ' + remainder : ''}`.replace(/\s+/g, ' ').trim();
  }
  function inferTherapyFormFromPackage(packageText) {
    const text = String(packageText || '').trim().toLowerCase();
    if (!text) return '';
    const formPatterns = [
      { re: /\btbl\.?(?=\s|$)|\btablete?\b|\bfilm\s*obl\.?\b/, value: 'tbl' },
      { re: /\bkaps\.?(?=\s|$)|\bkapsule?\b/, value: 'kaps' },
      { re: /\bfilm\s*tbl\.?\b/, value: 'tbl' },
      { re: /\bamp\.?(?=\s|$)|\bampule?\b/, value: 'amp' },
      { re: /\binj\.?(?=\s|$)|\binjekc/i, value: 'inj.' },
      { re: /\bsir\.?(?=\s|$)|\bsirup\b/, value: 'sirup' },
      { re: /\bkapi\b/, value: 'kapi' },
      { re: /\bsprej\b/, value: 'sprej' },
      { re: /\bmast\b/, value: 'mast' },
      { re: /\bkrema\b|\bcrm\.?\b/, value: 'krema' },
      { re: /\bgel\b/, value: 'gel' },
      { re: /\bflaster\b/, value: 'flaster' },
      { re: /\bčepić\b|\bcepici?\b|\bsupp\.?\b/, value: 'supp' },
      { re: /\binhal\.?(?=\s|$)|\bprašak\s+inhal\.?(?=\s|$)/, value: 'inh.' }
    ];
    const match = formPatterns.find((item) => item.re.test(text));
    return match ? match.value : '';
  }

  function canonicalizeTherapyFormToken(value) {
    const text = therapyNormalizeText(value || '');
    if (!text) return '';
    if (/\b(tbl|tableta|tablete|film obl|filmom oblozena|filmom oblozene)\b/.test(text)) return 'tbl';
    if (/\b(kaps|kapsula|kapsule)\b/.test(text)) return 'kaps';
    if (/\b(amp|ampula|ampule)\b/.test(text)) return 'amp';
    if (/\b(inj|injekc)\b/.test(text)) return 'inj.';
    if (/\b(kapi)\b/.test(text)) return 'kapi';
    if (/\b(sprej)\b/.test(text)) return 'sprej';
    if (/\b(sirup|sir)\b/.test(text)) return 'sirup';
    if (/\b(krema|crm)\b/.test(text)) return 'krema';
    if (/\b(mast)\b/.test(text)) return 'mast';
    if (/\b(gel)\b/.test(text)) return 'gel';
    if (/\b(flaster)\b/.test(text)) return 'flaster';
    if (/\b(cepic|supp)\b/.test(text)) return 'supp';
    if (/\b(inhal|inh)\b/.test(text)) return 'inh.';
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function inferTherapyShortPresentation(entry) {
    const packageText = String(entry?.packageText || '');
    const normalizedPackage = therapyNormalizeText(packageText);
    if (/\bkapi za oci\b/.test(normalizedPackage)) return 'kapi za oči';
    if (/\bkapi za uho\b/.test(normalizedPackage)) return 'kapi za uho';
    if (/\bkapi za nos\b/.test(normalizedPackage)) return 'kapi za nos';
    return canonicalizeTherapyFormToken(entry?.form || inferTherapyFormFromPackage(packageText) || '');
  }

  function isDoseOptionalTherapySuggestion(entry, line = '') {
    const text = therapyNormalizeText(`${line || ''} ${entry?.packageText || ''} ${entry?.routeTokens || ''} ${entry?.routeWide || ''}`);
    return /\bkapi za oci\b|\bkapi za uho\b|\bkapi za nos\b|\bu oko\b|\bu uho\b/.test(text);
  }

  function inferTherapyRouteOrFormToken(entry) {
    if (!entry) return '';
    const shortPresentation = inferTherapyShortPresentation(entry);
    if (shortPresentation) return shortPresentation === 'tablete' ? 'tbl' : shortPresentation;
    const routeWide = therapyNormalizeText(entry.routeWide || '');
    const routeTokens = String(entry.routeTokens || '');
    if (routeWide.includes('oral') || /\b(p\.o\.|per os|po|oralno|na usta)\b/i.test(routeTokens)) return 'p.o.';
    if (routeWide.includes('intravenski') || /\bi\.?v\.?\b/i.test(routeTokens)) return 'i.v.';
    if (routeWide.includes('intramuskularno') || /\bi\.?m\.?\b/i.test(routeTokens)) return 'i.m.';
    if (routeWide.includes('supkutano') || /\bs\.?c\.?\b/i.test(routeTokens)) return 's.c.';
    if (routeWide.includes('inhal') || /\binh\.?\b/i.test(routeTokens)) return 'inh.';
    return '';
  }

  function collapseDuplicateTherapyPresentationPhrases(value) {
    let text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return text;

    // Ako je korisnik već upisao oblik/put u nazivu, a CSV alias ima isti dodatak
    // u kanonskom nazivu, prijedlog može slučajno postati npr.
    // "Fixalpost kapi za oči kapi za oči 1,0,0". Takav prijedlog je nepregledan,
    // pa ovdje kolabiramo ponovljene kliničke prezentacije bez diranja doze/sheme.
    const repeatedPresentationPatterns = [
      { re: /\b(kapi za oči)(?:\s+\1\b)+/giu, replacement: '$1' },
      { re: /\b(kapi za oci)(?:\s+\1\b)+/giu, replacement: '$1' },
      { re: /\b(kapi za uho)(?:\s+\1\b)+/giu, replacement: '$1' },
      { re: /\b(kapi za nos)(?:\s+\1\b)+/giu, replacement: '$1' },
      { re: /\b(tbl)(?:\.?)\s+(?:tbl\.?\b)+/giu, replacement: 'tbl' },
      { re: /\b(kaps)(?:\.?)\s+(?:kaps\.?\b)+/giu, replacement: 'kaps' },
      { re: /\b(amp)(?:\.?)\s+(?:amp\.?\b)+/giu, replacement: 'amp' }
    ];
    for (const item of repeatedPresentationPatterns) {
      text = text.replace(item.re, item.replacement);
    }
    return text.replace(/\s+/g, ' ').trim();
  }


  function therapyDoseComparable(value, unit) {
    const n = Number(String(value || '').replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    let u = therapyNormalizeText(unit || '').replace(/µg/g, 'mcg').replace(/\bug\b/g, 'mcg').replace(/\bij\b/g, 'iu');
    if (u === 'g') return { unit: 'mg', value: n * 1000 };
    if (u === 'mg') return { unit: 'mg', value: n };
    if (u === 'mcg') return { unit: 'mg', value: n / 1000 };
    return { unit: u, value: n };
  }

  function therapyDoseComparablesEqual(a, b) {
    if (!a || !b || a.unit !== b.unit) return false;
    const tolerance = Math.max(0.001, Math.abs(a.value) * 0.0001);
    return Math.abs(a.value - b.value) <= tolerance;
  }

  function extractTherapyDoseComparables(value) {
    const text = String(value || '');
    const re = /(\d+(?:[,.]\d+)?)\s*(mg|g|mcg|µg|ug|ij|IU|ml|mL|mmol|%)\b/gi;
    const out = [];
    let match;
    while ((match = re.exec(text)) !== null) {
      const comparable = therapyDoseComparable(match[1], match[2]);
      if (comparable) out.push({ ...comparable, raw: match[0], index: match.index, end: match.index + match[0].length });
    }
    return out;
  }

  function removeDuplicatedTherapyTrailingStrength(value) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return text;
    const trailing = text.match(/\s+(\d+(?:[,.]\d+)?)\s*(mg|g|mcg|µg|ug|ij|IU|ml|mL|mmol|%)\s*$/i);
    if (!trailing) return text;
    const before = text.slice(0, trailing.index).trim();
    if (!before) return text;
    const trailingComparable = therapyDoseComparable(trailing[1], trailing[2]);
    if (!trailingComparable) return text;
    const earlier = extractTherapyDoseComparables(before);
    if (earlier.some((item) => therapyDoseComparablesEqual(item, trailingComparable))) return before;
    return text;
  }

  function normalizeTherapySuggestionText(value) {
    return removeDuplicatedTherapyTrailingStrength(collapseDuplicateTherapyPresentationPhrases(value));
  }

  // ============================================================
  // v247 — AUTOCOMPLETE KRONIČNE TERAPIJE
  // ============================================================
  const THERAPY_AUTOCOMPLETE_MAX_ITEMS = 8;
  const THERAPY_AUTOCOMPLETE_MIN_CHARS = 2;
  const THERAPY_AUTOCOMPLETE_RANK_POOL = 80;
  const THERAPY_AUTOCOMPLETE_DOSING_SCHEMES = Object.freeze(['1,0,0', '0,1,0', '0,0,1']);
  const THERAPY_AUTOCOMPLETE_FORM_PATTERN = '(?:tbl\\.?|tablete?|kaps\\.?|caps\\.?|inh\\.?|gtt\\.?|sir\\.?|amp\\.?|inj\\.?|i\\.?\\s*v\\.?|s\\.?\\s*c\\.?|p\\.?\\s*o\\.?|per\\s+os)';
  const THERAPY_AUTOCOMPLETE_STRENGTH_PATTERN = '(?:\\d+(?:[,.]\\d+)?\\s*(?:mg|mcg|Âµg|µg|ug|g|ml|mL|IU|i\\.j\\.|ij|mmol|%))';

  const THERAPY_AUTOCOMPLETE_SEED = Object.freeze([
    { line: 'ceftriakson 1x2,0 g i.v.', triggers: ['cef', 'ceftr', 'ceftriakson', 'lendacin', 'rocephin'], meta: 'česti predložak — provjeriti indikaciju i dozu' },
    { line: 'ceftriakson 1x1,0 g i.v.', triggers: ['cef', 'ceftr', 'ceftriakson'], meta: 'alternativni predložak — provjeriti indikaciju i dozu' },
    { line: 'cefuroksim 3x1,5 g i.v.', triggers: ['cef', 'cefu', 'cefuroksim', 'zinacef'], meta: 'predložak — provjeriti indikaciju i dozu' },
    { line: 'ceftazidim 3x2,0 g i.v.', triggers: ['cef', 'ceft', 'ceftazidim', 'fortum'], meta: 'predložak — provjeriti indikaciju i dozu' },
    { line: 'piperacilin/tazobaktam 4x4,5 g i.v.', triggers: ['pip', 'piper', 'tazo', 'tazocin'], meta: 'predložak — provjeriti eGFR/ClCr' },
    { line: 'meropenem 3x1,0 g i.v.', triggers: ['mer', 'mero', 'meropenem'], meta: 'predložak — provjeriti eGFR/ClCr' },
    { line: 'ertapenem 1x1,0 g i.v.', triggers: ['ert', 'erta', 'ertapenem', 'invanz'], meta: 'predložak — provjeriti eGFR/ClCr' },
    { line: 'vankomicin 2x1,0 g i.v.', triggers: ['van', 'vanko', 'vankomicin'], meta: 'predložak — dozirati prema razini/eGFR' },
    { line: 'linezolid 2x600 mg p.o.', triggers: ['lin', 'linezolid'], meta: 'predložak — provjeriti interakcije i KKS' },
    { line: 'azitromicin 1x500 mg p.o.', triggers: ['azi', 'azit', 'azitromicin'], meta: 'predložak — provjeriti QT/interakcije' },
    { line: 'moksifloksacin 1x400 mg p.o.', triggers: ['mok', 'moksi', 'moksifloksacin'], meta: 'predložak — provjeriti QT/tetive' },
    { line: 'metronidazol 3x500 mg i.v.', triggers: ['met', 'metro', 'metronidazol'], meta: 'predložak' },
    { line: 'pantoprazol 1x40 mg p.o.', triggers: ['pan', 'panto', 'pantoprazol', 'zipantola', 'controloc'], meta: 'česti PPI predložak' },
    { line: 'amlodipin 1x5 mg p.o.', triggers: ['aml', 'amlo', 'amlodipin'], meta: 'česti kronični lijek' },
    { line: 'bisoprolol 1x2,5 mg p.o.', triggers: ['bis', 'biso', 'bisoprolol', 'concor'], meta: 'česti kronični lijek' },
    { line: 'ramipril 1x5 mg p.o.', triggers: ['ram', 'rami', 'ramipril'], meta: 'česti kronični lijek' },
    { line: 'atorvastatin 1x20 mg p.o.', triggers: ['ato', 'ator', 'atorvastatin'], meta: 'česti kronični lijek' },
    { line: 'metformin 2x1000 mg p.o.', triggers: ['metf', 'metformin'], meta: 'česti kronični lijek — provjeriti eGFR' },
    { line: 'levotiroksin 1x50 mcg p.o.', triggers: ['lev', 'levo', 'levotiroksin', 'euthyrox'], meta: 'česti kronični lijek' },
    { line: 'apiksaban 2x5 mg p.o.', triggers: ['api', 'apik', 'apiksaban', 'eliquis'], meta: 'česti kronični lijek — provjeriti dozu' },
    { line: 'rivaroksaban 1x20 mg p.o.', triggers: ['riv', 'riva', 'rivaroksaban', 'xarelto'], meta: 'česti kronični lijek — provjeriti dozu' }
  ]);

  function getTherapyAutocompleteCurrentLine(textarea) {
    const value = String(textarea?.value || '');
    const cursor = Number(textarea?.selectionStart || 0);
    const lineStart = value.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
    const nextLineBreak = value.indexOf('\n', cursor);
    const lineEnd = nextLineBreak >= 0 ? nextLineBreak : value.length;
    const beforeCursor = value.slice(lineStart, cursor);
    const fullLine = value.slice(lineStart, lineEnd);
    const query = beforeCursor.replace(THERAPY_BULLET_PREFIX_RE, '').trim();
    return { value, cursor, lineStart, lineEnd, beforeCursor, fullLine, query };
  }

  function therapyAutocompleteUniquePush(items, item, seen) {
    const line = String(item?.line || '').replace(/\s+/g, ' ').trim();
    if (!line) return;
    const key = therapyNormalizeText(line);
    if (!key || seen.has(key)) return;
    seen.add(key);
    items.push({ ...item, line });
  }

  function getTherapyAutocompleteUsageRecord(item) {
    const key = normalizeTherapyAutocompleteUsageKey(item?.line || '');
    return key ? state.therapyAutocomplete.usage?.[key] || null : null;
  }

  function normalizeTherapyAutocompleteComparableKey(value) {
    let key = normalizeTherapyAutocompleteUsageKey(value || '');
    if (!key) return '';
    key = key
      .replace(/\bi\s+v\b/g, 'iv')
      .replace(/\bs\s+c\b/g, 'sc')
      .replace(/\bp\s+o\b/g, 'po')
      .replace(/\btablete?\b/g, 'tbl')
      .replace(/\bkapsule?\b/g, 'kaps')
      .replace(/\bampule?\b/g, 'amp')
      .replace(/\binjekcija\b/g, 'inj')
      .replace(/\s+/g, ' ')
      .trim();
    return key.slice(0, 180);
  }

  function getTherapyAutocompleteComparableKeys(line) {
    const keys = new Set();
    const clean = String(line || '')
      .replace(THERAPY_BULLET_PREFIX_RE, '')
      .replace(/\s+/g, ' ')
      .trim();
    const key = normalizeTherapyAutocompleteComparableKey(clean);
    if (!key) return keys;
    keys.add(key);
    const withoutTerminalForm = key.replace(/\s+(?:tbl|kaps|caps)\s*$/i, '').trim();
    if (withoutTerminalForm && withoutTerminalForm !== key) keys.add(withoutTerminalForm);
    return keys;
  }

  function therapyAutocompleteKeySetsOverlap(left, right) {
    for (const key of left || []) {
      if (right?.has?.(key)) return true;
    }
    return false;
  }

  function findExistingTherapyAutocompleteUsageKeyForLine(line) {
    const desiredKeys = getTherapyAutocompleteComparableKeys(line);
    if (!desiredKeys.size) return '';
    const exactKey = normalizeTherapyAutocompleteUsageKey(line || '');
    if (exactKey && state.therapyAutocomplete.usage?.[exactKey]) return exactKey;
    for (const [storedKey, value] of Object.entries(state.therapyAutocomplete.usage || {})) {
      const normalized = normalizeTherapyAutocompleteUsageRecord(storedKey, value);
      if (!normalized) continue;
      const storedKeys = getTherapyAutocompleteComparableKeys(normalized.record.line || storedKey);
      if (therapyAutocompleteKeySetsOverlap(desiredKeys, storedKeys)) return storedKey;
    }
    return '';
  }

  function hasTherapyAutocompleteUsageForLine(line) {
    const key = normalizeTherapyAutocompleteUsageKey(line || '');
    if (!key) return false;
    if (normalizeTherapyAutocompleteUsageRecord(key, state.therapyAutocomplete.usage?.[key])) return true;
    return Boolean(findExistingTherapyAutocompleteUsageKeyForLine(line));
  }

  function buildTherapyAutocompleteMeta(item, usageRecord) {
    if (item?.kind === 'save-custom') return item.meta || 'spremi u moje prijedloge';
    if (item?.source === 'custom') return 'moj spremljeni prijedlog';
    const base = String(item?.meta || 'prijedlog').trim();
    const count = Math.max(0, Number(usageRecord?.count || 0));
    if (!count) return base;
    return `često birano (${count}x) - ${base}`;
  }

  function rankTherapyAutocompleteSuggestions(query, suggestions) {
    const q = therapyNormalizeText(query);
    return (suggestions || [])
      .map((item, index) => {
        const usageRecord = getTherapyAutocompleteUsageRecord(item);
        const count = Math.max(0, Number(usageRecord?.count || 0));
        const lastUsedMs = Date.parse(usageRecord?.lastUsedAt || '') || 0;
        const lineNorm = therapyNormalizeText(item.line || '');
        const matchScore = lineNorm.startsWith(q) ? 2 : (lineNorm.includes(` ${q}`) ? 1 : 0);
        return {
          ...item,
          meta: buildTherapyAutocompleteMeta(item, usageRecord),
          _rank: { index, count, lastUsedMs, matchScore }
        };
      })
      .sort((a, b) => {
        if (b._rank.count !== a._rank.count) return b._rank.count - a._rank.count;
        if (b._rank.lastUsedMs !== a._rank.lastUsedMs) return b._rank.lastUsedMs - a._rank.lastUsedMs;
        if (b._rank.matchScore !== a._rank.matchScore) return b._rank.matchScore - a._rank.matchScore;
        return a._rank.index - b._rank.index;
      })
      .map(({ _rank, ...item }) => item);
  }

  function recordTherapyAutocompleteSelection(item, options = {}) {
    const line = String(item?.line || '').replace(/\s+/g, ' ').trim().slice(0, 180);
    const key = findExistingTherapyAutocompleteUsageKeyForLine(line) || normalizeTherapyAutocompleteUsageKey(line);
    if (!key) return;
    const usage = state.therapyAutocomplete.usage || {};
    const previous = usage[key] || {};
    const source = options.source || item?.source || previous.source || '';
    usage[key] = {
      line,
      count: Math.min(9999, Math.max(0, Number(previous.count || 0)) + 1),
      lastUsedAt: new Date().toISOString(),
      source: source === 'custom' ? 'custom' : ''
    };
    state.therapyAutocomplete.usage = usage;
    saveTherapyAutocompleteUsageToStorage();
  }

  function getRememberableTherapyAutocompleteLine(textarea = els.therapy) {
    if (!textarea) return '';
    const ctx = getTherapyAutocompleteCurrentLine(textarea);
    return String(ctx.fullLine || '')
      .replace(THERAPY_BULLET_PREFIX_RE, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);
  }

  function isRememberableTherapyAutocompleteLine(line) {
    const clean = String(line || '').trim();
    return clean.length >= 3 && /[A-Za-zČĆŽŠĐčćžšđ]/.test(clean);
  }

  function updateRememberTherapyAutocompleteButtonState() {
    const button = els.rememberTherapyAutocompleteBtn;
    if (!button) return;
    const line = getRememberableTherapyAutocompleteLine();
    const disabled = !els.therapy || els.therapy.readOnly || !isRememberableTherapyAutocompleteLine(line);
    button.disabled = disabled;
    button.title = disabled
      ? 'Postavi kursor na redak kronične terapije koji želiš upamtiti.'
      : `Upamti kao budući prijedlog: ${line}`;
  }

  function rememberCurrentTherapyAutocompleteLine() {
    const line = getRememberableTherapyAutocompleteLine();
    if (!isRememberableTherapyAutocompleteLine(line)) {
      setStatus('Nema retka kronične terapije za pamćenje. Postavite kursor u redak koji želite upamtiti.', true);
      updateRememberTherapyAutocompleteButtonState();
      return false;
    }
    const alreadyStored = hasTherapyAutocompleteUsageForLine(line);
    recordTherapyAutocompleteSelection({ line, source: 'custom' }, { source: 'custom' });
    updateRememberTherapyAutocompleteButtonState();
    setStatus(`${alreadyStored ? 'Osvježen' : 'Upamćen'} je lokalni prijedlog kronične terapije: ${line}`);
    return true;
  }

  function deleteCustomTherapyAutocompleteSuggestion(index = state.therapyAutocomplete.activeIndex || 0) {
    const suggestions = state.therapyAutocomplete.suggestions || [];
    const item = suggestions[index];
    const key = findExistingTherapyAutocompleteUsageKeyForLine(item?.line || '') || normalizeTherapyAutocompleteUsageKey(item?.line || '');
    if (!key || item?.source !== 'custom' || state.therapyAutocomplete.usage?.[key]?.source !== 'custom') {
      return false;
    }
    const line = String(state.therapyAutocomplete.usage[key]?.line || item.line || '').replace(/\s+/g, ' ').trim();
    const confirmed = window.confirm(`Jeste li sigurni da želite obrisati spremljenu terapiju?\n\n${line}`);
    if (!confirmed) {
      if (els.therapy) els.therapy.focus();
      return false;
    }
    delete state.therapyAutocomplete.usage[key];
    saveTherapyAutocompleteUsageToStorage();
    updateTherapyAutocomplete();
    updateRememberTherapyAutocompleteButtonState();
    if (els.therapy) els.therapy.focus();
    setStatus(`Obrisan je lokalni prijedlog kronicne terapije: ${line}`);
    return true;
  }

  function getSeedTherapyAutocompleteSuggestions(query) {
    const q = therapyNormalizeText(query);
    if (q.length < THERAPY_AUTOCOMPLETE_MIN_CHARS) return [];
    const seen = new Set();
    const out = [];
    THERAPY_AUTOCOMPLETE_SEED.forEach((item) => {
      const lineNorm = therapyNormalizeText(item.line);
      const triggerMatch = (item.triggers || []).some((trigger) => {
        const t = therapyNormalizeText(trigger);
        return t.startsWith(q) || q.startsWith(t);
      });
      if (!lineNorm.startsWith(q) && !triggerMatch) return;
      therapyAutocompleteUniquePush(out, { line: item.line, meta: item.meta || 'lokalni predložak' }, seen);
    });
    return out;
  }

  function getPopularTherapyAutocompleteSuggestions(query) {
    const q = therapyNormalizeText(query);
    if (q.length < THERAPY_AUTOCOMPLETE_MIN_CHARS) return [];
    return Object.entries(state.therapyAutocomplete.usage || {})
      .map(([key, value]) => normalizeTherapyAutocompleteUsageRecord(key, value))
      .filter(Boolean)
      .filter(({ key, record }) => key.startsWith(q) || therapyNormalizeText(record.line || '').startsWith(q))
      .sort((a, b) => {
        if (b.record.count !== a.record.count) return b.record.count - a.record.count;
        return (Date.parse(b.record.lastUsedAt || '') || 0) - (Date.parse(a.record.lastUsedAt || '') || 0);
      })
      .slice(0, THERAPY_AUTOCOMPLETE_MAX_ITEMS)
      .map(({ record }) => ({
        line: record.line,
        source: record.source || '',
        meta: record.source === 'custom' ? 'moj spremljeni prijedlog' : 'lokalno zapamćen prijedlog'
      }));
  }

  function buildSaveCustomTherapyAutocompleteSuggestion(ctx, existingSuggestions) {
    const line = String(ctx?.fullLine || '')
      .replace(THERAPY_BULLET_PREFIX_RE, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);
    if (!isRememberableTherapyAutocompleteLine(line)) return null;
    if (!/\s/.test(line) || line.length < 8) return null;
    const key = normalizeTherapyAutocompleteUsageKey(line);
    if (!key || hasTherapyAutocompleteUsageForLine(line)) return null;
    const alreadySuggested = (existingSuggestions || []).some((item) => normalizeTherapyAutocompleteUsageKey(item?.line || '') === key);
    if (alreadySuggested) return null;
    return {
      kind: 'save-custom',
      source: 'custom',
      line,
      meta: 'Klikni za spremanje u moje prijedloge. Ne brise se kod uvoza sluzbene baze.'
    };
  }

  function buildTherapyAutocompleteLineFromAlias(entry) {
    if (!entry) return '';
    const name = getTherapySimplifiedDisplayName(entry) || entry.displayName || entry.rawName || entry.brandName || entry.genericName || '';
    const strength = extractSimpleTherapyStrength(entry.strength || entry.packageText || '');
    const routeOrForm = inferTherapyRouteOrFormToken(entry);
    return normalizeTherapySuggestionText([name, strength, routeOrForm].filter(Boolean).join(' '));
  }

  function getTherapyAutocompleteScheme(index = state.therapyAutocomplete?.schemeIndex || 0) {
    const schemes = THERAPY_AUTOCOMPLETE_DOSING_SCHEMES;
    const normalizedIndex = ((Number(index) || 0) % schemes.length + schemes.length) % schemes.length;
    return schemes[normalizedIndex] || schemes[0];
  }

  function inferTherapyAutocompleteForm(line) {
    const text = String(line || '');
    if (/\b(?:inh|inhal)\b/i.test(text)) return 'inh';
    if (/\b(?:gtt|kapi)\b/i.test(text)) return 'gtt';
    if (/\b(?:kaps|caps)\b/i.test(text)) return 'kaps';
    if (/\b(?:sir|sirup)\b/i.test(text)) return 'sir';
    if (/\b(?:amp|inj)\b/i.test(text)) return 'inj.';
    if (/\bi\.?\s*v\.?\b/i.test(text)) return 'i.v.';
    if (/\bs\.?\s*c\.?\b/i.test(text)) return 's.c.';
    return 'tbl';
  }

  function stripTherapyAutocompleteDosingParts(line) {
    let text = String(line || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    text = text.replace(new RegExp(`\\b\\d\\s*[,./]\\s*\\d\\s*[,./]\\s*\\d(?:\\s*[,./]\\s*\\d)?\\s*${THERAPY_AUTOCOMPLETE_FORM_PATTERN}?\\b`, 'gi'), ' ');
    text = text.replace(new RegExp(`\\b\\d+\\s*x\\s*(${THERAPY_AUTOCOMPLETE_STRENGTH_PATTERN})\\b`, 'gi'), '$1');
    text = text.replace(new RegExp(`\\s+${THERAPY_AUTOCOMPLETE_FORM_PATTERN}\\s*$`, 'i'), '');
    return normalizeTherapySuggestionText(text.replace(/\s+/g, ' ').trim());
  }

  function shouldCycleTherapyAutocompleteDose(item) {
    if (item?.kind === 'save-custom') return false;
    const line = String(item?.line || '');
    if (!line) return false;
    return new RegExp(THERAPY_AUTOCOMPLETE_STRENGTH_PATTERN, 'i').test(line)
      || /\b\d+\s*x\s*\d/i.test(line)
      || /\b\d\s*[,./]\s*\d\s*[,./]\s*\d\b/.test(line);
  }

  function buildTherapyAutocompleteDisplay(item, schemeIndex = state.therapyAutocomplete?.schemeIndex || 0) {
    const rawLine = normalizeTherapySuggestionText(item?.line || '');
    if (!rawLine) return { line: '', canCycleDose: false, scheme: '', form: '' };
    if (!shouldCycleTherapyAutocompleteDose(item)) {
      return { line: rawLine, canCycleDose: false, scheme: '', form: '' };
    }
    const scheme = getTherapyAutocompleteScheme(schemeIndex);
    const form = inferTherapyAutocompleteForm(rawLine);
    const base = stripTherapyAutocompleteDosingParts(rawLine);
    const line = normalizeTherapySuggestionText([base, scheme, form].filter(Boolean).join(' '));
    return { line, canCycleDose: true, scheme, form };
  }

  function getCsvTherapyAutocompleteSuggestions(query, maxItems) {
    const q = therapyNormalizeText(query);
    if (q.length < THERAPY_AUTOCOMPLETE_MIN_CHARS) return [];
    const aliases = Array.isArray(state.therapyValidation.aliases) ? state.therapyValidation.aliases : [];
    if (!aliases.length) return [];
    const seen = new Set();
    const out = [];
    for (const entry of aliases) {
      const searchable = [
        entry.key,
        entry.displayName,
        entry.rawName,
        entry.genericName,
        entry.brandName
      ].map((value) => therapyNormalizeText(value || '')).filter(Boolean);
      const startsWithMatch = searchable.some((value) => value.startsWith(q));
      if (!startsWithMatch) continue;
      const line = buildTherapyAutocompleteLineFromAlias(entry);
      therapyAutocompleteUniquePush(out, {
        line,
        meta: 'iz ugrađene baze lijekova — dopisati shemu/dozu ako nedostaje'
      }, seen);
      if (out.length >= maxItems) break;
    }
    return out;
  }

  function getTherapyAutocompleteSuggestions(query) {
    const seen = new Set();
    const out = [];
    getPopularTherapyAutocompleteSuggestions(query).forEach((item) => therapyAutocompleteUniquePush(out, item, seen));
    getSeedTherapyAutocompleteSuggestions(query).forEach((item) => therapyAutocompleteUniquePush(out, item, seen));
    getCsvTherapyAutocompleteSuggestions(query, THERAPY_AUTOCOMPLETE_RANK_POOL).forEach((item) => {
      therapyAutocompleteUniquePush(out, item, seen);
    });
    return rankTherapyAutocompleteSuggestions(query, out).slice(0, THERAPY_AUTOCOMPLETE_MAX_ITEMS);
  }

  function hideTherapyAutocomplete() {
    state.therapyAutocomplete.suggestions = [];
    state.therapyAutocomplete.activeIndex = 0;
    state.therapyAutocomplete.schemeIndex = 0;
    if (els.therapyAutocompleteBox) {
      els.therapyAutocompleteBox.classList.add('hidden');
      els.therapyAutocompleteBox.classList.remove('side-flyout');
      els.therapyAutocompleteBox.innerHTML = '';
      els.therapyAutocompleteBox.removeAttribute('style');
    }
    if (els.therapy) els.therapy.removeAttribute('aria-activedescendant');
  }

  function getTherapyAutocompleteLineTop(textarea, ctx) {
    const valueBeforeCursor = String(ctx?.value || textarea?.value || '').slice(0, Number(ctx?.cursor || 0));
    const lineIndex = Math.max(0, valueBeforeCursor.split('\n').length - 1);
    const computed = window.getComputedStyle(textarea);
    const fontSize = parseFloat(computed.fontSize) || 16;
    const lineHeight = parseFloat(computed.lineHeight) || Math.round(fontSize * 1.25);
    const borderTop = parseFloat(computed.borderTopWidth) || 0;
    const paddingTop = parseFloat(computed.paddingTop) || 0;
    const rect = textarea.getBoundingClientRect();
    return rect.top + borderTop + paddingTop + (lineIndex * lineHeight) - textarea.scrollTop;
  }

  function clampAutocompleteNumber(value, min, max) {
    if (!Number.isFinite(value)) return min;
    if (max < min) return min;
    return Math.max(min, Math.min(value, max));
  }

  function isTextareaAutocompleteAnchorVisible(textarea, ctx) {
    if (!textarea) return false;
    const rect = textarea.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || rect.right;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || rect.bottom;
    if (!rect.width || !rect.height) return false;
    if (rect.bottom <= 0 || rect.top >= viewportHeight || rect.right <= 0 || rect.left >= viewportWidth) return false;

    const computed = window.getComputedStyle(textarea);
    const fontSize = parseFloat(computed.fontSize) || 16;
    const lineHeight = parseFloat(computed.lineHeight) || Math.round(fontSize * 1.25);
    const lineTop = getTherapyAutocompleteLineTop(textarea, ctx);
    if (!Number.isFinite(lineTop)) return false;

    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, viewportHeight);
    const lineBottom = lineTop + lineHeight;
    const tolerance = Math.max(4, Math.round(lineHeight * 0.25));
    return lineBottom > visibleTop + tolerance && lineTop < visibleBottom - tolerance;
  }

  function positionTextareaAutocompleteBox(box, textarea) {
    if (!box || !textarea || box.classList.contains('hidden')) return;

    const rect = textarea.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const computed = window.getComputedStyle(textarea);
    const borderRight = parseFloat(computed.borderRightWidth) || 0;
    const borderLeft = parseFloat(computed.borderLeftWidth) || 0;
    const paddingRight = parseFloat(computed.paddingRight) || 0;
    const paddingLeft = parseFloat(computed.paddingLeft) || 0;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || rect.right;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || rect.bottom;
    const pagePadding = 8;
    const gap = 8;
    const minHeight = 72;
    const desiredMaxHeight = 240;
    const fieldWidth = rect.width - borderLeft - borderRight - paddingLeft - paddingRight;
    const width = Math.max(160, Math.min(Math.round(fieldWidth), Math.round(viewportWidth - (pagePadding * 2))));
    const left = clampAutocompleteNumber(
      Math.round(rect.left + borderLeft + paddingLeft),
      pagePadding,
      Math.max(pagePadding, Math.round(viewportWidth - pagePadding - width))
    );

    const spaceBelow = Math.max(0, viewportHeight - rect.bottom - gap - pagePadding);
    const spaceAbove = Math.max(0, rect.top - gap - pagePadding);
    const preferBelow = spaceBelow >= minHeight || spaceBelow >= spaceAbove;
    const availableHeight = Math.max(
      minHeight,
      Math.min(desiredMaxHeight, preferBelow ? spaceBelow : spaceAbove, viewportHeight - (pagePadding * 2))
    );

    box.style.left = `${left}px`;
    box.style.width = `${width}px`;
    box.style.maxHeight = `${Math.round(availableHeight)}px`;

    const measuredHeight = Math.min(box.scrollHeight || availableHeight, availableHeight);
    let top;
    if (preferBelow && spaceBelow >= minHeight) {
      top = rect.bottom + gap;
    } else if (spaceAbove >= minHeight) {
      top = rect.top - gap - measuredHeight;
    } else if (spaceBelow >= spaceAbove) {
      top = rect.bottom + gap;
    } else {
      top = rect.top - gap - measuredHeight;
    }
    top = clampAutocompleteNumber(
      Math.round(top),
      pagePadding,
      Math.max(pagePadding, Math.round(viewportHeight - pagePadding - measuredHeight))
    );
    box.style.top = `${top}px`;
  }

  function positionTherapyAutocompleteBox() {
    const box = els.therapyAutocompleteBox;
    const textarea = els.therapy;
    if (!box || !textarea || box.classList.contains('hidden')) return;
    if (!isTextareaAutocompleteAnchorVisible(textarea, state.therapyAutocomplete)) {
      hideTherapyAutocomplete();
      return;
    }

    const rect = textarea.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || rect.right;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || rect.bottom;
    const pagePadding = 8;
    const gap = 10;
    const minSideWidth = 260;
    const preferredSideWidth = 360;
    const sideSpace = viewportWidth - rect.right - gap - pagePadding;

    box.classList.toggle('side-flyout', sideSpace >= minSideWidth);
    if (sideSpace < minSideWidth) {
      positionTextareaAutocompleteBox(box, textarea);
      return;
    }

    const width = Math.round(Math.min(preferredSideWidth, sideSpace));
    const maxHeight = Math.round(Math.min(280, Math.max(120, viewportHeight - (pagePadding * 2))));
    const lineTop = getTherapyAutocompleteLineTop(textarea, state.therapyAutocomplete);
    const computed = window.getComputedStyle(textarea);
    const fontSize = parseFloat(computed.fontSize) || 16;
    const lineHeight = parseFloat(computed.lineHeight) || Math.round(fontSize * 1.25);

    box.style.width = `${width}px`;
    box.style.maxHeight = `${maxHeight}px`;
    box.style.left = `${Math.round(rect.right + gap)}px`;

    const measuredHeight = Math.min(box.scrollHeight || maxHeight, maxHeight);
    const preferredTop = Number.isFinite(lineTop) ? lineTop - Math.max(4, Math.round(lineHeight * 0.25)) : rect.top;
    const top = clampAutocompleteNumber(
      Math.round(preferredTop),
      pagePadding,
      Math.max(pagePadding, Math.round(viewportHeight - pagePadding - measuredHeight))
    );
    box.style.top = `${top}px`;
  }

  function scheduleTherapyAutocompletePosition() {
    positionTherapyAutocompleteBox();
    requestAnimationFrame(positionTherapyAutocompleteBox);
    window.setTimeout(positionTherapyAutocompleteBox, 80);
  }

  function scrollTherapyAutocompleteActiveIntoView() {
    const box = els.therapyAutocompleteBox;
    if (!box || box.classList.contains('hidden')) return;
    const active = box.querySelector('.therapy-autocomplete-option.is-active');
    if (!active) return;

    const visibleTop = box.scrollTop;
    const visibleBottom = visibleTop + box.clientHeight;
    const itemTop = active.offsetTop;
    const itemBottom = itemTop + active.offsetHeight;
    const padding = 6;

    if (itemTop < visibleTop + padding) {
      box.scrollTop = Math.max(0, itemTop - padding);
    } else if (itemBottom > visibleBottom - padding) {
      box.scrollTop = itemBottom - box.clientHeight + padding;
    }
  }

  function scheduleTherapyAutocompleteActiveScroll() {
    scrollTherapyAutocompleteActiveIntoView();
    requestAnimationFrame(scrollTherapyAutocompleteActiveIntoView);
  }

  function renderTherapyAutocomplete() {
    const box = els.therapyAutocompleteBox;
    if (!box) return;
    const suggestions = state.therapyAutocomplete.suggestions || [];
    if (!suggestions.length) {
      hideTherapyAutocomplete();
      return;
    }
    const activeIndex = Math.max(0, Math.min(state.therapyAutocomplete.activeIndex || 0, suggestions.length - 1));
    state.therapyAutocomplete.activeIndex = activeIndex;
    box.innerHTML = suggestions.map((item, index) => {
      const active = index === activeIndex;
      const display = buildTherapyAutocompleteDisplay(item);
      const doseRow = display.canCycleDose
        ? `<div class="therapy-autocomplete-dose-row"><span>←/→ shema</span><strong>${therapyEscapeHtml(display.scheme)} ${therapyEscapeHtml(display.form)}</strong></div>`
        : '';
      const isStoredCustom = item.kind !== 'save-custom' && item.source === 'custom';
      const customClass = `${item.kind === 'save-custom' ? ' is-save-custom' : ''}${isStoredCustom ? ' is-user-custom' : ''}`;
      const mainText = item.kind === 'save-custom' ? `+ Spremi moj unos: ${display.line || item.line}` : (display.line || item.line);
      const deleteAction = isStoredCustom
        ? `<button type="button" class="therapy-autocomplete-delete" data-therapy-autocomplete-delete="${index}" aria-label="Obriši moj spremljeni prijedlog: ${therapyEscapeHtml(display.line || item.line)}">Obriši</button>`
        : '';
      return `<div id="therapyAutocompleteOption${index}" class="therapy-autocomplete-option${active ? ' is-active' : ''}${customClass}" role="option" aria-selected="${active ? 'true' : 'false'}" data-therapy-autocomplete-index="${index}"><div class="therapy-autocomplete-text"><div class="therapy-autocomplete-main">${therapyEscapeHtml(mainText)}</div>${doseRow}<div class="therapy-autocomplete-meta">${therapyEscapeHtml(item.meta || 'prijedlog')}</div></div>${deleteAction}</div>`;
    }).join('');
    box.classList.remove('hidden');
    scheduleTherapyAutocompletePosition();
    scheduleTherapyAutocompleteActiveScroll();
    if (els.therapy) els.therapy.setAttribute('aria-activedescendant', `therapyAutocompleteOption${activeIndex}`);
  }

  function updateTherapyAutocomplete() {
    if (!els.therapy || !els.therapyAutocompleteBox) return;
    const ctx = getTherapyAutocompleteCurrentLine(els.therapy);
    const query = ctx.query;
    const canSearch = query.length >= THERAPY_AUTOCOMPLETE_MIN_CHARS && !/\s/.test(query) && !/[0-9,./]\s*$/.test(query);
    if (!canSearch && !buildSaveCustomTherapyAutocompleteSuggestion(ctx, [])) {
      hideTherapyAutocomplete();
      return;
    }
    const suggestions = canSearch ? getTherapyAutocompleteSuggestions(query) : [];
    const saveCustomSuggestion = buildSaveCustomTherapyAutocompleteSuggestion(ctx, suggestions);
    if (saveCustomSuggestion) suggestions.unshift(saveCustomSuggestion);
    const usage = state.therapyAutocomplete.usage || {};
    state.therapyAutocomplete = {
      suggestions,
      activeIndex: 0,
      schemeIndex: 0,
      lineStart: ctx.lineStart,
      lineEnd: ctx.lineEnd,
      cursor: ctx.cursor,
      usage
    };
    renderTherapyAutocomplete();
  }

  function acceptTherapyAutocomplete(index = state.therapyAutocomplete.activeIndex || 0) {
    const textarea = els.therapy;
    const suggestions = state.therapyAutocomplete.suggestions || [];
    const item = suggestions[index];
    if (!textarea || !item) return false;
    if (item.kind === 'save-custom') {
      recordTherapyAutocompleteSelection({ line: item.line, source: 'custom' }, { source: 'custom' });
      hideTherapyAutocomplete();
      updateRememberTherapyAutocompleteButtonState();
      textarea.focus();
      setStatus(`UpamÄ‡en je lokalni prijedlog kroniÄne terapije: ${item.line}`);
      return true;
    }
    const ctx = getTherapyAutocompleteCurrentLine(textarea);
    const value = String(textarea.value || '');
    const prefix = value.slice(0, ctx.lineStart);
    const suffix = value.slice(ctx.lineEnd);
    const bullet = (ctx.fullLine.match(THERAPY_BULLET_PREFIX_RE) || [''])[0];
    const display = buildTherapyAutocompleteDisplay(item);
    const replacement = `${bullet}${display.line || item.line}`.trimStart();
    textarea.value = `${prefix}${replacement}${suffix}`;
    const nextCursor = prefix.length + replacement.length;
    textarea.focus();
    textarea.setSelectionRange(nextCursor, nextCursor);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    recordTherapyAutocompleteSelection({ ...item, line: display.line || item.line });
    hideTherapyAutocomplete();
    setStatus('Prijedlog terapije je upisan. Provjerite dozu, put primjene, bubrežnu funkciju i indikaciju prije ispisa.');
    return true;
  }

  function moveTherapyAutocompleteSelection(delta) {
    const suggestions = state.therapyAutocomplete.suggestions || [];
    if (!suggestions.length) return false;
    const next = (state.therapyAutocomplete.activeIndex + delta + suggestions.length) % suggestions.length;
    state.therapyAutocomplete.activeIndex = next;
    renderTherapyAutocomplete();
    return true;
  }

  function moveTherapyAutocompleteDoseScheme(delta) {
    const suggestions = state.therapyAutocomplete.suggestions || [];
    if (!suggestions.length) return false;
    const schemes = THERAPY_AUTOCOMPLETE_DOSING_SCHEMES;
    const current = Number(state.therapyAutocomplete.schemeIndex || 0);
    state.therapyAutocomplete.schemeIndex = (current + delta + schemes.length) % schemes.length;
    renderTherapyAutocomplete();
    return true;
  }

  function moveTherapyFocusWithTab(event) {
    if (!isTabNavigationKey(event) || event.altKey || event.ctrlKey || event.metaKey) return false;
    const next = getAdjacentWorkflowTabTarget(els.therapy, event.shiftKey ? -1 : 1);
    if (!next) return false;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    focusWorkflowTabTarget(next);
    return true;
  }

  function wireTherapyAutocomplete() {
    if (!els.therapy || !els.therapyAutocompleteBox) return;
    els.therapy.setAttribute('autocomplete', 'off');
    els.therapy.setAttribute('aria-autocomplete', 'list');
    els.therapy.setAttribute('aria-controls', 'therapyAutocompleteBox');

    els.therapy.addEventListener('input', () => {
      updateTherapyAutocomplete();
      updateRememberTherapyAutocompleteButtonState();
    });
    els.therapy.addEventListener('click', () => {
      updateTherapyAutocomplete();
      updateRememberTherapyAutocompleteButtonState();
    });
    els.therapy.addEventListener('focus', () => {
      hideDiagnosisAutocomplete();
      scheduleTherapyAutocompletePosition();
      updateRememberTherapyAutocompleteButtonState();
    });
    els.therapy.addEventListener('scroll', positionTherapyAutocompleteBox);
    els.therapy.addEventListener('keyup', (event) => {
      if (isTabNavigationKey(event)) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(event.key)) return;
      updateTherapyAutocomplete();
      updateRememberTherapyAutocompleteButtonState();
    });
    els.therapy.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.altKey && event.code === 'KeyM') {
        event.preventDefault();
        rememberCurrentTherapyAutocompleteLine();
        return;
      }
      if (moveTherapyFocusWithTab(event)) return;
      const hasSuggestions = Boolean(state.therapyAutocomplete.suggestions?.length);
      if (!hasSuggestions) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveTherapyAutocompleteSelection(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveTherapyAutocompleteSelection(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveTherapyAutocompleteDoseScheme(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveTherapyAutocompleteDoseScheme(-1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        acceptTherapyAutocomplete();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        hideTherapyAutocomplete();
      }
    });

    els.therapyAutocompleteBox.addEventListener('mousedown', (event) => {
      const deleteButton = event.target.closest('[data-therapy-autocomplete-delete]');
      if (deleteButton) {
        event.preventDefault();
        event.stopPropagation();
        deleteCustomTherapyAutocompleteSuggestion(Number(deleteButton.dataset.therapyAutocompleteDelete || 0));
        return;
      }
      const option = event.target.closest('[data-therapy-autocomplete-index]');
      if (!option) return;
      event.preventDefault();
      acceptTherapyAutocomplete(Number(option.dataset.therapyAutocompleteIndex || 0));
    });

    if (els.rememberTherapyAutocompleteBtn) {
      els.rememberTherapyAutocompleteBtn.addEventListener('mousedown', (event) => {
        event.preventDefault();
      });
      els.rememberTherapyAutocompleteBtn.addEventListener('click', () => {
        const remembered = rememberCurrentTherapyAutocompleteLine();
        if (remembered) els.therapy.focus();
      });
      updateRememberTherapyAutocompleteButtonState();
    }

    document.addEventListener('mousedown', (event) => {
      if (event.target === els.therapy || event.target === els.rememberTherapyAutocompleteBtn || els.therapyAutocompleteBox.contains(event.target)) return;
      hideTherapyAutocomplete();
    });
    window.addEventListener('scroll', positionTherapyAutocompleteBox, true);
    window.addEventListener('resize', positionTherapyAutocompleteBox);
  }

  // ============================================================
  // AUTOCOMPLETE DIJAGNOZA
  // ============================================================
  const DIAGNOSIS_AUTOCOMPLETE_MAX_ITEMS = 8;
  const DIAGNOSIS_AUTOCOMPLETE_MIN_CHARS = 2;

  function getDiagnosisAutocompleteCurrentSegment(textarea) {
    const value = String(textarea?.value || '');
    const cursor = Number(textarea?.selectionStart || 0);
    const lineStart = value.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
    const nextLineBreak = value.indexOf('\n', cursor);
    const lineEnd = nextLineBreak >= 0 ? nextLineBreak : value.length;
    const beforeCursorInLine = value.slice(lineStart, cursor);
    const lastComma = beforeCursorInLine.lastIndexOf(',');
    const lastSemicolon = beforeCursorInLine.lastIndexOf(';');
    const separatorOffset = Math.max(lastComma, lastSemicolon);
    const segmentStart = lineStart + (separatorOffset >= 0 ? separatorOffset + 1 : 0);
    const afterCursorInLine = value.slice(cursor, lineEnd);
    const nextSeparatorMatch = afterCursorInLine.match(/[,;]/);
    const segmentEnd = nextSeparatorMatch ? cursor + nextSeparatorMatch.index : lineEnd;
    const segmentText = value.slice(segmentStart, segmentEnd);
    const beforeCursor = value.slice(segmentStart, cursor);
    const query = beforeCursor.replace(DIAGNOSIS_AUTOCOMPLETE_PREFIX_RE, '').trim();
    return { value, cursor, lineStart, lineEnd, segmentStart, segmentEnd, beforeCursor, segmentText, query };
  }

  function diagnosisAutocompleteUniquePush(items, item, seen) {
    const line = normalizeDiagnosisAutocompleteLine(item?.line || '');
    if (!line) return;
    const key = normalizeDiagnosisAutocompleteUsageKey(line);
    if (!key || seen.has(key)) return;
    seen.add(key);
    items.push({ ...item, line });
  }

  function getDiagnosisAutocompleteUsageRecord(item) {
    const key = normalizeDiagnosisAutocompleteUsageKey(item?.line || '');
    return key ? state.diagnosisAutocomplete.usage?.[key] || null : null;
  }

  function buildDiagnosisAutocompleteMeta(item, usageRecord) {
    if (item?.kind === 'save-custom') return item.meta || 'spremi u moje prijedloge';
    if (item?.source === 'custom') return 'moj spremljeni prijedlog';
    const base = String(item?.meta || 'prijedlog dijagnoze').trim();
    const count = Math.max(0, Number(usageRecord?.count || 0));
    if (!count) return base;
    return `često birano (${count}x) - ${base}`;
  }

  function rankDiagnosisAutocompleteSuggestions(query, suggestions) {
    const q = normalizeDiagnosisAutocompleteUsageKey(query);
    return (suggestions || [])
      .map((item, index) => {
        const usageRecord = getDiagnosisAutocompleteUsageRecord(item);
        const count = Math.max(0, Number(usageRecord?.count || 0));
        const lastUsedMs = Date.parse(usageRecord?.lastUsedAt || '') || 0;
        const lineNorm = normalizeDiagnosisAutocompleteUsageKey(item.line || '');
        const matchScore = lineNorm.startsWith(q) ? 3 : (lineNorm.includes(` ${q}`) ? 2 : (lineNorm.includes(q) ? 1 : 0));
        return {
          ...item,
          meta: buildDiagnosisAutocompleteMeta(item, usageRecord),
          _rank: { index, count, lastUsedMs, matchScore }
        };
      })
      .sort((a, b) => {
        if (b._rank.count !== a._rank.count) return b._rank.count - a._rank.count;
        if (b._rank.lastUsedMs !== a._rank.lastUsedMs) return b._rank.lastUsedMs - a._rank.lastUsedMs;
        if (b._rank.matchScore !== a._rank.matchScore) return b._rank.matchScore - a._rank.matchScore;
        return a._rank.index - b._rank.index;
      })
      .map(({ _rank, ...item }) => item);
  }

  function recordDiagnosisAutocompleteSelection(item, options = {}) {
    const line = normalizeDiagnosisAutocompleteLine(item?.line || '');
    const key = normalizeDiagnosisAutocompleteUsageKey(line);
    if (!key || !line) return false;
    const usage = state.diagnosisAutocomplete.usage || {};
    const previous = usage[key] || {};
    usage[key] = {
      line,
      count: Math.min(9999, Math.max(0, Number(previous.count || 0)) + 1),
      lastUsedAt: new Date().toISOString(),
      source: options.source === 'custom' || item?.source === 'custom' || previous.source === 'custom' ? 'custom' : ''
    };
    state.diagnosisAutocomplete.usage = usage;
    if (!state.diagnosisAutocomplete.recordedKeys) state.diagnosisAutocomplete.recordedKeys = new Set();
    state.diagnosisAutocomplete.recordedKeys.add(key);
    if (!options.deferSave) saveDiagnosisAutocompleteUsageToStorage();
    return true;
  }

  function getDiagnosisAutocompleteStoredSuggestionRecords() {
    const out = {};
    Object.entries(state.diagnosisAutocomplete.usage || {}).forEach(([key, value]) => {
      const normalized = normalizeDiagnosisAutocompleteUsageRecord(key, value);
      if (!normalized) return;
      const sourceRecord = normalized.record;
      const lines = getDiagnosisAutocompleteRecordableLines(sourceRecord.line);
      const recordLines = sourceRecord.source === 'custom'
        ? [sourceRecord.line].filter((line) => normalizeDiagnosisAutocompleteUsageKey(line).length >= DIAGNOSIS_AUTOCOMPLETE_MIN_CHARS)
        : lines.length
        ? lines
        : [sourceRecord.line].filter(shouldRecordDiagnosisAutocompleteLine);
      recordLines.forEach((line) => {
        const cleanLine = normalizeDiagnosisAutocompleteLine(line);
        const cleanKey = normalizeDiagnosisAutocompleteUsageKey(cleanLine);
        if (!cleanKey || !cleanLine) return;
        const previous = out[cleanKey]?.record || null;
        const previousCount = Math.max(0, Number(previous?.count || 0));
        const sourceCount = Math.max(1, Number(sourceRecord.count || 1));
        const previousLastUsedMs = Date.parse(previous?.lastUsedAt || '') || 0;
        const sourceLastUsedMs = Date.parse(sourceRecord.lastUsedAt || '') || 0;
        out[cleanKey] = {
          key: cleanKey,
          record: {
            line: cleanLine,
            count: Math.min(9999, previousCount + sourceCount),
            lastUsedAt: sourceLastUsedMs >= previousLastUsedMs
              ? sourceRecord.lastUsedAt
              : previous?.lastUsedAt || sourceRecord.lastUsedAt,
            source: sourceRecord.source === 'custom' || previous?.source === 'custom' ? 'custom' : ''
          }
        };
      });
    });
    return Object.values(out);
  }

  function getPopularDiagnosisAutocompleteSuggestions(query) {
    const q = normalizeDiagnosisAutocompleteUsageKey(query);
    if (q.length < DIAGNOSIS_AUTOCOMPLETE_MIN_CHARS) return [];
    return getDiagnosisAutocompleteStoredSuggestionRecords()
      .filter(({ key, record }) => {
        const lineKey = normalizeDiagnosisAutocompleteUsageKey(record.line || '');
        return key.startsWith(q) || key.includes(` ${q}`) || lineKey.includes(q);
      })
      .sort((a, b) => {
        if (b.record.count !== a.record.count) return b.record.count - a.record.count;
        return (Date.parse(b.record.lastUsedAt || '') || 0) - (Date.parse(a.record.lastUsedAt || '') || 0);
      })
      .slice(0, DIAGNOSIS_AUTOCOMPLETE_MAX_ITEMS)
      .map(({ record }) => ({
        line: record.line,
        source: record.source || '',
        meta: 'lokalno zapamćen prijedlog'
      }));
  }

  function isSaveableCustomDiagnosisAutocompleteLine(line) {
    const clean = normalizeDiagnosisAutocompleteLine(line);
    const key = normalizeDiagnosisAutocompleteUsageKey(clean);
    if (key.length < DIAGNOSIS_AUTOCOMPLETE_MIN_CHARS || clean.length > 220) return false;
    if (/^(?:dg|dijagnoza|nema|bez osobitosti)$/i.test(clean)) return false;
    if (/[,;:]\s*$/.test(clean)) return false;
    return true;
  }

  function buildSaveCustomDiagnosisAutocompleteSuggestion(ctx, existingSuggestions) {
    const line = normalizeDiagnosisAutocompleteLine(ctx?.segmentText || ctx?.query || '');
    if (!isSaveableCustomDiagnosisAutocompleteLine(line)) return null;
    const key = normalizeDiagnosisAutocompleteUsageKey(line);
    if (!key || state.diagnosisAutocomplete.usage?.[key]?.source === 'custom') return null;
    const alreadySuggested = (existingSuggestions || []).some((item) => normalizeDiagnosisAutocompleteUsageKey(item?.line || '') === key);
    if (alreadySuggested) return null;
    return {
      kind: 'save-custom',
      source: 'custom',
      line,
      meta: 'Klikni za spremanje u moje prijedloge dijagnoza.'
    };
  }

  function getDictionaryDiagnosisAutocompleteSuggestions(query) {
    const q = normalizeDiagnosisAutocompleteSearchKey(query);
    if (q.length < DIAGNOSIS_AUTOCOMPLETE_MIN_CHARS) return [];
    const seen = new Set();
    const out = [];
    DIAGNOSIS_DICTIONARY.forEach((entry) => {
      const canonical = String(entry?.canonical || '').trim();
      if (!canonical) return;
      const searchable = [canonical].concat(entry.aliases || [], entry.codes || [])
        .flatMap((value) => [normalizeDiagnosisAutocompleteSearchKey(value), normalizeDiagnosisAutocompleteUsageKey(value)])
        .filter(Boolean);
      const matches = searchable.some((key) => key.startsWith(q) || key.includes(` ${q}`) || key.includes(q));
      if (!matches) return;
      diagnosisAutocompleteUniquePush(out, {
        line: canonical,
        meta: 'lokalni predložak dijagnoze'
      }, seen);
    });
    return out;
  }

  function getDiagnosisAutocompleteSuggestions(query) {
    const seen = new Set();
    const out = [];
    getPopularDiagnosisAutocompleteSuggestions(query).forEach((item) => diagnosisAutocompleteUniquePush(out, item, seen));
    getDictionaryDiagnosisAutocompleteSuggestions(query).forEach((item) => diagnosisAutocompleteUniquePush(out, item, seen));
    return rankDiagnosisAutocompleteSuggestions(query, out).slice(0, DIAGNOSIS_AUTOCOMPLETE_MAX_ITEMS);
  }

  function hideDiagnosisAutocomplete() {
    state.diagnosisAutocomplete.suggestions = [];
    state.diagnosisAutocomplete.activeIndex = 0;
    if (els.diagnosisAutocompleteBox) {
      els.diagnosisAutocompleteBox.classList.add('hidden');
      els.diagnosisAutocompleteBox.innerHTML = '';
      els.diagnosisAutocompleteBox.removeAttribute('style');
    }
    if (els.diagnosis) els.diagnosis.removeAttribute('aria-activedescendant');
  }

  function positionDiagnosisAutocompleteBox() {
    const box = els.diagnosisAutocompleteBox;
    const textarea = els.diagnosis;
    if (!box || !textarea || box.classList.contains('hidden')) return;
    if (!isTextareaAutocompleteAnchorVisible(textarea, state.diagnosisAutocomplete)) {
      hideDiagnosisAutocomplete();
      return;
    }

    const rect = textarea.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || rect.right;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || rect.bottom;
    const pagePadding = 8;
    const gap = 10;
    const minSideWidth = 260;
    const preferredSideWidth = 360;
    const sideSpace = viewportWidth - rect.right - gap - pagePadding;

    box.classList.toggle('side-flyout', sideSpace >= minSideWidth);
    if (sideSpace < minSideWidth) {
      positionTextareaAutocompleteBox(box, textarea);
      return;
    }

    const width = Math.round(Math.min(preferredSideWidth, sideSpace));
    const maxHeight = Math.round(Math.min(280, Math.max(120, viewportHeight - (pagePadding * 2))));
    const lineTop = getTherapyAutocompleteLineTop(textarea, state.diagnosisAutocomplete);
    const computed = window.getComputedStyle(textarea);
    const fontSize = parseFloat(computed.fontSize) || 16;
    const lineHeight = parseFloat(computed.lineHeight) || Math.round(fontSize * 1.25);

    box.style.width = `${width}px`;
    box.style.maxHeight = `${maxHeight}px`;
    box.style.left = `${Math.round(rect.right + gap)}px`;

    const measuredHeight = Math.min(box.scrollHeight || maxHeight, maxHeight);
    const preferredTop = Number.isFinite(lineTop) ? lineTop - Math.max(4, Math.round(lineHeight * 0.25)) : rect.top;
    const top = clampAutocompleteNumber(
      Math.round(preferredTop),
      pagePadding,
      Math.max(pagePadding, Math.round(viewportHeight - pagePadding - measuredHeight))
    );
    box.style.top = `${top}px`;
  }

  function scheduleDiagnosisAutocompletePosition() {
    positionDiagnosisAutocompleteBox();
    requestAnimationFrame(positionDiagnosisAutocompleteBox);
    window.setTimeout(positionDiagnosisAutocompleteBox, 80);
  }

  function scrollDiagnosisAutocompleteActiveIntoView() {
    const box = els.diagnosisAutocompleteBox;
    if (!box || box.classList.contains('hidden')) return;
    const active = box.querySelector('.therapy-autocomplete-option.is-active');
    if (!active) return;

    const visibleTop = box.scrollTop;
    const visibleBottom = visibleTop + box.clientHeight;
    const itemTop = active.offsetTop;
    const itemBottom = itemTop + active.offsetHeight;
    const padding = 6;

    if (itemTop < visibleTop + padding) {
      box.scrollTop = Math.max(0, itemTop - padding);
    } else if (itemBottom > visibleBottom - padding) {
      box.scrollTop = itemBottom - box.clientHeight + padding;
    }
  }

  function scheduleDiagnosisAutocompleteActiveScroll() {
    scrollDiagnosisAutocompleteActiveIntoView();
    requestAnimationFrame(scrollDiagnosisAutocompleteActiveIntoView);
  }

  function renderDiagnosisAutocomplete() {
    const box = els.diagnosisAutocompleteBox;
    if (!box) return;
    const suggestions = state.diagnosisAutocomplete.suggestions || [];
    if (!suggestions.length) {
      hideDiagnosisAutocomplete();
      return;
    }
    const activeIndex = Math.max(0, Math.min(state.diagnosisAutocomplete.activeIndex || 0, suggestions.length - 1));
    state.diagnosisAutocomplete.activeIndex = activeIndex;
    box.innerHTML = suggestions.map((item, index) => {
      const active = index === activeIndex;
      const isStoredCustom = item.kind !== 'save-custom' && item.source === 'custom';
      const customClass = `${item.kind === 'save-custom' ? ' is-save-custom' : ''}${isStoredCustom ? ' is-user-custom' : ''}`;
      const mainText = item.kind === 'save-custom' ? `+ Spremi moj unos: ${item.line}` : item.line;
      const deleteAction = isStoredCustom
        ? `<button type="button" class="therapy-autocomplete-delete" data-diagnosis-autocomplete-delete="${index}" aria-label="Obriši moj spremljeni prijedlog dijagnoze: ${therapyEscapeHtml(item.line)}">Obriši</button>`
        : '';
      return `<div id="diagnosisAutocompleteOption${index}" class="therapy-autocomplete-option${active ? ' is-active' : ''}${customClass}" role="option" aria-selected="${active ? 'true' : 'false'}" data-diagnosis-autocomplete-index="${index}"><div class="therapy-autocomplete-text"><div class="therapy-autocomplete-main">${therapyEscapeHtml(mainText)}</div><div class="therapy-autocomplete-meta">${therapyEscapeHtml(item.meta || 'prijedlog')}</div></div>${deleteAction}</div>`;
    }).join('');
    box.classList.remove('hidden');
    scheduleDiagnosisAutocompletePosition();
    scheduleDiagnosisAutocompleteActiveScroll();
    if (els.diagnosis) els.diagnosis.setAttribute('aria-activedescendant', `diagnosisAutocompleteOption${activeIndex}`);
  }

  function updateDiagnosisAutocomplete() {
    if (!els.diagnosis || !els.diagnosisAutocompleteBox) return;
    hideTherapyAutocomplete();
    const ctx = getDiagnosisAutocompleteCurrentSegment(els.diagnosis);
    const query = ctx.query;
    const canSearch = query.length >= DIAGNOSIS_AUTOCOMPLETE_MIN_CHARS && !/[,;:]\s*$/.test(query);
    if (!canSearch && !buildSaveCustomDiagnosisAutocompleteSuggestion(ctx, [])) {
      hideDiagnosisAutocomplete();
      return;
    }
    const suggestions = canSearch ? getDiagnosisAutocompleteSuggestions(query) : [];
    const saveCustomSuggestion = buildSaveCustomDiagnosisAutocompleteSuggestion(ctx, suggestions);
    if (saveCustomSuggestion) suggestions.unshift(saveCustomSuggestion);
    const usage = state.diagnosisAutocomplete.usage || {};
    const recordedKeys = state.diagnosisAutocomplete.recordedKeys || new Set();
    state.diagnosisAutocomplete = {
      suggestions,
      activeIndex: 0,
      segmentStart: ctx.segmentStart,
      segmentEnd: ctx.segmentEnd,
      cursor: ctx.cursor,
      usage,
      recordedKeys
    };
    renderDiagnosisAutocomplete();
  }

  function acceptDiagnosisAutocomplete(index = state.diagnosisAutocomplete.activeIndex || 0) {
    const textarea = els.diagnosis;
    const suggestions = state.diagnosisAutocomplete.suggestions || [];
    const item = suggestions[index];
    if (!textarea || !item) return false;
    if (item.kind === 'save-custom') {
      recordDiagnosisAutocompleteSelection({ line: item.line, source: 'custom' }, { source: 'custom' });
      hideDiagnosisAutocomplete();
      textarea.focus();
      setStatus(`UpamÄ‡en je lokalni prijedlog dijagnoze: ${item.line}`);
      return true;
    }
    const ctx = getDiagnosisAutocompleteCurrentSegment(textarea);
    const value = String(textarea.value || '');
    const prefix = value.slice(0, ctx.segmentStart);
    const suffix = value.slice(ctx.segmentEnd);
    const leading = (ctx.segmentText.match(/^\s*/) || [''])[0];
    const linePrefix = ctx.segmentStart === ctx.lineStart
      ? (ctx.segmentText.match(DIAGNOSIS_AUTOCOMPLETE_PREFIX_RE) || [''])[0]
      : leading || ' ';
    const replacement = ctx.segmentStart === ctx.lineStart
      ? `${linePrefix}${item.line}`.trimStart()
      : `${linePrefix}${item.line}`;
    textarea.value = `${prefix}${replacement}${suffix}`;
    const nextCursor = prefix.length + replacement.length;
    textarea.focus();
    textarea.setSelectionRange(nextCursor, nextCursor);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    recordDiagnosisAutocompleteSelection(item);
    hideDiagnosisAutocomplete();
    setStatus('Prijedlog dijagnoze je upisan.');
    return true;
  }

  function deleteCustomDiagnosisAutocompleteSuggestion(index = state.diagnosisAutocomplete.activeIndex || 0) {
    const suggestions = state.diagnosisAutocomplete.suggestions || [];
    const item = suggestions[index];
    const key = normalizeDiagnosisAutocompleteUsageKey(item?.line || '');
    if (!key || item?.source !== 'custom' || state.diagnosisAutocomplete.usage?.[key]?.source !== 'custom') {
      return false;
    }
    const line = normalizeDiagnosisAutocompleteLine(state.diagnosisAutocomplete.usage[key]?.line || item.line || '');
    const confirmed = window.confirm(`Jeste li sigurni da želite obrisati spremljenu dijagnozu?\n\n${line}`);
    if (!confirmed) {
      if (els.diagnosis) els.diagnosis.focus();
      return false;
    }
    delete state.diagnosisAutocomplete.usage[key];
    saveDiagnosisAutocompleteUsageToStorage();
    updateDiagnosisAutocomplete();
    if (els.diagnosis) els.diagnosis.focus();
    setStatus(`Obrisan je lokalni prijedlog dijagnoze: ${line}`);
    return true;
  }

  function moveDiagnosisAutocompleteSelection(delta) {
    const suggestions = state.diagnosisAutocomplete.suggestions || [];
    if (!suggestions.length) return false;
    const next = (state.diagnosisAutocomplete.activeIndex + delta + suggestions.length) % suggestions.length;
    state.diagnosisAutocomplete.activeIndex = next;
    renderDiagnosisAutocomplete();
    return true;
  }

  function shouldRecordDiagnosisAutocompleteLine(line) {
    const clean = normalizeDiagnosisAutocompleteLine(line);
    if (clean.length < DIAGNOSIS_AUTOCOMPLETE_MIN_CHARS || clean.length > 220) return false;
    if (/^(?:dg|dijagnoza|nema|bez osobitosti)$/i.test(clean)) return false;
    if (isRejectedDiagnosisCandidate(clean)) return false;
    return hasKnownDiagnosisTerm(clean) || looksLikeDiagnosisByFallback(clean) || Boolean(findDictionaryDiagnosisCanonical(clean));
  }

  function getDiagnosisAutocompleteRecordableLines(value) {
    const seen = new Set();
    const out = [];
    splitDiagnosisCandidates(value)
      .map((line) => normalizeDiagnosisAutocompleteLine(line))
      .filter(shouldRecordDiagnosisAutocompleteLine)
      .forEach((line) => {
        const key = normalizeDiagnosisAutocompleteUsageKey(line);
        if (!key || seen.has(key)) return;
        seen.add(key);
        out.push(line);
      });
    return out;
  }

  function recordDiagnosisAutocompleteFieldUsage() {
    if (!els.diagnosis) return;
    const recordedKeys = state.diagnosisAutocomplete.recordedKeys || new Set();
    state.diagnosisAutocomplete.recordedKeys = recordedKeys;
    let changed = false;
    getDiagnosisAutocompleteRecordableLines(els.diagnosis.value).forEach((line) => {
      const key = normalizeDiagnosisAutocompleteUsageKey(line);
      if (!key || recordedKeys.has(key)) return;
      if (recordDiagnosisAutocompleteSelection({ line }, { deferSave: true })) changed = true;
    });
    if (changed) saveDiagnosisAutocompleteUsageToStorage();
  }

  function wireDiagnosisAutocomplete() {
    if (!els.diagnosis || !els.diagnosisAutocompleteBox) return;
    els.diagnosis.setAttribute('autocomplete', 'off');
    els.diagnosis.setAttribute('aria-autocomplete', 'list');
    els.diagnosis.setAttribute('aria-controls', 'diagnosisAutocompleteBox');

    els.diagnosis.addEventListener('input', updateDiagnosisAutocomplete);
    els.diagnosis.addEventListener('click', updateDiagnosisAutocomplete);
    els.diagnosis.addEventListener('focus', () => {
      state.diagnosisAutocomplete.recordedKeys = new Set();
      hideTherapyAutocomplete();
      updateDiagnosisAutocomplete();
      scheduleDiagnosisAutocompletePosition();
    });
    els.diagnosis.addEventListener('scroll', positionDiagnosisAutocompleteBox);
    els.diagnosis.addEventListener('change', recordDiagnosisAutocompleteFieldUsage);
    els.diagnosis.addEventListener('keyup', (event) => {
      if (isTabNavigationKey(event)) return;
      if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) return;
      updateDiagnosisAutocomplete();
    });
    els.diagnosis.addEventListener('keydown', (event) => {
      const hasSuggestions = Boolean(state.diagnosisAutocomplete.suggestions?.length);
      if (!hasSuggestions) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveDiagnosisAutocompleteSelection(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveDiagnosisAutocompleteSelection(-1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        acceptDiagnosisAutocomplete();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        hideDiagnosisAutocomplete();
      }
    });

    els.diagnosisAutocompleteBox.addEventListener('mousedown', (event) => {
      const deleteButton = event.target.closest('[data-diagnosis-autocomplete-delete]');
      if (deleteButton) {
        event.preventDefault();
        event.stopPropagation();
        deleteCustomDiagnosisAutocompleteSuggestion(Number(deleteButton.dataset.diagnosisAutocompleteDelete || 0));
        return;
      }
      const option = event.target.closest('[data-diagnosis-autocomplete-index]');
      if (!option) return;
      event.preventDefault();
      acceptDiagnosisAutocomplete(Number(option.dataset.diagnosisAutocompleteIndex || 0));
    });

    document.addEventListener('mousedown', (event) => {
      if (event.target === els.diagnosis || els.diagnosisAutocompleteBox.contains(event.target)) return;
      hideDiagnosisAutocomplete();
    });
    window.addEventListener('scroll', positionDiagnosisAutocompleteBox, true);
    window.addEventListener('resize', positionDiagnosisAutocompleteBox);
  }

  function getTherapyAliasAlternatives(entry, maxItems = 500) {
    if (!entry) return [];
    const key = String(entry.key || '').trim();
    const display = therapyNormalizeText(entry.displayName || entry.rawName || '');
    const generic = therapyNormalizeText(entry.genericName || '');
    const brand = therapyNormalizeText(entry.brandName || '');
    const raw = therapyNormalizeText(entry.rawName || '');
    const atcBase = therapyNormalizeText(String(entry.atk || '').split(/\s+/)[0] || '');
    const seen = new Set();
    const alternatives = [];

    for (const item of state.therapyValidation.aliases || []) {
      const itemDisplay = therapyNormalizeText(item.displayName || item.rawName || '');
      const itemRaw = therapyNormalizeText(item.rawName || '');
      const itemBrand = therapyNormalizeText(item.brandName || '');
      const itemGeneric = therapyNormalizeText(item.genericName || '');
      const itemAtcBase = therapyNormalizeText(String(item.atk || '').split(/\s+/)[0] || '');

      const sameKey = key && item.key === key;
      const sameRawName = raw && (itemRaw === raw || itemDisplay === raw);
      const sameDisplay = display && (itemDisplay === display || itemRaw === display);
      const sameBrand = brand && itemBrand === brand;
      const prefixBrand = key && itemBrand && (itemBrand.startsWith(`${key} `) || itemBrand.startsWith(`${key}-`));
      const prefixDisplay = key && itemDisplay && (itemDisplay.startsWith(`${key} `) || itemDisplay.startsWith(`${key}-`));
      const prefixRaw = key && itemRaw && (itemRaw.startsWith(`${key} `) || itemRaw.startsWith(`${key}-`));
      const sameProductFamily = brand && generic && itemBrand === brand && itemGeneric === generic;
      const sameAtcFamily = atcBase && generic && itemAtcBase === atcBase && itemGeneric === generic && (sameBrand || sameKey || sameDisplay || sameRawName || prefixBrand || prefixDisplay || prefixRaw);

      if (!sameKey && !sameRawName && !sameDisplay && !sameBrand && !prefixBrand && !prefixDisplay && !prefixRaw && !sameProductFamily && !sameAtcFamily) continue;

      // Prikazni prijedlozi se dedupliciraju po klinički bitnim poljima: naziv + jačina + oblik.
      // Pakiranja 30/60/90 tbl ne smiju stvarati duplikate, ali jačine 5 mg i 10 mg moraju ostati.
      const unique = [
        therapyNormalizeText(getTherapySimplifiedDisplayName(item) || item.displayName || item.rawName || item.brandName || ''),
        therapyNormalizeText(item.strength || ''),
        therapyNormalizeText(inferTherapyShortPresentation(item) || item.form || ''),
        therapyNormalizeText(item.routeWide || '')
      ].join('|');
      if (seen.has(unique)) continue;
      seen.add(unique);
      alternatives.push(item);
      if (alternatives.length >= maxItems) break;
    }
    return alternatives.length ? alternatives : [entry];
  }

  function therapyNumericStrengthValue(strength) {
    const match = String(strength || '').match(/(\d+(?:[,.]\d+)?)/);
    return match ? Number(match[1].replace(',', '.')) : Number.POSITIVE_INFINITY;
  }

  function normalizeTherapyStrengthForCompare(value) {
    return therapyNormalizeText(value || '')
      .replace(/µg/g, 'mcg')
      .replace(/\bug\b/g, 'mcg')
      .replace(/\bij\b/g, 'iu')
      .replace(/\s+/g, '')
      .replace(/,/g, '.');
  }

  function extractSimpleTherapyStrength(value) {
    const match = String(value || '').match(/\b\d+(?:[,.]\d+)?\s*(?:mg|g|mcg|µg|ug|ij|IU|ml|mL|mmol|%)\b/i);
    return match ? match[0].replace(/\s+/g, ' ').trim() : '';
  }

  function replaceSimpleTherapyStrength(value, newStrength) {
    const text = String(value || '');
    const replacement = String(newStrength || '').trim();
    if (!text || !replacement) return text;
    const match = text.match(/\b\d+(?:[,.]\d+)?\s*(?:mg|g|mcg|µg|ug|ij|IU|ml|mL|mmol|%)\b/i);
    if (!match) return text;
    return `${text.slice(0, match.index)}${replacement}${text.slice(match.index + match[0].length)}`.replace(/\s+/g, ' ').trim();
  }

  function isSimpleTherapyStrength(value) {
    const text = String(value || '').trim();
    if (!text) return false;
    if (/[+;]/.test(text)) return false;
    return /^\d+(?:[,.]\d+)?\s*(?:mg|g|mcg|µg|ug|ij|IU|ml|mL|mmol|%)$/i.test(text);
  }

  function extractTherapySchemeToken(line) {
    const text = String(line || '');
    const token = '(?:\\d+\\s*\\/\\s*\\d+|\\d+)';
    const numericRe = new RegExp(`(?:^|[^\\d/])(${token}\\s*,\\s*${token}\\s*,\\s*${token})(?=$|[^\\d/])|(?:^|[^\\d/])(${token}\\s*-\\s*${token}\\s*-\\s*${token})(?=$|[^\\d/])|(?:^|[^\\d/])(${token}\\s*[x×]\\s*${token})(?=$|[^\\d/])`, 'i');
    const numeric = text.match(numericRe);
    if (numeric) {
      const raw = numeric[1] || numeric[2] || numeric[3] || '';
      if (raw) return raw.replace(/\s+/g, '').replace(/×/g, 'x').trim();
    }
    const verbal = text.match(/\bpo\s+potrebi\b|\bprema\s+potrebi\b|\bpp\b|\bnavečer\b|\bujutro\b|\bdnevno\b|\bsvaki\s+dan\b|\bsvakih\s+\d+\s*h\b/i);
    return verbal ? verbal[0].replace(/\s+/g, ' ').trim() : '';
  }

  function extractTherapyFractionSchemeToken(line) {
    const scheme = extractTherapySchemeToken(line);
    return /\d+\s*\/\s*\d+/.test(scheme) ? scheme : '';
  }

  function isTherapyStrengthValidForMatch(line, match) {
    const entered = extractSimpleTherapyStrength(line);
    if (!entered || !match?.entry || isDoseOptionalTherapySuggestion(match.entry, line)) return true;
    const alternatives = getTherapyAliasAlternatives(match.entry, 500)
      .filter((item) => item && isSimpleTherapyStrength(item.strength));
    if (!alternatives.length) return true;
    const enteredKey = normalizeTherapyStrengthForCompare(entered);
    return alternatives.some((item) => normalizeTherapyStrengthForCompare(item.strength) === enteredKey);
  }

  function buildTherapyStrengthCorrectionSuggestions(originalLine, match) {
    if (!match?.entry) return [];
    const prefix = String(originalLine || '').match(THERAPY_BULLET_PREFIX_RE)?.[0] || '';
    const alternatives = sortTherapyAlternativesForSuggestion(getTherapyAliasAlternatives(match.entry, 500), match.entry)
      .filter((item) => item && isSimpleTherapyStrength(item.strength));
    const suggestions = [];
    const seen = new Set();
    const existingScheme = extractTherapySchemeToken(originalLine);
    const pushSuggestion = (value) => {
      const normalized = normalizeTherapySuggestionText(value);
      const key = therapyNormalizeText(normalized);
      if (!normalized || seen.has(key)) return;
      seen.add(key);
      suggestions.push(normalized);
    };

    for (const alt of alternatives) {
      const displayName = getTherapySimplifiedDisplayName(alt) || getTherapySimplifiedDisplayName(match.entry) || alt.displayName || alt.rawName || alt.brandName || match.entry.displayName || match.entry.rawName || '';
      const token = inferTherapyRouteOrFormToken(alt);
      const schemes = existingScheme ? [existingScheme] : defaultTherapySchemesForEntry(alt);
      for (const scheme of schemes) {
        pushSuggestion(`${prefix}${displayName} ${alt.strength} ${scheme}${token ? ' ' + token : ''}`);
      }
    }
    return suggestions;
  }

  function therapyAtcOrGenericText(entry) {
    return therapyNormalizeText(`${entry?.genericName || ''} ${entry?.brandName || ''} ${entry?.category || ''} ${entry?.atk || ''} ${entry?.atc || ''} ${entry?.packageText || ''}`);
  }

  function isLikelyStatinEntry(entry) {
    const text = therapyAtcOrGenericText(entry);
    return /\b(?:rosuvastatin|atorvastatin|simvastatin|pravastatin|fluvastatin|pitavastatin)\b/.test(text) || /\bc10aa\b|\bc10ba\b/.test(text);
  }

  function sortTherapyAlternativesForSuggestion(items, entry) {
    const arr = [...(items || [])];
    if (isLikelyStatinEntry(entry)) {
      const preferred = [10, 20, 40, 5];
      arr.sort((a, b) => {
        const av = therapyNumericStrengthValue(a.strength);
        const bv = therapyNumericStrengthValue(b.strength);
        const ai = preferred.indexOf(av);
        const bi = preferred.indexOf(bv);
        const ar = ai >= 0 ? ai : preferred.length + av;
        const br = bi >= 0 ? bi : preferred.length + bv;
        return ar - br || String(a.strength || '').localeCompare(String(b.strength || ''), 'hr');
      });
      return arr;
    }
    arr.sort((a, b) => therapyNumericStrengthValue(a.strength) - therapyNumericStrengthValue(b.strength) || String(a.strength || '').localeCompare(String(b.strength || ''), 'hr'));
    return arr;
  }

  function defaultTherapySchemesForEntry(entry) {
    const text = therapyAtcOrGenericText(entry);
    if (/\b(?:rosuvastatin|atorvastatin|simvastatin|pravastatin|fluvastatin|pitavastatin)\b/.test(text) || /\bc10aa\b|\bc10ba\b/.test(text)) return ['0,0,1'];
    if (/\bkapi za oci\b|\bu oko\b|\bu uho\b|\bkapi za uho\b|\bkapi za nos\b/.test(text)) return ['1,0,0'];
    if (/\b(?:pantoprazol|esomeprazol|omeprazol|lansoprazol|rabeprazol)\b/.test(text)) return ['1,0,0'];
    if (/\b(?:levotiroksin|levothyroxine|euthyrox|eutirox)\b/.test(text)) return ['1,0,0'];
    if (/\b(?:acetilsalicil|aspirin|andol|clopidogrel|allopurinol)\b/.test(text)) return ['1,0,0'];
    if (/\b(?:amlodipin|amlopin|lerkanidipin|lacidipin|nifedipin)\b/.test(text) || /\bc08ca\b/.test(text)) return ['1,0,0', '0,0,1'];
    return ['1,0,0', '0,0,1'];
  }

  function appendTherapyTokenIfMissing(text, token) {
    const normalized = normalizeTherapySuggestionText(text);
    if (!token) return normalized;
    const normLine = therapyNormalizeText(normalized);
    const normToken = therapyNormalizeText(token);
    if (!normToken || hasWordLikeBoundary(normLine, normToken)) return normalized;
    return normalizeTherapySuggestionText(`${normalized} ${token}`);
  }

  function buildCompletedTherapySuggestions(originalLine, match, missing = []) {
    const standardized = buildStandardizedTherapyLine(originalLine, match);
    if (!standardized) return [];
    const original = normalizeTherapySuggestionText(String(originalLine || ''));
    const hasDose = lineHasDose(standardized);
    const hasScheme = lineHasScheme(standardized);
    const hasRoute = lineHasRouteOrForm(standardized);
    const alternatives = sortTherapyAlternativesForSuggestion(getTherapyAliasAlternatives(match?.entry, 500), match?.entry);
    const suggestions = [];
    const seen = new Set();
    const pushSuggestion = (value) => {
      const normalized = normalizeTherapySuggestionText(value);
      const key = therapyNormalizeText(normalized);
      if (!normalized || normalized === original || seen.has(key)) return;
      seen.add(key);
      suggestions.push(normalized);
    };

    // v176: ako je korisnik upisao jačinu koja ne postoji za točan tvornički naziv
    // (npr. "Byol Cor 5 mg"), ne smijemo samo dodati "tbl" i tako zadržati pogrešnu
    // jačinu. Umjesto toga nudimo sve dostupne jačine za istu obitelj lijeka.
    if (hasDose && !isTherapyStrengthValidForMatch(standardized, match)) {
      buildTherapyStrengthCorrectionSuggestions(originalLine, match).forEach(pushSuggestion);
      return suggestions;
    }

    if (hasDose && hasScheme && hasRoute) {
      pushSuggestion(standardized);
      return suggestions;
    }

    // Za kapi za oči/uho/nos ne nuditi dugačke koncentracije iz pakiranja
    // (npr. "0,2 ml + 50 mcg/ml + 5 mg/ml"), nego kratki klinički zapis.
    if (isDoseOptionalTherapySuggestion(match?.entry, standardized)) {
      let base = standardized;
      const presentation = inferTherapyRouteOrFormToken(match?.entry);
      if (presentation) base = appendTherapyTokenIfMissing(base, presentation);
      if (!hasScheme) {
        for (const scheme of defaultTherapySchemesForEntry(match?.entry)) {
          pushSuggestion(`${base} ${scheme}`);
        }
      } else {
        pushSuggestion(base);
      }
      return suggestions;
    }

    // Ako nedostaje samo oblik/put, ne diraj dozu i shemu — samo dopuni kratki oblik/put iz CSV-a.
    // Iznimka je već riješena gore: ako doza ne pripada tom brandu, nudi se zamjena jačine.
    if (hasDose && hasScheme && !hasRoute) {
      const token = inferTherapyRouteOrFormToken(match?.entry);
      if (token) pushSuggestion(`${standardized} ${token}`);
      return suggestions;
    }

    const usableAlternatives = alternatives.filter((item) => item && (item.strength || hasDose));
    const pool = usableAlternatives.length ? usableAlternatives : [match?.entry].filter(Boolean);
    for (const alt of pool) {
      let suggestion = standardized;
      if (!isDoseOptionalTherapySuggestion(alt, standardized)) {
        if (!hasDose && alt.strength) {
          suggestion = `${suggestion} ${alt.strength}`;
        } else if (hasDose && alt.strength && isSimpleTherapyStrength(alt.strength)) {
          // v179: ako je upisana valjana jačina, i dalje ponuditi sve druge jačine
          // istog tvorničkog naziva u padajućem izborniku (npr. Amlopin 5 mg + 10 mg).
          suggestion = replaceSimpleTherapyStrength(suggestion, alt.strength);
        }
      }
      if (!hasScheme) {
        const schemes = defaultTherapySchemesForEntry(alt);
        for (const scheme of schemes) {
          let withScheme = `${suggestion} ${scheme}`;
          if (!hasRoute) {
            const token = inferTherapyRouteOrFormToken(alt);
            if (token) withScheme = `${withScheme} ${token}`;
          }
          pushSuggestion(withScheme);
        }
      } else if (!hasRoute) {
        const token = inferTherapyRouteOrFormToken(alt);
        if (token) pushSuggestion(`${suggestion} ${token}`);
      } else {
        pushSuggestion(suggestion);
      }
    }

    return suggestions;
  }

  function buildCompletedTherapySuggestion(originalLine, match, missing = []) {
    return buildCompletedTherapySuggestions(originalLine, match, missing)[0] || '';
  }



  function isTherapyContinuationAfterSeparator(value) {
    const text = therapyNormalizeText(value || '');
    if (!text) return true;
    return /^(?:tbl|tableta|tablete|film obl|filmom|kaps|kapsula|kapsule|amp|ampula|ampule|inj|injekcija|iv|i v|im|i m|sc|s c|po|p o|per os|oralno|peroralno|na usta|subkutano|supkutano|intravenozno|intramuskularno|inh|inhalacijski|udisati|kapi|kapi za oci|kapi za uho|kapi za nos|u oko|u uho|u nos|sprej|sirup|mast|krema|gel|flaster|supp|cepic|cepici|ujutro|navecer|vecer|dnevno|svaki dan|prije jela|poslije jela|uz obrok|nataste|po potrebi|prema potrebi|pp|kroz|do|dana|tjedana|mjeseci)\b/.test(text);
  }

  function splitTherapyMultiDrugCandidates(line) {
    const clean = stripTherapyBullet(line);
    if (!clean) return [];
    return splitTherapyItemsSmart(clean);
  }

  function detectTherapyMultiDrugEntry(line) {
    const parts = splitTherapyMultiDrugCandidates(line);
    if (parts.length < 2) return null;
    // v194-lite: separator znači više lijekova samo ako barem dva segmenta stvarno
    // odgovaraju lijeku iz baze. Ne nagađati samo zato što tekst iza zareza počinje slovom.
    const analyzed = parts.map((part) => ({ part, match: findTherapyMatch(part) }));
    if (analyzed.filter((item) => Boolean(item.match)).length < 2) return null;
    const suggestion = analyzed.map((item) => item.part).join('\n');
    return { parts: analyzed, suggestion };
  }

  function inferLocalExceptionName(line) {
    const clean = stripTherapyBullet(line);
    const stop = clean.search(/(?:\b\d|\bpo\s+potrebi\b|\bp\.?o\.?\b|\bper\s+os\b|\bi\.?v\.?\b|\btbl\b|\bkaps\b|\bamp\b|\binh\b)/i);
    const candidate = (stop > 0 ? clean.slice(0, stop) : clean).trim().replace(/[;:,.]+$/, '').trim();
    return candidate.split(/\s+/).slice(0, 4).join(' ');
  }

  function classifyTherapyLine(line, index) {
    const original = String(line || '');
    const clean = stripTherapyBullet(original);
    if (!clean.trim()) return { index, line: original, status: 'note', kind: 'blank', message: 'Prazan redak.' };
    if (isTherapyJunkCandidate(clean)) return { index, line: original, status: 'note', kind: 'notDrug', message: 'Izolirana interpunkcija/zagrada nije terapijski lijek.' };

    const hasDose = lineHasDose(clean);
    const hasScheme = lineHasScheme(clean);
    const hasRoute = lineHasRouteOrForm(clean);
    const multiDrug = detectTherapyMultiDrugEntry(clean);
    const match = findTherapyMatch(clean);
    const looksLikeInstruction = THERAPY_NON_DRUG_PATTERN.test(clean) && !hasDose && !hasRoute;

    if (multiDrug) {
      return {
        index,
        line: original,
        status: 'warning',
        kind: 'multipleDrugs',
        suggestions: [multiDrug.suggestion],
        suggestion: multiDrug.suggestion,
        message: 'U istom retku vjerojatno su upisana 2 ili više lijeka. Po potrebi razdvoji ih u zasebne retke.'
      };
    }

    if (!match && looksLikeInstruction) {
      return { index, line: original, status: 'note', kind: 'notDrug', message: 'Uputa/napomena — ne provjerava se kao lijek.' };
    }

    if (!match) {
      const candidate = inferLocalExceptionName(clean);
      return {
        index,
        line: original,
        status: 'warning',
        kind: 'unknownDrug',
        message: 'Slobodno upisan lijek nije potvrđen iz baze. Može ostati u terapiji, ali provjeri naziv ručno ili odaberi iz padajućeg izbornika.',
        candidateExceptionName: candidate
      };
    }

    if (match.type === 'fuzzy') {
      const fuzzySuggestions = buildCompletedTherapySuggestions(original, match, []);
      return {
        index,
        line: original,
        status: 'warning',
        kind: 'fuzzy',
        match,
        suggestion: fuzzySuggestions[0] || '',
        suggestions: fuzzySuggestions,
        message: `Mogući tipfeler ili nepotvrđen naziv. Odaberi ispravan lijek iz izbornika ako želiš standardizirati.`
      };
    }

    const missing = [];
    const doseOptional = isDoseOptionalTherapySuggestion(match?.entry, clean);
    if (!hasDose && !doseOptional) missing.push('doza/jačina');
    if (!hasScheme) missing.push('shema uzimanja');
    if (!hasRoute) missing.push('put primjene ili oblik');

    const suggestions = buildCompletedTherapySuggestions(original, match, missing);
    const suggestion = suggestions[0] || '';

    if (missing.length) {
      return {
        index,
        line: original,
        status: 'warning',
        kind: 'incomplete',
        match,
        suggestion,
        suggestions,
        message: `Prepoznat lijek, ali nedostaje: ${missing.join(', ')}.`
      };
    }

    // v194-lite: nema automatske medicinske korekcije jačine/doze. Ako je lijek prepoznat
    // i ima osnovnu strukturu, redak je zelen. Jačine/doze ostaju odgovornost korisnika.
    return {
      index,
      line: original,
      status: 'ok',
      kind: 'ok',
      match,
      suggestion: '',
      suggestions: [],
      message: match.entry.localException ? 'Lijek prepoznat kao lokalna iznimka.' : 'Lijek je prepoznat i redak ima osnovnu strukturu.'
    };
  }

  function getTherapyUniqueSuggestion(result) {
    // v196: ako bi se u padajućem izborniku prikazala samo jedna moguća opcija,
    // primijeni je automatski samo ako ne mijenja već upisanu shemu doziranja.
    const suggestions = getTherapySuggestionsForResult(result)
      .map((item) => String(item || '').trim())
      .filter(Boolean);
    if (suggestions.length !== 1) return '';
    const replacement = suggestions[0];
    const current = String(result?.line || '').trim();
    if (!replacement) return '';
    if (therapyNormalizeText(replacement) === therapyNormalizeText(current)) return '';

    const currentScheme = extractTherapySchemeToken(current);
    const replacementScheme = extractTherapySchemeToken(replacement);
    if (currentScheme && replacementScheme && therapyNormalizeText(currentScheme) !== therapyNormalizeText(replacementScheme)) return '';

    const currentFractionScheme = extractTherapyFractionSchemeToken(current);
    if (currentFractionScheme) {
      const replacementFractionScheme = extractTherapyFractionSchemeToken(replacement);
      if (therapyNormalizeText(currentFractionScheme) !== therapyNormalizeText(replacementFractionScheme)) return '';
    }

    return replacement;
  }

  function autoApplyUniqueTherapySuggestions(results, lines) {
    if (!els.therapy || !Array.isArray(results) || !Array.isArray(lines)) return 0;
    let changed = 0;
    const nextLines = lines.slice();
    results.forEach((result) => {
      const replacement = getTherapyUniqueSuggestion(result);
      if (!replacement) return;
      if (result.index < 0 || result.index >= nextLines.length) return;
      nextLines[result.index] = replacement;
      changed += 1;
    });
    if (!changed) return 0;
    pushTherapyValidationUndo();
    els.therapy.value = nextLines.join('\n');
    syncTherapyEditorFromTextarea();
    return changed;
  }

  function validateTherapyField(options = {}) {
    if (!els.therapy) return [];
    syncTherapyTextareaFromEditor(false);
    let text = normalizeLineBreaks(els.therapy.value || '');
    let lines = text ? text.split('\n') : [''];
    let results = lines.map((line, index) => classifyTherapyLine(line, index));
    const autoAppliedCount = autoApplyUniqueTherapySuggestions(results, lines);
    if (autoAppliedCount) {
      text = normalizeLineBreaks(els.therapy.value || '');
      lines = text ? text.split('\n') : [''];
      results = lines.map((line, index) => classifyTherapyLine(line, index));
    }
    state.therapyValidation.lastResults = results;
    renderTherapyEditorLinesPreservingCaret(lines, results);
    renderTherapyValidationResults(results);
    renderMedicationSafetyChecks(runMedicationSafetyChecks(patientDataToClinicalRecordV1(getFormData(), { source: 'medication-safety' })));
    updateTherapyNonDrugButton(results);
    const warnCount = results.filter((r) => r.status === 'warning').length;
    const errorCount = results.filter((r) => r.status === 'error').length;
    const noteCount = results.filter((r) => r.kind === 'notDrug').length;
    if (!state.therapyValidation.aliases.length) {
      setTherapyCsvStatus('CSV lijekova nije učitan — naziv lijeka se ne može pouzdano provjeriti.', 'warn');
    } else if (errorCount || warnCount || noteCount) {
      const autoNote = autoAppliedCount ? ` Automatski ispravljeno: ${autoAppliedCount} redak/redaka s jednom mogućnošću.` : '';
      setTherapyCsvStatus(`Provjera terapije: ${errorCount} crveno, ${warnCount} žuto, ${noteCount} sivo. Slobodno upisani/žuti retci ostaju dopušteni; za standardizaciju odaberi lijek iz padajućeg izbornika.${autoNote}`, 'warn');
    } else {
      const autoNote = autoAppliedCount ? ` Automatski ispravljeno: ${autoAppliedCount} redak/redaka s jednom mogućnošću.` : '';
      setTherapyCsvStatus(`Provjera terapije: svi retci imaju osnovnu strukturu i prepoznat naziv lijeka.${autoNote}`, 'ok');
    }
    if (autoAppliedCount) {
      renderAll();
      setStatus(`Automatski primijenjen jedini prijedlog ispravka u terapiji (${autoAppliedCount}). Undo vraća prethodni tekst.`);
    }
    return results;
  }

  function updateTherapyNonDrugButton(results) {
    if (!els.therapyDeleteNonDrugBtn) return;
    const count = (results || state.therapyValidation.lastResults || []).filter((r) => r.kind === 'notDrug').length;
    els.therapyDeleteNonDrugBtn.disabled = count === 0;
    els.therapyDeleteNonDrugBtn.textContent = count ? `Obriši nelijekove (${count})` : 'Obriši nelijekove';
  }

  function renderTherapyValidationResults(results) {
    if (!els.therapyValidationResults) return;
    const relevant = (results || []).filter((r) => r.kind !== 'blank' && r.status !== 'ok');
    if (!relevant.length) {
      els.therapyValidationResults.innerHTML = '';
      return;
    }
    els.therapyValidationResults.innerHTML = `<div class="therapy-validation-result note"><div class="therapy-validation-result-message">Prijedlozi ispravka prikazani su desno od svakog retka terapije. Za promjenu odaberi lijek iz padajućeg izbornika u istom retku.</div></div>`;
  }

  function statusLabelForTherapyResult(result) {
    if (!result) return '';
    if (result.kind === 'notDrug') return 'sivo — nelijek';
    if (result.status === 'warning') return 'žuto — provjeriti';
    if (result.status === 'error') return 'crveno — nejasno';
    return 'OK';
  }

  function replaceTherapyLine(lineIndex, replacement) {
    syncTherapyTextareaFromEditor(false);
    const lines = normalizeLineBreaks(els.therapy.value || '').split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    pushTherapyValidationUndo();
    lines[lineIndex] = replacement;
    if (state.therapyValidation.confirmedLines && replacement) {
      state.therapyValidation.confirmedLines.add(therapyNormalizeText(replacement));
    }
    els.therapy.value = lines.join('\n');
    syncTherapyEditorFromTextarea();
    validateTherapyField();
    renderAll();
    setStatus('Primijenjen je odabrani prijedlog u terapiji. Undo vraća prethodni tekst.');
  }

  function acceptTherapyLocalException(lineIndex) {
    const result = state.therapyValidation.lastResults.find((r) => r.index === lineIndex);
    const name = result?.candidateExceptionName || inferLocalExceptionName(result?.line || '');
    const key = therapyNormalizeText(name);
    if (!key || key.length < 3) return;
    if (!state.therapyValidation.localExceptions.some((item) => item.key === key)) {
      state.therapyValidation.localExceptions.push({ name, key, savedAt: new Date().toISOString() });
      saveTherapyExceptionsToStorage();
    }
    validateTherapyField();
    setStatus(`Lokalna iznimka zapamćena je samo u ovoj sesiji: ${name}.`);
  }

  function deleteTherapyNonDrugLines() {
    const results = state.therapyValidation.lastResults.length ? state.therapyValidation.lastResults : validateTherapyField();
    const nonDrug = new Set(results.filter((r) => r.kind === 'notDrug').map((r) => r.index));
    if (!nonDrug.size) return;
    const ok = window.confirm(`Obrisati ${nonDrug.size} redak/retka označena kao nelijek/uputa?`);
    if (!ok) return;
    syncTherapyTextareaFromEditor(false);
    const lines = normalizeLineBreaks(els.therapy.value || '').split('\n');
    pushTherapyValidationUndo();
    const kept = lines.filter((_, index) => !nonDrug.has(index));
    els.therapy.value = kept.join('\n');
    syncTherapyEditorFromTextarea();
    validateTherapyField();
    renderAll();
    setStatus('Obrisani su retci označeni kao nelijekovi. Undo vraća prethodni tekst.');
  }

  function onTherapyValidationResultClick(event) {
    const button = event.target.closest('button[data-therapy-action]');
    if (!button) return;
    const index = Number(button.dataset.lineIndex);
    const result = state.therapyValidation.lastResults.find((r) => r.index === index);
    if (!result) return;
    if (button.dataset.therapyAction === 'apply-suggestion') {
      const suggestionIndex = Number(button.dataset.suggestionIndex || 0);
      const suggestions = Array.isArray(result.suggestions) && result.suggestions.length ? result.suggestions : (result.suggestion ? [result.suggestion] : []);
      const replacement = suggestions[suggestionIndex] || suggestions[0] || '';
      if (replacement) replaceTherapyLine(index, replacement);
    } else if (button.dataset.therapyAction === 'accept-exception') {
      acceptTherapyLocalException(index);
    }
  }

  function onTherapyValidationResultChange(event) {
    const select = event.target.closest('select[data-therapy-action="apply-suggestion-select"]');
    if (!select) return;
    const index = Number(select.dataset.lineIndex);
    const suggestionIndex = Number(select.value);
    if (!Number.isFinite(index) || !Number.isFinite(suggestionIndex)) return;
    const result = state.therapyValidation.lastResults.find((r) => r.index === index);
    if (!result) return;
    const suggestions = Array.isArray(result.suggestions) && result.suggestions.length ? result.suggestions : (result.suggestion ? [result.suggestion] : []);
    const replacement = suggestions[suggestionIndex] || '';
    if (replacement) replaceTherapyLine(index, replacement);
  }

  function getTherapyEditorLinesForMutation() {
    syncTherapyTextareaFromEditor(false);
    const text = normalizeLineBreaks(els.therapy?.value || '');
    return text ? text.split('\n') : [''];
  }

  function setTherapyLinesFromMutation(lines, focusIndex = null) {
    const cleaned = Array.isArray(lines) && lines.length ? lines : [''];
    els.therapy.value = cleaned.join('\n');
    syncTherapyEditorFromTextarea();
    scheduleTherapyLivePreview();
    if (state.therapyValidation.liveValidationEnabled) validateTherapyField({ source: 'mutate' });
    if (Number.isFinite(focusIndex)) {
      requestAnimationFrame(() => {
        const idx = Math.max(0, Math.min(cleaned.length - 1, focusIndex));
        const input = els.therapyEditor?.querySelector(`.therapy-drug-input[data-line-index="${idx}"]`);
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      });
    }
  }


  function focusTherapyAddInput() {
    requestAnimationFrame(() => {
      const input = els.therapyEditor?.querySelector('.therapy-new-drug-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }

  function commitTherapyAddInput(input) {
    if (!input) return;
    const raw = String(input.value || '').trim();
    if (!raw) {
      focusTherapyAddInput();
      return;
    }
    const newLines = splitTherapyItemsSmart(normalizeLineBreaks(raw));
    if (!newLines.length) return;
    const existingLines = getTherapyEditorLinesForMutation();
    pushTherapyValidationUndo();
    const combined = [...newLines, ...existingLines];
    els.therapy.value = combined.join('\n');
    input.value = '';
    syncTherapyEditorFromTextarea();
    enableTherapyLiveValidation();
    validateTherapyField({ source: 'add' });
    scheduleTherapyLivePreview();
    renderAll();
    setStatus('Nova terapija dodana je na vrh popisa i odmah osnovno validirana. Undo vraća prethodni tekst.');
    focusTherapyAddInput();
  }

  function insertTherapyLineAfter(index, value = '') {
    const lines = getTherapyEditorLinesForMutation();
    const insertAt = Math.max(0, Math.min(lines.length, index + 1));
    pushTherapyValidationUndo();
    lines.splice(insertAt, 0, value);
    setTherapyLinesFromMutation(lines, insertAt);
  }

  function deleteTherapyLineAt(index) {
    const lines = getTherapyEditorLinesForMutation();
    if (index < 0 || index >= lines.length) return;
    pushTherapyValidationUndo();
    lines.splice(index, 1);
    setTherapyLinesFromMutation(lines, lines.length ? Math.min(index, lines.length - 1) : null);
    renderAll();
    setStatus('Terapijski redak je obrisan. Undo vraća prethodni tekst.');
  }

  function moveTherapyLine(fromIndex, toIndex) {
    const lines = getTherapyEditorLinesForMutation();
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= lines.length || toIndex >= lines.length) return;
    pushTherapyValidationUndo();
    const [moved] = lines.splice(fromIndex, 1);
    lines.splice(toIndex, 0, moved);
    setTherapyLinesFromMutation(lines, toIndex);
    renderAll();
    setStatus('Redoslijed terapije je promijenjen. Undo vraća prethodni tekst.');
  }

  function applyTherapyInlineSuggestion(select) {
    const index = Number(select.dataset.lineIndex);
    const suggestionIndex = Number(select.value);
    if (!Number.isFinite(index) || !Number.isFinite(suggestionIndex)) return;
    const result = state.therapyValidation.lastResults.find((r) => r.index === index);
    if (!result) return;
    const suggestions = getTherapySuggestionsForResult(result);
    const replacement = suggestions[suggestionIndex] || '';
    if (replacement) replaceTherapyLine(index, replacement);
  }

  function handleTherapyEditorPaste(event) {
    const addInput = event.target.closest('.therapy-new-drug-input');
    if (addInput) {
      const pasted = event.clipboardData?.getData('text/plain') || '';
      if (!/\r|\n/.test(pasted)) return;
      event.preventDefault();
      addInput.value = normalizeLineBreaks(pasted).trim();
      commitTherapyAddInput(addInput);
      return;
    }
    const input = event.target.closest('.therapy-drug-input');
    if (!input) return;
    const pasted = event.clipboardData?.getData('text/plain') || '';
    if (!/\r|\n/.test(pasted)) return;
    event.preventDefault();
    const index = Number(input.dataset.lineIndex || 0);
    const lines = getTherapyEditorLinesForMutation();
    const pasteLines = splitTherapyItemsSmart(normalizeLineBreaks(pasted));
    if (!pasteLines.length) return;
    pushTherapyValidationUndo();
    lines.splice(index, 1, ...pasteLines);
    setTherapyLinesFromMutation(lines, index + pasteLines.length - 1);
  }

  function handleTherapyEditorKeydown(event) {
    const addInput = event.target.closest('.therapy-new-drug-input');
    if (addInput) {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitTherapyAddInput(addInput);
      }
      return;
    }
    const input = event.target.closest('.therapy-drug-input');
    if (!input) return;
    const index = Number(input.dataset.lineIndex || 0);
    if (event.key === 'Enter') {
      event.preventDefault();
      insertTherapyLineAfter(index, '');
      return;
    }
    if (event.key === 'Backspace' && !input.value && getTherapyEditorLinesForMutation().length > 1) {
      event.preventDefault();
      deleteTherapyLineAt(index);
    }
  }

  function handleTherapyEditorClick(event) {
    const actionEl = event.target.closest('[data-therapy-action]');
    if (!actionEl || !els.therapyEditor?.contains(actionEl)) return;
    const index = Number(actionEl.dataset.lineIndex || 0);
    const action = actionEl.dataset.therapyAction;
    if (action === 'add-new-row') {
      const input = els.therapyEditor.querySelector('.therapy-new-drug-input');
      commitTherapyAddInput(input);
    } else if (action === 'delete-row') {
      deleteTherapyLineAt(index);
    } else if (action === 'edit-row') {
      const input = els.therapyEditor.querySelector(`.therapy-drug-input[data-line-index="${index}"]`);
      if (input) {
        input.focus();
        input.select();
      }
    }
  }

  function handleTherapyEditorChange(event) {
    const select = event.target.closest('select[data-therapy-action="inline-suggestion-select"]');
    if (select) applyTherapyInlineSuggestion(select);
  }

  function handleTherapyDragStart(event) {
    const handle = event.target.closest('.therapy-drag-handle');
    if (!handle) return;
    const row = handle.closest('.therapy-drug-item');
    if (!row) return;
    const index = Number(row.dataset.lineIndex || 0);
    state.therapyValidation.dragIndex = index;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }

  function handleTherapyDragOver(event) {
    const row = event.target.closest('.therapy-drug-item');
    if (!row || row.dataset.therapyAddRow === 'true' || !els.therapyEditor?.contains(row)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    els.therapyEditor.querySelectorAll('.therapy-drug-item.is-drag-over').forEach((item) => item.classList.remove('is-drag-over'));
    row.classList.add('is-drag-over');
  }

  function handleTherapyDragLeave(event) {
    const row = event.target.closest('.therapy-drug-item');
    if (row) row.classList.remove('is-drag-over');
  }

  function handleTherapyDrop(event) {
    const row = event.target.closest('.therapy-drug-item');
    if (!row || row.dataset.therapyAddRow === 'true' || !els.therapyEditor?.contains(row)) return;
    event.preventDefault();
    els.therapyEditor.querySelectorAll('.therapy-drug-item.is-drag-over').forEach((item) => item.classList.remove('is-drag-over'));
    const fromIndex = Number(state.therapyValidation.dragIndex ?? event.dataTransfer.getData('text/plain'));
    const toIndex = Number(row.dataset.lineIndex || 0);
    state.therapyValidation.dragIndex = null;
    if (Number.isFinite(fromIndex) && Number.isFinite(toIndex)) moveTherapyLine(fromIndex, toIndex);
  }

  function handleTherapyDragEnd() {
    state.therapyValidation.dragIndex = null;
    els.therapyEditor?.querySelectorAll('.therapy-drug-item.is-drag-over').forEach((item) => item.classList.remove('is-drag-over'));
  }

  function wireTherapyValidationEvents() {
    // v200: kronična terapija je običan textarea bez provjere lijekova.
    // Namjerno ne učitavamo CSV bazu, ne prikazujemo prijedloge i ne palimo live validaciju.
    if (els.therapyValidationControls) els.therapyValidationControls.style.display = 'none';
    initTherapyCsvValidationStorage();
    if (els.therapyValidationResults) els.therapyValidationResults.innerHTML = '';
  }


  function populateAdminLayoutSelect() {
    els.adminLayoutSelect.innerHTML = '';
    Object.entries(LAYOUT_LABELS).forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      els.adminLayoutSelect.appendChild(option);
    });
  }

  function getFieldPathLabels(layoutKey) {
    const layout = state.calibration[layoutKey];
    const options = [
      { path: 'patientHeader', label: FIELD_LABELS.patientHeader }
    ];
    if (layout?.diagnosis?.visible !== false) {
      options.push({ path: 'diagnosis', label: FIELD_LABELS.diagnosis });
    }
    if (layout?.allergiesBox?.visible !== false) {
      options.push({ path: 'allergiesBox', label: FIELD_LABELS.allergiesBox });
    }
    if (layout?.patientOriginBox?.visible !== false) {
      options.push({ path: 'patientOriginBox', label: FIELD_LABELS.patientOriginBox });
    }
    if (layout?.ohbpTherapyBox?.visible !== false) {
      options.push({ path: 'ohbpTherapyBox', label: FIELD_LABELS.ohbpTherapyBox });
    }
    const dayLabels = ['pon', 'uto', 'sri', 'čet', 'pet', 'sub', 'ned'];
    [
      { root: 'labBox1Days', label: FIELD_LABELS.labBox1Days },
      { root: 'labBox2Days', label: FIELD_LABELS.labBox2Days },
      { root: 'labBox4Days', label: FIELD_LABELS.labBox4Days },
      { root: 'labBox3Days', label: FIELD_LABELS.labBox3Days },
      { root: 'radiologyDays', label: FIELD_LABELS.radiologyDays },
      { root: 'vitalSignsDays', label: FIELD_LABELS.vitalSignsDays },
      { root: 'followUpControlDays', label: FIELD_LABELS.followUpControlDays }
    ].forEach(({ root, label }) => {
      if (Array.isArray(layout[root])) {
        layout[root].forEach((field, i) => {
          if (field?.visible !== false) {
            options.push({ path: `${root}.${i}`, label: `${label} – ${dayLabels[i]}` });
          }
        });
      }
    });
    layout.dates.forEach((_, i) => {
      options.push({ path: `dates.${i}`, label: `Datum ${i + 1}` });
    });
    if (Array.isArray(layout.hospitalDays)) {
      layout.hospitalDays.forEach((_, i) => {
        options.push({ path: `hospitalDays.${i}`, label: `${FIELD_LABELS.hospitalDays} ${i + 1}` });
      });
    }
    layout.therapy.forEach((_, i) => {
      options.push({ path: `therapy.${i}`, label: `Terapija ${i + 1}` });
    });
    return options;
  }

  function populateAdminFieldSelect() {
    const layoutKey = state.admin.selectedLayout;
    const options = getFieldPathLabels(layoutKey);
    els.adminFieldSelect.innerHTML = '';
    options.forEach(({ path, label }) => {
      const option = document.createElement('option');
      option.value = path;
      option.textContent = label;
      els.adminFieldSelect.appendChild(option);
    });
    if (!options.some(item => item.path === state.admin.selectedField)) {
      state.admin.selectedField = options[0]?.path || 'patientHeader';
    }
    els.adminFieldSelect.value = state.admin.selectedField;
    updateAdminInputs();
  }

  function getFieldRef(layoutKey, fieldPath) {
    const layout = state.calibration[layoutKey];
    if (!layout) return null;
    if (!fieldPath.includes('.')) return layout[fieldPath] || null;
    const [root, indexStr] = fieldPath.split('.');
    const index = Number(indexStr);
    return Array.isArray(layout[root]) ? layout[root][index] || null : null;
  }

  function makeSelectionKey(layoutKey, fieldPath) {
    return `${layoutKey}::${fieldPath}`;
  }

  function parseSelectionKey(key) {
    const separatorIndex = String(key || '').indexOf('::');
    if (separatorIndex < 0) {
      return { layoutKey: state.admin.selectedLayout, path: String(key || '') };
    }
    return {
      layoutKey: key.slice(0, separatorIndex),
      path: key.slice(separatorIndex + 2)
    };
  }

  function pruneSelectedFields() {
    const seen = new Set();
    state.admin.selectedFields = (state.admin.selectedFields || []).filter((key) => {
      const { layoutKey, path } = parseSelectionKey(key);
      if (!layoutKey || !path || seen.has(key)) return false;
      seen.add(key);
      const field = getFieldRef(layoutKey, path);
      return Boolean(field && field.visible !== false);
    });
  }

  function ensureSingleSelection(layoutKey = state.admin.selectedLayout, fieldPath = state.admin.selectedField) {
    state.admin.selectedLayout = layoutKey;
    state.admin.selectedField = fieldPath;
    state.admin.selectedFields = [makeSelectionKey(layoutKey, fieldPath)];
    state.admin.selectAllTextBoxes = false;
  }

  function getRenderedLayoutKeys() {
    const keys = [els.shell1?.dataset?.layout, els.shell2?.dataset?.layout]
      .filter(Boolean);
    return Array.from(new Set(keys));
  }

  function isFieldSelected(layoutKey, fieldPath) {
    if (state.admin.selectAllTextBoxes) return true;
    pruneSelectedFields();
    return state.admin.selectedFields.includes(makeSelectionKey(layoutKey, fieldPath));
  }

  function getSelectedFieldRefs() {
    pruneSelectedFields();
    return (state.admin.selectedFields || [])
      .map((key) => {
        const { layoutKey, path } = parseSelectionKey(key);
        const field = getFieldRef(layoutKey, path);
        return field ? { layoutKey, path, field } : null;
      })
      .filter(Boolean);
  }

  function getAllTextFieldRefs(layoutKey = null) {
    const layoutKeys = layoutKey ? [layoutKey] : getRenderedLayoutKeys();
    const refs = [];
    const seen = new Set();
    layoutKeys.forEach((key) => {
      getFieldPathLabels(key).forEach(({ path }) => {
        const selectionKey = makeSelectionKey(key, path);
        if (seen.has(selectionKey)) return;
        seen.add(selectionKey);
        const field = getFieldRef(key, path);
        if (field && field.visible !== false) {
          refs.push({ layoutKey: key, path, field });
        }
      });
    });
    return refs;
  }

  function getActiveEditableFields() {
    if (state.admin.selectAllTextBoxes) {
      return getAllTextFieldRefs();
    }
    const selected = getSelectedFieldRefs();
    if (selected.length) return selected;
    const field = getFieldRef(state.admin.selectedLayout, state.admin.selectedField);
    return field ? [{ layoutKey: state.admin.selectedLayout, path: state.admin.selectedField, field }] : [];
  }

  function updateSelectAllTextBoxesButton() {
    if (!els.selectAllTextBoxesBtn) return;
    const isActive = Boolean(state.admin.selectAllTextBoxes);
    els.selectAllTextBoxesBtn.classList.toggle('active-admin', isActive);
    els.selectAllTextBoxesBtn.textContent = isActive ? 'Svi okviri odabrani' : 'Odaberi sve okvire';
  }

  function updateUndoRedoButtons() {
    if (els.adminUndoBtn) els.adminUndoBtn.disabled = !state.admin.undoStack.length;
    if (els.adminRedoBtn) els.adminRedoBtn.disabled = !state.admin.redoStack.length;
  }

  function updateAdminAdvancedControls() {
    const visible = Boolean(state.admin.advancedVisible);
    if (els.adminAdvancedControls) {
      els.adminAdvancedControls.classList.toggle('visible', visible);
      els.adminAdvancedControls.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }
    if (els.adminAdvancedToggleBtn) {
      els.adminAdvancedToggleBtn.setAttribute('aria-expanded', visible ? 'true' : 'false');
      els.adminAdvancedToggleBtn.setAttribute('aria-label', visible ? 'Sakrij napredne kontrole servisnog režima' : 'Prikaži napredne kontrole servisnog režima');
      els.adminAdvancedToggleBtn.textContent = visible ? 'Sakrij napredno' : 'Napredno';
    }
  }

  function toggleAdminAdvancedControls() {
    state.admin.advancedVisible = !state.admin.advancedVisible;
    updateAdminAdvancedControls();
    setStatus(state.admin.advancedVisible ? 'Napredne admin kontrole su prikazane.' : 'Napredne admin kontrole su skrivene.');
  }

  function snapshotCalibration() {
    return JSON.stringify(state.calibration);
  }

  function hasUnsavedAdminChanges() {
    return Boolean(
      state.admin.enabled &&
      state.admin.savedSnapshot !== null &&
      snapshotCalibration() !== state.admin.savedSnapshot
    );
  }

  function updateAdminUnsavedIndicator() {
    const hasUnsavedChanges = hasUnsavedAdminChanges();
    if (els.adminUnsavedIndicator) {
      els.adminUnsavedIndicator.classList.toggle('hidden', !hasUnsavedChanges);
      els.adminUnsavedIndicator.setAttribute('aria-hidden', hasUnsavedChanges ? 'false' : 'true');
    }
    return hasUnsavedChanges;
  }

  function markAdminCalibrationSaved() {
    state.admin.savedSnapshot = snapshotCalibration();
    updateAdminUnsavedIndicator();
  }

  function pushUndoSnapshot(beforeSnapshot) {
    const currentSnapshot = snapshotCalibration();
    if (!beforeSnapshot || beforeSnapshot === currentSnapshot) {
      updateUndoRedoButtons();
      return false;
    }
    const stack = state.admin.undoStack;
    if (stack[stack.length - 1] !== beforeSnapshot) {
      stack.push(beforeSnapshot);
      if (stack.length > 80) stack.shift();
    }
    state.admin.redoStack = [];
    updateUndoRedoButtons();
    updateAdminUnsavedIndicator();
    return true;
  }

  function restoreCalibrationSnapshot(snapshot) {
    if (!snapshot) return false;
    try {
      const parsed = JSON.parse(snapshot);
      state.calibration = tunePrintFieldCapacity(mergeDeep(deepClone(DEFAULT_COORDS), parsed));
      saveCalibrationToStorage();
      updateAdminSelectionUI();
      updateAdminInputs();
      renderAll();
      updateUndoRedoButtons();
      updateAdminUnsavedIndicator();
      return true;
    } catch (error) {
      setStatus('Nije moguće vratiti promjenu.', true);
      return false;
    }
  }

  function commitCalibrationMutation(mutator) {
    const beforeSnapshot = snapshotCalibration();
    mutator();
    const afterSnapshot = snapshotCalibration();
    if (beforeSnapshot === afterSnapshot) {
      updateAdminInputs();
      updateUndoRedoButtons();
      updateAdminUnsavedIndicator();
      return false;
    }
    if (state.admin.undoStack[state.admin.undoStack.length - 1] !== beforeSnapshot) {
      state.admin.undoStack.push(beforeSnapshot);
      if (state.admin.undoStack.length > 80) state.admin.undoStack.shift();
    }
    state.admin.redoStack = [];
    saveCalibrationToStorage();
    updateAdminInputs();
    renderAll();
    updateUndoRedoButtons();
    updateAdminUnsavedIndicator();
    return true;
  }

  function undoAdminChange() {
    if (!state.admin.undoStack.length) {
      updateUndoRedoButtons();
      return;
    }
    const undoStackBefore = state.admin.undoStack.slice();
    const redoStackBefore = state.admin.redoStack.slice();
    const currentSnapshot = snapshotCalibration();
    const previousSnapshot = state.admin.undoStack.pop();
    state.admin.redoStack.push(currentSnapshot);
    const restored = restoreCalibrationSnapshot(previousSnapshot);
    if (!restored) {
      state.admin.undoStack = undoStackBefore;
      state.admin.redoStack = redoStackBefore;
      updateUndoRedoButtons();
      return;
    }
    setStatus('Vraćena je zadnja admin promjena.');
  }

  function redoAdminChange() {
    if (!state.admin.redoStack.length) {
      updateUndoRedoButtons();
      return;
    }
    const undoStackBefore = state.admin.undoStack.slice();
    const redoStackBefore = state.admin.redoStack.slice();
    const currentSnapshot = snapshotCalibration();
    const nextSnapshot = state.admin.redoStack.pop();
    state.admin.undoStack.push(currentSnapshot);
    if (state.admin.undoStack.length > 80) state.admin.undoStack.shift();
    const restored = restoreCalibrationSnapshot(nextSnapshot);
    if (!restored) {
      state.admin.undoStack = undoStackBefore;
      state.admin.redoStack = redoStackBefore;
      updateUndoRedoButtons();
      return;
    }
    setStatus('Ponovljena je vraćena admin promjena.');
  }

  function setSelectAllTextBoxes(enabled) {
    state.admin.selectAllTextBoxes = Boolean(enabled);
    if (state.admin.selectAllTextBoxes) {
      state.admin.selectedFields = [];
    } else {
      ensureSingleSelection(state.admin.selectedLayout, state.admin.selectedField);
    }
    updateSelectAllTextBoxesButton();
    updateAdminInputs();
    renderAdminOverlays();
    if (state.admin.selectAllTextBoxes) {
      const count = getAllTextFieldRefs().length;
      setStatus(`Odabrani su svi tekstualni okviri na obje prikazane stranice: ${count}. Promjena fonta mijenja samo font, a promjena proreda samo prored; postojeće pojedinačne vrijednosti ostaju sačuvane.`);
    } else if (state.admin.enabled) {
      setStatus('Odabir svih okvira je isključen.');
    }
  }

  function getCommonNumericValue(items, propertyName) {
    if (!items.length) return '';
    const values = items.map(({ field }) => Math.round(Number(field[propertyName] ?? 0)));
    const first = values[0];
    return values.every((value) => value === first) ? String(first) : '';
  }

  function getCommonStringValue(items, propertyName, fallback = '') {
    if (!items.length) return fallback;
    const values = items.map(({ field }) => String(field[propertyName] ?? fallback));
    const first = values[0];
    return values.every((value) => value === first) ? first : fallback;
  }

  function setNumericSelectValue(selectElement, value) {
    if (!selectElement) return;
    selectElement.value = value;
    if (value === '') {
      // Prazna skrivena opcija ostaje odabrana samo za zatvoreni prikaz selecta.
      // Kad se padajući izbornik otvori, korisnik i dalje vidi numeričke opcije.
      selectElement.selectedIndex = 0;
    }
    // Sync visible number input if this is the font size select
    if (selectElement === els.fieldFontSize) {
      const numInput = document.getElementById('fieldFontSizeInput');
      if (numInput) numInput.value = value === '' ? '' : value;
    }
  }

  // Font size widget: A- / A+ buttons + number input → hidden select
  (function initFontSizeWidget() {
    const numInput = document.getElementById('fieldFontSizeInput');
    const decBtn  = document.getElementById('fontSizeDecBtn');
    const incBtn  = document.getElementById('fontSizeIncBtn');
    const select  = document.getElementById('fieldFontSize');
    if (!numInput || !decBtn || !incBtn || !select) return;

    function setFontSize(val) {
      const n = Math.max(6, Math.min(60, Math.round(val)));
      numInput.value = n;
      select.value = String(n);
      // Dispatch change so existing JS picks it up
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    decBtn.addEventListener('click', () => {
      const cur = parseInt(numInput.value, 10);
      if (!isNaN(cur)) setFontSize(cur - 1);
    });

    incBtn.addEventListener('click', () => {
      const cur = parseInt(numInput.value, 10);
      if (!isNaN(cur)) setFontSize(cur + 1);
    });

    numInput.addEventListener('change', () => {
      const cur = parseInt(numInput.value, 10);
      if (!isNaN(cur)) setFontSize(cur);
    });

    numInput.addEventListener('input', () => {
      const cur = parseInt(numInput.value, 10);
      if (!isNaN(cur) && cur >= 6 && cur <= 60) {
        select.value = String(cur);
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  })();

  function updateAdminInputs() {
    const items = getActiveEditableFields();
    const primary = items[0] || null;
    const field = primary?.field || getFieldRef(state.admin.selectedLayout, state.admin.selectedField);
    if (!field) return;
    if (primary && items.length <= 1) {
      state.admin.selectedLayout = primary.layoutKey || state.admin.selectedLayout;
      state.admin.selectedField = primary.path || state.admin.selectedField;
    }
    els.adminLayoutSelect.value = state.admin.selectedLayout;
    els.adminFieldSelect.value = state.admin.selectedField;
    els.fieldX.value = Math.round(field.x ?? 0);
    els.fieldY.value = Math.round(field.y ?? 0);
    els.fieldWidth.value = Math.round(field.width ?? 0);
    els.fieldHeight.value = Math.round(field.height ?? 0);
    setNumericSelectValue(els.fieldFontSize, getCommonNumericValue(items, 'fontSize'));
    setNumericSelectValue(els.fieldLineHeight, getCommonNumericValue(items, 'lineHeight'));
    els.fieldAlign.value = getCommonStringValue(items, 'textAlign', field.textAlign || 'left');
    els.fieldVisible.value = String(field.visible !== false);
  }

  function applyAdminInputValues(event) {
    const target = event?.target || null;
    const changedFontSize = target === els.fieldFontSize;
    const changedLineHeight = target === els.fieldLineHeight;
    const changedTypographyControl = changedFontSize || changedLineHeight;
    const nextFontSize = els.fieldFontSize.value === '' ? null : Number(els.fieldFontSize.value);
    const nextLineHeight = els.fieldLineHeight.value === '' ? null : Number(els.fieldLineHeight.value);

    if (changedFontSize && nextFontSize === null) return;
    if (changedLineHeight && nextLineHeight === null) return;

    commitCalibrationMutation(() => {
      // Font i prored pamte se po pojedinoj kućici.
      // Kod višestrukog ili masovnog odabira mijenja se samo ona tipografska vrijednost
      // koju je korisnik stvarno promijenio.
      if (changedTypographyControl) {
        const items = getActiveEditableFields();
        items.forEach(({ field }) => {
          if (changedFontSize && Number.isFinite(nextFontSize) && nextFontSize > 0) {
            field.fontSize = nextFontSize;
          }
          if (changedLineHeight && Number.isFinite(nextLineHeight) && nextLineHeight > 0) {
            field.lineHeight = nextLineHeight;
          }
        });
        return;
      }

      const field = getFieldRef(state.admin.selectedLayout, state.admin.selectedField);
      if (!field) return;

      if (!target || target === els.fieldX) field.x = Number(els.fieldX.value || 0);
      if (!target || target === els.fieldY) field.y = Number(els.fieldY.value || 0);
      if (!target || target === els.fieldWidth) field.width = Number(els.fieldWidth.value || 0);
      if (!target || target === els.fieldHeight) field.height = Number(els.fieldHeight.value || 0);
      if (!target || target === els.fieldAlign) field.textAlign = els.fieldAlign.value;
      if (!target || target === els.fieldVisible) field.visible = els.fieldVisible.value !== 'false';
    });
  }

  function setStatus(message, isError = false) {
    els.statusBar.textContent = message || '';
    els.statusBar.style.color = isError ? 'var(--danger)' : 'var(--muted)';
  }

  function clearStatusSoon(delayMs = 4500) {
    window.clearTimeout(state.statusClearTimer);
    state.statusClearTimer = window.setTimeout(() => {
      if (els.statusBar?.dataset?.autoLabWarning === 'true') return;
      setStatus('');
    }, delayMs);
  }

  function setOhbpParseStatus(message, kind = 'neutral') {
    if (!els.ohbpParseStatus) return;
    els.ohbpParseStatus.textContent = message || '';
    els.ohbpParseStatus.classList.toggle('ok', kind === 'ok');
    els.ohbpParseStatus.classList.toggle('warn', kind === 'warn');
  }


  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function replaceLatinWord(line, source, target) {
    return line.replace(new RegExp('\\b' + escapeRegExp(source) + '\\b', 'gi'), target);
  }

  function replaceLatinWordList(line, replacements) {
    let next = line;
    replacements.forEach(([source, target]) => {
      next = replaceLatinWord(next, source, target);
    });
    return next;
  }

  function correctAdjectiveAgreement(line, nouns, adjectiveForms, targetForm) {
    let next = line;
    nouns.forEach((noun) => {
      const forms = adjectiveForms.map(escapeRegExp).join('|');
      next = next.replace(new RegExp('\\b(' + escapeRegExp(noun) + ')\\s+(' + forms + ')\\b', 'gi'), (_, matchedNoun) => matchedNoun + ' ' + targetForm);
    });
    return next;
  }

  const NON_DIAGNOSIS_TAIL_PATTERNS = Object.freeze([
    /\s*(?:[-–—]\s*)?\b(?:RR|TA|AT)\b\s*(?:u\s*)?(?:(?:\d{1,2}\s*[.:]\s*\d{1,2}|\d{1,2})\s*h?)?\s*[:=]?\s*\d{2,3}\s*\/\s*\d{2,3}\s*(?:mm\s*Hg|mmHg)?\b/i,
    /\s*(?:[-–—]\s*)?\b(?:krvni\s+tlak|tlak)\b.{0,45}?\d{2,3}\s*\/\s*\d{2,3}\s*(?:mm\s*Hg|mmHg)?\b/i,
    /\s*(?:[-–—]\s*)?\bSpO2\b\s*[:=]?\s*\d{2,3}\s*%?/i,
    /\s*(?:[-–—]\s*)?\b(?:puls|sr\.?\s*freq\.?|srčana\s+frekvencija|srcana\s+frekvencija)\b\s*[:=]?\s*\d{2,3}\s*(?:\/\s*min|\/min|min)?\b/i,
    /\s*(?:[-–—]\s*)?\b(?:temp\.?|temperatura)\b\s*[:=]?\s*\d{1,2}(?:[.,]\d)?\s*°?\s*C?\b/i,
    /\s*(?:[-–—]\s*)?\b(?:GCS|bol)\b\s*[:=]?\s*\d{1,2}(?:\s*\/\s*\d{1,2})?\b/i,
    /\s*(?:[-–—]\s*)?\b(?:objektivna\s+procjena|vitalni\s+parametri|trijažn[ai]\s+kategorij[ae])\b\s*[:=]/i
  ]);

  function findNonDiagnosisTailStartIndex(value) {
    const source = String(value || '');
    let index = -1;
    NON_DIAGNOSIS_TAIL_PATTERNS.forEach((pattern) => {
      const match = source.match(pattern);
      if (match && match.index >= 0) {
        index = index < 0 ? match.index : Math.min(index, match.index);
      }
    });
    return index;
  }

  function stripNonDiagnosisTail(value) {
    const source = String(value || '');
    const index = findNonDiagnosisTailStartIndex(source);
    if (index < 0) return source;
    return source.slice(0, index).replace(/[\s,;:–—-]+$/g, '').trimEnd();
  }


  const LATIN_DIAGNOSIS_DICTIONARY = Object.freeze([
    { canonical: 'Collectio intraabdominalis. Status post occlusionem colostomae', aliases: ['collectio intraabdominalisa st post oclusio colostomae', 'collectio intraabdominalis st post oclusio colostomae', 'collectio intraabdominalisa st. post oclusio colostomae', 'collectio intraabdominalis st. post oclusio colostomae', 'collectio intraabdominalis status post occlusio colostomae', 'collectio intraabdominalis status post occlusionem colostomae'] },
    { canonical: 'Collectio intraabdominalis', aliases: ['collectio intraabdominalis', 'collectio intraabdominalisa', 'kolekcija intraabdominalna', 'intraabdominalna kolekcija', 'intraabdominalna kolekcija tekućine', 'intraabdominalna kolekcija tekucine'] },
    { canonical: 'Status post occlusionem colostomae', aliases: ['status post occlusionem colostomae', 'status post occlusio colostomae', 'status post oclusio colostomae', 'st post occlusio colostomae', 'st post oclusio colostomae', 'st. post occlusio colostomae', 'st. post oclusio colostomae'] },
    { canonical: 'Enterocolitis acuta', aliases: ['enterocolitis acuta', 'enterocolitis acutus', 'enterokolitis akutni', 'akutni enterokolitis'] },
    { canonical: 'Status post pneumoniam', aliases: ['status post pneumoniam', 'status post pneumonia', 'status post pneumonija', 'st post pneumoniam', 'st post pneumonia', 'st. post pneumoniam', 'st. post pneumonia', 'stanje nakon pneumonije'] },
    { canonical: 'Insufficientia respiratoria acuta', aliases: ['insufficientia respiratoria acuta', 'insufficientio respiratoria acuta', 'insuf respiratoria acuta', 'insuff respiratoria acuta', 'respiratorna insuficijencija akutna', 'akutna respiratorna insuficijencija', 'akutno respiratorno zatajenje'] },
    { canonical: 'Haematoma corporis', aliases: ['haematoma corporis', 'hematoma corporis', 'haematoma corp', 'hematoma corp', 'hematom tijela', 'hematom trupa'] },
    { canonical: 'CVI suspecta', aliases: ['CVI susp', 'CVI susp.', 'C.V.I. susp.', 'CVI suspektna', 'CVI suspektan', 'CVI suspecta', 'CVI suspectus', 'CVI suspectum'] },
    { canonical: 'Pneumonia acuta', aliases: ['pneumonia acuta', 'pneumonija akutna', 'akutna pneumonija', 'pneumonia acutus', 'pneumonia acutum'] },
    { canonical: 'Pneumonia bilateralis', aliases: ['pneumonia bilateralis', 'obostrana pneumonija', 'bilateralna pneumonija', 'pneumonija obostrano'] },
    { canonical: 'Pneumonia lateris dextri', aliases: ['pneumonia lat dex', 'pneumonia l dex', 'pneumonia dex', 'desnostrana pneumonija', 'pneumonija desno'] },
    { canonical: 'Pneumonia lateris sinistri', aliases: ['pneumonia lat sin', 'pneumonia l sin', 'pneumonia sin', 'lijevostrana pneumonija', 'pneumonija lijevo'] },
    { canonical: 'Bronchopneumonia acuta', aliases: ['bronchopneumonia acuta', 'bronhopneumonija akutna', 'bronhopneumonia acuta', 'bronchopneumonia acutus', 'bronchopneumonia acutum'] },
    { canonical: 'Bronchitis acuta', aliases: ['bronchitis acuta', 'bronhitis akutni', 'akutni bronhitis', 'bronchitis acutus', 'bronchitis acutum'] },
    { canonical: 'Infectio tractus respiratorii', aliases: ['infectio tractus respiratorii', 'infectio tractus respiratorii acuta', 'infectio respiratoria', 'infectio respiratorii', 'respiratorna infekcija', 'infekcija respiratornog trakta', 'infekt respiratornog trakta', 'akutna respiratorna infekcija', 'ARI'] },
    { canonical: 'Infectio tractus respiratorii superioris', aliases: ['infectio tractus respiratorii superioris', 'infectio tractus respiratorii superior', 'infekcija gornjih disnih puteva', 'infekcija gornjih dišnih puteva', 'infekt gornjih disnih puteva', 'infekt gornjih dišnih puteva', 'prehlada', 'nasopharyngitis acuta', 'rhinopharyngitis acuta'] },
    { canonical: 'Infectio tractus respiratorii inferioris', aliases: ['infectio tractus respiratorii inferioris', 'infectio tractus respiratorii inferior', 'infekcija donjih disnih puteva', 'infekcija donjih dišnih puteva', 'infekt donjih disnih puteva', 'infekt donjih dišnih puteva', 'tracheobronchitis acuta', 'bronchiolitis acuta'] },
    { canonical: 'Pharyngitis acuta', aliases: ['pharyngitis acuta', 'faringitis akutni', 'akutni faringitis', 'upala grla'] },
    { canonical: 'Tonsillopharyngitis acuta', aliases: ['tonsillopharyngitis acuta', 'tonsilofaringitis akutni', 'akutni tonsilofaringitis', 'angina'] },
    { canonical: 'Sinusitis acuta', aliases: ['sinusitis acuta', 'sinuitis acuta', 'akutni sinusitis', 'sinusitis akutni'] },
    { canonical: 'Laryngitis acuta', aliases: ['laryngitis acuta', 'laringitis akutni', 'akutni laringitis'] },
    { canonical: 'Exacerbatio COPD', aliases: ['egzacerbacija kopb', 'egzacerbacija copd', 'exacerbatio copd', 'exacerbatio KOPB'] },
    { canonical: 'Asthma bronchiale exacerbata', aliases: ['astma egzacerbacija', 'exacerbatio asthme', 'asthma bronchiale exacerbata'] },
    { canonical: 'Pyelonephritis acuta', aliases: ['pyelonephritis acuta', 'pyelonefritis akutni', 'akutni pijelonefritis', 'pijelonefritis akutni', 'pyelonephritis acutus', 'pyelonephritis acutum', 'pielonephritis acuta'] },
    { canonical: 'Cystitis acuta', aliases: ['cystitis acuta', 'cistitis akutni', 'akutni cistitis', 'cystitis acutus', 'cystitis acutum'] },
    { canonical: 'Infectio tractus urinarii', aliases: ['infekcija mokracnog sustava', 'infekcija mokraćnog sustava', 'IMS', 'UTI', 'infectio urinaria', 'infectio tractus urinarius', 'infectio tractus urinarii'] },
    { canonical: 'Urosepsis', aliases: ['urosepsa', 'urosepsis'] },
    { canonical: 'Sepsis', aliases: ['sepsa', 'sepsis'] },
    { canonical: 'Sepsis suspecta', aliases: ['sepsis susp', 'sepsis susp.', 'sepsa suspektna', 'sepsis suspecta'] },
    { canonical: 'Febris ignotae originis', aliases: ['febris ignota originis', 'febris ignotus originis', 'febris ignotae etiologiae', 'vrucica nepoznata porijekla', 'vrućica nepoznata podrijetla', 'febrilitet nepoznate etiologije'] },
    { canonical: 'Status febrilis', aliases: ['status febrilis', 'st febrilis', 'st. febrilis', 'febrilno stanje'] },
    { canonical: 'Hyperglycaemia', aliases: ['hyperglicemia', 'hyperglycaemia', 'hyperglycemia', 'hiperglikemija'] },
    { canonical: 'Tussis', aliases: ['tussis', 'kašalj', 'kasalj'] },
    { canonical: 'Enteritis in observatione', aliases: ['enteritis i.o.', 'enteritis io', 'enteritis in observatione'] },
    { canonical: 'Insufficientia renalis chronica in acutisatione', aliases: ['insuff.renalis chr. in acutisatio', 'insuff renalis chr in acutisatio', 'insuff renalis chr in acutisatione', 'insufficientia renalis chronica in acutisatione'] },
    { canonical: 'Gastroenterocolitis acuta', aliases: ['gastroenterocolitis acuta', 'akutni gastroenterokolitis', 'gastroenterokolitis akutni', 'gastroenterocolitis acutus'] },
    { canonical: 'Gastroenteritis acuta', aliases: ['gastroenteritis acuta', 'akutni gastroenteritis', 'gastroenteritis akutni', 'gastroenteritis acutus'] },
    { canonical: 'Diarrhoea acuta', aliases: ['diarrhoea acuta', 'diarrhea acuta', 'proljev akutni', 'akutni proljev'] },
    { canonical: 'Colicae abdominales', aliases: ['collicae abdominales', 'colicae abdominales', 'kolike abdominalne', 'abdominalne kolike'] },
    { canonical: 'Hypokaliaemia', aliases: ['hypokaliaemia', 'hypokaliemia', 'hipokalijemija', 'hipokalemia'] },
    { canonical: 'Melaena ex anamnesi', aliases: ['melaena ex anamnesis', 'melaena ex anamnesi', 'melena ex anamnesis', 'melena iz anamneze'] },
    { canonical: 'Status post Billroth II', aliases: ['st post bilroth ii', 'st. post bilroth ii', 'status post bilroth ii', 'st post billroth ii', 'status post billroth ii'] },
    { canonical: 'Status post ulcus duodeni', aliases: ['st post ulcus duodeni', 'st. post ulcus duodeni', 'status post ulcus duodeni'] },
    { canonical: 'Cholecystitis acuta', aliases: ['cholecystitis acuta', 'kolecistitis akutni', 'akutni kolecistitis', 'cholecystitis acutus'] },
    { canonical: 'Appendicitis acuta', aliases: ['appendicitis acuta', 'apendicitis akutni', 'akutni apendicitis', 'appendicitis acutus'] },
    { canonical: 'Pancreatitis acuta', aliases: ['pancreatitis acuta', 'pankreatitis akutni', 'akutni pankreatitis', 'pancreatitis acutus'] },
    { canonical: 'Diverticulitis acuta', aliases: ['diverticulitis acuta', 'divertikulitis akutni', 'akutni divertikulitis', 'diverticulitis acutus'] },
    { canonical: 'Cellulitis cruris dextri', aliases: ['cellulitis cruris dextri', 'celulitis desne potkoljenice', 'celulitis desno cruris', 'cellulitis cruris dexter'] },
    { canonical: 'Cellulitis cruris sinistri', aliases: ['cellulitis cruris sinistri', 'celulitis lijeve potkoljenice', 'celulitis lijevo cruris', 'cellulitis cruris sinister'] },
    { canonical: 'Erysipelas cruris dextri', aliases: ['erysipelas cruris dextri', 'erizipel desne potkoljenice', 'erisipelas cruris dextri'] },
    { canonical: 'Erysipelas cruris sinistri', aliases: ['erysipelas cruris sinistri', 'erizipel lijeve potkoljenice', 'erisipelas cruris sinistri'] },
    { canonical: 'Abscessus', aliases: ['absces', 'apsces', 'abscessus'] },
    { canonical: 'Vulnus', aliases: ['vulnus', 'rana'] },
    { canonical: 'Trauma capitis', aliases: ['trauma capitis', 'ozljeda glave', 'trauma glave'] },
    { canonical: 'Contusio capitis', aliases: ['contusio capitis', 'kontuzija glave', 'nagnjecenje glave', 'nagnječenje glave'] },
    { canonical: 'Status post lapsum', aliases: ['status post lapsum', 'st post lapsum', 'stanje nakon pada', 'pad'] },
    { canonical: 'Insufficientia cordis', aliases: ['insufficientia cordis', 'zatajivanje srca', 'srčano zatajivanje', 'srcano zatajivanje'] },
    { canonical: 'Decompensatio cordis', aliases: ['decompensatio cordis', 'dekompenzacija srca', 'kardijalna dekompenzacija'] },
    { canonical: 'Hypertensio arterialis', aliases: ['hypertensio arterialis', 'hipertenzija', 'arterijska hipertenzija', 'hta'] },
    { canonical: 'Diabetes mellitus', aliases: ['diabetes mellitus', 'dijabetes melitus', 'šećerna bolest', 'secerna bolest'] },
    { canonical: 'Anaemia', aliases: ['anaemia', 'anemia', 'anemija'] },
    { canonical: 'Anaemia microcytica', aliases: ['anaemia microcytica', 'anemia microcytica', 'mikrocitna anemija'] },
    { canonical: 'Thrombocytopenia', aliases: ['thrombocytopenia', 'trombocitopenija'] },
    { canonical: 'Leucocytosis', aliases: ['leucocytosis', 'leukocitoza'] },
    { canonical: 'Syncope', aliases: ['syncope', 'sinkopa'] },
    { canonical: 'Vertigo', aliases: ['vertigo', 'vrtoglavica'] }
  ]);

  const HOSPITAL_DIAGNOSIS_ICD_SEED = Object.freeze([
    ['COVID-19', ['U07.1', 'U07.2'], ['covid', 'covid 19', 'sars cov 2 infekcija', 'koronavirusna bolest']],
    ['Influenza', ['J10', 'J11'], ['gripa', 'influenca', 'influenza virusna infekcija']],
    ['Infiltratio pulmonum lateris dextri', ['J18.9'], ['infiltratio pulmonum lat dex', 'infiltratio pulmonum lateris dextri', 'upalni infiltrat desno', 'infiltrat desno']],
    ['Infiltratio pulmonum lateris sinistri', ['J18.9'], ['infiltratio pulmonum lat sin', 'infiltratio pulmonum lateris sinistri', 'upalni infiltrat lijevo', 'infiltrat lijevo']],
    ['Pneumonia atypica', ['J18.9'], ['atipična pneumonija', 'atipicna pneumonija', 'atypical pneumonia']],
    ['Pneumonia aspirationis', ['J69.0'], ['aspiracijska pneumonija', 'aspiration pneumonia', 'pneumonija aspiracijska']],
    ['Pleuropneumonia', ['J18.9'], ['pleuropneumonija', 'pneumonia cum pleuritide']],
    ['Morbus pulmonum obstructivus chronicus', ['J44'], ['KOPB', 'COPD', 'kronična opstruktivna plućna bolest', 'kronicna opstruktivna plucna bolest']],
    ['Exacerbatio bronchitidis chronicae', ['J44.1'], ['egzacerbacija kroničnog bronhitisa', 'egzacerbacija kronicnog bronhitisa', 'akutna egzacerbacija KOPB']],
    ['Insufficientia respiratoria chronica', ['J96.1'], ['kronična respiratorna insuficijencija', 'kronicna respiratorna insuficijencija', 'kronično respiratorno zatajenje']],
    ['Insufficientia respiratoria acuta et chronica', ['J96.2'], ['akutizacija kronične respiratorne insuficijencije', 'akutno na kronično respiratorno zatajenje']],
    ['Embolia pulmonalis', ['I26'], ['plućna embolija', 'plucna embolija', 'PE', 'embolija pluća']],
    ['Effusio pleurae', ['J90'], ['pleuralni izljev', 'izljev pleure', 'pleural effusion']],
    ['Pneumothorax', ['J93'], ['pneumotoraks']],
    ['Atelectasis pulmonis', ['J98.1'], ['atelektaza pluća', 'atelektaza pluca', 'atelektaza']],
    ['Bronchiectasiae', ['J47'], ['bronhiektazije', 'bronchiectasis']],
    ['Oedema pulmonis', ['J81'], ['edem pluća', 'plućni edem', 'plucni edem']],
    ['Dolor thoracis', ['R07.4'], ['bol u prsima', 'bol u prsištu', 'bol u prsistu', 'thoracalgia']],
    ['Angina pectoris', ['I20'], ['angina pektoris', 'stenokardija']],
    ['Syndroma coronarium acutum', ['I24.9'], ['akutni koronarni sindrom', 'AKS', 'ACS']],
    ['Infarctus myocardii acutus STEMI', ['I21.0', 'I21.1', 'I21.2', 'I21.3'], ['STEMI', 'akutni infarkt miokarda sa ST elevacijom']],
    ['Infarctus myocardii acutus NSTEMI', ['I21.4'], ['NSTEMI', 'akutni infarkt miokarda bez ST elevacije']],
    ['Status post infarctum myocardii', ['I25.2'], ['st post infarkt miokarda', 'stanje nakon infarkta miokarda', 'preboljeli infarkt miokarda']],
    ['Morbus coronarius chronicus', ['I25'], ['kronična koronarna bolest', 'kronicna koronarna bolest', 'ishemijska bolest srca']],
    ['Fibrillatio atriorum', ['I48'], ['fibrilacija atrija', 'FA', 'AF', 'apsolutna aritmija']],
    ['Flutter atriorum', ['I48'], ['undulacija atrija', 'atrijski flutter']],
    ['Tachyarrhythmia supraventricularis', ['I47.1'], ['SVT', 'supraventrikulska tahikardija']],
    ['Bradyarrhythmia', ['R00.1'], ['bradiaritmija', 'bradikardija']],
    ['Bloc atrioventricularis', ['I44'], ['AV blok', 'atrioventrikulski blok']],
    ['Crisis hypertensiva', ['I16'], ['hipertenzivna kriza', 'hipertenzivna urgencija']],
    ['Hypotensio arterialis', ['I95'], ['hipotenzija', 'arterijska hipotenzija']],
    ['Insufficientia cordis acuta', ['I50'], ['akutno zatajivanje srca', 'akutna srčana insuficijencija', 'akutna srcana insuficijencija']],
    ['Insufficientia cordis chronica', ['I50'], ['kronično zatajivanje srca', 'kronicno zatajivanje srca', 'kronična srčana insuficijencija']],
    ['Decompensatio cordis acuta', ['I50'], ['akutna dekompenzacija srca', 'srčana dekompenzacija', 'srcana dekompenzacija']],
    ['Cardiomyopathia dilatativa', ['I42.0'], ['dilatativna kardiomiopatija', 'DCM']],
    ['Endocarditis infectiosa', ['I33'], ['infektivni endokarditis', 'endokarditis']],
    ['Pericarditis acuta', ['I30'], ['akutni perikarditis', 'perikarditis']],
    ['Syncope et collapsus', ['R55'], ['sinkopa i kolaps', 'kolaps', 'presinkopa']],
    ['Thrombosis venae profundae', ['I80.2'], ['duboka venska tromboza', 'DVT', 'tromboza dubokih vena']],
    ['Dolor abdominalis', ['R10'], ['bol u trbuhu', 'abdominalna bol', 'bolovi u trbuhu']],
    ['Nausea et vomitus', ['R11'], ['mučnina i povraćanje', 'mucnina i povracanje', 'povraćanje']],
    ['Obstipatio', ['K59.0'], ['opstipacija', 'zatvor stolice', 'konstipacija']],
    ['Ileus', ['K56'], ['ileus', 'opstrukcija crijeva']],
    ['Subileus', ['K56.7'], ['subileus', 'paralitički ileus', 'paraliticki ileus']],
    ['Gastritis acuta', ['K29.1'], ['akutni gastritis', 'gastritis']],
    ['Ulcus ventriculi', ['K25'], ['ulkus želuca', 'ulkus zeluca', 'želučani ulkus']],
    ['Ulcus duodeni', ['K26'], ['ulkus duodenuma', 'duodenalni ulkus']],
    ['Haemorrhagia gastrointestinalis', ['K92.2'], ['GI krvarenje', 'gastrointestinalno krvarenje', 'krvarenje iz probavnog trakta']],
    ['Haematochezia', ['K92.1'], ['hematokezija', 'svježa krv u stolici', 'svjeza krv u stolici']],
    ['Morbus refluxus gastrooesophagealis', ['K21'], ['GERB', 'gastroezofagealna refluksna bolest', 'refluks']],
    ['Cholelithiasis', ['K80'], ['kolelitijaza', 'žučni kamenci', 'zucni kamenci']],
    ['Colica biliaris', ['K80.5'], ['bilijarna kolika', 'žučna kolika', 'zucna kolika']],
    ['Choledocholithiasis', ['K80.5'], ['koledokolitijaza', 'kamenac holedokusa']],
    ['Cholangitis acuta', ['K83.0'], ['akutni kolangitis', 'kolangitis']],
    ['Cirrhosis hepatis', ['K74'], ['ciroza jetre', 'jetrena ciroza']],
    ['Ascites', ['R18'], ['ascites', 'ascites abdomena']],
    ['Hepatitis acuta', ['K72', 'B17'], ['akutni hepatitis', 'hepatitis']],
    ['Steatosis hepatis', ['K76.0'], ['steatoza jetre', 'masna jetra']],
    ['Hernia inguinalis', ['K40'], ['ingvinalna hernija', 'preponska kila']],
    ['Hernia umbilicalis', ['K42'], ['umbilikalna hernija', 'pupčana kila', 'pupcana kila']],
    ['Neoplasma coli suspectum', ['C18', 'D37.4'], ['suspektni tumor kolona', 'NPL kolona', 'npl coli', 'neoplazma kolona']],
    ['Laesio renalis acuta', ['N17'], ['akutno bubrežno oštećenje', 'akutno bubrezno ostecenje', 'AKI', 'acute kidney injury']],
    ['Insufficientia renalis acuta', ['N17'], ['akutno bubrežno zatajenje', 'akutno bubrezno zatajenje']],
    ['Insufficientia renalis chronica', ['N18'], ['kronično bubrežno zatajenje', 'kronicno bubrezno zatajenje', 'kronična bubrežna bolest', 'KBB']],
    ['Nephrolithiasis', ['N20'], ['nefrolitijaza', 'bubrežni kamenci', 'bubrezni kamenci']],
    ['Colica renalis', ['N23'], ['renalna kolika', 'bubrežna kolika', 'bubrezna kolika']],
    ['Hydronephrosis', ['N13.3'], ['hidronefroza']],
    ['Retentio urinae', ['R33'], ['retencija urina', 'urinarna retencija']],
    ['Haematuria', ['R31'], ['hematurija', 'krv u urinu']],
    ['Hypertrophia prostatae', ['N40'], ['BPH', 'hiperplazija prostate', 'hipertrofija prostate', 'uvećana prostata']],
    ['Prostatitis acuta', ['N41.0'], ['akutni prostatitis', 'prostatitis']],
    ['Orchitis et epididymitis', ['N45'], ['orhiepididimitis', 'epididimitis', 'orhitis']],
    ['Diabetes mellitus typus 2', ['E11'], ['DM2', 'šećerna bolest tip 2', 'secerna bolest tip 2', 'dijabetes tip 2']],
    ['Diabetes mellitus typus 1', ['E10'], ['DM1', 'šećerna bolest tip 1', 'secerna bolest tip 1', 'dijabetes tip 1']],
    ['Hypoglycaemia', ['E16.2'], ['hipoglikemija', 'niski šećer', 'niski secer']],
    ['Ketoacidosis diabetica', ['E10.1', 'E11.1'], ['DKA', 'dijabetička ketoacidoza', 'dijabeticka ketoacidoza']],
    ['Hyponatraemia', ['E87.1'], ['hiponatrijemija']],
    ['Hypernatraemia', ['E87.0'], ['hipernatrijemija']],
    ['Hyperkaliaemia', ['E87.5'], ['hiperkalijemija', 'hiperkalemija']],
    ['Dehydratatio', ['E86'], ['dehidracija', 'eksikoza']],
    ['Hypovolaemia', ['E86.1'], ['hipovolemija']],
    ['Hypothyreosis', ['E03'], ['hipotireoza']],
    ['Hyperthyreosis', ['E05'], ['hipertireoza']],
    ['Obesitas', ['E66'], ['pretilost', 'gojaznost']],
    ['Hyperlipidaemia', ['E78.5'], ['hiperlipidemija', 'dislipidemija']],
    ['Insultus cerebrovascularis', ['I64'], ['CVI', 'moždani udar', 'mozdani udar', 'cerebrovaskularni inzult']],
    ['Ischaemia cerebri acuta', ['I63'], ['ishemijski moždani udar', 'ishemični moždani udar', 'infarkt mozga']],
    ['Transitorna ischaemia cerebri', ['G45.9'], ['TIA', 'tranzitorna ishemijska ataka']],
    ['Haemorrhagia intracerebralis', ['I61'], ['intracerebralno krvarenje', 'hemoragijski moždani udar']],
    ['Cephalea', ['R51'], ['glavobolja', 'cefalalgija']],
    ['Epilepsia', ['G40'], ['epilepsija']],
    ['Status epilepticus', ['G41'], ['epileptički status', 'epilepticki status']],
    ['Convulsiones', ['R56'], ['konvulzije', 'grčevi', 'grcevi']],
    ['Delirium', ['F05'], ['delirij', 'akutna smetenost', 'konfuzno stanje']],
    ['Dementia', ['F03'], ['demencija']],
    ['Morbus Parkinson', ['G20'], ['Parkinsonova bolest', 'parkinsonizam']],
    ['Polyneuropathia diabetica', ['G63.2'], ['dijabetička polineuropatija', 'dijabeticka polineuropatija']],
    ['Paresis nervi facialis', ['G51.0'], ['pareza facijalisa', 'pareza n. facialis']],
    ['Radiculopathia lumbalis', ['M54.1'], ['lumbalna radikulopatija', 'radikulopatija']],
    ['Ischialgia', ['M54.3'], ['išijas', 'isijas', 'lumboishialgija']],
    ['Anaemia sideropenica', ['D50'], ['sideropenična anemija', 'sideropenicna anemija', 'anemija zbog manjka željeza']],
    ['Anaemia normocytica', ['D64.9'], ['normocitna anemija']],
    ['Anaemia posthaemorrhagica acuta', ['D62'], ['akutna posthemoragijska anemija', 'posthemoragijska anemija']],
    ['Pancytopenia', ['D61.9'], ['pancitopenija']],
    ['Neutropenia', ['D70'], ['neutropenija']],
    ['Thrombocytosis', ['D75.8'], ['trombocitoza']],
    ['Coagulopathia', ['D68.9'], ['koagulopatija', 'poremećaj koagulacije']],
    ['Lymphadenopathia', ['R59'], ['limfadenopatija', 'uvećani limfni čvorovi']],
    ['Neoplasma pulmonis', ['C34'], ['karcinom pluća', 'karcinom pluca', 'NPL pluća', 'NPL pulmonis']],
    ['Neoplasma mammae', ['C50'], ['karcinom dojke', 'NPL mammae']],
    ['Meta pulmonum', ['C78.0'], ['plućne metastaze', 'plucne metastaze', 'metastaze pluća']],
    ['Meta hepatis', ['C78.7'], ['jetrene metastaze', 'metastaze jetre']],
    ['Status post chemotherapiam', ['Z92.2'], ['stanje nakon kemoterapije', 'status post kemoterapiju']],
    ['Status post radiotherapiam', ['Z92.3'], ['stanje nakon radioterapije', 'status post radioterapiju']],
    ['Infectio cutis et subcutis', ['L08.9'], ['infekcija kože i potkožja', 'infekcija koze i potkozja']],
    ['Abscessus cutis', ['L02'], ['apsces kože', 'apsces koze', 'kožni apsces']],
    ['Ulcus cruris', ['L97'], ['ulkus potkoljenice', 'rana potkoljenice']],
    ['Pes diabeticus', ['E11.5'], ['dijabetičko stopalo', 'dijabeticko stopalo']],
    ['Herpes zoster', ['B02'], ['zoster']],
    ['Infectio viralis', ['B34.9'], ['viroza', 'virusna infekcija']],
    ['Bacteraemia', ['R78.81'], ['bakterijemija', 'pozitivne hemokulture']],
    ['Shock septicus', ['R65.2'], ['septički šok', 'septicki sok', 'septic shock']],
    ['Lumbago', ['M54.5'], ['križobolja', 'krizobolja', 'lumbalna bol']],
    ['Dolor dorsi', ['M54.9'], ['bol u leđima', 'bol u ledima', 'dorzalgija']],
    ['Cervicobrachialgia', ['M53.1'], ['cervikobrahialgija', 'bol u vratu i ruci']],
    ['Gonarthrosis', ['M17'], ['gonartroza', 'artroza koljena']],
    ['Coxarthrosis', ['M16'], ['koksartroza', 'artroza kuka']],
    ['Arthritis urica', ['M10'], ['giht', 'urični artritis', 'uricni artritis']],
    ['Polyarthritis', ['M13'], ['poliartritis']],
    ['Fractura colli femoris', ['S72.0'], ['prijelom vrata femura', 'fraktura vrata femura', 'prijelom kuka']],
    ['Fractura radii distalis', ['S52.5'], ['prijelom distalnog radijusa', 'fraktura distalnog radijusa']],
    ['Fractura humeri', ['S42.3'], ['prijelom humerusa', 'fraktura humerusa']],
    ['Fractura costae', ['S22.3'], ['prijelom rebra', 'fraktura rebra']],
    ['Fractura vertebrae', ['S22', 'S32'], ['prijelom kralješka', 'prijelom kraljeska', 'fraktura kralješka']],
    ['Luxatio humeri', ['S43.0'], ['luksacija ramena', 'iščašenje ramena', 'iscasenje ramena']],
    ['Distorsio articulationis talocruralis', ['S93.4'], ['distorzija gležnja', 'distorzija gleznja', 'uganuće gležnja']],
    ['Contusio thoracis', ['S20.2'], ['kontuzija prsnog koša', 'nagnječenje prsnog koša']],
    ['Contusio abdominis', ['S30.1'], ['kontuzija abdomena', 'nagnječenje trbuha']],
    ['Intoxicatio alcoholica acuta', ['F10.0'], ['akutna alkoholna intoksikacija', 'alkoholiziranost']],
    ['Syndroma abstinentiae alcoholicae', ['F10.3'], ['alkoholni apstinencijski sindrom', 'apstinencijska kriza']],
    ['Delirium tremens', ['F10.4'], ['alkoholni delirij', 'delirium alcoholicum']],
    ['Intoxicatio medicamentosa', ['T50.9'], ['intoksikacija lijekovima', 'predoziranje lijekovima']],
    ['Anxietas', ['F41.9'], ['anksioznost', 'anksiozni poremećaj']],
    ['Reactio stress acuta', ['F43.0'], ['akutna stresna reakcija', 'reakcija na stres']],
    ['Depressio', ['F32'], ['depresija', 'depresivna epizoda']],
    ['Psychosis acuta', ['F23'], ['akutna psihoza', 'psihotična epizoda']],
    ['Insomnia', ['G47.0'], ['nesanica', 'insomnija']],
    ['Otitis media acuta', ['H66'], ['akutna upala srednjeg uha', 'akutni otitis media']],
    ['Otitis externa', ['H60'], ['upala vanjskog uha', 'otitis externa']],
    ['Epistaxis', ['R04.0'], ['epistaksa', 'krvarenje iz nosa']],
    ['Conjunctivitis acuta', ['H10'], ['akutni konjunktivitis', 'konjunktivitis']],
    ['Cataracta', ['H26'], ['katarakta', 'mrena']],
    ['Glaucoma', ['H40'], ['glaukom']],
    ['Dyspnoea', ['R06.0'], ['dispneja', 'otežano disanje', 'otezano disanje']],
    ['Oedema crurum', ['R60.0'], ['edemi potkoljenica', 'otok nogu', 'edemi nogu']],
    ['Asthenia', ['R53'], ['opća slabost', 'opca slabost', 'malaksalost']],
    ['Inappetentia', ['R63.0'], ['slab apetit', 'gubitak apetita']],
    ['Status post operationem', ['Z98.8'], ['stanje nakon operacije', 'status post op', 'st post op']],
    ['Status post implantationem stent', ['Z95.5'], ['stanje nakon implantacije stenta', 'st post stent', 'ugrađen stent']]
  ].map(([canonical, codes, aliases]) => ({ canonical, codes, aliases })));

  const DIAGNOSIS_DICTIONARY = Object.freeze([
    ...LATIN_DIAGNOSIS_DICTIONARY,
    ...HOSPITAL_DIAGNOSIS_ICD_SEED
  ]);

  function normalizeDiagnosisLookupKey(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/\bC\s*\.\s*V\s*\.\s*I\s*\.?/gi, 'CVI')
      .replace(/^\s*[A-Z][0-9]{2}(?:\.[0-9A-Z]+)?\s*(?:-|–|:)?\s*/i, '')
      .toLowerCase()
      .replace(/[.,;:()\[\]{}]/g, ' ')
      .replace(/[–—-]/g, ' ')
      .replace(/\b(?:dg|dijagnoza)\b/g, ' ')
      .replace(/\bsusp\b/g, 'susp')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getDiagnosisCodePrefixAndBody(line) {
    const source = String(line || '').trim();
    const match = source.match(/^(\s*[A-Z][0-9]{2}(?:\.[0-9A-Z]+)?\s*(?:-|–|:)\s*)(.+)$/i);
    if (!match) return { prefix: '', body: source };
    return { prefix: match[1].replace(/\s*[-–:]\s*$/, ' - '), body: match[2].trim() };
  }

  const LATIN_DIAGNOSIS_LOOKUP = (() => {
    const map = new Map();
    DIAGNOSIS_DICTIONARY.forEach((entry) => {
      [entry.canonical].concat(entry.aliases || []).forEach((alias) => {
        const key = normalizeDiagnosisLookupKey(alias);
        if (key && !map.has(key)) map.set(key, entry.canonical);
      });
    });
    return map;
  })();

  function levenshteinDistance(a, b) {
    const left = String(a || '');
    const right = String(b || '');
    if (left === right) return 0;
    if (!left) return right.length;
    if (!right) return left.length;
    let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let i = 0; i < left.length; i += 1) {
      const current = [i + 1];
      for (let j = 0; j < right.length; j += 1) {
        const insertCost = current[j] + 1;
        const deleteCost = previous[j + 1] + 1;
        const replaceCost = previous[j] + (left[i] === right[j] ? 0 : 1);
        current.push(Math.min(insertCost, deleteCost, replaceCost));
      }
      previous = current;
    }
    return previous[right.length];
  }

  function firstDiagnosisToken(key) {
    return String(key || '').split(/\s+/).filter(Boolean)[0] || '';
  }

  function findDictionaryDiagnosisCanonical(line) {
    const cleaned = stripNonDiagnosisTail(line).trim();
    if (!cleaned) return '';
    const parts = getDiagnosisCodePrefixAndBody(cleaned);
    const key = normalizeDiagnosisLookupKey(parts.body);
    if (!key) return '';

    const exact = LATIN_DIAGNOSIS_LOOKUP.get(key);
    if (exact) return parts.prefix + exact;

    // Konzervativna fuzzy usporedba: smije ispraviti samo očite tipfelere
    // u dijagnozama koje su već vrlo blizu spremljenom popisu.
    if (key.length < 8) return '';
    const keyFirst = firstDiagnosisToken(key);
    let best = { canonical: '', distance: Infinity, aliasKey: '' };
    LATIN_DIAGNOSIS_LOOKUP.forEach((canonical, aliasKey) => {
      if (!aliasKey || Math.abs(aliasKey.length - key.length) > 2) return;
      if (firstDiagnosisToken(aliasKey) !== keyFirst) return;
      const distance = levenshteinDistance(key, aliasKey);
      const allowed = key.length >= 14 ? 2 : 1;
      if (distance <= allowed && distance < best.distance) {
        best = { canonical, distance, aliasKey };
      }
    });
    return best.canonical ? parts.prefix + best.canonical : '';
  }

  function correctLatinDiagnosisSegment(inputLine) {
    let line = String(inputLine || '');
    const leading = line.match(/^\s*/)?.[0] || '';
    const trailing = line.match(/\s*$/)?.[0] || '';
    line = line.trim();
    if (!line) return inputLine;

    line = line
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+([,.;:])/g, '$1')
      .replace(/([,.;:])(?!\s|$)/g, '$1 ')
      .replace(/\s*[–—]\s*/g, ' – ')
      .replace(/\s*-\s*/g, ' - ');

    // Gumb za ispravak dijagnoza smije ukloniti očiti višak iz OHBP parsera
    // ako su u tekstni okvir dijagnoze ušli vitalni znakovi, npr.
    // "CVI susp. - RR u 14.30h: 170/100 mmHg" -> "CVI susp.".
    line = stripNonDiagnosisTail(line).trim();
    if (!line) return leading + trailing;

    // Česte složene dijagnoze i kratice koje se ne smiju rješavati samo nastavcima.
    // Primjer lošeg starog ishoda: "Collectio intraabdominalisa st post oclusio colostomae".
    line = line
      .replace(/\bcollectio\s+intra[-\s]?abdominalis(?:a|na|um)?\b/gi, 'Collectio intraabdominalis')
      .replace(/\bintra[-\s]?abdominalna\s+kolekcija\b/gi, 'Collectio intraabdominalis')
      .replace(/\bst\.?\s*post\b/gi, 'Status post')
      .replace(/\bstatus\s+post\s+o?cclusio\s+colostomae\b/gi, 'Status post occlusionem colostomae')
      .replace(/\bstatus\s+post\s+occlusionem\s+colostomae\b/gi, 'Status post occlusionem colostomae')
      .replace(/\boclusio\s+colostomae\b/gi, 'occlusio colostomae')
      .replace(/\binf{2,}iltratio\b/gi, 'Infiltratio')
      .replace(/\b(Collectio intraabdominalis)\s+(Status post occlusionem colostomae)\b/g, '$1. $2');

    const dictionaryCanonical = findDictionaryDiagnosisCanonical(line);
    if (dictionaryCanonical) {
      line = dictionaryCanonical;
    }

    // Lokalna konvencija za čestu neurološku skraćenicu:
    // "CVI susp." ili "CVI susp" -> "CVI suspecta".
    // Pravilo se primjenjuje i nakon rezanja vitalnih znakova, npr.
    // "CVI susp - RR u 14.30h: 170/100 mmHg" -> "CVI suspecta".
    line = line
      .replace(/\bC\.?\s*V\.?\s*I\.?\s+susp\.?(?=$|[\s,;.)])/gi, 'CVI suspecta')
      .replace(/\bCVI\s+suspekt[au]?\b/gi, 'CVI suspecta')
      .replace(/\bCVI\s+suspect(?:us|um)?\b/gi, 'CVI suspecta');

    line = replaceLatinWordList(line, [
      ['pneumonija', 'Pneumonia'],
      ['pneumonia', 'Pneumonia'],
      ['bronchopneumonia', 'Bronchopneumonia'],
      ['bronhopneumonia', 'Bronchopneumonia'],
      ['pyelonefritis', 'Pyelonephritis'],
      ['pielonephritis', 'Pyelonephritis'],
      ['pyelonephritis', 'Pyelonephritis'],
      ['cystitis', 'Cystitis'],
      ['bronchitis', 'Bronchitis'],
      ['tonsillitis', 'Tonsillitis'],
      ['pharyngitis', 'Pharyngitis'],
      ['sinusitis', 'Sinusitis'],
      ['cholecystitis', 'Cholecystitis'],
      ['pancreatitis', 'Pancreatitis'],
      ['appendicitis', 'Appendicitis'],
      ['gastroenteritis', 'Gastroenteritis'],
      ['enterocolitis', 'Enterocolitis'],
      ['diverticulitis', 'Diverticulitis'],
      ['cellulitis', 'Cellulitis'],
      ['collectio', 'Collectio'],
      ['infectio', 'Infectio'],
      ['sepsa', 'Sepsis'],
      ['sepsis', 'Sepsis'],
      ['abscessus', 'Abscessus'],
      ['infarctus', 'Infarctus'],
      ['insultus', 'Insultus'],
      ['ileus', 'Ileus'],
      ['vulnus', 'Vulnus'],
      ['ulcus', 'Ulcus'],
      ['trauma', 'Trauma'],
      ['oedema', 'Oedema'],
      ['edema', 'Oedema']
    ]);

    line = line
      .replace(/\bstatus\s+post\b/gi, 'Status post')
      .replace(/\bexitus\s+letalis\b/gi, 'Exitus letalis')
      .replace(/\bca\.?\b/g, 'Ca.')
      .replace(/\bmet\.?\b/g, 'met.')
      .replace(/\bbil(?:at)?\.?\b/gi, 'bilateralis')
      .replace(/\b(l\.|lat\.|lateris)\s*dex\.?\b/gi, 'lateris dextri')
      .replace(/\b(l\.|lat\.|lateris)\s*sin\.?\b/gi, 'lateris sinistri')
      .replace(/\b(cruris|pedis|lateris)\s+(dexter|dextra|dextrum|dex\.)\b/gi, '$1 dextri')
      .replace(/\b(cruris|pedis|lateris)\s+(sinister|sinistra|sinistrum|sin\.)\b/gi, '$1 sinistri')
      .replace(/\bmanus\s+(dexter|dextrum|dex\.)\b/gi, 'manus dextrae')
      .replace(/\bmanus\s+(sinister|sinistrum|sin\.)\b/gi, 'manus sinistrae');

    const feminineNouns = ['Pneumonia', 'Bronchopneumonia', 'Pyelonephritis', 'Cystitis', 'Bronchitis', 'Tonsillitis', 'Pharyngitis', 'Sinusitis', 'Cholecystitis', 'Pancreatitis', 'Appendicitis', 'Gastroenteritis', 'Enterocolitis', 'Diverticulitis', 'Cellulitis', 'Infectio'];
    const masculineNouns = ['Abscessus', 'Infarctus', 'Insultus', 'Ileus'];
    const neuterNouns = ['Vulnus', 'Ulcus', 'Trauma', 'Oedema'];

    line = correctAdjectiveAgreement(line, feminineNouns, ['acutus', 'acutum', 'acuta'], 'acuta');
    line = correctAdjectiveAgreement(line, masculineNouns, ['acutus', 'acutum', 'acuta'], 'acutus');
    line = correctAdjectiveAgreement(line, neuterNouns, ['acutus', 'acutum', 'acuta'], 'acutum');

    line = correctAdjectiveAgreement(line, feminineNouns, ['chronicus', 'chronicum', 'chronica'], 'chronica');
    line = correctAdjectiveAgreement(line, masculineNouns, ['chronicus', 'chronicum', 'chronica'], 'chronicus');
    line = correctAdjectiveAgreement(line, neuterNouns, ['chronicus', 'chronicum', 'chronica'], 'chronicum');

    line = correctAdjectiveAgreement(line, feminineNouns, ['dexter', 'dextrum', 'dextra', 'dex.'], 'dextra');
    line = correctAdjectiveAgreement(line, feminineNouns, ['sinister', 'sinistrum', 'sinistra', 'sin.'], 'sinistra');
    line = correctAdjectiveAgreement(line, masculineNouns, ['dexter', 'dextrum', 'dextra', 'dex.'], 'dexter');
    line = correctAdjectiveAgreement(line, masculineNouns, ['sinister', 'sinistrum', 'sinistra', 'sin.'], 'sinister');
    line = correctAdjectiveAgreement(line, neuterNouns, ['dexter', 'dextrum', 'dextra', 'dex.'], 'dextrum');
    line = correctAdjectiveAgreement(line, neuterNouns, ['sinister', 'sinistrum', 'sinistra', 'sin.'], 'sinistrum');

    line = line
      .replace(/\binsufficientio\s+respiratoria\s+acuta\b/gi, 'Insufficientia respiratoria acuta')
      .replace(/\binsuff\.?\s+respiratoria\s+acuta\b/gi, 'Insufficientia respiratoria acuta')
      .replace(/\binsuf\.?\s+respiratoria\s+acuta\b/gi, 'Insufficientia respiratoria acuta')
      .replace(/\bstatus\s+post\s+pneumonia\b/gi, 'Status post pneumoniam')
      .replace(/\bstatus\s+post\s+pneumoniam\b/gi, 'Status post pneumoniam')
      .replace(/\bst\.?\s+post\s+pneumonia\b/gi, 'Status post pneumoniam')
      .replace(/\bst\.?\s+post\s+pneumoniam\b/gi, 'Status post pneumoniam')
      .replace(/\bhematoma\s+corporis\b/gi, 'Haematoma corporis')
      .replace(/\bhaematoma\s+corporis\b/gi, 'Haematoma corporis');

    line = line
      .replace(/\b(Pneumonia|Bronchopneumonia)\s+bilateralis\b/gi, '$1 bilateralis')
      .replace(/\b(Infectio)\s+urinaria\b/gi, '$1 urinaria')
      .replace(/\b(Infectio)\s+respiratoria\b/gi, '$1 respiratoria')
      .replace(/\b(tractus)\s+urinarius\b/gi, '$1 urinarii')
      .replace(/\b(febris)\s+ignotus\s+originis\b/gi, 'Febris ignotae originis')
      .replace(/\b(febris)\s+ignota\s+originis\b/gi, 'Febris ignotae originis')
      .replace(/\b(febris)\s+ignotae\s+etiologiae\b/gi, 'Febris ignotae originis');

    const prefixMatch = line.match(/^(\s*(?:[A-Z][0-9]{2}(?:\.[0-9A-Z]+)?\s*(?:-|–)\s*)?)(.*)$/);
    if (prefixMatch && prefixMatch[2]) {
      const prefix = prefixMatch[1];
      const body = prefixMatch[2].trim();
      line = prefix + body.charAt(0).toUpperCase() + body.slice(1);
    }

    line = line
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+([,.;:])/g, '$1')
      .replace(/([,.;:])(?!\s|$)/g, '$1 ')
      .trim();

    return leading + line + trailing;
  }

  function splitDiagnosisCorrectionParts(line) {
    return String(line || '').split(/([,;]\s*)/);
  }

  function isDiagnosisSegmentKnownOrTypical(segment) {
    const source = String(segment || '').replace(/\s+/g, ' ').trim();
    if (!source) return true;
    if (findDictionaryDiagnosisCanonical(source)) return true;
    return hasKnownDiagnosisTerm(source) || looksLikeDiagnosisByFallback(source);
  }

  function stripDiagnosisReviewMarkers(value) {
    return String(value || '')
      .replace(/\s*\[provjeriti\]/gi, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .trim();
  }

  function markDiagnosisSegmentForReviewIfNeeded(originalSegment, correctedSegment) {
    // v163: kronična terapija prepoznaje anamnezički “Th - …” i čisti uvod “ne zna što troši”; v162: radiologija se reže prije ABS/(aK), a dijagnoza prije postavljanja UK; v161: dodan zaseban okvir alergija na listi; v160: završni Dg se reže prije naslova “Završna dijagnoza, epikriza i preporuke”; v157: kronična terapija ne povlači blok “Lijekovi iz med. dok.”; v156: OHBP terapija se dinamički miče ispod/desno od dijagnoze ako bi došlo do preklapanja; v155: RTG/UZV blok se reže prije Dg/Dg/; v154: kronična terapija se reže prije Komorbiditeti/Alergija; v153: nakon uklanjanja gumba za automatsku provjeru dijagnoza više ne dodajemo
    // oznaku [provjeriti] u tekst dijagnoze. Funkcija ostaje zbog postojećeg toka
    // korekcije latinskog zapisa, ali samo čisti eventualne stare oznake.
    return String(correctedSegment || '').replace(/\s*\[provjeriti\]/gi, '');
  }

  function correctLatinDiagnosisLine(inputLine) {
    const raw = String(inputLine || '');
    const parts = splitDiagnosisCorrectionParts(raw);
    if (parts.length <= 1) {
      const corrected = correctLatinDiagnosisSegment(raw);
      return markDiagnosisSegmentForReviewIfNeeded(raw, corrected);
    }

    let previousOriginalSegment = '';
    return parts.map((part, index) => {
      if (index % 2 === 1) return part;
      previousOriginalSegment = part;
      if (!part.trim()) return part;
      const corrected = correctLatinDiagnosisSegment(part);
      return markDiagnosisSegmentForReviewIfNeeded(previousOriginalSegment, corrected);
    }).join('');
  }

  function countDiagnosisReviewMarkers(text) {
    const matches = String(text || '').match(/\[provjeriti\]/gi);
    return matches ? matches.length : 0;
  }

  function correctLatinDiagnosisText(text) {
    return normalizeLineBreaks(text).split('\n').map(correctLatinDiagnosisLine).join('\n');
  }

  function countChangedDiagnosisLines(before, after) {
    const beforeLines = normalizeLineBreaks(before).split('\n');
    const afterLines = normalizeLineBreaks(after).split('\n');
    const max = Math.max(beforeLines.length, afterLines.length);
    let changed = 0;
    for (let i = 0; i < max; i += 1) {
      if ((beforeLines[i] || '') !== (afterLines[i] || '')) changed += 1;
    }
    return changed;
  }

  function handleCorrectDiagnosisClick() {
    const before = els.diagnosis?.value || '';
    if (!before.trim()) {
      setStatus('Nema upisanih dijagnoza za ispravak.', true);
      return;
    }
    const after = correctLatinDiagnosisText(before);
    if (after === before) {
      setStatus('Nema prepoznatih gramatičkih korekcija u polju dijagnoze. Latinske dijagnoze ipak ručno provjeriti prije ispisa.');
      return;
    }
    const changedLines = countChangedDiagnosisLines(before, after);
    const reviewCount = countDiagnosisReviewMarkers(after);
    els.diagnosis.value = after;
    onFormChanged();
    if (reviewCount > 0) {
      setStatus('Ispravljene su latinske dijagnoze u ' + changedLines + ' redaka. ' + reviewCount + ' segment(a) označeno je s [provjeriti] jer nije sigurno prepoznato.');
    } else {
      setStatus('Ispravljene su latinske dijagnoze u ' + changedLines + ' redaka. Provjeriti medicinski smisao i MKB-10 prije ispisa.');
    }
  }

  function hasParsedValue(value) {
    return String(value || '').trim().length > 0;
  }

  function buildOhbpRecognitionStatus(parsed = {}) {
    const fields = [
      { key: 'fullName', label: 'ime' },
      { key: 'birthYear', label: 'godište' },
      { key: 'admissionDate', label: 'datum' },
      { key: 'diagnosis', label: 'dg' },
      { key: 'allergies', label: 'alergije' },
      { key: 'therapy', label: 'kron. th' },
      { key: 'ohbpTherapy', label: 'OHBP th' },
      { key: 'vitalSigns', label: 'vitalni' },
      { key: 'followUpControl', label: 'kontrola' },
      { key: 'labRaw', label: 'lab' },
      { key: 'radiologyRaw', label: 'RTG/UZV' }
    ];
    const missing = fields
      .filter(field => typeof hasClinicalFieldValue === 'function' ? !hasClinicalFieldValue(parsed, field.key) : !hasParsedValue(parsed[field.key]))
      .map(field => field.label);
    const warnings = [];
    if (parsed.nameValidationWarning) warnings.push(parsed.nameValidationWarning);
    if (parsed.nameOrderWarning) warnings.push(parsed.nameOrderWarning);
    if (parsed.diagnosisWarning) warnings.push(parsed.diagnosisWarning);
    if (parsed.therapyLabWarning) warnings.push(parsed.therapyLabWarning);
    if (parsed.labWithoutMarkerWarning) warnings.push(parsed.labWithoutMarkerWarning);
    if (typeof getUnsafeClinicalSafetySummaries === 'function') {
      const unsafeClinicalFields = getUnsafeClinicalSafetySummaries(parsed);
      if (unsafeClinicalFields.length) {
        warnings.push(`Sigurnosno zaustavljeno automatsko popunjavanje (${unsafeClinicalFields.join('; ')}).`);
      }
    }

    if (missing.length === 0 && warnings.length === 0) {
      return { message: '✓ Svi podaci prepoznati', kind: 'ok' };
    }

    const parts = [];
    if (missing.length) {
      parts.push(`Nije prepoznato: ${missing.join(', ')}.`);
    }
    if (warnings.length) {
      parts.push(`Upozorenje: ${warnings.join(' ')}`);
    }
    return { message: parts.join(' '), kind: 'warn' };
  }

  function defaultTrue(value) {
    return value !== false;
  }

  function getMicrobiologySamplesFromData(data = {}) {
    return MICROBIOLOGY_SAMPLE_DEFS.reduce((samples, item) => {
      samples[item.key] = Boolean(data[item.key]);
      return samples;
    }, {});
  }

  function hasSelectedMicrobiologySamples(data = {}) {
    const samples = getMicrobiologySamplesFromData(data);
    return MICROBIOLOGY_SAMPLE_DEFS.some((item) => Boolean(samples[item.key]));
  }

  function getSelectedMicrobiologyLabels(samples = {}, position = '') {
    return MICROBIOLOGY_SAMPLE_DEFS
      .filter((item) => item.position === position && samples[item.key])
      .map((item) => item.shortLabel);
  }

  function setDisplayTogglesDefaultOn() {
    if (els.showDiagnosisOnList) els.showDiagnosisOnList.checked = true;
    if (els.showAllergiesOnList) els.showAllergiesOnList.checked = true;
    if (els.showPatientOriginOnList) els.showPatientOriginOnList.checked = true;
    if (els.showTherapyOnList) els.showTherapyOnList.checked = true;
    if (els.showOhbpTherapyOnList) els.showOhbpTherapyOnList.checked = true;
    if (els.showVitalSignsOnList) els.showVitalSignsOnList.checked = true;
    if (els.showFollowUpControlOnList) els.showFollowUpControlOnList.checked = true;
    if (els.showLabsOnList) els.showLabsOnList.checked = true;
    if (els.showRadiologyOnList) els.showRadiologyOnList.checked = true;
    updateDisplayToggleUi();
  }

  function updateControlledFieldState(textarea, checkbox) {
    if (!textarea || !checkbox) return;
    const inactive = !checkbox.checked;
    textarea.classList.toggle('inactive-field', inactive);
    textarea.readOnly = inactive;
    textarea.setAttribute('aria-disabled', inactive ? 'true' : 'false');
    if (textarea.id === 'therapy') {
      updateTherapyEditorDisabled();
      updateRememberTherapyAutocompleteButtonState();
    }
    if (textarea.id === 'followUpControl') {
      document.querySelectorAll('[data-followup-lab-option]').forEach((input) => {
        input.disabled = inactive;
      });
    }
    const wrapper = textarea.closest('.collapsible-field');
    const labelRow = wrapper ? wrapper.querySelector('.field-label-row') : textarea.previousElementSibling;
    if (labelRow && labelRow.classList.contains('field-label-row')) {
      labelRow.classList.toggle('is-inactive', inactive);
    }
  }

  function updateDisplayToggleUi() {
    updateControlledFieldState(els.diagnosis, els.showDiagnosisOnList);
    updateControlledFieldState(els.allergies, els.showAllergiesOnList);
    updateControlledFieldState(els.patientOrigin, els.showPatientOriginOnList);
    updateControlledFieldState(els.therapy, els.showTherapyOnList);
    updateControlledFieldState(els.ohbpTherapy, els.showOhbpTherapyOnList);
    updateControlledFieldState(els.vitalSigns, els.showVitalSignsOnList);
    updateControlledFieldState(els.followUpControl, els.showFollowUpControlOnList);
    updateControlledFieldState(els.labRaw, els.showLabsOnList);
    updateControlledFieldState(els.radiologyRaw, els.showRadiologyOnList);
  }

  const FOLLOW_UP_CONTROL_LAB_OPTIONS = Object.freeze([
    'CRP', 'KKS', 'GUK', 'ureja', 'kreatinin', 'Na', 'K', 'Cl', 'bil',
    'AST', 'ALT', 'AP', 'GGT', 'CK', 'LDH', 'Troponin', 'D-dimeri', 'urin'
  ]);
  const FOLLOW_UP_CONTROL_KKS_DISPLAY_LABELS = Object.freeze(['E', 'Hb', 'Trc', 'L']);
  const FOLLOW_UP_CONTROL_SECOND_ROW_OPTIONS = Object.freeze([
    'GUK', 'ureja', 'kreatinin', 'Na', 'K', 'Cl', 'bil',
    'AST', 'ALT', 'AP', 'GGT', 'CK', 'LDH', 'Troponin', 'D-dimeri'
  ]);

  function normalizeFollowUpControlLabLabel(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('hr-HR');
  }

  function getFollowUpControlKnownLabLabelSet() {
    return new Set([
      ...FOLLOW_UP_CONTROL_LAB_OPTIONS,
      ...FOLLOW_UP_CONTROL_KKS_DISPLAY_LABELS
    ].map(normalizeFollowUpControlLabLabel));
  }

  function getFollowUpControlLinesFromValue(value) {
    return String(value || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function getFollowUpControlLabTokensFromLines(lines) {
    return (Array.isArray(lines) ? lines : [])
      .flatMap((line) => line.split(/\s+/))
      .map(normalizeFollowUpControlLabLabel)
      .filter(Boolean);
  }

  function getFollowUpControlLabTokens() {
    return getFollowUpControlLabTokensFromLines(getFollowUpControlLines());
  }

  function isGeneratedFollowUpControlLabLine(line) {
    const knownLabs = getFollowUpControlKnownLabLabelSet();
    const tokens = String(line || '')
      .split(/\s+/)
      .map(normalizeFollowUpControlLabLabel)
      .filter(Boolean);
    return tokens.length > 0 && tokens.every((token) => knownLabs.has(token));
  }

  function buildFollowUpControlLabDisplayLines(selectedOptions) {
    const selected = new Set(selectedOptions);
    const firstRow = [];
    if (selected.has('CRP')) firstRow.push('CRP');
    if (selected.has('KKS')) firstRow.push(...FOLLOW_UP_CONTROL_KKS_DISPLAY_LABELS);
    const secondRow = FOLLOW_UP_CONTROL_SECOND_ROW_OPTIONS.filter((option) => selected.has(option));
    const lines = [];
    if (firstRow.length) lines.push(firstRow.join(' '));
    if (secondRow.length) lines.push(secondRow.join(' '));
    if (selected.has('urin')) lines.push('urin');
    return lines;
  }

  function getFollowUpControlLabInputs() {
    return Array.from(document.querySelectorAll('[data-followup-lab-option]'));
  }

  function getFollowUpControlLines() {
    return getFollowUpControlLinesFromValue(els.followUpControl?.value || '');
  }

  function buildFollowUpControlRenderParts(value) {
    const lines = getFollowUpControlLinesFromValue(value);
    const labLines = lines.filter(isGeneratedFollowUpControlLabLine);
    const labTokens = new Set(getFollowUpControlLabTokensFromLines(labLines));
    const hasKks = labTokens.has(normalizeFollowUpControlLabLabel('KKS')) ||
      FOLLOW_UP_CONTROL_KKS_DISPLAY_LABELS.every((label) => labTokens.has(normalizeFollowUpControlLabLabel(label)));

    const firstBox = [];
    if (labTokens.has(normalizeFollowUpControlLabLabel('CRP'))) firstBox.push('CRP');
    if (hasKks) firstBox.push(...FOLLOW_UP_CONTROL_KKS_DISPLAY_LABELS);

    const secondBox = FOLLOW_UP_CONTROL_SECOND_ROW_OPTIONS
      .filter((option) => labTokens.has(normalizeFollowUpControlLabLabel(option)));
    const urineBox = labTokens.has(normalizeFollowUpControlLabLabel('urin')) ? ['urin'] : [];
    const hasLabBoxes = Boolean(firstBox.length || secondBox.length || urineBox.length);

    const manualLines = lines
      .filter((line) => !isGeneratedFollowUpControlLabLine(line))
      .filter((line) => !(hasLabBoxes && normalizeFollowUpControlLabLabel(line) === 'kontrola'));

    return {
      manualText: manualLines.join('\n'),
      labBoxes: [
        firstBox.join('\n'),
        secondBox.join('\n'),
        urineBox.join('\n'),
        ''
      ]
    };
  }

  function syncFollowUpControlLabPickerFromText() {
    const selected = new Set(getFollowUpControlLabTokens());
    const hasKksDisplay = FOLLOW_UP_CONTROL_KKS_DISPLAY_LABELS
      .every((label) => selected.has(normalizeFollowUpControlLabLabel(label)));
    getFollowUpControlLabInputs().forEach((input) => {
      const normalizedValue = normalizeFollowUpControlLabLabel(input.value);
      input.checked = normalizedValue === normalizeFollowUpControlLabLabel('KKS')
        ? selected.has(normalizedValue) || hasKksDisplay
        : selected.has(normalizedValue);
    });
  }

  function updateFollowUpControlFromLabPicker() {
    if (!els.followUpControl) return;
    const manualLines = getFollowUpControlLines()
      .filter((line) => !isGeneratedFollowUpControlLabLine(line));
    const selectedOptions = getFollowUpControlLabInputs()
      .filter((input) => input.checked)
      .map((input) => input.value);
    const labLines = buildFollowUpControlLabDisplayLines(selectedOptions);
    const nextValue = [...manualLines, ...labLines].join('\n');
    if (els.followUpControl.value !== nextValue) {
      els.followUpControl.value = nextValue;
      els.followUpControl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    setCollapsibleTextFieldExpanded('followUpControl', Boolean(nextValue.trim() || String(els.followUpControlDate?.value || '').trim()));
  }

  function wireFollowUpControlLabPicker() {
    const inputs = getFollowUpControlLabInputs();
    if (!inputs.length || !els.followUpControl) return;
    inputs.forEach((input) => {
      input.addEventListener('change', updateFollowUpControlFromLabPicker);
    });
    els.followUpControl.addEventListener('input', syncFollowUpControlLabPickerFromText);
    syncFollowUpControlLabPickerFromText();
  }

  const COLLAPSIBLE_TEXT_FIELD_IDS = ['diagnosis', 'allergies', 'patientOrigin', 'therapy', 'ohbpTherapy', 'vitalSigns', 'followUpControl', 'labRaw', 'radiologyRaw'];

  function setCollapsibleTextFieldExpanded(fieldId, expanded) {
    const section = document.querySelector(`[data-collapsible-field="${fieldId}"]`);
    const button = document.querySelector(`[data-collapsible-target="${fieldId}"]`);
    if (!section || !button) return;
    section.classList.toggle('is-expanded', Boolean(expanded));
    section.classList.toggle('is-collapsed', !expanded);
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    button.title = expanded ? 'Skupi tekstni okvir' : 'Prikaži tekstni okvir';
    const arrow = button.querySelector('.collapsible-arrow');
    if (arrow) arrow.textContent = expanded ? '▴' : '▾';
    const editButton = document.querySelector(`[data-collapsible-edit-target="${fieldId}"]`);
    if (editButton) {
      editButton.textContent = expanded ? 'Skupi' : 'Uredi';
      editButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      editButton.title = expanded ? 'Skupi tekstni okvir' : 'Otvori tekstni okvir za uređivanje';
    }
    if (typeof applyWorkflowTabOrder === 'function') applyWorkflowTabOrder();
    if (expanded && typeof scheduleAutoResizeTextarea === 'function') scheduleAutoResizeTextarea(document.getElementById(fieldId));
  }

  function expandDefaultTextFields(data = {}) {
    // Osnovna klinička polja ostaju otvorena; rjeđa polja otvaraju se tek ako imaju sadržaj ili ih korisnik ručno otvori.
    ['diagnosis', 'allergies', 'patientOrigin', 'therapy'].forEach((fieldId) => setCollapsibleTextFieldExpanded(fieldId, true));
    setCollapsibleTextFieldExpanded('ohbpTherapy', Boolean(String(data.ohbpTherapy || '').trim()));
    setCollapsibleTextFieldExpanded('vitalSigns', Boolean(String(data.vitalSigns || '').trim()));
    setCollapsibleTextFieldExpanded('followUpControl', Boolean(String(data.followUpControl || '').trim() || String(data.followUpControlDate || '').trim()));
    setCollapsibleTextFieldExpanded('microbiologySamples', hasSelectedMicrobiologySamples(data));
    setCollapsibleTextFieldExpanded('labRaw', Boolean(String(data.labRaw || '').trim()));
    setCollapsibleTextFieldExpanded('radiologyRaw', Boolean(String(data.radiologyRaw || '').trim()));
  }

  function wireCollapsibleTextFields() {
    document.querySelectorAll('[data-collapsible-target]').forEach((button) => {
      button.addEventListener('click', () => {
        const fieldId = button.dataset.collapsibleTarget;
        const isExpanded = button.getAttribute('aria-expanded') === 'true';
        setCollapsibleTextFieldExpanded(fieldId, !isExpanded);
      });
    });
    document.querySelectorAll('[data-collapsible-edit-target]').forEach((button) => {
      button.addEventListener('click', () => {
        const fieldId = button.dataset.collapsibleEditTarget;
        const toggle = document.querySelector(`[data-collapsible-target="${fieldId}"]`);
        const isExpanded = toggle?.getAttribute('aria-expanded') === 'true';
        setCollapsibleTextFieldExpanded(fieldId, !isExpanded);
        const field = document.getElementById(fieldId);
        if (!isExpanded && field) {
          field.focus({ preventScroll: true });
          activateFocusedTextBox(field);
        }
      });
    });
  }

  function normalizeAdmissionDateInput(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (isValidIsoDateOnly(raw)) return raw;
    return parseCroatianDateToIso(raw);
  }

  function formatIsoDateToCroatian(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (!isValidIsoDateOnly(raw)) return raw;
    const [year, month, day] = raw.split('-');
    return `${day}.${month}.${year}.`;
  }

  function updateAdmissionDateInputValidity() {
    if (!els.admissionDate) return true;
    const raw = els.admissionDate.value.trim();
    const valid = !raw || Boolean(normalizeAdmissionDateInput(raw));
    els.admissionDate.setCustomValidity(valid ? '' : 'Upiši datum u formatu dd.mm.gggg., npr. 13.05.2026.');
    els.admissionDate.classList.toggle('invalid', !valid);
    return valid;
  }

  function normalizeAdmissionDateFieldForDisplay() {
    if (!els.admissionDate) return;
    const iso = normalizeAdmissionDateInput(els.admissionDate.value);
    if (iso) els.admissionDate.value = formatIsoDateToCroatian(iso);
    updateAdmissionDateInputValidity();
    syncDatePickerFromText(els.admissionDate, els.admissionDatePicker);
  }

  function syncDatePickerFromText(textInput, pickerInput) {
    if (!textInput || !pickerInput) return;
    const iso = normalizeAdmissionDateInput(textInput.value || '');
    pickerInput.value = isValidIsoDateOnly(iso) ? iso : '';
  }

  function syncDatePickersFromText() {
    syncDatePickerFromText(els.admissionDate, els.admissionDatePicker);
    syncDatePickerFromText(els.followUpControlDate, els.followUpControlDatePicker);
  }

  function applyDatePickerSelection(textInput, pickerInput) {
    if (!textInput || !pickerInput) return;
    const iso = pickerInput.value || '';
    textInput.value = isValidIsoDateOnly(iso) ? formatIsoDateToCroatian(iso) : '';
    if (textInput === els.admissionDate) updateAdmissionDateInputValidity();
    textInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function wireDatePicker(textInput, pickerInput) {
    if (!textInput || !pickerInput) return;
    const sync = () => syncDatePickerFromText(textInput, pickerInput);
    textInput.addEventListener('input', sync);
    textInput.addEventListener('blur', sync);
    pickerInput.addEventListener('focus', sync);
    pickerInput.addEventListener('pointerdown', sync);
    pickerInput.addEventListener('input', () => applyDatePickerSelection(textInput, pickerInput));
    pickerInput.addEventListener('change', () => applyDatePickerSelection(textInput, pickerInput));
  }

  function normalizePatientMode(value) {
    const mode = String(value || '').trim().toLowerCase();
    return mode === PATIENT_MODES.OUTPATIENT ? PATIENT_MODES.OUTPATIENT : PATIENT_MODES.WARD;
  }

  function getCurrentPatientMode() {
    return normalizePatientMode(state.patientMode);
  }

  function getPatientModeLabel(mode) {
    return PATIENT_MODE_LABELS[normalizePatientMode(mode)] || PATIENT_MODE_LABELS[DEFAULT_PATIENT_MODE];
  }

  function isOutpatientMode(mode = getCurrentPatientMode()) {
    return normalizePatientMode(mode) === PATIENT_MODES.OUTPATIENT;
  }

  function getPatientModeFromData(data = {}) {
    return normalizePatientMode(data.patientMode);
  }

  function setModeButtonState(button, isActive) {
    if (!button) return;
    button.classList.toggle('is-active', Boolean(isActive));
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  }

  function syncFirebasePatientDialogModeUi() {
    const mode = normalizePatientMode(state.firebasePatients.dialogMode || getCurrentPatientMode());
    setModeButtonState(els.firebasePatientDialogOutpatientModeBtn, mode === PATIENT_MODES.OUTPATIENT);
    setModeButtonState(els.firebasePatientDialogWardModeBtn, mode === PATIENT_MODES.WARD);
  }

  function syncPatientModeUi() {
    const mode = getCurrentPatientMode();
    setModeButtonState(els.patientModeOutpatientBtn, mode === PATIENT_MODES.OUTPATIENT);
    setModeButtonState(els.patientModeWardBtn, mode === PATIENT_MODES.WARD);
    document.body.classList.toggle('patient-mode-outpatient', mode === PATIENT_MODES.OUTPATIENT);
    document.body.classList.toggle('patient-mode-ward', mode === PATIENT_MODES.WARD);
    if (typeof applyWorkflowTabOrder === 'function') applyWorkflowTabOrder();
    if (typeof scheduleAutoResizeTextareas === 'function') scheduleAutoResizeTextareas();
    syncFirebasePatientDialogModeUi();
    if (typeof renderFirebaseUserPanel === 'function') renderFirebaseUserPanel();
  }

  function applyPatientMode(mode, options = {}) {
    state.patientMode = normalizePatientMode(mode);
    if (options.syncDialog !== false) {
      state.firebasePatients.dialogMode = state.patientMode;
    }
    syncPatientModeUi();
    if (options.renderLists !== false && typeof renderFirebasePatientList === 'function') {
      renderFirebasePatientList(options.preferredId || state.firebasePatients.currentRecordId || '');
    }
  }

  function changePatientMode(mode, options = {}) {
    const nextMode = normalizePatientMode(mode);
    const currentMode = getCurrentPatientMode();
    if (nextMode === currentMode) {
      syncPatientModeUi();
      return true;
    }

    const hasPatientData = isPatientDataDifferentFromEmpty(getFormData());
    if (!options.skipConfirm && hasPatientData) {
      const target = nextMode === PATIENT_MODES.WARD ? 'odjelnog' : 'ambulantnog';
      const confirmed = window.confirm(`Zelite li ovog pacijenta pretvoriti u ${target} pacijenta?`);
      if (!confirmed) {
        syncPatientModeUi();
        return false;
      }
    }

    applyPatientMode(nextMode);
    renderAll();
    schedulePatientDraftSave();
    scheduleFirebasePatientAutoSave({ force: true });
    setStatus(`Aktivan je mod: ${getPatientModeLabel(nextMode)}.`);
    return true;
  }

  function getFirebasePatientDialogMode() {
    return normalizePatientMode(state.firebasePatients.dialogMode || getCurrentPatientMode());
  }

  function setFirebasePatientDialogMode(mode, options = {}) {
    state.firebasePatients.dialogMode = normalizePatientMode(mode);
    syncFirebasePatientDialogModeUi();
    if (options.render !== false) renderFirebasePatientDialogList();
    updateFirebasePatientControls();
  }

  function getFormData() {
    return {
      patientMode: getCurrentPatientMode(),
      fullName: els.fullName.value.trim(),
      birthYear: els.birthYear.value.trim(),
      diagnosis: normalizeLineBreaks(els.diagnosis.value),
      allergies: normalizeLineBreaks(els.allergies?.value || ''),
      patientOrigin: normalizeLineBreaks(els.patientOrigin?.value || ''),
      therapy: normalizeLineBreaks(els.therapy.value),
      ohbpTherapy: normalizeLineBreaks(els.ohbpTherapy.value),
      vitalSigns: normalizeLineBreaks(els.vitalSigns?.value || ''),
      followUpControlDate: normalizeAdmissionDateInput(els.followUpControlDate?.value || ''),
      followUpControl: normalizeLineBreaks(els.followUpControl?.value || ''),
      microHemocultures: Boolean(els.microHemocultures?.checked),
      microUrineCulture: Boolean(els.microUrineCulture?.checked),
      microStoolBacteriology: Boolean(els.microStoolBacteriology?.checked),
      microStoolCdiff: Boolean(els.microStoolCdiff?.checked),
      microStoolVirology: Boolean(els.microStoolVirology?.checked),
      labRaw: normalizeLineBreaks(els.labRaw.value),
      radiologyRaw: normalizeLineBreaks(els.radiologyRaw.value),
      admissionDate: normalizeAdmissionDateInput(els.admissionDate.value),
      showTherapyMonday2: els.showTherapyMonday2.checked,
      showDiagnosisOnList: els.showDiagnosisOnList ? els.showDiagnosisOnList.checked : true,
      showAllergiesOnList: els.showAllergiesOnList ? els.showAllergiesOnList.checked : true,
      showPatientOriginOnList: els.showPatientOriginOnList ? els.showPatientOriginOnList.checked : true,
      showTherapyOnList: els.showTherapyOnList ? els.showTherapyOnList.checked : true,
      showOhbpTherapyOnList: els.showOhbpTherapyOnList ? els.showOhbpTherapyOnList.checked : true,
      showVitalSignsOnList: els.showVitalSignsOnList ? els.showVitalSignsOnList.checked : true,
      showFollowUpControlOnList: els.showFollowUpControlOnList ? els.showFollowUpControlOnList.checked : true,
      showLabsOnList: els.showLabsOnList ? els.showLabsOnList.checked : true,
      showRadiologyOnList: els.showRadiologyOnList ? els.showRadiologyOnList.checked : true
    };
  }

  function getEmptyPatientData() {
    return {
      patientMode: getCurrentPatientMode(),
      fullName: '',
      birthYear: '',
      diagnosis: '',
      allergies: '',
      patientOrigin: '',
      therapy: '',
      ohbpTherapy: '',
      vitalSigns: '',
      followUpControlDate: '',
      followUpControl: '',
      microHemocultures: false,
      microUrineCulture: false,
      microStoolBacteriology: false,
      microStoolCdiff: false,
      microStoolVirology: false,
      labRaw: '',
      radiologyRaw: '',
      admissionDate: '',
      showTherapyMonday2: false,
      showDiagnosisOnList: true,
      showAllergiesOnList: true,
      showPatientOriginOnList: true,
      showTherapyOnList: true,
      showOhbpTherapyOnList: true,
      showVitalSignsOnList: true,
      showFollowUpControlOnList: true,
      showLabsOnList: true,
      showRadiologyOnList: true
    };
  }

  function isPatientDataDifferentFromEmpty(data = {}) {
    const empty = getEmptyPatientData();
    return Object.keys(empty).some((key) => key !== 'patientMode' && data[key] !== empty[key]);
  }

  const MISSING_PATIENT_NAME_SAVE_MESSAGE = 'Pacijent neće biti spremljen jer nema imena.';

  function hasPatientFullName(data = {}) {
    return Boolean(String(data?.fullName || '').replace(/\s+/g, ' ').trim());
  }

  function shouldWarnAboutUnnamedPatient(data = getFormData()) {
    return isPatientDataDifferentFromEmpty(data) && !hasPatientFullName(data);
  }

  function getUnnamedPatientNewEntryMessage() {
    return `${MISSING_PATIENT_NAME_SAVE_MESSAGE}\n\nOtvoriti novi unos i obrisati podatke iz obrasca?`;
  }

  function setFormData(data = {}) {
    applyPatientMode(getPatientModeFromData(data), { renderLists: false });
    els.fullName.value = data.fullName || '';
    els.birthYear.value = data.birthYear || '';
    els.diagnosis.value = data.diagnosis || '';
    if (els.allergies) els.allergies.value = data.allergies || '';
    if (els.patientOrigin) els.patientOrigin.value = data.patientOrigin || '';
    els.therapy.value = data.therapy || '';
    els.ohbpTherapy.value = data.ohbpTherapy || '';
    if (els.vitalSigns) els.vitalSigns.value = data.vitalSigns || '';
    if (els.followUpControlDate) els.followUpControlDate.value = formatIsoDateToCroatian(data.followUpControlDate || '');
    if (els.followUpControl) els.followUpControl.value = data.followUpControl || '';
    syncFollowUpControlLabPickerFromText();
    if (els.microHemocultures) els.microHemocultures.checked = Boolean(data.microHemocultures);
    if (els.microUrineCulture) els.microUrineCulture.checked = Boolean(data.microUrineCulture);
    if (els.microStoolBacteriology) els.microStoolBacteriology.checked = Boolean(data.microStoolBacteriology);
    if (els.microStoolCdiff) els.microStoolCdiff.checked = Boolean(data.microStoolCdiff);
    if (els.microStoolVirology) els.microStoolVirology.checked = Boolean(data.microStoolVirology);
    els.labRaw.value = data.labRaw || '';
    els.radiologyRaw.value = data.radiologyRaw || '';
    els.admissionDate.value = formatIsoDateToCroatian(data.admissionDate || '');
    updateAdmissionDateInputValidity();
    syncDatePickersFromText();
    els.showTherapyMonday2.checked = Boolean(data.showTherapyMonday2);
    syncTherapyEditorFromTextarea();
    setDisplayTogglesDefaultOn();
    if (els.showDiagnosisOnList) els.showDiagnosisOnList.checked = defaultTrue(data.showDiagnosisOnList);
    if (els.showAllergiesOnList) els.showAllergiesOnList.checked = defaultTrue(data.showAllergiesOnList);
    if (els.showPatientOriginOnList) els.showPatientOriginOnList.checked = defaultTrue(data.showPatientOriginOnList);
    if (els.showTherapyOnList) els.showTherapyOnList.checked = defaultTrue(data.showTherapyOnList);
    if (els.showOhbpTherapyOnList) els.showOhbpTherapyOnList.checked = defaultTrue(data.showOhbpTherapyOnList);
    if (els.showVitalSignsOnList) els.showVitalSignsOnList.checked = defaultTrue(data.showVitalSignsOnList);
    if (els.showFollowUpControlOnList) els.showFollowUpControlOnList.checked = defaultTrue(data.showFollowUpControlOnList);
    if (els.showLabsOnList) els.showLabsOnList.checked = defaultTrue(data.showLabsOnList);
    if (els.showRadiologyOnList) els.showRadiologyOnList.checked = defaultTrue(data.showRadiologyOnList);
    updateDisplayToggleUi();
    expandDefaultTextFields(data);
    scheduleAutoResizeTextareas();
  }

  function splitClinicalLines(value) {
    return normalizeLineBreaks(value || '')
      .split('\n')
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  function makeClinicalItemId(prefix, index) {
    return `${prefix}-${String(index + 1).padStart(3, '0')}`;
  }

  function normalizeClinicalText(value, maxLength = 4000) {
    return normalizeLineBreaks(value || '').trim().slice(0, maxLength);
  }

  const ANTIMICROBIAL_KEYWORDS = Object.freeze([
    'amoksicilin',
    'amoksicilin/klavulanska',
    'klavulanska',
    'ceftriakson',
    'cefuroksim',
    'ciprofloksacin',
    'levofloksacin',
    'metronidazol',
    'piperacilin',
    'tazobaktam',
    'meropenem',
    'vankomicin',
    'linezolid',
    'azitromicin',
    'doksiciklin',
    'kotrimoksazol'
  ]);

  const RENAL_ADJUSTMENT_KEYWORDS = Object.freeze([
    'metformin',
    'vankomicin',
    'gentamicin',
    'amikacin',
    'meropenem',
    'piperacilin',
    'tazobaktam',
    'levofloksacin',
    'ciprofloksacin',
    'kotrimoksazol',
    'apiksaban',
    'rivaroksaban',
    'dabigatran',
    'enoksaparin'
  ]);

  function normalizedMedicationName(line) {
    return String(line || '')
      .replace(THERAPY_BULLET_PREFIX_RE, '')
      .replace(/\b\d+(?:[,.]\d+)?\s*(?:mg|g|mcg|ug|µg|ml|mmol|ij|iu|%)\b.*$/i, '')
      .replace(/\b\d\s*[,./]\s*\d\s*[,./]\s*\d.*$/i, '')
      .replace(/\b\d+\s*x\s*\d.*$/i, '')
      .replace(/\b(?:tbl|tabl|kaps|amp|inj|inh|sir|gtt|i\.?\s*v\.?|p\.?\s*o\.?|s\.?\s*c\.?)\b.*$/i, '')
      .replace(/[^\p{L}\p{N}/+-]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function medicationHasKeyword(line, keywords) {
    const text = therapyNormalizeText(line || '');
    return (keywords || []).some(keyword => text.includes(therapyNormalizeText(keyword)));
  }

  function extractMedicationRoute(line) {
    const text = String(line || '');
    if (/\bi\.?\s*v\.?\b/i.test(text)) return 'i.v.';
    if (/\bp\.?\s*o\.?\b|\bper os\b|\boralno\b/i.test(text)) return 'p.o.';
    if (/\bs\.?\s*c\.?\b/i.test(text)) return 's.c.';
    if (/\bi\.?\s*m\.?\b/i.test(text)) return 'i.m.';
    if (/\binh\.?|\binhal/i.test(text)) return 'inh.';
    return '';
  }

  function extractMedicationSchedule(line) {
    const text = String(line || '');
    const commaScheme = text.match(/\b\d\s*[,./]\s*\d\s*[,./]\s*\d(?:\s*[,./]\s*\d)?\s*(?:tbl|kaps|amp|inj|inh|gtt)?\b/i);
    if (commaScheme) return commaScheme[0].replace(/\s+/g, ' ').trim();
    const timesScheme = text.match(/\b\d+\s*x\s*\d+(?:[,.]\d+)?\s*(?:mg|g|mcg|ug|µg|ml|tbl|kaps|amp|inj|inh|gtt)?\b/i);
    return timesScheme ? timesScheme[0].replace(/\s+/g, ' ').trim() : '';
  }

  function parseMedicationLine(line, index, sourceText = 'therapy') {
    const clean = normalizeClinicalText(line, 500);
    const name = normalizedMedicationName(clean) || clean.split(/\s+/).slice(0, 3).join(' ');
    const doseMatch = clean.match(/\b\d+(?:[,.]\d+)?\s*(mg|g|mcg|ug|µg|ml|mmol|ij|iu|%)\b/i);
    return {
      id: makeClinicalItemId(sourceText === 'ohbpTherapy' ? 'ohbp-med' : 'med', index),
      name,
      route: extractMedicationRoute(clean),
      dose: doseMatch ? doseMatch[0].replace(/\s+/g, ' ').trim() : '',
      doseUnit: doseMatch ? doseMatch[1] : '',
      frequency: '',
      scheduleText: extractMedicationSchedule(clean),
      startDate: '',
      stopDate: '',
      indication: '',
      isAntimicrobial: medicationHasKeyword(clean, ANTIMICROBIAL_KEYWORDS),
      renalAdjustmentRequired: medicationHasKeyword(clean, RENAL_ADJUSTMENT_KEYWORDS),
      sourceText: clean,
      note: sourceText === 'ohbpTherapy' ? 'Terapija unesena u OHBP polje.' : ''
    };
  }

  function parseAllergiesFromText(text) {
    const clean = normalizeClinicalText(text, 2000);
    if (!clean) return [];
    return splitClinicalLines(clean)
      .flatMap(line => line.split(/[;,]/).map(item => item.trim()).filter(Boolean))
      .map((substance, index) => ({
        id: makeClinicalItemId('allergy', index),
        substance,
        reaction: '',
        severity: '',
        certainty: '',
        status: /^(?:nema|negira|bez)$/i.test(substance) ? 'negated' : 'active',
        note: ''
      }));
  }

  function parseConditionsFromText(text) {
    return splitClinicalLines(text).map((line, index) => ({
      id: makeClinicalItemId('condition', index),
      type: 'working',
      text: line,
      codeSystem: '',
      code: '',
      onsetDate: '',
      status: 'active',
      note: ''
    }));
  }

  function parseVitalSignsFromText(text) {
    const clean = normalizeClinicalText(text, 2000);
    if (!clean) return [];
    const number = pattern => {
      const match = clean.match(pattern);
      if (!match) return null;
      const value = Number(String(match[1] || '').replace(',', '.'));
      return Number.isFinite(value) ? value : null;
    };
    const bp = clean.match(/\b(?:RR|TA)\s*[:=]?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i);
    const vital = {
      id: 'vital-001',
      measuredAt: '',
      temperatureC: number(/\b(?:T|Tax|temp(?:eratura)?)\s*[:=]?\s*(\d{2}(?:[,.]\d)?)/i),
      systolicBpMmHg: bp ? Number(bp[1]) : null,
      diastolicBpMmHg: bp ? Number(bp[2]) : null,
      heartRatePerMin: number(/\b(?:cp|puls|HR)\s*[:=]?\s*(\d{2,3})/i),
      respiratoryRatePerMin: number(/\b(?:resp|RRf)\s*[:=]?\s*(\d{1,3})/i),
      spo2Percent: number(/\b(?:SpO2|sat(?:uracija)?)\s*[:=]?\s*(\d{2,3})\s*%?/i),
      oxygenTherapy: (clean.match(/\b(?:O2|kisik)\s*[:=]?\s*([^,;\n]+)/i) || [])[1] || '',
      painScore: null,
      note: clean
    };
    return Object.values(vital).some(value => value !== null && value !== '' && value !== 'vital-001') ? [vital] : [];
  }

  function parseLabsFromText(text) {
    const clean = normalizeClinicalText(text, 12000);
    if (!clean) return [];
    const matches = [];
    const tokenRe = /\b([A-Za-zČĆŽŠĐčćžšđ-]{1,18})\s*[:=]?\s*([<>]?\s*\d+(?:[,.]\d+)?)\s*([A-Za-z/%µμ0-9.,-]*)/gu;
    let match;
    while ((match = tokenRe.exec(clean)) !== null && matches.length < 120) {
      const analyte = match[1].trim();
      if (/^(?:od|do|na|uz|po|bez|dana|god|prije)$/i.test(analyte)) continue;
      matches.push({
        id: makeClinicalItemId('lab', matches.length),
        collectedAt: '',
        panel: '',
        analyte,
        value: match[2].replace(/\s+/g, ''),
        unit: match[3] || '',
        referenceRange: '',
        abnormalFlag: '',
        sourceText: match[0].replace(/\s+/g, ' ').trim(),
        note: ''
      });
    }
    return matches;
  }

  function buildMicrobiologyItemsFromData(data = {}) {
    const items = [
      ['microHemocultures', 'hemokulture'],
      ['microUrineCulture', 'urinokultura'],
      ['microStoolBacteriology', 'stolica bakteriološki'],
      ['microStoolCdiff', 'stolica C. difficile'],
      ['microStoolVirology', 'stolica virusološki']
    ];
    return items
      .filter(([key]) => Boolean(data[key]))
      .map(([, specimen], index) => ({
        id: makeClinicalItemId('micro', index),
        collectedAt: '',
        specimen,
        testType: '',
        organism: '',
        resultText: '',
        susceptibility: '',
        finalStatus: 'planned',
        sourceText: specimen,
        note: ''
      }));
  }

  function patientDataToClinicalRecordV1(data = {}, options = {}) {
    const authContext = options.authContext || getFirebaseAuthContext?.() || {};
    const nowIso = options.nowIso || new Date().toISOString();
    const patientMode = getPatientModeFromData(data);
    const therapyMeds = splitClinicalLines(data.therapy).map((line, index) => parseMedicationLine(line, index, 'therapy'));
    const ohbpMeds = splitClinicalLines(data.ohbpTherapy).map((line, index) => parseMedicationLine(line, therapyMeds.length + index, 'ohbpTherapy'));
    return {
      schema: CLINICAL_RECORD_SCHEMA,
      patient: {
        fullName: normalizeClinicalText(data.fullName, 200),
        birthYear: normalizeClinicalText(data.birthYear, 4),
        sex: '',
        patientIdentifiers: []
      },
      encounter: {
        admissionDate: normalizeClinicalText(data.admissionDate, 10),
        admissionTime: '',
        source: normalizeClinicalText(data.patientOrigin, 300),
        wardId: authContext.activeWardId || '',
        room: '',
        bed: '',
        attendingPhysician: '',
        dayOfHospitalization: '',
        patientMode
      },
      conditions: parseConditionsFromText(data.diagnosis),
      allergies: parseAllergiesFromText(data.allergies),
      medications: [...therapyMeds, ...ohbpMeds],
      vitalSigns: parseVitalSignsFromText(data.vitalSigns),
      labs: parseLabsFromText(data.labRaw),
      microbiology: buildMicrobiologyItemsFromData(data),
      infectionControl: {
        isolationType: '',
        indication: '',
        startDate: '',
        endDate: '',
        note: ''
      },
      freeText: {
        originalDiagnosisText: normalizeClinicalText(data.diagnosis, 4000),
        originalTherapyText: normalizeClinicalText(data.therapy, 6000),
        originalLabText: normalizeClinicalText(data.labRaw, 12000),
        originalMicrobiologyText: buildMicrobiologyItemsFromData(data).map(item => item.sourceText).join('\n')
      },
      metadata: {
        appVersion: APP_VERSION,
        createdAt: options.createdAt || nowIso,
        updatedAt: nowIso,
        source: options.source || 'form',
        parserVersion: APP_VERSION
      }
    };
  }

  function makeValidationIssue(severity, field, message, metadata = {}) {
    return { severity, field, message, metadata };
  }

  function validateEncounter(encounter = {}) {
    const issues = [];
    if (encounter.admissionDate && !isValidIsoDateOnly(encounter.admissionDate)) {
      issues.push(makeValidationIssue('warning', 'encounter.admissionDate', 'Datum prijema nije valjan ISO datum.'));
    }
    const admissionMs = Date.parse(encounter.admissionDate || '');
    if (Number.isFinite(admissionMs) && admissionMs > Date.now() + 24 * 60 * 60 * 1000) {
      issues.push(makeValidationIssue('warning', 'encounter.admissionDate', 'Datum prijema je u budućnosti.'));
    }
    return issues;
  }

  function validateVitalSigns(vitalSigns = []) {
    const issues = [];
    (vitalSigns || []).forEach((vital, index) => {
      if (vital.temperatureC != null && (vital.temperatureC < 30 || vital.temperatureC > 45)) {
        issues.push(makeValidationIssue('critical', `vitalSigns[${index}].temperatureC`, 'Temperatura je izvan fiziološkog raspona.'));
      }
      if (vital.heartRatePerMin != null && (vital.heartRatePerMin < 20 || vital.heartRatePerMin > 250)) {
        issues.push(makeValidationIssue('critical', `vitalSigns[${index}].heartRatePerMin`, 'Puls je izvan očekivanog raspona.'));
      }
      if (vital.spo2Percent != null && (vital.spo2Percent < 50 || vital.spo2Percent > 100)) {
        issues.push(makeValidationIssue('critical', `vitalSigns[${index}].spo2Percent`, 'SpO2 je izvan mogućeg raspona.'));
      }
      if (vital.systolicBpMmHg != null && vital.diastolicBpMmHg != null && vital.systolicBpMmHg <= vital.diastolicBpMmHg) {
        issues.push(makeValidationIssue('warning', `vitalSigns[${index}]`, 'Sistolički tlak je manji ili jednak dijastoličkom.'));
      }
    });
    return issues;
  }

  function validateMedications(medications = []) {
    const issues = [];
    const seen = new Map();
    (medications || []).forEach((med, index) => {
      const key = therapyNormalizeText(med.name || med.sourceText || '');
      if (key) {
        if (seen.has(key)) {
          issues.push(makeValidationIssue('warning', `medications[${index}]`, `Mogući duplikat terapije: ${med.name}.`, { firstIndex: seen.get(key) }));
        } else {
          seen.set(key, index);
        }
      }
      if (med.sourceText && !med.dose) {
        issues.push(makeValidationIssue('info', `medications[${index}].dose`, `Redak terapije nema prepoznatu dozu: ${med.sourceText}.`));
      }
      if (med.sourceText && !med.route) {
        issues.push(makeValidationIssue('info', `medications[${index}].route`, `Redak terapije nema prepoznat put primjene: ${med.sourceText}.`));
      }
    });
    return issues;
  }

  function validateAllergies(allergies = []) {
    return (allergies || [])
      .filter(item => item.status !== 'negated' && !item.substance)
      .map((_, index) => makeValidationIssue('warning', `allergies[${index}]`, 'Alergija nema navedenu tvar.'));
  }

  function validateLabs(labs = []) {
    const issues = [];
    (labs || []).forEach((lab, index) => {
      const value = Number(String(lab.value || '').replace(/[<>]/g, '').replace(',', '.'));
      if (Number.isFinite(value) && value < 0) {
        issues.push(makeValidationIssue('warning', `labs[${index}]`, `Laboratorijska vrijednost za ${lab.analyte} je negativna.`));
      }
    });
    return issues;
  }

  function validateMicrobiology(microbiology = []) {
    return (microbiology || []).filter(item => !item.specimen).map((_, index) =>
      makeValidationIssue('info', `microbiology[${index}]`, 'Mikrobiološki zapis nema uzorak.'));
  }

  function validateClinicalRecord(record = {}) {
    const issues = [
      ...validateEncounter(record.encounter || {}),
      ...validateVitalSigns(record.vitalSigns || []),
      ...validateMedications(record.medications || []),
      ...validateAllergies(record.allergies || []),
      ...validateLabs(record.labs || []),
      ...validateMicrobiology(record.microbiology || [])
    ];
    const issueCounts = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {});
    return { ok: !issues.some(issue => issue.severity === 'critical'), issues, issueCounts };
  }

  function getLatestEgfrFromRecord(record = {}) {
    const labs = Array.isArray(record.labs) ? record.labs : [];
    for (let index = labs.length - 1; index >= 0; index -= 1) {
      const lab = labs[index];
      const key = therapyNormalizeText(`${lab.analyte || ''} ${lab.sourceText || ''}`);
      if (!/\begfr\b|ckd-epi|epi\b/.test(key)) continue;
      const value = Number(String(lab.value || '').replace(/[<>]/g, '').replace(',', '.'));
      if (Number.isFinite(value)) return value;
    }
    return null;
  }

  function runMedicationSafetyChecks(record = patientDataToClinicalRecordV1(getFormData())) {
    const issues = [];
    const medications = Array.isArray(record.medications) ? record.medications : [];
    const allergies = (record.allergies || []).filter(item => item.status !== 'negated').map(item => therapyNormalizeText(item.substance || ''));
    const conditionText = (record.conditions || []).map(item => item.text || '').join(' ').trim();
    const egfr = getLatestEgfrFromRecord(record);
    const seen = new Map();

    medications.forEach((med, index) => {
      const nameKey = therapyNormalizeText(med.name || med.sourceText || '');
      if (nameKey) {
        if (seen.has(nameKey)) {
          issues.push(makeValidationIssue('warning', `medications[${index}]`, `Mogući duplikat lijeka: ${med.name}.`, { type: 'duplicate', firstIndex: seen.get(nameKey) }));
        } else {
          seen.set(nameKey, index);
        }
      }
      allergies.forEach((allergy) => {
        if (allergy && nameKey && (nameKey.includes(allergy) || allergy.includes(nameKey))) {
          issues.push(makeValidationIssue('critical', `medications[${index}]`, `Terapija se tekstualno poklapa s alergijom: ${med.name}.`, { type: 'allergy-match' }));
        }
      });
      if (med.isAntimicrobial && !conditionText) {
        issues.push(makeValidationIssue('warning', `medications[${index}]`, `Antimikrobni lijek bez navedene indikacije u dijagnozi: ${med.name}.`, { type: 'ams-indication' }));
      }
      if (med.isAntimicrobial && !/\b(?:do|dana|trajanje|review|kontrola|stop)\b/i.test(med.sourceText || '')) {
        issues.push(makeValidationIssue('warning', `medications[${index}]`, `Antimikrobni lijek nema planirano trajanje ili review datum: ${med.name}.`, { type: 'ams-review' }));
      }
      if (egfr != null && egfr < 60 && med.renalAdjustmentRequired) {
        issues.push(makeValidationIssue('warning', `medications[${index}]`, `Provjeriti dozu zbog bubrežne funkcije: ${med.name}.`, { type: 'renal', egfr }));
      }
      if (med.sourceText && (!med.dose || !med.route)) {
        issues.push(makeValidationIssue('info', `medications[${index}]`, `Redak terapije nema jasno prepoznatu dozu ili put primjene: ${med.sourceText}.`, { type: 'structure' }));
      }
    });

    return { ok: !issues.some(issue => issue.severity === 'critical'), issues };
  }

  function renderMedicationSafetyChecks(result = runMedicationSafetyChecks()) {
    if (!els.medicationSafetySummary || !els.medicationSafetyDetails) return;
    const issues = Array.isArray(result.issues) ? result.issues : [];
    const warnings = issues.filter(issue => issue.severity === 'warning').length;
    const critical = issues.filter(issue => issue.severity === 'critical').length;
    const info = issues.filter(issue => issue.severity === 'info').length;
    els.medicationSafetySummary.textContent = issues.length
      ? `${critical ? `${critical} kritično, ` : ''}${warnings} upozorenja, ${info} info napomena terapijske provjere.`
      : 'Nema upozorenja osnovne terapijske provjere.';
    els.medicationSafetyDetails.innerHTML = issues.slice(0, 8).map(issue => {
      const severityClass = safeHtmlClassToken(issue.severity, 'note');
      return `<div class="therapy-validation-result ${severityClass}"><div class="therapy-validation-result-header"><span>${therapyEscapeHtml(issue.severity.toUpperCase())}</span><span>${therapyEscapeHtml(issue.field)}</span></div><div class="therapy-validation-result-message">${therapyEscapeHtml(issue.message)}</div></div>`;
    }).join('');
  }

  function getMedicationAutocompleteSuggestions(input) {
    return getTherapyAutocompleteSuggestions(input);
  }

  function insertMedicationSuggestion(suggestion) {
    if (!suggestion || !els.therapy) return false;
    const line = typeof suggestion === 'string' ? suggestion : suggestion.line;
    if (!line) return false;
    els.therapy.value = [normalizeLineBreaks(els.therapy.value || '').trim(), line].filter(Boolean).join('\n');
    els.therapy.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  function clinicalRecordToFhirBundle(record, options = {}) {
    const bundleId = options.id || `temperaturna-lista-${Date.now()}`;
    const patientId = options.patientId || 'patient-1';
    const encounterId = options.encounterId || 'encounter-1';
    const entries = [];
    const push = (resource) => {
      entries.push({ fullUrl: `urn:uuid:${resource.resourceType}-${resource.id}`, resource });
    };
    push({
      resourceType: 'Patient',
      id: patientId,
      name: record.patient?.fullName ? [{ text: record.patient.fullName }] : [],
      birthDate: record.patient?.birthYear || undefined,
      identifier: record.patient?.patientIdentifiers || []
    });
    push({
      resourceType: 'Encounter',
      id: encounterId,
      status: 'in-progress',
      class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: record.encounter?.patientMode === PATIENT_MODES.OUTPATIENT ? 'AMB' : 'IMP' },
      subject: { reference: `Patient/${patientId}` },
      period: record.encounter?.admissionDate ? { start: record.encounter.admissionDate } : undefined,
      serviceProvider: record.encounter?.wardId ? { display: record.encounter.wardId } : undefined
    });
    (record.conditions || []).forEach((condition, index) => push({
      resourceType: 'Condition',
      id: condition.id || makeClinicalItemId('condition', index),
      subject: { reference: `Patient/${patientId}` },
      encounter: { reference: `Encounter/${encounterId}` },
      clinicalStatus: { text: condition.status || 'active' },
      code: { text: condition.text || '' },
      note: condition.note ? [{ text: condition.note }] : []
    }));
    (record.allergies || []).forEach((allergy, index) => push({
      resourceType: 'AllergyIntolerance',
      id: allergy.id || makeClinicalItemId('allergy', index),
      patient: { reference: `Patient/${patientId}` },
      clinicalStatus: { text: allergy.status || 'active' },
      code: { text: allergy.substance || '' },
      reaction: allergy.reaction ? [{ description: allergy.reaction }] : []
    }));
    (record.medications || []).forEach((medication, index) => push({
      resourceType: 'MedicationStatement',
      id: medication.id || makeClinicalItemId('med', index),
      status: medication.stopDate ? 'stopped' : 'active',
      subject: { reference: `Patient/${patientId}` },
      context: { reference: `Encounter/${encounterId}` },
      medicationCodeableConcept: { text: medication.name || medication.sourceText || '' },
      dosage: [{ text: medication.sourceText || medication.scheduleText || '' }],
      note: medication.note ? [{ text: medication.note }] : []
    }));
    (record.vitalSigns || []).forEach((vital, index) => {
      [
        ['temperatureC', 'Body temperature', 'Cel'],
        ['heartRatePerMin', 'Heart rate', '/min'],
        ['respiratoryRatePerMin', 'Respiratory rate', '/min'],
        ['spo2Percent', 'Oxygen saturation', '%']
      ].forEach(([field, label, unit]) => {
        if (vital[field] == null) return;
        push({
          resourceType: 'Observation',
          id: `${vital.id || makeClinicalItemId('vital', index)}-${field}`,
          status: 'final',
          category: [{ text: 'vital-signs' }],
          code: { text: label },
          subject: { reference: `Patient/${patientId}` },
          encounter: { reference: `Encounter/${encounterId}` },
          effectiveDateTime: vital.measuredAt || record.encounter?.admissionDate || undefined,
          valueQuantity: { value: vital[field], unit }
        });
      });
    });
    (record.labs || []).forEach((lab, index) => {
      const numeric = Number(String(lab.value || '').replace(/[<>]/g, '').replace(',', '.'));
      push({
        resourceType: 'Observation',
        id: lab.id || makeClinicalItemId('lab', index),
        status: 'final',
        category: [{ text: 'laboratory' }],
        code: { text: lab.analyte || '' },
        subject: { reference: `Patient/${patientId}` },
        encounter: { reference: `Encounter/${encounterId}` },
        effectiveDateTime: lab.collectedAt || record.encounter?.admissionDate || undefined,
        valueQuantity: Number.isFinite(numeric) ? { value: numeric, unit: lab.unit || '' } : undefined,
        valueString: Number.isFinite(numeric) ? undefined : lab.value || lab.sourceText || ''
      });
    });
    (record.microbiology || []).forEach((micro, index) => push({
      resourceType: 'DiagnosticReport',
      id: micro.id || makeClinicalItemId('micro', index),
      status: micro.finalStatus === 'final' ? 'final' : 'registered',
      category: [{ text: 'microbiology' }],
      code: { text: micro.testType || micro.specimen || 'Microbiology' },
      subject: { reference: `Patient/${patientId}` },
      encounter: { reference: `Encounter/${encounterId}` },
      conclusion: micro.resultText || micro.sourceText || ''
    }));
    return {
      resourceType: 'Bundle',
      id: bundleId,
      type: 'collection',
      meta: { source: FHIR_EXPORT_SCHEMA },
      timestamp: new Date().toISOString(),
      entry: entries
    };
  }

  function validateBasicFhirBundle(bundle) {
    const errors = [];
    if (!bundle || bundle.resourceType !== 'Bundle') errors.push('FHIR payload mora biti Bundle.');
    if (bundle?.type !== 'collection') errors.push('Bundle.type mora biti collection.');
    if (!Array.isArray(bundle?.entry) || !bundle.entry.length) errors.push('Bundle mora imati entry zapise.');
    const resourceTypes = new Set((bundle?.entry || []).map(entry => entry?.resource?.resourceType).filter(Boolean));
    if (!resourceTypes.has('Patient')) errors.push('Bundle mora sadržavati Patient.');
    if (!resourceTypes.has('Encounter')) errors.push('Bundle mora sadržavati Encounter.');
    return { ok: errors.length === 0, errors };
  }

  function buildCurrentFhirBundle() {
    const record = patientDataToClinicalRecordV1(getFormData(), { source: 'fhir-export' });
    return clinicalRecordToFhirBundle(record);
  }

  function downloadFhirBundle(record = patientDataToClinicalRecordV1(getFormData(), { source: 'fhir-export' })) {
    const bundle = clinicalRecordToFhirBundle(record);
    const validation = validateBasicFhirBundle(bundle);
    if (!validation.ok) {
      setStatus(`FHIR export nije valjan: ${validation.errors.join(' ')}`, true);
      return false;
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/fhir+json;charset=utf-8' });
    downloadBlob(`temperaturna_lista_fhir_${parserRegressionTimestampForFile()}.json`, blob);
    setStatus('FHIR JSON Bundle je preuzet.');
    return true;
  }

  async function copyFhirBundleToClipboard(record = patientDataToClinicalRecordV1(getFormData(), { source: 'fhir-export' })) {
    const bundle = clinicalRecordToFhirBundle(record);
    const validation = validateBasicFhirBundle(bundle);
    if (!validation.ok) {
      setStatus(`FHIR export nije valjan: ${validation.errors.join(' ')}`, true);
      return false;
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
      setStatus('FHIR JSON Bundle je kopiran u clipboard.');
      return true;
    } catch (error) {
      setStatus('Clipboard nije dostupan. Preuzmi FHIR JSON kao datoteku.', true);
      return false;
    }
  }

  function exposeClinicalRecordHelpers() {
    window.TemperaturnaListaClinical = {
      schema: CLINICAL_RECORD_SCHEMA,
      fhirExportSchema: FHIR_EXPORT_SCHEMA,
      fromPatientData: (data, options = {}) => patientDataToClinicalRecordV1(data, options),
      fromCurrentForm: () => patientDataToClinicalRecordV1(getFormData(), { source: 'current-form' }),
      validateClinicalRecord,
      validateVitalSigns,
      validateMedications,
      validateAllergies,
      validateLabs,
      validateMicrobiology,
      validateEncounter,
      getMedicationAutocompleteSuggestions,
      insertMedicationSuggestion,
      validateCurrentTherapy: () => validateTherapyField({ source: 'clinical-helper' }),
      runMedicationSafetyChecks,
      clinicalRecordToFhirBundle,
      buildCurrentFhirBundle,
      validateBasicFhirBundle
    };
  }

  function clearForm(options = {}) {
    const statusMessage = typeof options.statusMessage === 'string' ? options.statusMessage : 'Obrazac je očišćen.';
    const draftStatusMessage = typeof options.draftStatusMessage === 'string' ? options.draftStatusMessage : 'Lokalni draft obrisan za novi unos.';
    state.patientDraft.suppressSave = true;
    state.firebasePatients.suppressAutoSave = true;
    try {
      clearPatientFormValuesForNextPatient();
    } finally {
      state.patientDraft.suppressSave = false;
      state.firebasePatients.suppressAutoSave = false;
    }
    resetCurrentFirebasePatientContext();
    if (els.ohbpPasteBox) {
      els.ohbpPasteBox.value = '';
    }
    state.ohbpLastParsedText = '';
    setOhbpParseStatus('');
    clearPatientDraft({ quiet: true });
    renderAll();
    resetPatientSyncState('empty', { data: getEmptyPatientData() });
    updateDowntimeBackupControls();
    setStatus(statusMessage);
    setPatientDraftStatus(draftStatusMessage, 'warn', { state: 'cleared' });
    if (options.focusFirstField) {
      window.setTimeout(() => els.fullName?.focus({ preventScroll: true }), 0);
    }
  }

  async function startNewPatientEntry() {
    const currentData = getFormData();
    const hasPatientData = isPatientDataDifferentFromEmpty(currentData);
    if (!hasPatientData) {
      clearForm({
        statusMessage: 'Novi unos je spreman.',
        draftStatusMessage: 'Lokalni draft obrisan za novi unos.',
        focusFirstField: true
      });
      return;
    }

    if (!hasPatientFullName(currentData)) {
      const continueWithoutSave = window.confirm(getUnnamedPatientNewEntryMessage());
      if (!continueWithoutSave) {
        setStatus('Novi unos je odgođen; pacijent nema ime i nije spremljen.');
        if (els.fullName) window.setTimeout(() => els.fullName.focus({ preventScroll: true }), 0);
        return;
      }
      clearForm({
        statusMessage: 'Novi unos je spreman. Prethodni pacijent nije spremljen jer nema imena.',
        draftStatusMessage: 'Lokalni draft obrisan za novi unos.',
        focusFirstField: true
      });
      return;
    }

    let savedToFirebase = false;
    if (state.firebasePatients.user) {
      const wantsFirebaseSave = window.confirm(
        'Spremiti trenutnog pacijenta u Firebase prije novog unosa?\n\nU redu = spremi i otvori novi unos.\nOdustani = otvori novi unos bez Firebase spremanja.'
      );
      if (wantsFirebaseSave) {
        const saved = await saveCurrentPatientToFirebase({
          automatic: true,
          force: true,
          saveTrigger: 'new-entry',
          statusLabel: 'Firebase spremanje prije novog unosa'
        });
        if (!saved) {
          const saveErrorMessage = state.firebasePatients.lastSaveErrorMessage || 'Firebase spremanje nije uspjelo.';
          const continueWithoutSave = window.confirm(`${saveErrorMessage}\n\nSvejedno otvoriti novi unos i obrisati podatke iz obrasca?`);
          if (!continueWithoutSave) {
            setStatus('Novi unos je odgođen; podaci pacijenta ostali su u obrascu.');
            return;
          }
        } else {
          savedToFirebase = true;
        }
      }
    } else {
      const continueWithoutFirebase = window.confirm('Nisi prijavljen u Firebase, pa se trenutni pacijent ne može spremiti tamo. Otvoriti novi unos bez Firebase spremanja?');
      if (!continueWithoutFirebase) {
        setStatus('Novi unos je odgođen; podaci pacijenta ostali su u obrascu.');
        syncFirebaseLoginGateState('Prijavi se Google računom za Firebase spremanje pacijenata.');
        return;
      }
    }

    clearForm({
      statusMessage: savedToFirebase
        ? 'Novi unos je spreman. Prethodni pacijent je spremljen u Firebase.'
        : 'Novi unos je spreman. Prethodni pacijent nije spremljen u Firebase.',
      draftStatusMessage: 'Lokalni draft obrisan za novi unos.',
      focusFirstField: true
    });
  }

  function normalizeLineBreaks(value) {
    return String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }


  
