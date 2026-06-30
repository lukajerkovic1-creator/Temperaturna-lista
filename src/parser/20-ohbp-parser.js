// ============================================================
  // MODULE: 20-ohbp-parser.js
  // Source module; tools/build-offline-html.js inlines modules for offline use.
  // ============================================================
function normalizeOhbpFusedSectionLabels(value) {
    return String(value || '')
      // OHBP/BIS kopiranje ponekad zalijepi naslov sekcije odmah iza prethodne rečenice
      // bez razmaka, npr. "nepoznatoLijekovi s liste iz doma:".
      .replace(/([a-zčćžšđ])(?=(?:Lijekovi|Kronična\s+terapija|Dosadašnja\s+terapija|Redovita\s+terapija|Kućna\s+terapija|Alergije|Alerigje|AL\.?\s+na\s+lijekove|FIN|FiN|Iz\s+statusa|Status|EKG|LAB|RTG|MSCT|Dg\.?|Th\.?|Funkcije|Osobna|Sadašnja|Dosadašnje|Prema\s+dogovoru|Vraća\s+se|Vraca\s+se|Ad\s+[A-ZČĆŽŠĐa-zčćžšđ]+|Dg\s*\/|Th\s*\/|Liječnik|Lijecnik)\b)/gu, '$1 ');
  }

  function compactOhbpText(value) {
    return normalizeOhbpFusedSectionLabels(normalizeLineBreaks(value).replace(/[ \t]+/g, ' ').replace(/\n+/g, ' ').trim());
  }

  function toTitleCaseHr(value) {
    return String(value || '')
      .toLocaleLowerCase('hr-HR')
      .split(/([ \-'])/)
      .map(part => {
        if (!part || /^[ \-']$/.test(part)) return part;
        return part.charAt(0).toLocaleUpperCase('hr-HR') + part.slice(1);
      })
      .join('');
  }

  const OHBP_ADMIN_NAME_TOKENS = Object.freeze([
    'NN', 'N.N.', 'NEPOZNAT', 'NEPOZNATA', 'NEIDENTIFICIRAN', 'NEIDENTIFICIRANA',
    'MIGRANT', 'MIGRANTICA', 'AZILANT', 'AZILANTICA',
    'MUSKO', 'MUŠKO', 'ZENSKO', 'ŽENSKO', 'M', 'Z', 'Ž',
    'ZUTO', 'ŽUTO', 'CRVENO', 'ZELENO', 'PLAVO', 'SIVO', 'CRNO', 'BIJELO', 'TRIJAZA', 'TRIJAŽA'
  ]);

  const COMMON_CROATIAN_GIVEN_NAMES = Object.freeze([
    'ANA', 'ANICA', 'ANITA', 'ANTONIA', 'ANTONIJA', 'BARBARA', 'BRANKA', 'DANIJELA', 'DORA', 'DRAGICA', 'DUBRAVKA', 'EMA', 'EMILIJA', 'IVA', 'IVANA', 'IVKA', 'JASNA', 'JELENA', 'KATARINA', 'KATICA', 'KRISTINA', 'LANA', 'LAURA', 'LUCIJA', 'MARA', 'MARIJA', 'MARIJANA', 'MARTA', 'MATEA', 'MELITA', 'MILA', 'MIRJANA', 'NADA', 'NATALIJA', 'NIKA', 'NINA', 'PETRA', 'RENATA', 'RUŽICA', 'SANDRA', 'SARA', 'SNJEŽANA', 'SUZANA', 'TAMARA', 'TEA', 'VALENTINA', 'VESNA', 'VIKTORIJA', 'ZDENKA', 'ŽELJKA',
    'ANTE', 'ANTONIO', 'BORIS', 'BOJAN', 'BRANKO', 'DAMIR', 'DANIJEL', 'DARKO', 'DAVID', 'DAVOR', 'DOMAGOJ', 'DRAGAN', 'DRAŽEN', 'FILIP', 'FRANJO', 'GORAN', 'HRVOJE', 'IGOR', 'IVAN', 'IVICA', 'JAKOV', 'JOSIP', 'KARLO', 'KRISTIJAN', 'LUKA', 'MARKO', 'MARIO', 'MATEJ', 'MATIJA', 'MIHAEL', 'MILAN', 'MLADEN', 'NENAD', 'NIKOLA', 'PETAR', 'ROBERT', 'STJEPAN', 'TOMISLAV', 'VEDRAN', 'ZDRAVKO', 'ZLATKO', 'ŽELJKO'
  ]);

  function normalizeNameToken(value) {
    return String(value || '')
      .replace(/[.'’\-]/g, '')
      .toLocaleUpperCase('hr-HR')
      .trim();
  }

  function isLikelyCroatianGivenName(value) {
    return COMMON_CROATIAN_GIVEN_NAMES.includes(normalizeNameToken(value));
  }

  function normalizeOhbpPersonName(rawName) {
    const parts = String(rawName || '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
    if (parts.length >= 4) {
      // Kod 4 ili više dijelova redoslijed je često neodrediv.
      // Sigurnije je zadržati izvorni redoslijed i tražiti ručnu provjeru.
      return toTitleCaseHr(parts.join(' '));
    }
    if (parts.length === 3) {
      const [first, second, third] = parts;
      const secondLooksGiven = isLikelyCroatianGivenName(second);
      const thirdLooksGiven = isLikelyCroatianGivenName(third);

      // PREZIME IME IME, npr. HORVAT ANA MARIJA.
      if (secondLooksGiven && thirdLooksGiven) {
        return `${toTitleCaseHr(second)} ${toTitleCaseHr(third)} ${toTitleCaseHr(first)}`.trim();
      }

      // PREZIME PREZIME IME, npr. HORVAT KOVAČ ANA.
      if (!secondLooksGiven && thirdLooksGiven) {
        return `${toTitleCaseHr(third)} ${toTitleCaseHr(first)} ${toTitleCaseHr(second)}`.trim();
      }

      // Nejasno: moguće dvostruko ime ili dvostruko prezime koje nije u ugrađenom popisu.
      return toTitleCaseHr(parts.join(' '));
    }
    if (parts.length >= 2) {
      const surname = parts.shift();
      return `${toTitleCaseHr(parts.join(' '))} ${toTitleCaseHr(surname)}`.trim();
    }
    return toTitleCaseHr(parts.join(' '));
  }

  function countOhbpPersonNameParts(rawName) {
    return String(rawName || '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean).length;
  }

  function buildOhbpNameOrderWarning(cleanedName) {
    const parts = String(cleanedName || '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
    if (parts.length >= 4) {
      return 'Ime/prezime ima 4 ili više dijelova; aplikacija je zadržala izvorni redoslijed. Provjerite redoslijed imena i prezimena.';
    }
    if (parts.length === 3) {
      return 'Ime/prezime ima 3 dijela; moguća su dvostruka imena ili dvostruka prezimena. Provjerite redoslijed.';
    }
    return '';
  }

  function getOhbpSuspiciousNameCandidateReason(rawName) {
    const original = String(rawName || '').replace(/\s+/g, ' ').trim();
    const candidate = cleanOhbpPersonNameCandidate(original);
    if (!candidate) return '';

    const parts = candidate.split(/\s+/).filter(Boolean);
    const normalizedParts = parts.map(normalizeNameToken);

    if (normalizedParts.some(part => OHBP_ADMIN_NAME_TOKENS.includes(part))) {
      return 'kandidat izgleda kao administrativni opis, trijažna oznaka, spol ili NN pacijent';
    }
    if (/\b(?:NN|N\.\s*N\.|NEPOZNAT[AI]?|MIGRANT(?:ICA)?|AZILANT(?:ICA)?)\b/i.test(original)) {
      return 'kandidat izgleda kao NN/nepoznat pacijent ili administrativni opis';
    }
    if (/\d/.test(candidate)) {
      return 'kandidat za ime sadrži brojke';
    }
    return '';
  }

  function buildOhbpPersonNameResult(rawName) {
    const cleaned = cleanOhbpPersonNameCandidate(rawName);
    if (!cleaned) return { fullName: '', nameOrderWarning: '', nameValidationWarning: '' };
    const validationReason = getOhbpSuspiciousNameCandidateReason(rawName);
    if (validationReason) {
      return {
        fullName: '',
        nameOrderWarning: '',
        nameValidationWarning: `Ime i prezime nisu automatski preuzeti jer ${validationReason}. Upišite/provjerite ručno.`
      };
    }
    return {
      fullName: normalizeOhbpPersonName(cleaned),
      nameOrderWarning: buildOhbpNameOrderWarning(cleaned),
      nameValidationWarning: ''
    };
  }

  function resolveOhbpPersonNameCandidate(rawName) {
    const validationReason = getOhbpSuspiciousNameCandidateReason(rawName);
    if (validationReason) return buildOhbpPersonNameResult(rawName);
    if (isPlausibleOhbpPersonNameCandidate(rawName)) return buildOhbpPersonNameResult(rawName);
    return null;
  }

  function cleanOhbpPersonNameCandidate(rawName) {
    let candidate = String(rawName || '').replace(/\s+/g, ' ').trim();
    if (!candidate) return '';

    candidate = candidate
      // Testni/ručno dodani prefiksi tipa "Četiri - ČUČAK ANA" nisu dio imena.
      // Važno: crtica bez razmaka može biti dio prezimena, npr. "VUKOVIĆ-MOTTL SRNA".
      .replace(/^(?:\d+|[A-ZČĆŽŠĐa-zčćžšđ]+)\s+[-–—]\s+(?=[A-ZČĆŽŠĐ][A-ZČĆŽŠĐa-zčćžšđ'’-]+(?:\s+[A-ZČĆŽŠĐ][A-ZČĆŽŠĐa-zčćžšđ'’-]+){1,})/u, '')
      // OHBP ponekad ispred imena ima interni broj bez crtice, npr. "202338 ŽUTO MUŠKO, rođen...".
      .replace(/^\d{3,}\s+(?=[A-ZČĆŽŠĐ][A-ZČĆŽŠĐa-zčćžšđ'’-]+(?:\s+[A-ZČĆŽŠĐ][A-ZČĆŽŠĐa-zčćžšđ'’-]+){1,})/u, '')
      // Ako se iz testnog Word dokumenta kopira i opis greške prije imena, odbaci prefiks do crtice.
      .replace(/^(?:Nije|U\s+dijagnozu|Greška|Test)\b.{0,220}[-–—]\s*(?=[A-ZČĆŽŠĐ][A-ZČĆŽŠĐa-zčćžšđ'’-]+(?:\s+[A-ZČĆŽŠĐ][A-ZČĆŽŠĐa-zčćžšđ'’-]+){1,})/iu, '')
      .replace(/^(?:Pacijent(?:ica)?|Bolesnik(?:ica)?)\s*:?\s*/i, '')
      .trim();

    const boundaryIndex = candidate.search(/\s*(?:,|;)?\s*\b(?:ro(?:đ|d|dj|\?|\uFFFD)en[ao]?|datum\s+ro(?:đ|d|dj|\?|\uFFFD)enja|adresa|MBOO?|OIB|matični\s+list|primljen[ao]?|dijagnoza|pregled|podaci\s+sa\s+trijaže|glavna\s+tegoba|objektivna\s+procjena)\b/iu);
    if (boundaryIndex >= 0) {
      candidate = candidate.slice(0, boundaryIndex).trim();
    }

    return candidate
      .replace(/[,:;.\s]+$/g, '')
      .replace(/^[,:;.\s]+/g, '')
      .trim();
  }

  function isPlausibleOhbpPersonNameCandidate(rawName) {
    const candidate = cleanOhbpPersonNameCandidate(rawName);
    if (!candidate) return false;
    if (getOhbpSuspiciousNameCandidateReason(rawName)) return false;
    const parts = candidate.split(/\s+/).filter(Boolean);
    if (parts.length < 2 || parts.length > 6) return false;
    return parts.every(part => /^[A-ZČĆŽŠĐ][A-ZČĆŽŠĐa-zčćžšđ'’-]*$/u.test(part));
  }

  function extractOhbpPersonNameResult(text, compact) {
    const rawText = normalizeLineBreaks(text);

    // Eksplicitni BIS/OHBP obrazac može se nalaziti bilo gdje u kopiranom tekstu,
    // ne samo na prvom retku nalaza. Vrijednost se i dalje tretira kao PREZIME IME.
    const labelledLineMatch = rawText.match(/(?:^|\n)\s*Prezime\s+i\s+ime\s*:\s*([^\n\r]{2,160})/i);
    if (labelledLineMatch) {
      const resolved = resolveOhbpPersonNameCandidate(labelledLineMatch[1]);
      if (resolved) return resolved;
    }

    const labelledCompactMatch = compact.match(/\bPrezime\s+i\s+ime\s*:\s*(.{2,160}?)(?=\s+\b(?:ro(?:đ|d|dj|\?|\uFFFD)en[ao]?|datum\s+ro(?:đ|d|dj|\?|\uFFFD)enja|adresa|MBOO?|OIB|matični\s+list|primljen[ao]?|dijagnoza|pregled|podaci\s+sa\s+trijaže|glavna\s+tegoba|objektivna\s+procjena)\b|$)/iu);
    if (labelledCompactMatch) {
      const resolved = resolveOhbpPersonNameCandidate(labelledCompactMatch[1]);
      if (resolved) return resolved;
    }

    const leadingNameMatch = compact.match(/^\s*(?:Prezime\s+i\s+ime\s*:\s*)?(.{2,100}?)\s*,?\s+ro(?:đ|d|dj|\?|\uFFFD)en[ao]?\s*:?\s*\d{1,2}[.\/\-\s]+\d{1,2}[.\/\-\s]+\d{4}/iu);
    if (leadingNameMatch) {
      const resolved = resolveOhbpPersonNameCandidate(leadingNameMatch[1]);
      if (resolved) return resolved;
    }

    const bornLineMatch = rawText.match(/(?:^|\n)\s*(?:\d{3,}\s+)?([^\n\r,]{2,140}?)\s*,?\s+ro(?:\u0111|Ä‘|d|dj|\?|\uFFFD)en[ao]?\s*:?\s*\d{1,2}[.\/\-\s]+\d{1,2}[.\/\-\s]+\d{4}/iu);
    if (bornLineMatch) {
      const resolved = resolveOhbpPersonNameCandidate(bornLineMatch[1]);
      if (resolved) return resolved;
    }

    return { fullName: '', nameOrderWarning: '', nameValidationWarning: '' };
  }

  function extractOhbpPersonName(text, compact) {
    return extractOhbpPersonNameResult(text, compact).fullName;
  }

  function parseCroatianDateToIso(value) {
    const match = String(value || '').trim().match(/(\d{1,2})[.\/\-\s]+(\d{1,2})[.\/\-\s]+(\d{4})/);
    if (!match) return '';
    const dayNumber = Number(match[1]);
    const monthNumber = Number(match[2]);
    const yearNumber = Number(match[3]);
    if (
      !Number.isInteger(yearNumber) || yearNumber < 1900 || yearNumber > 2100 ||
      !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12 ||
      !Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31
    ) {
      return '';
    }
    const date = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));
    if (
      date.getUTCFullYear() !== yearNumber ||
      date.getUTCMonth() !== monthNumber - 1 ||
      date.getUTCDate() !== dayNumber
    ) {
      return '';
    }
    const day = String(dayNumber).padStart(2, '0');
    const month = String(monthNumber).padStart(2, '0');
    return `${yearNumber}-${month}-${day}`;
  }

  function extractOhbpSection(text, startPattern, endPatterns = []) {
    const source = compactOhbpText(text);
    const startMatch = source.match(startPattern);
    if (!startMatch) return '';
    const startIndex = startMatch.index + startMatch[0].length;
    let endIndex = source.length;
    const tail = source.slice(startIndex);
    endPatterns.forEach(pattern => {
      const endMatch = tail.match(pattern);
      if (endMatch && endMatch.index >= 0) {
        if (typeof LAB_VALUE_START_IN_TEXT_PATTERN !== 'undefined' && pattern === LAB_VALUE_START_IN_TEXT_PATTERN && isTherapeuticPotassiumDoseAtIndex(tail, endMatch.index)) {
          return;
        }
        endIndex = Math.min(endIndex, startIndex + endMatch.index);
      }
    });
    return source.slice(startIndex, endIndex).trim();
  }

  function findLastPatternMatch(source, patterns = [], acceptMatch = null) {
    let bestMatch = null;
    patterns.forEach(pattern => {
      const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
      const globalPattern = new RegExp(pattern.source, flags);
      let match;
      while ((match = globalPattern.exec(source)) !== null) {
        const candidate = { index: match.index, length: match[0].length, text: match[0], pattern };
        if (typeof acceptMatch === 'function' && !acceptMatch(candidate, source)) {
          if (match[0].length === 0) globalPattern.lastIndex += 1;
          continue;
        }
        if (!bestMatch || candidate.index > bestMatch.index) {
          bestMatch = candidate;
        }
        if (match[0].length === 0) globalPattern.lastIndex += 1;
      }
    });
    return bestMatch;
  }

  function extractLastOhbpSection(text, startPatterns = [], endPatterns = []) {
    const source = compactOhbpText(text);
    const startMatch = findLastPatternMatch(source, startPatterns);
    if (!startMatch) return '';
    const startIndex = startMatch.index + startMatch.length;
    let endIndex = source.length;
    const tail = source.slice(startIndex);
    endPatterns.forEach(pattern => {
      const endMatch = tail.match(pattern);
      if (endMatch && endMatch.index >= 0) {
        if (typeof LAB_VALUE_START_IN_TEXT_PATTERN !== 'undefined' && pattern === LAB_VALUE_START_IN_TEXT_PATTERN && isTherapeuticPotassiumDoseAtIndex(tail, endMatch.index)) {
          return;
        }
        endIndex = Math.min(endIndex, startIndex + endMatch.index);
      }
    });
    return source.slice(startIndex, endIndex).trim();
  }

  function extractLastOhbpSectionPreserveLineBreaks(text, startPatterns = [], endPatterns = [], acceptStartMatch = null, acceptEndMatch = null) {
    const source = normalizeLineBreaks(text).replace(/[ \t]+/g, ' ').trim();
    const startMatch = findLastPatternMatch(source, startPatterns, acceptStartMatch);
    if (!startMatch) return '';
    const startIndex = startMatch.index + startMatch.length;
    let endIndex = source.length;
    const tail = source.slice(startIndex);
    endPatterns.forEach(pattern => {
      const endMatch = tail.match(pattern);
      if (endMatch && endMatch.index >= 0) {
        if (typeof LAB_VALUE_START_IN_TEXT_PATTERN !== 'undefined' && pattern === LAB_VALUE_START_IN_TEXT_PATTERN && isTherapeuticPotassiumDoseAtIndex(tail, endMatch.index)) {
          return;
        }
        const candidate = { index: endMatch.index, length: endMatch[0].length, text: endMatch[0], pattern };
        if (typeof acceptEndMatch === 'function' && !acceptEndMatch(candidate, tail, source)) {
          return;
        }
        endIndex = Math.min(endIndex, startIndex + endMatch.index);
      }
    });
    return source.slice(startIndex, endIndex).trim();
  }

  function findFirstPatternIndex(source, patterns = []) {
    let bestIndex = -1;
    patterns.forEach(pattern => {
      const match = source.match(pattern);
      if (match && match.index >= 0 && (bestIndex < 0 || match.index < bestIndex)) {
        bestIndex = match.index;
      }
    });
    return bestIndex;
  }
  const INLINE_LAB_SECTION_START_PATTERN = /\bLAB\.?\s*(?=(?:SE|PCT|PROKAL|Prokalcitonin|CRP|Erc|E|Hb|Htc|Trc|Lkc|L|NEUTRO|NEUT|NEU|GUK|UREJA|Urea|KREA|Kreatinin|Na|K|Cl|BIL|Bilirubin|AST|ALT|AP|GGT|CK|LDH|LD|Troponin|PV|INR|APTV|Fib|Fibrinogen|D[-–]?\s*dimeri)\b)/i;

  const LAB_SECTION_START_PATTERNS = Object.freeze([
    /\bLAB(?:ORATORIJ)?\b\.?\s*:\s*/i,
    INLINE_LAB_SECTION_START_PATTERN,
    /\bLab(?:oratorij)?\b\.?\s*:\s*/i,
    /\bLaboratorij\s*:\s*/i,
    /\bLaboratorijski\s+nalaz\s*:\s*/i,
    /\bLaboratorijski\s+nalaz\b/i,
    /\bLaboratorijski\s+nalazi\s*:\s*/i,
    /\bLaboratorijski\s+nalazi\b/i,
    /\bLaboratorijske\s+pretrage\s*:\s*/i,
    /\bBiokemija\s*:\s*/i,
    /\bHematologija\s*:\s*/i,
    /\bKKS\s*:\s*/i,
    /\bPretrage\s*:\s*/i,
    /\bNalazi\s*:\s*/i
  ]);

  const LAB_SECTION_END_PATTERNS = Object.freeze([
    /(?:^|\n|\s)-{5,}(?=\s|\n|$)/i,
    /\bkontrolni\s+nalaz\s*:/i,
    // RTG opisi u OHBP nalazima često počinju bez jasnog naslova "RTG:".
    // Zato laboratorij završavamo i na početku tipičnih radioloških rečenica.
    // Primjeri: "Na sumacijskoj PA i LP snimci...", "Na PA i LL snimkama...".
    /\bNa\s+(?:modificiranoj\s+)?sumacijskoj(?:\s+(?:AP|PA|LP|LL|i|srca|pluća|pluca|torakalnih|organa))*\s+snim\w*\b/i,
    /\bNa\s+(?:modificiranoj\s+)?(?:AP|PA)(?:\s+i\s+(?:AP|PA|LP|LL))?\s+snim\w*\b/i,
    /\b(?:AP|PA|LP|LL)\s+snim\w*\b/i,
    /\bNa\s+sumacijskoj\s+snimci\b/i,
    /\bNa\s+AP\s+snimci\b/i,
    /\bNa\s+PA\s+i\s+LP\s+snimci\b/i,
    /\bNa\s+nativnoj\s+snimci\b/i,
    /\bNativna\s+snimka\b/i,
    /\bHITNI\s+MSCT\b/i,
    /\bRTG\b/i,
    /\bUZV\b/i,
    /\bCT\b/i,
    /\bMSCT\b/i,
    /\bEKG\b/i,
    /\b(?:Tetraparesis|Tetraplegia|Paraparesis|Paraplegia|Hemiparesis|Dysphagia|Dyphagia|Iclusion\s+body\s+myositis|Inclusion\s+body\s+myositis|MND\s+i\.o\.|Insuff\.?\s+renalis|Diabetes\s+mellitus|Ana?emia\s+microcytica|Polyarthritis|Gastritis|Duodenitis|Pseudophakia|Cataracta|Retinopathia|GERB)\b/i,
    /\bTerapija\s+u\s+OHBP-u\s*:/i,
    /\bTerapija\s+pri\s+otpustu\s*:/i,
    /\bPreporučen[ae]?\s+terapij[ae]\s*:/i,
    /\bPreporučena\s+terapija\s*:/i,
    /\bTh\.?(?=\s|[:;/]|[-–—])\s*(?:[:;/]|[-–—])?\s*/i,
    /\bTerapija\s*:/i,
    /\bPreporuk[ae]\b/i,
    /\bZaključak\s*[:;]/i,
    /\bZavršna\s+dijagnoza\b/i,
    /\bDg\.?\s*(?:[:;/]|[-–—])?\s*/i,
    /\bDijagnoza\s*:/i,
    /\bKonzilijarn[iaei]\s+(?:nalaz|pregled|obrada)\b/i
  ]);

  const LAB_VALUE_FRAGMENT_LABELS = Object.freeze([
    'SE', 'Sedimentacija', 'PCT', 'PROKAL', 'Prokalcitonin', 'CRP',
    'Erc', 'E', 'Hb', 'Trc', 'Lkc', 'L',
    'NEUTRO', 'NEUT', 'NEU', 'NEUm', 'SEGm', 'NESEGm', 'LIMFO', 'LYMFO', 'LYM', 'LIMFOm', 'MONO', 'MONOm', 'EO', 'EOm', 'BAZO', 'BASO', 'BAZOm', 'BASOm', 'METAm',
    'GUK', 'UREJA', 'Urea', 'KREA', 'Kreatinin', 'Na', 'K', 'Cl',
    'T-BIL', 'TBIL', 'BIL', 'Bilirubin', 'AST', 'ALT', 'AP', 'GGT', 'CK', 'LDH', 'LD', 'Troponin',
    'PV', 'APTV R', 'APTV', 'fibrinogen', 'Fibrinogen', 'Fib', 'FIB', 'D-dimeri', 'INR',
    'Urin', 'Sediment urina', 'pH', 'proteini', 'ketoni', 'nitriti', 'leukociti', 'eritrociti', 'bakterije'
  ]);

  function getLabValueFragmentMarkers(source) {
    const text = String(source || '');
    const labelPattern = LAB_VALUE_FRAGMENT_LABELS
      .slice()
      .sort((a, b) => b.length - a.length)
      .map(labLabelToPattern)
      .join('|');
    const markerRegex = new RegExp(`(^|[\\s,;])(${labelPattern})(?=\\s|[:=])\\s*(?::|=)?\\s*[-+]?\\d`, 'gi');
    const markers = [];
    let match;
    while ((match = markerRegex.exec(text)) !== null) {
      const prefixLength = match[1] ? match[1].length : 0;
      const label = match[2];
      const valueStart = markerRegex.lastIndex - String(match[0] || '').match(/[-+]?\d/)?.[0].length;
      const rawValue = text.slice(valueStart).trim();
      if (isStrictSingleLetterLabLabel(label) && !startsWithImmediateNumericLabValue(rawValue)) {
        continue;
      }
      markers.push({
        index: match.index + prefixLength,
        label: label.toLowerCase()
      });
      if (match[0].length === 0) markerRegex.lastIndex += 1;
    }
    return markers;
  }

  function findLabValueClusterStartIndex(source, minUniqueLabels = 2, windowLength = 360) {
    const markers = getLabValueFragmentMarkers(source);
    for (let i = 0; i < markers.length; i += 1) {
      const labelsInWindow = new Set();
      for (let j = i; j < markers.length; j += 1) {
        if (markers[j].index - markers[i].index > windowLength) break;
        labelsInWindow.add(markers[j].label);
      }
      if (labelsInWindow.size >= minUniqueLabels) return markers[i].index;
    }
    return -1;
  }

  function hasLabValueCluster(source, minUniqueLabels = 2, windowLength = 360) {
    return findLabValueClusterStartIndex(source, minUniqueLabels, windowLength) >= 0;
  }

  function extractMarkedLabSection(source, startPattern, isBroadMarker = false) {
    const section = extractOhbpSection(source, startPattern, LAB_SECTION_END_PATTERNS);
    if (!section) return '';
    // "Pretrage:" je širok naslov i može sadržavati samo RTG/CT/UZV.
    // Zato ga prihvaćamo kao laboratorij samo ako u tom odsječku postoje barem 2 lab-vrijednosti.
    if (isBroadMarker && !hasLabValueCluster(section, 2)) return '';
    return section;
  }

  function extractLabSectionWithoutMarker(source) {
    const text = String(source || '');
    const markers = getLabValueFragmentMarkers(text);
    for (let i = 0; i < markers.length; i += 1) {
      const labelsInWindow = new Set();
      for (let j = i; j < markers.length; j += 1) {
        if (markers[j].index - markers[i].index > 360) break;
        labelsInWindow.add(markers[j].label);
      }
      if (labelsInWindow.size < 2) continue;
      const startIndex = markers[i].index;
      const tail = text.slice(startIndex);
      let endIndex = tail.length;
      LAB_SECTION_END_PATTERNS.forEach(pattern => {
        const endMatch = tail.match(pattern);
        if (endMatch && endMatch.index > 0) {
          endIndex = Math.min(endIndex, endMatch.index);
        }
      });
      return tail.slice(0, endIndex).trim();
    }
    return '';
  }

  function extractOhbpLabsResult(text) {
    const source = compactOhbpText(text);
    for (const pattern of LAB_SECTION_START_PATTERNS) {
      const isBroadMarker = /Pretrage|Nalazi/i.test(pattern.source);
      const section = extractMarkedLabSection(source, pattern, isBroadMarker);
      if (section) {
        return { value: section, foundWithoutMarker: false };
      }
    }
    // Konzervativni fallback za OHBP nalaze bez jasnog laboratorijskog naslova:
    // laboratorij se prihvaća samo ako se nađe skup od barem 2 različita lab-parametra s brojčanim vrijednostima.
    const fallbackSection = extractLabSectionWithoutMarker(source);
    return { value: fallbackSection, foundWithoutMarker: Boolean(fallbackSection) };
  }

  function extractOhbpLabs(text) {
    return extractOhbpLabsResult(text).value;
  }

  const RADIOLOGY_SECTION_START_PATTERNS = Object.freeze([
    // RTG naslov može biti kratak ("RTG:") ili opisni ("RTG srca i pluća:", "RTG abdomena:").
    { label: 'RTG', pattern: /\bRTG\b\.?(?:\s+[^:\n]{0,80})?\s*:\s*/gi },
    // Konzilijarni nalazi često počinju rečenicom "RTG torakalnih organa pokazuje..." bez dvotočke.
    { label: 'RTG', pattern: /(?=(?:^|\n)\s*RTG\s+(?:torakalnih\s+organa|plu[ćc]a|srca\s+i\s+plu[ćc]a|snim\w*)\b)/gi },
    // OHBP radiološki nalazi ponekad imaju samostalni red "RTG" bez dvotočke.
    { label: 'RTG', pattern: /(?:^|\n)\s*RTG\s*(?:\n|$)/gi },
    // Ponekad radiološki tekst nema naslov RTG, nego odmah počinje opisom snimke.
    { label: 'RTG', pattern: /(?=(?:^|\n)\s*(?:Na\s+(?:modificiranoj\s+)?(?:sumacijskoj|nativnoj|AP|PA|LP|LL)\b|Nativna\s+snimka\b))/gi },
    // UZV naslov može biti kratak ("UZV:") ili opisni ("UZV abdomena:") i nalaz često počinje u istoj liniji.
    { label: 'UZV', pattern: /\bUZV\b\.?(?:\s+[^:\n]{0,80})?\s*:\s*/gi },
    { label: 'UZV', pattern: /(?:^|\n)\s*UZV(?:\s+[^:\n]{0,80})?\s*:?[ \t]*(?:\n|$)/gi },
    { label: 'UZV', pattern: /\bUltrazvuk\b\.?(?:\s+[^:\n]{0,80})?\s*:\s*/gi },
    { label: 'MSCT', pattern: /(?=(?:^|\n)\s*(?:Hitn[ai]\s+)?MSCT\b)/gi },
    { label: 'CT', pattern: /(?=(?:^|\n)\s*(?:Hitn[ai]\s+)?CT\b)/gi }
  ]);

  const RADIOLOGY_SECTION_END_PATTERNS = Object.freeze([
    /(?:^|\n|\s)-{5,}(?=\s|\n|$)/i,
    /\bLAB(?:ORATORIJ)?\b\.?\s*:/i,
    INLINE_LAB_SECTION_START_PATTERN,
    /\bLaboratorij(?:ski\s+nalaz|ski\s+nalazi)?\s*:/i,
    /\bPretrage\s*:/i,
    /\bEKG\s*:/i,
    /(?:^|\n)\s*Th\.?\s+(?=(?:monitor|monitoring|O2|O₂|kisik|F\.?\s*O\.?|NaCl|Ringer|Ionolyte|Hartmann|Plasmalyte|Glukoza|[A-ZČĆŽŠĐ0-9]))/i,
    /\bDatum\s+i\s+vrijeme\s+nalaza\s*:/i,
    // Acidobazni status i naknadni kontrolni laboratoriji nisu dio radiološkog nalaza,
    // osobito kad nakon UZV/MSCT teksta slijedi redak "(aK) pH...".
    /(?:^|\n)\s*\(?aK\)?\s*pH\b/i,
    /(?:^|\n)\s*(?:ABS|Acidobazni\s+status|Plinska\s+analiza)\b/i,
    /(?:^|\n)\s*kontroln[io]\s+(?:troponin|hs\s*Trop|TnI|Tn\s*I)\b/i,
    // Završna dijagnoza može biti zapisana kao Dg:, Dg., Dg/ ili samo Dg na početku retka.
    // Radiološki blok mora stati prije te oznake, čak i kad nakon dijagnoze slijedi Th /.
    /(?:^|\n)\s*[A-TV-Z]\d{2}(?:\.\d+)?\s+(?=\S)/i,
    /(?:^|\n)\s*Dg\.?\s*(?:[:;\/]|[-–—]|\b)/i,
    /\bDijagnoza\s*:/i,
    /\bTh\.?\s*(?:[:;/]|[-–—])\s*/i,
    /\bTerapija\s*:/i,
    /\bZavršna\s+dijagnoza\b/i,
    /\bEpikriza\b/i,
    /\bPreporuk[ae]\b/i,
    /\bLiječnik\s*:/i,
    /\bLijecnik\s*:/i,
    /\bAd\s+[A-ZČĆŽŠĐa-zčćžšđ]+\b/i
  ]);

  function extractOhbpRadiology(rawText) {
    const source = normalizeLineBreaks(rawText).replace(/[ \t]+/g, ' ').trim();
    if (!source) return '';
    const starts = [];
    RADIOLOGY_SECTION_START_PATTERNS.forEach(({ label, pattern }) => {
      const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
      const regex = new RegExp(pattern.source, flags);
      let match;
      while ((match = regex.exec(source)) !== null) {
        starts.push({ label, index: match.index, length: match[0].length });
        if (match[0].length === 0) regex.lastIndex += 1;
      }
    });
    starts.sort((a, b) => a.index - b.index);
    const parts = [];
    starts.forEach((start, idx) => {
      const contentStart = start.index + start.length;
      let endIndex = idx + 1 < starts.length ? starts[idx + 1].index : source.length;
      const tail = source.slice(contentStart, endIndex);
      RADIOLOGY_SECTION_END_PATTERNS.forEach((pattern) => {
        const match = tail.match(pattern);
        if (match && match.index != null && match.index >= 0) {
          endIndex = Math.min(endIndex, contentStart + match.index);
        }
      });
      const content = source.slice(contentStart, endIndex)
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^[\s:;,.]+|[\s]+$/g, '')
        .trim();
      if (content) parts.push(`${start.label}: ${content}`);
    });
    return parts.join('\n\n').trim();
  }

  const LAB_VALUE_START_IN_TEXT_PATTERN = /(?:^|[\s,;])(?:SE|Sedimentacija|PCT|PROKAL|Prokalcitonin|CRP|Erc|E|Hb|Trc|Lkc|L|NEUTRO|NEUT|NEU|NEUm|SEGm|NESEGm|LIMFO|LYMFO|LYM|LIMFOm|MONO|MONOm|EO|EOm|BAZO|BASO|BAZOm|BASOm|METAm|GUK|UREJA|Urea|KREA|Kreatinin|Na|K|Cl|T[-–]?BIL|TBIL|BIL|Bilirubin|AST|ALT|AP|GGT|CK|LDH|LD|Troponin|PV|APTV\s*R|APTV|fibrinogen|Fibrinogen|Fib|FIB|D[-–]?\s*dimeri|INR)\s*(?::|=)?\s*[<>]?\s*[-+]?\d/i;


  const DIAGNOSIS_URINE_LAB_HARD_STOP_PATTERNS = Object.freeze([
    /\bUrin\s*:/i,
    /\bSediment\s+urina\b\s*:?/i,
    /\bNitriti\b\s*(?::|=)?\s*(?:poz\w*|neg\w*|[-+]{1,4}|\d)?/i,
    /(?:^|[\s,;/])L\s*\+{1,4}(?=\s|[,;/]|$)/i,
    /(?:^|[\s,;/])E\s*\+{1,4}(?=\s|[,;/]|$)/i,
    /\bBakterije\b\s*(?::|=)?\s*(?:dosta|ne[šs]to|malo|rijetko|poz\w*|neg\w*|[-+]{1,4}|\d)?/i,
    /\bLAB(?:ORATORIJ)?\b\.?\s*:/i,
    /\bLaboratorij\b\s*:/i,
    /\bLaboratorijski\s+nalaz\b\s*:?/i,
    /\bLaboratorijski\s+nalazi\b\s*:?/i
  ]);

  function findDiagnosisUrineLabHardStopIndex(value) {
    const source = String(value || '');
    let index = -1;
    DIAGNOSIS_URINE_LAB_HARD_STOP_PATTERNS.forEach((pattern) => {
      const match = source.match(pattern);
      if (match && match.index >= 0) {
        index = index < 0 ? match.index : Math.min(index, match.index);
      }
    });
    return index;
  }

  function hasDiagnosisUrineLabHardStop(value) {
    return findDiagnosisUrineLabHardStopIndex(value) >= 0;
  }

  function therapyTextContainsLabValues(value) {
    const source = String(value || '');
    return hasLabValueCluster(source, 2, 220) || LAB_VALUE_START_IN_TEXT_PATTERN.test(source);
  }

  const THERAPY_SECTION_END_PATTERNS = Object.freeze([
    /(?:^|\n|\s)-{5,}(?=\s|\n|$)/i,
    /\bAlergije\s+na\s+lijekove\s*:/i,
    /\bAlergije\s+na\s+lijekove\b/i,
    /\bAlergije\s*:/i,
    /\bAlergije\b/i,
    /\bAlerigje\s+na\s+lijekove\s*:/i,
    /\bAlerigje\s+na\s+lijekove\b/i,
    /\bAlerigje\s*:/i,
    /\bAlerigje\b/i,
    /\bAlergija\s+(?:na\s+lijekove|na\s+[^.\n]{1,120})\.?:?/i,
    /\bAL\.?\s+na\s+lijekove\b/i,
    /\bKomorbiditeti\s*:/i,
    /\bDosada[šs]nje\s+bolesti\s*:/i,
    /\bOsobna\s+anamneza\s*:/i,
    /\bRanije\s+bolesti\s*:/i,
    /\bRanije\s+je\s+(?:bio|bila)\b/i,
    /\bRanije\s+(?:bio|bila)\b/i,
    /\bTerapija\s+u\s+OHBP[-–—]?u\s*:/i,
    /\bOHBP\s+terapija\s*:/i,
    /\bTerapija\s+pri\s+otpustu\s*:/i,
    /\bPreporučen[ae]?\s+terapij[ae]\s*:/i,
    /\bPreporučena\s+terapija\s*:/i,
    /\bOrdinirano\s*:/i,
    // Rečenice o adherenciji nakon kućne terapije nisu dio popisa lijekova.
    // Primjer: "Neke je lijekove prestao uzimati jer...".
    /\b(?:Neke|Neki|Dio|Pojedine|Pojedini|Odre[đd]ene|Odre[đd]eni)\s+(?:je\s+|su\s+)?lijekove?\s+(?:prestao|prestala|prestali|prekinuo|prekinula|prekinuli|ne\s+uzima|nije\s+uzimao|nije\s+uzimala|nisu\s+uzimali)\b/i,
    /\bLijekove?\s+(?:je\s+|su\s+)?(?:prestao|prestala|prestali|prekinuo|prekinula|prekinuli|ne\s+uzima|nije\s+uzimao|nije\s+uzimala|nisu\s+uzimali)\b/i,
    // v206: nakon transdermalnih lijekova ponekad slijedi slobodni opis zamjene flastera,
    // npr. "Transtec 35 ug/h - subotom i utorkom, opisuje danas novi stavila".
    // Taj narativ ne smije ući u kroničnu terapiju.
    /\b(?:opisuje|opsiuje|navodi)\s+(?:da\s+)?(?:je\s+)?(?:danas\s+)?(?:nov[iauo]\s+)?(?:stavila|stavio|postavila|postavio|zalijepila|zalijepio|nalijepila|nalijepio)\b/i,
    /\bAL\.?\s+na\s+lijekove\s*:/i,
    /\bAL\.?\s*:/i,
    /\bFIN\s*:/i,
    /\bFiN\s*:/i,
    /\bFunkcije\s+i\s+navike\s*:/i,
    // v213: granice kronične terapije ne smiju progutati idući lab/status/dg/th blok.
    // v214: hrvatski datum mora biti stvarno postojeći kalendarski datum.
    // Posebno čuvamo slučaj: "salbutamol po potrebi. Lab".
    /(?:^|[\s.;,])Lab\.?\b/i,
    /\bLAB\s*:/i,
    /\bLaboratorij\b\.?:?/i,
    /\bLaboratorijski\s+nalaz[ai]?\b\.?:?/i,
    /\bStatus\s*:/i,
    /\bStatus\b/i,
    /\bStatus\s+preasens\s*:/i,
    /\bKlinički\s+status\s*:/i,
    /\bIz\s+statusa\s*:/i,
    /\bIz\s+statusa\b/i,
    /\bECOG\s*\d\b/i,
    /\bNeurološki\s+(?:status|pregled)\b/i,
    /\bGrubi\s+neurološki\s+pregled\b/i,
    /\bPri\s+svijesti\b/i,
    /\bRR\s*\d/i,
    /\bTax\s*:?/i,
    /\bEKG\b/i,
    LAB_VALUE_START_IN_TEXT_PATTERN,
    ...LAB_SECTION_START_PATTERNS,
    /\bLAB\s*:/i,
    /\bLaboratorijsk[iaoe]\b/i,
    /\bRTG\b/i,
    /\bUZV\b/i,
    /\bCT\b/i,
    /\bMSCT\b/i,
    /\bKonzultiran[aoaei]?\b/i,
      /\bOpservacija\s+na\s+Odjelu\b/i,
      /\bOpservacija\b/i,
      /\bOpservirati\b/i,
      /\bU\s+ovom\s+tren(?:u|utku)\b/i,
      /\bU\s+ovom\s+\u010dasu\b/i,
      /\bMi[\u0161s]ljenja\s+sam\b/i,
      /\bBez\s+indikacije\s+za\b/i,
      /\bart\.?\s*braunil[aeu]?\b/i,
      /\ba\.?\s*brachialis\b/i,
      /\bIBP\b/i,
      /\b(?:Granisetron|Urapidil|Ebrantil|TXA|traneksami[čc]n[aeiou]*\s+kiselin[aeiou]*)\b/i,
      /\bostala\s+th\s+na\s+odjelu\b/i,
      /\bspO2\b/i,
      /\bO2\s*\d+(?:[.,]\d+)?\s*l\s*\/\s*min\b/i,
      /\bNastaviti\s+(?:sa\s+)?(?:dosada[\u0161s]njom|preporu[\u010dc]enom|ordiniranom)?\s*terapij\w*\b/i,
      /\bNastaviti\s+(?:sa\s+)?(?:daljnjom\s+)?obrad\w*(?:\s+na\s+odjelu)?\b/i,
      /\bNastaviti\s+(?:sa\s+)?obradom\b/i,
      /\bDaljnj[ae]\s+obrad\w*\b/i,
      /\bobrad\w*\s+na\s+odjelu\b/i,
      /\bDaljnj[ae]\s+lije[\u010dc]enj\w*\s+i\s+obrad\w*\b/i,
      /\bRedovit[aei]?\s+kontrole?\b/i,
      /\bKontrola\s+nadle[\u017ez]nog\b/i,
    /\bPreporu[čc]a\s+se\b/i,
    /\bPreporu[čc]eno\s+je\b/i,
    /\bU[čc]initi\b/i,
    /\bUzeti\s+(?:HK|UK|hemokultur\w*|urinokultur\w*|urin|krv)\b/i,
    /\b(?:HK|UK)\s*x?\s*\d+\b/i,
    /\bS\s+obzirom\s+na\b/i,
    /\bZbog\s+(?:nedostatka|pogoršanja|pogorsanja|sumnje|potrebe|visokog)\b/i,
    /\bMolim\s+(?:pregled|aplicirati|ordinirati|dati|uzeti|u[čc]initi)\b/i,
      /\bOrdiniran[aoaei]?\s+(?:priprem\w*|obrad\w*|pregled\w*|terapij\w*|aplikacij\w*)\b/i,
    /(?:^|\n)\s*PRIJEM\s*[-–—]?(?:\s+[A-ZČĆŽŠĐ]{2,}){0,4}\s*(?:\n|$)/i,
    /\bBAT\s+na\b/i,
    /\bBrzi\s+antigenski\s+test\b/i,
    /\bPCR\s+na\b/i,
    /\bAd\s+(?:internist[auie]?|kirurg[auie]?|neurolog[auie]?|pulmolog[auie]?|kardiolog[auie]?|urolog[auie]?|ginekolog[auie]?)\b/i,
      /\bAd\s+[A-ZČĆŽŠĐa-zčćžšđ.]{3,30}\b/i,
    /\bPacijent(?:ica|icu|a)?\b.{0,140}\b(?:upućuje|upućuje\s+se|upušuje|upućena|upućen|preuzela|preuzeo|preuzeta|preuzet)\b/i,
    /\bTrenutno\b/i,
    /\bPacijent(?:a|ica|icu)?\s+pregledao\b/i,
    /\bPacijent(?:a|ica|icu)?\s+pregledala\b/i,
    /\bU\s+\d{1,2}:\d{2}\s+preuzel[aoa]?\b/i,
    /\bPreuzela\s+dr\b/i,
    /\bPreuzeo\s+dr\b/i,
    /\bMirovanje\b/i,
    /\bKontorla\b/i,
    /\bKontrola\s+(?:kirurga|internista|neurologa|pulmologa|kardiologa|urologa|ginekologa)\b/i,
    /\bTraži\s+se\b/i,
    /\bZaključak\s*[:;]/i,
    /\bZakljucak\s*[:;]/i,
    /\bEpikriza\s*:/i,
    /\bPlan\s*:/i,
    /\bPreporuk[ae]\s*:/i,
    /\bKontrola\b/i,
    /\bKontrolni\s+pregled\b/i,
    /\bOtpust\b/i,
    /\bOtpušta\s+se\b/i,
    /\bUpute\b/i,
    /\bNapomena\s*:/i,
    /\bU\s+slučaju\b/i,
    /\bZavršna\s+dijagnoza\b/i,
    /\bprijem\s+(?:KARDIO|KARDIOLOGIJ[AU]|INTERN[AU]|KIRURGIJ[AU]|NEUROLOGIJ[AU]|PULMOLOGIJ[AU]|UROLOGIJ[AU]|GINEKOLOGIJ[AU])\b/i,
      /\bprijem\s*[-–—]?\s+[A-ZČĆŽŠĐa-zčćžšđ.]+\b/i,
    /\bIndiciran\s+je\s+prijem\b/i,
    /\bLiječnik\s*:/i,
    /\bLijecnik\s*:/i,
    /\bDatum\s+i\s+vrijeme\s+nalaza\s*:/i,
    /\bDg\.?\s*(?:[:;/]|[-–—])\s*/i,
    /\bDg\.\s*/i,
    /\bTh\.?\s*:\s*/i,
    /\bTerapija\s*:\s*/i
  ]);

  const FINAL_THERAPY_SECTION_END_PATTERNS = Object.freeze(THERAPY_SECTION_END_PATTERNS.filter((pattern) => !/(?:O2|O₂|spO2|SpO2)/.test(pattern.source)));

  function isTherapeuticPotassiumDoseAtIndex(source, index) {
    const tail = String(source || '').slice(Math.max(0, index)).replace(/^[\s,;]+/u, '');
    // U OHBP terapiji zapis “K 30mEq” ili “K 40 mEq” znači nadoknada kalija,
    // ne laboratorijska vrijednost kalija. Ne smije rezati terapiju.
    return /^K\s*\d+(?:[.,]\d+)?\s*mEq\b/i.test(tail);
  }

  function trimTherapyAtNarrativeBoundary(value, boundaryPatterns = THERAPY_SECTION_END_PATTERNS) {
    const source = String(value || '');
    let endIndex = source.length;
    boundaryPatterns.forEach(pattern => {
      const match = source.match(pattern);
      if (match && match.index >= 0) {
        if (pattern === LAB_VALUE_START_IN_TEXT_PATTERN && isTherapeuticPotassiumDoseAtIndex(source, match.index)) {
          return;
        }
        endIndex = Math.min(endIndex, match.index);
      }
    });
    return source.slice(0, endIndex).trim();
  }

  const CHRONIC_THERAPY_SOURCE_PATTERN = '(?:iz\\s+BIS-?a?|iz\\s+bolničkog\\s+informacijskog\\s+sustava|iz\\s+(?:zadnjeg|posljednjeg)\\s+otpusnog\\s+pisma(?:\\s+(?:od\\s*)?\\d{1,2}[.\\/-]\\d{1,2}[.\\/-]\\d{4}\\.?|\\s+\\d{1,2}[.\\/]\\d{4}\\.?|\\s+\\d{4}\\.?)?|po\\s+[^:]{1,80}|prema\\s+[^:]{1,120}|s\\s+(?:liste|popisa)\\s+iz\\s+doma|s\\s+(?:liste|popisa)\\s+terapije|iz\\s+doma)';
  const THERAPY_LABEL_WITH_OPTIONAL_SOURCE_PATTERN = `(?:\\s+${CHRONIC_THERAPY_SOURCE_PATTERN}|\\s*\\([^)]{1,160}\\))?\\s*:?\\s*`;

  function removeTherapySourcePrefix(value) {
    return String(value || '')
      // Primjer: "Kronična terapija (prema pratećem popisu iz doma): Andol..."
      // Startni regex ponekad uhvati od zagrade nadalje; na listu ide samo stvarna terapija.
      .replace(/^\s*\((?:prema|po|iz|sukladno)[^)]{1,160}\)\s*:?\s*/i, '')
      // Primjer: "Th - ne zna što troši, ovo je prema zadnjem nalazu: NovoMix...".
      // Na listu ide samo stvarni popis lijekova, bez nesigurnog uvoda.
      .replace(/^\s*ne\s+zna\s+(?:što|sto)\s+(?:troši|trosi|uzima)\b[^:]{0,180}:\s*/i, '')
      .replace(/^\s*ovo\s+je\s+prema\s+(?:zadnjem|posljednjem)\s+nalazu\s*:?[\s,;-]*/i, '')
      // Primjer: "Lijekovi: prema nalazu hitne i e-kartonu-Eliquis...".
      // Na listu ide samo stvarni popis lijekova, bez opisa izvora podataka.
      .replace(/^\s*prema\s+nalazu\s+(?:hitne|HMP|OHBP-a?|interniste|neurologa|lije[čc]nika)\s+i\s+e[-\s]?kartonu\s*[-–—:]?\s*/i, '')
      .replace(/^\s*prema\s+(?:zadnjem|posljednjem)\s+nalazu\s*[-–—:]?\s*/i, '')
      .replace(/^\s*prema\s+(?:nalazu|dokumentaciji|med\.?\s*dok\.?|e[-\s]?kartonu|e[-\s]?kartonu\s+i\s+nalazu)\b[^:;\n]{0,180}[-–—:]\s*/i, '')
      // Primjer: "Lijekovi: pripremještaju iz odjela interne medicine u odjel kirurgije - Meropenem...".
      // Na listu ide samo stvarni popis terapije, bez opisa izvora/premještaja.
      .replace(/^\s*(?:pri\s*premje[šs]taju|prilikom\s+premje[šs]taja|kod\s+premje[šs]taja)\b[^:;\n]{0,220}[-–—:]\s*/i, '')
      .replace(/^\s*(?:prema\s+(?:pratećem|pratecem|med(?:\.|icinskoj)?|zadnjem|popisu)[^:]{0,160}|po\s+zadnjem\s+BIS\s+nalazu(?:\s+iz\s+\d{4})?|iz\s+BIS-?a?|iz\s+bolničkog\s+informacijskog\s+sustava|iz\s+(?:zadnjeg|posljednjeg)\s+otpusnog\s+pisma(?:\s+(?:od\s*)?\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4}\.?|\s+\d{1,2}[.\/]\d{4}\.?|\s+\d{4}\.?)?|s\s+(?:liste|popisa)\s+iz\s+doma|s\s+(?:liste|popisa)\s+terapije|iz\s+doma)\s*:?\s*/i, '')
      .trim();
  }


  function removeMedDokTherapyBlocksFromChronicSearch(value) {
    // U stvarnim OHBP nalazima "Lijekovi iz med. dok." i "Lijekovi prema med. dokumentaciji"
    // često su jedini jasan izvor kronične terapije, pa ih više ne odbacujemo.
    return String(value || '');
  }

  const FINAL_THERAPY_SECTION_START_PATTERNS = Object.freeze([
    /\bTerapija\s+u\s+OHBP[-–—]?u\s*:\s*/i,
    /\bOHBP\s+terapija\s*:\s*/i,
    /\bTerapija\s+pri\s+otpustu\s*:\s*/i,
    /\bPreporučen[ae]?\s+terapij[ae]\s*:\s*/i,
    /\bPreporučena\s+terapija\s*:\s*/i,
    /\bTh\.?\s*(?:[:;/]|[-–—])\s*/i,
    /\bTh\.?\s*\/\s*/i,
    /\bTh\.\s+/i,
    /\bTh\s*[-–—]\s*/i,
    /\bTh\s*:\s*/i,
    /\bTh\s+(?!uzima\b)(?=[A-ZČĆŽŠĐ0-9])/i,
    /\bOrdinirano\s*:\s*/i,
    /\bTijekom\s+opservacije\s+ordiniran[aoaei]?\s*/i,
    /\bTerapija\s*:\s*/i
  ]);


  function isFalsePositiveFinalTherapyStartMatch(candidate, source) {
    const label = String(candidate?.text || '').replace(/\s+/g, ' ');
    if (!/^Th\.?\s+$/i.test(label)) return false;

    const before = String(source || '')
      .slice(Math.max(0, candidate.index - 40), candidate.index)
      .replace(/\s+/g, ' ')
      .trim();
    const after = String(source || '')
      .slice(candidate.index + candidate.length, candidate.index + candidate.length + 80)
      .replace(/\s+/g, ' ')
      .trim();

    // v239: “CT th kralježnice”, “MR th kralježnice” i slični radiološko-anatomski izrazi
    // znače torakalnu kralježnicu, a ne početak terapijskog bloka “Th”.
    if (/\b(?:CT|MSCT|MR|MRI|RTG)\s*$/i.test(before) && /^(?:kralje[žz]nic[aeu]?|ki[čc]m[aeu]?|segment[aeu]?|pr[šs]ljen|vertebr|spine|torakaln)/i.test(after)) {
      return true;
    }
    if (/\bkontrolni\s+(?:CT|MSCT|MR|MRI|RTG)\s*$/i.test(before)) return true;
    if (/^(?:kralje[žz]nic[aeu]?|ki[čc]m[aeu]?|segment[aeu]?|pr[šs]ljen|vertebr|spine)\b/i.test(after)) return true;
    return false;
  }

  function acceptFinalTherapyStartMatch(candidate, source) {
    return !isFalsePositiveFinalTherapyStartMatch(candidate, source);
  }

  function isLikelyFinalOhbpTherapyLine(value) {
    const line = String(value || '')
      .replace(/^[-–—•*\d.)\s]+/u, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!line) return false;
    if (/^(?:opservacija|molim|prijem|primiti|zaključak|zakljucak|ad\b|pregled|kontrola|upute|otpust|otpušta|otpusta|hospitalizacija|obrada)\b/i.test(line)) {
      return false;
    }
    if (/^(?:monitor|monitoring)(?:\b|$)/i.test(line)) return true;
    if (/^(?:Fursemid|Furosemid|Reglan|Acipan|Lanitop|NTG|Kalinor|Cipla|Solu[-\s]?Medrol|Solumedrol|Amlodipin|Concor|Fragmin|Perfalgan|Paracetamol|Tramal|FO|F\.O\.|NaCl|Glukoza)\b/i.test(line)) return true;
    if (/\b(?:inhalacij[aeu]?|inhalacija|inh\.?|udah|kisik|O2|O₂|monitoring)\b/i.test(line)) return true;
    if (/^(?:O2|O₂|kisik)\b/i.test(line) && /\d/.test(line)) return true;
    if (/^(?:NaCl|Ringer|Ionolyte|Hartmann|Plasmalyte|Glukoza|Fiziološka|Fizioloska)\b/i.test(line) && /\d/.test(line)) return true;
    return /\d/.test(line) && /\b(?:mg|g|µg|mcg|ml|mL|L\/min|IU|IJ|tbl\.?|tableta|amp\.?|ampula|inj\.?|i\.v\.?|iv\b|p\.o\.?|per\s+os|s\.c\.?|sc\b|i\.m\.?|im\b|inh\.?|udah|kapi|x\s*\d|\d\s*x\s*\d)\b/i.test(line);
  }

  function cleanAmbulatoryInlineTherapyInstruction(line) {
    let cleanLine = String(line || '').trim();
    // v240: u ambulantnim nalazima nakon aktivne terapije često istim retkom slijede upute
    // poput “Svakodnevno dolaziti...”, “Sutra će se učiniti RTG...” ili “Kontrola...”.
    // One nisu terapija i ne smiju završiti u polju Kronična terapija.
    cleanLine = cleanLine
      .replace(/^Kod\s+ku[ćc]e\s+uzimati\s+/i, '')
      .replace(/^Kod\s+ku[ćc]e\s+(?:nastaviti|primjenjivati)\s+/i, '')
      .replace(/^Uzimati\s+kod\s+ku[ćc]e\s+/i, '');
    cleanLine = cleanLine.replace(/\s*\b(?:Svakodnevno\s+dolaziti\s+na\s+terapiju|Sutra\s+(?:će|ce)\s+se\s+u[čc]initi|Kontrola\b|Kontrolni\s+pregled\b|Javiti\s+se\b|Do[ćc]i\s+na\s+kontrolu\b)[\s\S]*$/i, '');
    return cleanLine.trim();
  }

  function sanitizeAmbulatoryTherapyText(value) {
    return normalizeLineBreaks(value)
      .split('\n')
      .map(line => String(line || '').replace(/\s+/g, ' ').trim())
      .filter(line => {
        if (!line) return false;
        // v241: sigurnosno makni ostatke lažno prepoznatog "th" iz izraza
        // "kontrolni CT th kralježnice"; na listu terapije ne smije ući samo anatomija.
        if (/^(?:kralje[žz]nic[aeu]?|ki[čc]m[aeu]?|segment[aeu]?|pr[šs]ljen(?:ov[ai])?|vertebr[aeu]?|spine)\.?$/i.test(line)) return false;
        if (/\b(?:CT|MSCT|MR|MRI|RTG)\s+th\s+(?:kralje[žz]nic|ki[čc]m|segment|pr[šs]ljen|vertebr)/i.test(line)) return false;
        return true;
      })
      .join('\n')
      .trim();
  }

  function normalizeFinalOhbpTherapyInlineSeparators(value) {
    return String(value || '')
      .replace(/\s*;\s*(?=(?:ovdje\s+)?(?:O2|O₂|F\.?\s*O\.?|FO|NaCl|Ringer|Ionolyte|Hartmann|Plasmalyte|Glukoza|Paracetamol|Perfalgan|Reglan|Acipan|Lanitop|Fursemid|Furosemid)\b)/giu, '\n')
      .replace(/,\s*(?=(?:O2|O₂|F\.?\s*O\.?|FO|NaCl|Ringer|Ionolyte|Hartmann|Plasmalyte|Glukoza)\b)/giu, '\n');
  }

  function acceptFinalOhbpTherapyEndMatch(candidate, tail) {
    const after = String(tail || '')
      .slice(Math.max(0, candidate?.index || 0))
      .replace(/^[\s,;]+/u, '');
    if (/^(?:O2|O₂|F\.?\s*O\.?|FO|NaCl|Ringer|Ionolyte|Hartmann|Plasmalyte|Glukoza|Paracetamol|Perfalgan|Reglan|Acipan|Lanitop|Fursemid|Furosemid)\b/i.test(after)) {
      return false;
    }
    return true;
  }

  const FINAL_THERAPY_HARD_STOP_PATTERNS = Object.freeze([
    /\n\s*(?:Nalaz\s+(?:završio|zavrsio|završila|zavrsila|dovršio|dovrsio|dovršila|dovrsila)\b|Konzultiran[aoaei]?\b|Liječnik\s*:|Lijecnik\s*:|Datum\s+i\s+vrijeme\s+nalaza\s*:)/i,
    /\n\s*(?:Dg\.?\s*(?:[:;/]|[-–—])|Završna\s+dijagnoza|Zavrsna\s+dijagnoza|LAB(?:ORATORIJ)?\b|Laboratorij\b|RTG\b|UZV\b|CT\b|MSCT\b|EKG\b)/i,
    /\b(?:Nalaz\s+(?:završio|zavrsio|završila|zavrsila|dovršio|dovrsio|dovršila|dovrsila)|Konzultiran[aoaei]?|Liječnik\s*:|Lijecnik\s*:)\b/i,
    /(?:^|\n|\s)-{5,}(?=\s|\n|$)/i,
    /\b(?:Epikriza|Plan|Preporuk[ae]|Kontrola)\s*:/i
  ]);

  function extractFinalOhbpTherapyRawValue(source, startMatch) {
    const startIndex = startMatch.index + startMatch.length;
    const tail = String(source || '').slice(startIndex);
    let endIndex = tail.length;
    FINAL_THERAPY_HARD_STOP_PATTERNS.forEach((pattern) => {
      const match = tail.match(pattern);
      if (match && match.index >= 0) endIndex = Math.min(endIndex, match.index);
    });
    return tail.slice(0, endIndex).trim();
  }


  function trimFinalOhbpTherapyAtLineBoundary(value) {
    const raw = normalizeFinalOhbpTherapyInlineSeparators(normalizeLineBreaks(value))
      .replace(/,\s*(?:monitor|monitoring)(?:\s+(?:RR|EKG|SpO2|saturacije|tlaka|puls[a]?|diureze|vitalnih\s+parametara))*\.?\s*$/gim, '')
      .trim();
    if (!raw) return '';
    const lines = raw.split('\n');
    const kept = [];
    let seenBlankAfterTherapy = false;

    for (const originalLine of lines) {
      const line = String(originalLine || '').trim();
      if (!line) {
        if (kept.length > 0) seenBlankAfterTherapy = true;
        continue;
      }

      const bulletLine = /^[-–—•*]\s+/.test(line);
      let cleanLine = line.replace(/^[-–—•*]\s+/u, '').trim();

      // Makni narativni uvod iz terapijskih redaka, ali zadrži stvarno ordiniranu terapiju.
      // Primjeri: "po dolasku RR 80/60 mmHg - ordinirano FO...", "u 14:40 RR 67/47 mmHg - FO...",
      // "U konzultaciji s dr. X - Noradrenalin...".
      cleanLine = cleanLine
        .replace(/^(?:po\s+dolasku|kod\s+dolaska)\b.{0,220}\bordi[kn]irano\s*/i, '')
        .replace(/^u\s+\d{1,2}:\d{2}\b.{0,140}[-–—]\s*(?=\S)/i, '')
        .replace(/^(?:ovdje|u\s+OHBP[-–—]?u|u\s+hitnoj)\s+/i, '');
      const consultationTherapyMatch = cleanLine.match(/^(?:U\s+konzultaciji|U\s+dogovoru)\s+s\b.{0,180}[-–—]\s*(.+)$/i);
      if (consultationTherapyMatch && isLikelyFinalOhbpTherapyLine(consultationTherapyMatch[1])) {
        cleanLine = consultationTherapyMatch[1].trim();
      }
      cleanLine = cleanAmbulatoryInlineTherapyInstruction(cleanLine);
      if (!cleanLine) continue;

      if (/^(?:molim\s+(?:pregled|aplicirati|ordinirati|dati|uzeti|u[čc]initi)|konzultiran[aoaei]?|preporu[čc]a\s+se|preporu[čc]eno\s+je|nastaviti\s+(?:sa\s+)?(?:daljnjom\s+)?obrad\w*|daljnj[ae]\s+obrad\w*|obrad\w*\s+na\s+odjelu|u[čc]initi|s\s+obzirom\s+na|zbog\s+visokog|prijem(?:\s+[A-ZČĆŽŠĐa-zčćžšđ.]+){0,4}|primiti\b|zaključak|zakljucak|epikriza|plan|preporuk[ae]|kontrola|otpust|otpušta|otpusta|ad\s+)\b/i.test(cleanLine)) {
        break;
      }

      // "Th. monitor" je uvod za nadzor, nije terapijska stavka. Ako nakon njega slijede
      // stvarne ordinacije (npr. O2, F.O./NaCl), ne ispisuje se u OHBP terapiju.
      if (kept.length === 0 && /^(?:monitor|monitoring)\b/i.test(cleanLine)) {
        seenBlankAfterTherapy = false;
        continue;
      }

      if (kept.length === 0) {
        kept.push(cleanLine);
        seenBlankAfterTherapy = false;
        continue;
      }

      if (bulletLine && !isLikelyFinalOhbpTherapyLine(cleanLine)) {
        break;
      }

      if (seenBlankAfterTherapy && !isLikelyFinalOhbpTherapyLine(cleanLine)) {
        break;
      }

      if (!isLikelyFinalOhbpTherapyLine(cleanLine) && /^[A-ZČĆŽŠĐa-zčćžšđ]/u.test(cleanLine)) {
        break;
      }

      kept.push(cleanLine);
      seenBlankAfterTherapy = false;
    }

    return kept.join('\n').trim();
  }

  function extractFinalOhbpTherapy(text) {
    const source = normalizeLineBreaks(text).replace(/[ \t]+/g, ' ').trim();
    const startMatch = findLastPatternMatch(source, FINAL_THERAPY_SECTION_START_PATTERNS, acceptFinalTherapyStartMatch);
    if (!startMatch) return '';

    const labelText = source.slice(startMatch.index, startMatch.index + startMatch.length);
    const isExplicitFinalTherapyLabel = /Terapija\s+(?:u\s+OHBP[-–—]?u|pri\s+otpustu)|Preporučen[ae]?\s+terapij[ae]|Preporučena\s+terapija|Ordinirano/i.test(labelText);
    const textBeforeTherapy = source.slice(0, startMatch.index);
    const labelIsGenericTherapy = /\b(?:Th\.?|Terapija)\b/i.test(labelText) && !isExplicitFinalTherapyLabel;
    const shortTextAfterTherapyLabel = source.slice(startMatch.index + startMatch.length, Math.min(source.length, startMatch.index + startMatch.length + 900));
    if (labelIsGenericTherapy && /\bAleri(?:gje|gije)(?:\s+na\s+lijekove)?\b[\s\S]{0,650}\b(?:Status|Pri\s+svijesti|EKG|LAB|Laboratorij|RTG|UZV|Dg\.?|Zavrsna\s+dijagnoza|Zavr[\u0161s]na\s+dijagnoza)\b/i.test(shortTextAfterTherapyLabel)) {
      return '';
    }

    // Samostalni "Th:" u anamnezi označava kućnu/kroničnu terapiju, ne terapiju ordiniranu u OHBP-u.
    // Zato ga za OHBP terapiju prihvaćamo samo ako je prije njega već završna/obradačka zona nalaza
    // (EKG, laboratorij, radiologija ili završni Dg:). Time se izbjegava da kućna terapija ode u OHBP Th.
    const hasFinalTherapyAnchorBefore = /\b(?:EKG|LAB|Laboratorij|Laboratorijski|RTG|UZV|CT|MSCT)\b|\bZavršna\s+dijagnoza\b|\bDg\.?\s*(?:(?:[:;\/]|[-–—])|\s+(?=[A-ZČĆŽŠĐ]))/i.test(textBeforeTherapy);
    if (!isExplicitFinalTherapyLabel && !/\b(?:Ordiniran|Tijekom\s+opservacije)\b/i.test(labelText) && !hasFinalTherapyAnchorBefore) {
      return '';
    }

    const value = extractFinalOhbpTherapyRawValue(source, startMatch) ||
      extractLastOhbpSectionPreserveLineBreaks(source, FINAL_THERAPY_SECTION_START_PATTERNS, FINAL_THERAPY_SECTION_END_PATTERNS, acceptFinalTherapyStartMatch, acceptFinalOhbpTherapyEndMatch);
    const lineBounded = trimFinalOhbpTherapyAtLineBoundary(value);
    const trimmed = trimTherapyAtNarrativeBoundary(lineBounded, FINAL_THERAPY_SECTION_END_PATTERNS);
    if (!trimmed) return '';
    // Ako je parser slučajno uhvatio izrazito dugačak slobodni tekst, sigurnije je ne popuniti terapiju automatski.
    if (trimmed.length > 1200 && !/[\d](?:\s*x\s*\d+|\s*,\s*\d\s*,\s*\d|\s*(?:mg|g|ml|IU|i\.v\.|p\.o\.|s\.c\.))/i.test(trimmed)) {
      return '';
    }
    return trimmed;
  }

  function extractChronicTherapyFromAnamnesis(text) {
    const source = compactOhbpText(text);
    const firstClinicalBoundary = findFirstPatternIndex(source, [
      /\bPri\s+svijesti\b/i,
      /\bStatus\s*:/i,
      /\bIz\s+statusa\s*:/i,
    /\bIz\s+statusa\b/i,
    /\bECOG\s*\d\b/i,
      /\bKlinički\s+status\s*:/i,
      /\bEKG\b/i,
      ...LAB_SECTION_START_PATTERNS,
      /\bRTG\b/i,
      /\bZaključak\s*[:;]/i,
      /\bZavršna\s+dijagnoza\b/i,
      /\bprijem\s+(?:KARDIO|KARDIOLOGIJ[AU]|INTERN[AU]|KIRURGIJ[AU]|NEUROLOGIJ[AU]|PULMOLOGIJ[AU]|UROLOGIJ[AU]|GINEKOLOGIJ[AU])\b/i,
      /\bprijem\s*[-–—]?\s+[A-ZČĆŽŠĐa-zčćžšđ.]+\b/i,
      /\bPrema\s+dogovoru\b/i,
      /\bVraća\s+se\s+na\s+hospitalizaciju\b/i,
      /\bVraca\s+se\s+na\s+hospitalizaciju\b/i,
      /\bLiječnik\s*:/i,
      /\bLijecnik\s*:/i,
      /(?:^|\s)dr\.\s*[A-ZČĆŽŠĐ]/i,
    ]);
    const sourceForSearch = firstClinicalBoundary >= 0 ? source.slice(0, firstClinicalBoundary) : source;
    const chronicSourceForSearch = removeMedDokTherapyBlocksFromChronicSearch(sourceForSearch);

    const labelledChronicTherapy = extractOhbpSection(
      chronicSourceForSearch,
      new RegExp('\\b(?:Lijekovi|Od\\s+lijekova\\s+uzima|Od\\s+lijekova|Kronična\\s+terapija|Dosadašnja\\s+terapija|Redovita\\s+terapija|Kućna\\s+terapija|Th\\.?\\s+od\\s+ku[ćc]e|Th\\.?\\s+prema\\s+nalazu[^:]{0,180})' + THERAPY_LABEL_WITH_OPTIONAL_SOURCE_PATTERN, 'i'),
      THERAPY_SECTION_END_PATTERNS
    );
    if (labelledChronicTherapy) return labelledChronicTherapy;

    // OHBP anamneze ponekad kućnu terapiju označe samo kao "Terapija:".
    // Ako je taj naslov prije Statusa/EKG-a/LAB-a/RTG-a/završne Dg., tretira se kao kronična terapija.
    const anamnesisTherapy = extractOhbpSection(
      chronicSourceForSearch,
      /\bTerapija\s*:\s*/i,
      THERAPY_SECTION_END_PATTERNS
    );
    if (anamnesisTherapy) return anamnesisTherapy;

    // Varijante iz konzilijarnih nalaza: "od TH uzima; Valsartan..." ili "od terapije uzima: ...".
    const odThUzimaTherapy = extractOhbpSection(
      chronicSourceForSearch,
      /\bod\s+(?:TH|Th|terapij[ae])\s+uzima\s*[:;,-]\s*/i,
      THERAPY_SECTION_END_PATTERNS
    );
    if (odThUzimaTherapy) return odThUzimaTherapy;

    // v198: OHBP anamneze često pišu "Od terapije: ..." bez riječi "uzima".
    // To je kućna/kronična terapija ako je prije kliničkog statusa/laba/završne dijagnoze.
    const odTerapijeLabelTherapy = extractOhbpSection(
      chronicSourceForSearch,
      /\bod\s+(?:TH|Th|terapij[ae])\s*:\s*/i,
      THERAPY_SECTION_END_PATTERNS
    );
    if (odTerapijeLabelTherapy) return odTerapijeLabelTherapy;

    // U nekim OHBP nalazima kronična terapija u anamnezi je označena samo kao "Th:".
    // Ako se takav "Th:" nalazi prije statusa/laboratorija/završne dijagnoze, tretira se kao kronična terapija,
    // a ne kao terapija primijenjena u OHBP-u.
    const anamnesisThDashTherapy = extractOhbpSection(
      chronicSourceForSearch,
      /\bTh\.?\s*(?:[-–—]|\/)\s*/i,
      THERAPY_SECTION_END_PATTERNS
    );
    if (anamnesisThDashTherapy) return anamnesisThDashTherapy;

    return extractOhbpSection(
      chronicSourceForSearch,
      /\bTh\.?\s*:\s*/i,
      THERAPY_SECTION_END_PATTERNS
    );
  }

  function isNonTherapyListItem(value, options = {}) {
    const line = String(value || '')
      .replace(/^[-–—•*\d.)\s]+/u, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!line) return true;
    if (!options.includeMonitoring && /^(?:monitor|monitoring)(?:\s+(?:RR|EKG|SpO2|saturacije|tlaka|puls[a]?|diureze|vitalnih\s+parametara))?\.?$/i.test(line)) return true;
    if (/^(?:molim|prijem|primiti|zaključak|zakljucak|ad\b|pregled|kontrola|upute|otpust|otpušta|otpusta|hospitalizacija|obrada|alergije|al\.?\s+na\s+lijekove|fin\b|iz\s+statusa|status\b|liječnik|lijecnik)\b/i.test(line)) return true;
    return false;
  }

  function splitMedicationList(value, options = {}) {
    const sourceForSplit = options.skipNarrativeTrim
      ? String(value || '')
      : trimTherapyAtNarrativeBoundary(value, options.boundaryPatterns || THERAPY_SECTION_END_PATTERNS);
    const cleaned = removeTherapySourcePrefix(sourceForSplit)
      // U kroničnoj terapiji ne ispisuj opis izvora, nego samo lijekove.
      // U stvarnim OHBP zapisima ponekad se nova stavka zalijepi neposredno nakon sheme doziranja.
      // Primjer: "1,0,0Atorvox" -> "1,0,0, Atorvox".
      .replace(/(\b\d\s*,\s*\d\s*,\s*\d)(?=[A-ZČĆŽŠĐ])/gu, '$1, ')
      .replace(/(\b\d\s*x\s*\d+\s*(?:tbl\.?|mg|g|ml)?)(?=[A-ZČĆŽŠĐ])/gu, '$1, ')
      .replace(/\)\s+(?=[A-ZČĆŽŠĐ][\p{L}'’.-]+(?:\s*,|\s+a\s+\d|\s+\d|$))/gu, '), ')
      .replace(/\b(pp\.?|po\s+potrebi)\s+(?=[a-zčćžšđ][\p{L}'’.-]+\s+(?:\d|a\s+\d))/gu, '$1, ')
      .replace(/[ \t]+/g, ' ')
      .trim();

    return splitTherapyItemsSmart(cleaned)
      .map(item => cleanTherapyCandidateText(item))
      .filter(item => !isTherapyJunkCandidate(item))
      .filter(item => !isNonTherapyListItem(item, options))
      .join('\n');
  }


  const DIAGNOSIS_VALIDATION_DB = Object.freeze([
    {
      canonical: 'Febrilitet / vrućica',
      hr: ['vrućica', 'febrilitet', 'temperatura', 'stanje febriliteta'],
      la: ['st febrilis', 'status febrilis', 'febris', 'febrilitas']
    },
    {
      canonical: 'Slabost i umor',
      hr: ['slabost i umor', 'slabost', 'umor', 'malaksalost'],
      la: ['asthenia', 'fatigatio', 'lassitudo']
    },
    {
      canonical: 'Bol u trbuhu / zdjelici',
      hr: ['boli u trbuhu i u zdjelici', 'bol u trbuhu', 'bolovi u trbuhu', 'abdominalna bol', 'bol u zdjelici'],
      la: ['dolor abdominalis', 'dolores abdominales', 'dolor pelvis', 'dolor abdominis']
    },
    {
      canonical: 'Akutni pijelonefritis',
      hr: ['akutni pijelonefritis', 'pijelonefritis'],
      la: ['pyelonephritis acuta', 'pyelonephritis', 'nephritis tubulointerstitialis acuta']
    },
    {
      canonical: 'Infekcija mokraćnog sustava / uroinfekt',
      hr: ['infekcija mokraćnog sustava', 'uroinfekt', 'urinoinfekt', 'cistitis', 'upala mokraćnog mjehura'],
      la: ['uroinfectio', 'infectio tractus urinarii', 'cystitis', 'cystitis acuta']
    },
    {
      canonical: 'Pneumonija',
      hr: ['pneumonija', 'upala pluća', 'bronhopneumonija'],
      la: ['pneumonia', 'pneumonia non specificata', 'bronchopneumonia']
    },
    {
      canonical: 'Plućni infiltrat',
      hr: ['upalni infiltrat', 'infiltrat pluća', 'infiltrat pluca', 'infiltrat desno', 'infiltrat lijevo'],
      la: ['infiltratio pulmonum', 'infiltratio pulmonum lateris dextri', 'infiltratio pulmonum lateris sinistri', 'infiltratio pulmonum lat dex', 'infiltratio pulmonum lat sin']
    },
    {
      canonical: 'Bronhitis / KOPB',
      hr: ['bronhitis', 'akutni bronhitis', 'kronični bronhitis', 'kopb', 'egzacerbacija kopb'],
      la: ['bronchitis', 'bronchitis acuta', 'bronchitis chronica', 'morbus pulmonum obstructivus chronicus', 'exacerbatio kopb']
    },
    {
      canonical: 'Respiratorna infekcija',
      hr: ['respiratorna infekcija', 'akutna respiratorna infekcija', 'infekcija respiratornog trakta', 'infekt respiratornog trakta', 'infekcija gornjih disnih puteva', 'infekcija gornjih dišnih puteva', 'infekcija donjih disnih puteva', 'infekcija donjih dišnih puteva', 'prehlada', 'upala grla'],
      la: ['infectio tractus respiratorii', 'infectio tractus respiratorii acuta', 'infectio tractus respiratorii superioris', 'infectio tractus respiratorii inferioris', 'infectio respiratoria', 'nasopharyngitis acuta', 'rhinopharyngitis acuta', 'pharyngitis acuta', 'tonsillopharyngitis acuta', 'sinusitis acuta', 'laryngitis acuta', 'tracheobronchitis acuta']
    },
    {
      canonical: 'Gastroenteritis / kolitis',
      hr: ['gastroenteritis', 'kolitis', 'infektivni gastroenteritis', 'infektivni kolitis', 'proljev'],
      la: ['gastroenteritis', 'colitis', 'gastroenteritis infectiosa', 'colitis infectiosa', 'diarrhoea', 'diarrhea']
    },
    {
      canonical: 'Divertikulitis / divertikuloza',
      hr: ['divertikulitis', 'divertikuloza', 'akutni divertikulitis', 'suspektni divertikulitis'],
      la: ['diverticulitis', 'diverticulitis acuta', 'diverticulitis ac susp', 'diverticulist ac susp', 'diverticulosis']
    },
    {
      canonical: 'Neoplazma / tumor kolona',
      hr: ['neoplazma kolona', 'tumor kolona', 'tumor sigme', 'npl sigme', 'npl sigmae', 'suspektni npl'],
      la: ['npl colonis', 'npl coli', 'npl sigmae', 'neoplasma sigmae', 'neoplasma coli', 'neoplasma colonis']
    },
    {
      canonical: 'Hematokezija / melena',
      hr: ['hematokezija', 'svježa krv na stolicu', 'krv u stolici', 'melena'],
      la: ['haematochezia', 'hematochezia', 'melaena', 'melena']
    },
    {
      canonical: 'Celulitis / erizipel',
      hr: ['celulitis', 'erizipel', 'crvenilo potkoljenice'],
      la: ['cellulitis', 'erysipelas']
    },
    {
      canonical: 'Sepsa',
      hr: ['sepsa', 'septičko stanje', 'septički šok'],
      la: ['sepsis', 'status septicus', 'shock septicus']
    },
    {
      canonical: 'Virusna infekcija',
      hr: ['virusna infekcija', 'viroza', 'mialgije'],
      la: ['infectio viralis', 'infectio viralis non specificata', 'myalgia', 'myalgiae']
    },
    {
      canonical: 'Ozljede / kontuzije',
      hr: ['površinska ozljeda', 'ozljeda glave', 'ozljeda trbuha', 'kontuzija', 'hematom', 'prijelom'],
      la: ['trauma', 'contusio', 'vulnus', 'fractura', 'haematoma']
    },
    {
      canonical: 'Zatajivanje srca / kardiološke dijagnoze',
      hr: ['zatajivanje srca', 'srčano popuštanje', 'infarkt miokarda', 'fibrilacija atrija', 'hipertenzija', 'arterijska hipertenzija'],
      la: ['insufficientia cordis', 'insufficientia respiratoria', 'insufficientia respiratoria acuta', 'decompensatio cordis', 'infarctus myocardii', 'fibrillatio atriorum', 'hypertensio arterialis', 'status post infarctum myocardii']
    },
    {
      canonical: 'Dijabetes',
      hr: ['dijabetes', 'šećerna bolest', 'diabetes mellitus'],
      la: ['diabetes mellitus', 'dm', 'dm2', 'diabetes mellitus typus 2']
    },
    {
      canonical: 'Prostata / urološke dijagnoze',
      hr: ['hipertrofija prostate', 'uvećana prostata', 'hiperplazija prostate', 'retencija urina'],
      la: ['hypertrophia prostatae', 'hyperplasia prostatae', 'hyp prostatae', 'retentio urinae']
    },
    {
      canonical: 'Lumbosakralni sindrom / diskus hernija',
      hr: ['lumbosakralni sindrom', 'ls sindrom', 'protruzija diska', 'diskus hernija', 'radikulopatija'],
      la: ['sy ls chr', 'sy lumbosacrale', 'syndroma lumbosacrale', 'protrusio disci', 'hernia disci', 'radiculopathia']
    },
    {
      canonical: 'Status nakon zahvata/bolesti',
      hr: ['status nakon', 'stanje nakon', 'operiran', 'apendektomija', 'implantiran stent'],
      la: ['status post', 'st post', 'status post pneumoniam', 'status post pneumonia', 'st post pneumoniam', 'st post pneumonia', 'status post op', 'st post op', 'st post im', 'post appendectomiam', 'post apendectomiam', 'cum impl stent']
    },
    {
      canonical: 'GERB / gastritis',
      hr: ['gerb', 'gastroezofagealna refluksna bolest', 'gastritis'],
      la: ['morbus refluxus gastrooesophagealis', 'refluxus gastrooesophagealis', 'gastritis']
    },
    {
      canonical: 'Kronična bubrežna bolest',
      hr: ['kronična bubrežna bolest', 'bubrežno zatajenje', 'akutno bubrežno oštećenje'],
      la: ['insufficientia renalis chronica', 'insufficientia renalis acuta', 'laesio renalis acuta']
    }
  ]);

  const DIAGNOSIS_VALIDATION_TERMS = Object.freeze(DIAGNOSIS_VALIDATION_DB.flatMap(entry => [
    entry.canonical,
    ...(entry.hr || []),
    ...(entry.la || [])
  ]).map(normalizeDiagnosisValidationText).filter(term => term.length >= 2));

  const DIAGNOSIS_REJECT_PATTERNS = Object.freeze([
    /\b(?:pacijent|pacijentica|bolesnik|bolesnica)\b/i,
    /\b(?:upućen|upućena|upućuje|vraća|vraca|pregledan|pregledana|prema\s+dogovoru|u\s+dogovoru|molim|postavljen\s+T?UK|nalaz\s+urina\s+u\s+izradi|ad\s+infektolog|ad\s+internist|kontrola|preporuč|preporuc|liječnik|lijecnik|hospitalizaciju|odjel|vlastitim\s+prijevozom|pratnji)\b/i,
    /\b(?:anamneza|status|iz\s+statusa|pregled\s+pacijenta|laboratorij|lab\s*:|rtg\s*:|uzv\s*:|th\s*:|terapija\s*:|lijekovi\s*:|alergije)\b/i,
    /\b(?:ne\s+nalazim|uredna\s+je|uredan\s+je|pleuralnog\s+izljeva|pneumotoraksa|kupole\s+ošita|hilovaskularni|sumacijskoj\s+snimci|nativnoj\s+snimci)\b/i
  ]);

  function normalizeDiagnosisValidationText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/\b[a-z]\d{2}(?:\.\d+)?\b/gi, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function splitDiagnosisCandidates(value) {
    const commaPlaceholder = '\uE000';
    let depth = 0;
    const protectedText = String(value || '')
      .replace(/\r\n?/g, '\n')
      .split('')
      .map((char) => {
        if (char === '(') depth += 1;
        if (char === ')' && depth > 0) depth -= 1;
        if (char === ',' && depth > 0) return commaPlaceholder;
        return char;
      })
      .join('');
    const sentenceSplitText = protectedText.replace(/([.!?])\s+(?=(?:[A-Z\u010C\u0106\u017D\u0160\u0110]|\d))/gu, (match, punct, offset, source) => {
      const before = source.slice(Math.max(0, offset - 20), offset + 1);
      if (/\b(?:st|sy|dg|dr|mr|prof)\.$/i.test(before)) return match;
      return `${punct}\n`;
    });
    return sentenceSplitText
      .split(/\n+|;\s*|\s+\/\s+|,(?=\s*(?:[A-ZČĆŽŠĐ]|St\.?\b|Sy\b|DM\b|AH\b|GERB\b|Uro|Diabetes|Hyp|NPL|Divert|Pneum|Seps|Celul|Insuff|Status))/u)
      .map(item => item.replaceAll(commaPlaceholder, ',').replace(/^[\s,.;:\-–—/]+|[\s,.;:\-–—/]+$/g, '').trim())
      .filter(Boolean)
      .slice(0, 24);
  }

  function hasKnownDiagnosisTerm(item) {
    const normalized = normalizeDiagnosisValidationText(item);
    if (!normalized) return false;
    return DIAGNOSIS_VALIDATION_TERMS.some(term => {
      if (!term) return false;
      if (term.length <= 3) {
        return new RegExp(`(?:^| )${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: |$)`).test(normalized);
      }
      return normalized.includes(term) || term.includes(normalized);
    });
  }

  function looksLikeDiagnosisByFallback(item) {
    const source = String(item || '').replace(/\s+/g, ' ').trim();
    const normalized = normalizeDiagnosisValidationText(source);
    if (!normalized) return false;
    if (/\b[A-Z]\d{2}(?:\.\d+)?\b/.test(source)) return true;
    if (/\b(?:ac|chr|chron|susp|io|i\s*o|cum|status\s+febrilis|status\s+post|st\.?\s*post|post\s+op|sy\.?\b|syndrom|syndroma|insuff|infectio|inf{1,2}iltratio|infarctus|fractura|contusio|vulnus|abscessus|perforatio|microperforatio|neoplasma|npl|protrusio|hernia|radiculopathia|haematochezia|diarrhoea|haematoma|insufficientia|insufficientio)\b/i.test(source)) return true;
    if (/\b(?:infekcija|uroinfekt|pneumonija|bronhitis|divertikulitis|divertikuloza|sepsa|celulitis|erizipel|vrućica|febrilitet|slabost|umor|bol|ozljeda|kontuzija|zatajenje|dijabetes|hipertenzija|prostata|neoplazma|tumor|suspekt|protruzija|sindrom|appendektom|apendektom|stent|respiratorna insuficijencija|respiratorno zatajenje)\b/i.test(source)) return true;
    // Kratke latinice s medicinskim nastavcima koje nisu rečenice.
    if (source.length <= 140 && /\b[a-zčćžšđ]{4,}(?:itis|osis|oma|emia|aemia|algia|pathia|plegia|paresis|uria|ectomia|ectomiam)\b/i.test(source)) return true;
    return false;
  }

  function isRejectedDiagnosisCandidate(item) {
    const source = String(item || '').replace(/\s+/g, ' ').trim();
    if (!source) return true;
    if (/^Status\s+febrilis$/i.test(source)) return false;
    // v215: "Status febrilis" i "Status post" su valjani dijagnostički izrazi,
    // čak i kada su u istom retku s idućom dijagnozom (npr. "Status febrilis Sy. Down").
    if (/^Status\s+(?:febrilis|post)\b/i.test(source)) return false;
    if (source.length > 280) return true;
    if (hasLabValueCluster(source, 2, 260) || LAB_VALUE_START_IN_TEXT_PATTERN.test(source) || hasDiagnosisUrineLabHardStop(source)) return true;
    if (DIAGNOSIS_REJECT_PATTERNS.some(pattern => pattern.test(source))) return true;
    // Rečenice s tipičnim glagolima u 3. licu vjerojatnije su epikriza/preporuka nego dijagnoza.
    if (source.length > 80 && /\b(?:je|su|se|ima|nema|negira|navodi|učinjena|učinjen|preporučeno|preporučena|dolazi|vraća|upućen|upućena)\b/i.test(source)) return true;
    return false;
  }

  function validateOhbpDiagnosisText(value) {
    const original = String(value || '').replace(/[ \t]+/g, ' ').replace(/\n[ \t]*/g, '\n').trim();
    if (!original) return { acceptedText: '', warning: '' };

    const candidates = splitDiagnosisCandidates(original);
    const accepted = [];
    const uncertain = [];
    const rejected = [];

    candidates.forEach(candidate => {
      if (isRejectedDiagnosisCandidate(candidate)) {
        rejected.push(candidate);
        return;
      }
      if (hasKnownDiagnosisTerm(candidate) || looksLikeDiagnosisByFallback(candidate) || findDictionaryDiagnosisCanonical(candidate)) {
        accepted.push(candidate);
      } else {
        accepted.push(stripDiagnosisReviewMarkers(candidate));
        uncertain.push(candidate);
      }
    });

    const acceptedText = accepted.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    const warningParts = [];
    if (uncertain.length) {
      warningParts.push(`${uncertain.length} dijagnostičkih dijelova nije rječnički potvrđeno; tekst nije automatski označen`);
    }
    if (rejected.length) {
      warningParts.push(`odbačeno ${rejected.length} očito nedijagnostičkih dijelova`);
    }
    if (!acceptedText && original) {
      warningParts.push('dijagnoza nije prebačena jer su svi dijelovi izgledali kao laboratorij, plan, preporuka ili drugi nedijagnostički tekst');
    }
    return {
      acceptedText,
      warning: warningParts.length ? `Provjera dijagnoze: ${warningParts.join('; ')}.` : ''
    };
  }

  const OHBP_FINAL_DIAGNOSIS_PLAN_BOUNDARY_PATTERNS = Object.freeze([
    // v241: završni Dg. u ambulantnom nalazu mora stati prije plana/upucivanja,
    // npr. "Dg. Oteklina..." pa "Bolesnica se upućuje ortopedu...".
    /\bBolesni(?:k|ca)\s+se\s+upu[ćc]uje\b/i,
    /\bBolesni(?:k|ca)\s+upu[ćc]en[ao]?\b/i,
    /\bPacijent(?:ica)?\s+se\s+upu[ćc]uje\b/i,
    // v215: završna dijagnoza mora stati prije plana praćenja, npr. "- monitor RR, SpO2".
    /(?:^|\n)\s*[-*•]\s*(?:monitor|monitorirati|pratiti|kontrol[aeu]?|kontrola|mjeriti|opservacija|opservirati)\b/i,
    /(?:^|\n)\s*[-*•]\s*(?:RR|SpO2|saturacij[aeu]?|puls|temperatur[aeu]?|diurez[aeu]?)\b/i,
    /(?:^|\n)\s*\*\s*u\s+\d{1,2}[:.]\d{2}\s*h?\s*:/i,
    /(?:^|\n)\s*(?:Plan|Preporuk[ae]|Kontrola)\s*:/i,
    /\bmonitor\s+(?:RR|SpO2|saturacij[aeu]?|puls|temperatur[aeu]?|diurez[aeu]?|vitalne\s+parametre)\b/i,
    /\bmonitorirati\s+(?:RR|SpO2|saturacij[aeu]?|puls|temperatur[aeu]?|diurez[aeu]?|vitalne\s+parametre)\b/i,
    /\bpratiti\s+(?:RR|SpO2|saturacij[aeu]?|puls|temperatur[aeu]?|diurez[aeu]?|vitalne\s+parametre)\b/i,
    /\bkontrola\s+(?:RR|SpO2|saturacij[aeu]?|puls|temperatur[aeu]?|CRP|KKS|urin[ae]?|diurez[aeu]?)\b/i,
    /\bmjeriti\s+(?:RR|SpO2|saturacij[aeu]?|puls|temperatur[aeu]?)\b/i
  ]);

  function trimOhbpDiagnosisAtNarrativeBoundary(value) {
    const source = String(value || '');
    const boundaryPatterns = [
      /(?:^|\n|\s)-{5,}(?=\s|\n|$)/i,
      ...OHBP_FINAL_DIAGNOSIS_PLAN_BOUNDARY_PATTERNS,
      /\bPredan[ao]?\s+zbog\b/i,
      /\bPreuzet[ao]?\s+zbog\b/i,
      /\bPrimljen[ao]?\s+zbog\b/i,
      /\bUpućen[ao]?\s+zbog\b/i,
      /\bUpućuje\s+se\s+zbog\b/i,
      /\bDolazi\s+zbog\b/i,
      /\bJavlja\s+se\s+zbog\b/i,
      /\bPregledan[ao]?\s+zbog\b/i,
      /\bObrađen[ao]?\s+zbog\b/i,
      /\bHospitaliziran[ao]?\s+zbog\b/i,
      /\bprijem\s+(?:KARDIO|KARDIOLOGIJ[AU]|INTERN[AU]|KIRURGIJ[AU]|NEUROLOGIJ[AU]|PULMOLOGIJ[AU]|UROLOGIJ[AU]|GINEKOLOGIJ[AU])\b/i,
      /\bprijem\s*[-–—]?\s+[A-ZČĆŽŠĐa-zčćžšđ.]+\b/i,
      /\bIndiciran\s+je\s+prijem\b/i,
      /\bpreuzet[ao]?\s+od\s+prethodne\s+smjene\b/i,
      /\bpreuzet[ao]?\s+od\b/i,
      /\bU\s+dogovoru\s+s\b/i,
      /\bS\s+obzirom\s+na\b/i,
      /\bNaknadno\b/i,
      /\bPrema\s+dogovoru\b/i,
      /\bVraća\s+se\s+na\s+hospitalizaciju\b/i,
      /\bVraca\s+se\s+na\s+hospitalizaciju\b/i,
      /\bU\s+konzultaciji\s+s\b/i,
      /\bPacijent(?:ica)?\s+se\s+prima\s+u\b/i,
      /\bPacijent(?:ica)?\s+se\s+prima\b/i,
      /\bprima\s+se\s+u\s+(?:JIL|KARDIO|KARDIOLOGIJ[AU]|INTERN[AU]|KIRURGIJ[AU]|NEUROLOGIJ[AU]|PULMOLOGIJ[AU]|UROLOGIJ[AU]|GINEKOLOGIJ[AU])\b/i,
      /\bNalaz\s+(?:završil[ao]|zavrsil[ao]|dovršil[ao]|dovrsil[ao])\b/i,
      /\bLiječnik\s*:/i,
      /\bLijecnik\s*:/i,
      /(?:^|\s)dr\.\s*[A-ZČĆŽŠĐ]/i,
      /\bDatum\s+i\s+vrijeme\s+nalaza\s*:/i,
      /\bTerapija\s+u\s+OHBP[-–—]?u\s*:/i,
      /\bOHBP\s+terapija\s*:/i,
      /\bOrdinirano\s*:/i,
      /\bLaboratorij\b/i,
      /\bLaboratorijsk[iaoe]\b/i,
      /\bNalazi\s*:/i,
      /\bNalaz\s*:/i,
      /\bU\s+nalazu\b/i,
      /\bPretrage\s*:/i,
      /\bObrada\s*:/i,
      ...DIAGNOSIS_URINE_LAB_HARD_STOP_PATTERNS,
      /\bKonzilijarn[iaei]\s+(?:nalaz|pregled|obrada)\b/i,
      /\bKonzultiran[aoaei]?\b/i,
      /\bOpservacija\s+na\s+Odjelu\b/i,
      /\bOpservacija\b/i,
      /\bOpservirati\b/i,
      /\bU\s+ovom\s+tren(?:u|utku)\b/i,
      /\bU\s+ovom\s+\u010dasu\b/i,
      /\bMi[\u0161s]ljenja\s+sam\b/i,
      /\bBez\s+indikacije\s+za\b/i,
      /\bart\.?\s*braunil[aeu]?\b/i,
      /\ba\.?\s*brachialis\b/i,
      /\bIBP\b/i,
      /\b(?:Granisetron|Urapidil|Ebrantil|TXA|traneksami[čc]n[aeiou]*\s+kiselin[aeiou]*)\b/i,
      /\bostala\s+th\s+na\s+odjelu\b/i,
      /\bspO2\b/i,
      /\bO2\s*\d+(?:[.,]\d+)?\s*l\s*\/\s*min\b/i,
      /\bNastaviti\s+(?:sa\s+)?(?:dosada[\u0161s]njom|preporu[\u010dc]enom|ordiniranom)?\s*terapij\w*\b/i,
      /\bRedovit[aei]?\s+kontrole?\b/i,
      /\bKontrola\s+nadle[\u017ez]nog\b/i,
      /\bMolim\s+(?:pregled|aplicirati|ordinirati|dati|uzeti|u[čc]initi)\b/i,
      /\bPostavljen[ao]?\s+(?:T?UK|urinarni\s+kateter|kateter)\b/i,
      /\bNalaz\s+urina\s+u\s+izradi\b/i,
      /\bOrdiniran[aoaei]?\s+(?:priprem\w*|obrad\w*|pregled\w*|terapij\w*|aplikacij\w*)\b/i,
      /\bAd\s+(?:internist[auie]?|kirurg[auie]?|neurolog[auie]?|pulmolog[auie]?|kardiolog[auie]?|urolog[auie]?|ginekolog[auie]?)\b/i,
      /\bAd\s+[A-ZČĆŽŠĐa-zčćžšđ.]{3,30}\b/i,
      /\b(?:Internisti|Kirurzi|Neurolozi|Pulmolozi|Kardiolozi|Urolozi|Ginekolozi)\b/i,
      /\bPacijent(?:ica|icu|a)?\b.{0,140}\b(?:upućuje|upućuje\s+se|upušuje|upućena|upućen|preuzela|preuzeo|preuzeta|preuzet)\b/i,
      /\bNalaz\s+(?:neurologa|kirurga|internista|kardiologa|pulmologa|radiologa|urologa|ginekologa|konzilijarnog)\b/i,
      /\bU\s+prilogu\b/i,
      /\bAnamneza\b/i,
      /\bStatus\s*:/i,
      /\bIz\s+statusa\s*:/i,
    /\bIz\s+statusa\b/i,
    /\bECOG\s*\d\b/i,
      /\bKlinički\s+status\b/i,
      /\bPregled\s+pacijenta\b/i,
      /\bUčinjenom\s+obradom\b/i,
      /\bOtpušta\s+se\b/i,
      /\bSavjetuje\s+se\b/i,
      /\bU\s+slučaju\b/i,
      /\bPreporuk[ae]\b/i,
      /\bTrenutno\b/i,
      /\bPacijent(?:a|ica|icu)?\s+pregledao\b/i,
      /\bPacijent(?:a|ica|icu)?\s+pregledala\b/i,
      /\bU\s+\d{1,2}:\d{2}\s+preuzel[aoa]?\b/i,
      /\bPreuzela\s+dr\b/i,
      /\bPreuzeo\s+dr\b/i,
      /\bDatum\s+(?:nalaza|pregleda|prijema)\s*:/i,
      /\bZavršna\s+dijagnoza\s*,?\s*(?:epikriza\s+i\s+preporuke)?\b/i,
      /\bPrimljen[ao]?\s*:/i,
      /\bKontrola\b/i
    ];

    let endIndex = source.length;
    boundaryPatterns.forEach(pattern => {
      const match = source.match(pattern);
      if (match && match.index >= 0) {
        endIndex = Math.min(endIndex, match.index);
      }
    });

    const urineLabHardStopIndex = findDiagnosisUrineLabHardStopIndex(source);
    if (urineLabHardStopIndex >= 0) {
      endIndex = Math.min(endIndex, urineLabHardStopIndex);
    }

    // Ako laboratorij nema jasan naslov, dijagnoza se ne smije nastaviti kroz lab-nalaze.
    // Reži na prvom laboratorijskom clusteru: barem 2 različita lab-parametra s brojčanim vrijednostima
    // u kratkom odsječku teksta (npr. "CRP 155 L 17,3 Hb 140...").
    const labClusterStartIndex = findLabValueClusterStartIndex(source, 2, 360);
    if (labClusterStartIndex >= 0) {
      endIndex = Math.min(endIndex, labClusterStartIndex);
    }

    // Vitalni znakovi nisu dio dijagnoze; ako parser povuče npr.
    // "CVI susp. - RR u 14.30h: 170/100 mmHg", reže se prije RR.
    const nonDiagnosisTailStartIndex = findNonDiagnosisTailStartIndex(source);
    if (nonDiagnosisTailStartIndex >= 0) {
      endIndex = Math.min(endIndex, nonDiagnosisTailStartIndex);
    }

    return source.slice(0, endIndex);
  }

  function isIcdDiagnosisPrefix(value) {
    return /^\s*[A-TV-Z]\d{2}(?:\.\d+)?\b/i.test(String(value || ''));
  }

  function looksLikeIcdPrefixedDiagnosisLine(line) {
    const source = String(line || '').replace(/\s+/g, ' ').trim();
    if (!source) return false;
    return /^\s*[A-TV-Z]\d{2}(?:\.\d+)?\s*(?:[-–—:]\s*)?\S.{2,}$/i.test(source);
  }

  function isFinalIcdDiagnosisBoundaryLine(line) {
    const source = String(line || '').replace(/\s+/g, ' ').trim();
    if (!source) return false;
    return /^(?:Zaklju[čc]ak|Plan|Preporuk|Th\.?\b|Terapija\b|Lijekovi\b|Aleri(?:gje|gije)\b|Lije[čc]nik\b|Datum\b|Kontrola\b|U\s+slu[čc]aju|Otpu[šs]ta|Otklanja|Prepiur|Preporu[čc]a|Konzultiran|U\s+dogovoru|Prema\s+dogovoru|preuzet[ao]?\s+od|primljen[ao]?\b|prima\s+se\b|Ad\s+|LAB\b|EKG\b|RTG\b|UZV\b|MSCT\b|CT\b)/i.test(source);
  }

  function isSafeIcdDiagnosisContinuationLine(line) {
    const source = String(line || '').replace(/\s+/g, ' ').trim();
    if (!source || source.length > 180) return false;
    if (isFinalIcdDiagnosisBoundaryLine(source)) return false;
    if (hasLabValueCluster(source, 1, 180) || LAB_VALUE_START_IN_TEXT_PATTERN.test(source) || hasDiagnosisUrineLabHardStop(source)) return false;
    if (/\b(?:navodi|negira|dolazi|upu[ćc]en|upu[ćc]ena|pregledan|pregledana|u[čc]injen|u[čc]injena|nalaz|opisuje|preporu[čc]ena|preporu[čc]eno|kontrolni\s+RR|pri\s+svijesti|status)\b/i.test(source)) return false;
    return /\b(?:status\s+post|st\.?\s*post|sy\.?|susp|i\.?\s*o\.?|insuff|pares|pleg|pathia|tensio|diabetes|pneum|seps|fract|contus|vulnus|anaem|emia|aemia|itis|osis|oma|algia|uria|ectomia|Hypertensio|Hemiparesis|Myelopathia)\b/i.test(source);
  }

  function extractFinalIcdDiagnosisBlock(text) {
    const source = normalizeLineBreaks(text).replace(/[ \t]+/g, ' ').trim();
    if (!source) return '';
    const lines = source.split('\n').map(line => line.trim());
    const blocks = [];

    for (let i = 0; i < lines.length; i += 1) {
      if (!looksLikeIcdPrefixedDiagnosisLine(lines[i])) continue;
      const blockLines = [];
      let icdLineCount = 0;

      for (let j = i; j < lines.length; j += 1) {
        const line = lines[j].trim();
        if (!line) {
          if (blockLines.length) break;
          continue;
        }
        if (looksLikeIcdPrefixedDiagnosisLine(line)) {
          blockLines.push(line);
          icdLineCount += 1;
          continue;
        }
        if (blockLines.length && isSafeIcdDiagnosisContinuationLine(line)) {
          blockLines.push(line);
          continue;
        }
        break;
      }

      const candidate = blockLines.join('\n').trim();
      if (!candidate || icdLineCount < 1) continue;
      if (candidate.length < 8 || candidate.length > 900) continue;
      blocks.push({ index: i, icdLineCount, text: candidate });
    }

    if (!blocks.length) return '';
    blocks.sort((a, b) => {
      if (a.icdLineCount !== b.icdLineCount) return b.icdLineCount - a.icdLineCount;
      return b.index - a.index;
    });
    return blocks[0].text;
  }

  function extractUnlabelledFinalDiagnosisBlock(text) {
    const source = normalizeLineBreaks(text).replace(/[ 	]+/g, ' ').trim();
    const lines = source.split('\n');
    let labLineIndex = -1;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (/^(?:LAB|Lab|Laboratorij|Laboratorijski\s+nalaz|Laboratorijski\s+nalazi)\b\s*[:,]?/i.test(line)) {
        labLineIndex = i;
      }
    }
    if (labLineIndex < 0) return '';

    const candidateLines = [];
    let passedLabValues = false;
    for (let i = labLineIndex + 1; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line) {
        if (candidateLines.length > 0) break;
        passedLabValues = true;
        continue;
      }
      if (!passedLabValues && (hasLabValueCluster(line, 1, 240) || LAB_VALUE_START_IN_TEXT_PATTERN.test(line))) {
        continue;
      }
      if (/^(?:[-*•]\s*(?:monitor|monitorirati|pratiti|kontrol[aeu]?|kontrola|mjeriti|RR|SpO2|saturacij|puls|temperatur)|RTG|UZV|CT|MSCT|EKG|Th\b|Th\s*\/|Terapija\b|Zaključak|Zakljucak|Plan|Preporuk|Konzultiran|Opservacija|Opservirati|Naknadno|S\s+obzirom|prijem\b|Liječnik|Lijecnik|dr\.)/i.test(line)) {
        break;
      }
      if (/^(?:Pri\s+svijesti|Status|Iz\s+statusa|Neurološki\s+status|Kardiorespiratorno|Somnolentan|Za\s+vrijeme\s+opservacije)\b/i.test(line)) {
        break;
      }
      candidateLines.push(line);
      if (candidateLines.join(' ').length > 900) break;
    }

    const candidate = candidateLines.join(' ').replace(/\s+/g, ' ').trim();
    if (!candidate) return '';
    if (candidate.length < 10 || candidate.length > 900) return '';
    if (/\b(?:navodi|negira|dolazi|upućen|upućena|pregledan|pregledana|učinjen|učinjena|nalaz|opisuje|preporučena|preporučeno)\b/i.test(candidate)) return '';
    const diagnosisLikeParts = candidate.split(/[,;]|\s{2,}/).map(part => part.trim()).filter(Boolean).length;
    const medicalTerms = /\b(?:pares|pleg|myositis|myositis|nephropath|nepropath|insuff|diabetes|anaemia|anemia|thalassaem|arthritis|gastritis|duodenitis|pseudophakia|cataracta|retinopathia|GERB|MND|IBM|dysphag|dyphag)\b/i.test(candidate);
    if (diagnosisLikeParts < 2 && !medicalTerms) return '';
    return candidate;
  }

  function buildOhbpDiagnosisWarning(value) {
    const source = String(value || '').replace(/\s+/g, ' ').trim();
    if (!source) return '';
    const reasons = [];
    if (source.length > 900) {
      reasons.push('duža je od 900 znakova');
    }
    const diagnosisLabPattern = /(?:^|[\s,;])(?:CRP|Hb|Trc|Lkc|L|GUK|Urea|UREJA|Kreatinin|KREA|Na|K|Cl|AST|ALT|AP|GGT|CK|LDH|Troponin|PV|APTV\s*R|APTV|fibrinogen|Fib|FIB|D[-–]?\s*dimeri|INR)\s*(?::|=)?\s*[<>]?\s*[-+]?\d/i;
    if (hasLabValueCluster(source, 2, 360) || diagnosisLabPattern.test(source) || hasDiagnosisUrineLabHardStop(source)) {
      reasons.push('sadrži moguće laboratorijske ili urinske parametre');
    }
    if (/\b(?:Opservacija|Opservirati|hospitalizacija|dnevna\s+bolnica|preporuk[ae]|monitor\s+(?:RR|SpO2|saturacij|puls|temperatur|diurez)|pratiti\s+(?:RR|SpO2|saturacij|puls|temperatur|diurez|vitalne)|kontrola\s+(?:RR|SpO2|saturacij|puls|temperatur|CRP|KKS|urin|diurez)|art\.?\s*braunil[aeu]?|a\.?\s*brachialis|IBP|Granisetron|Urapidil|Ebrantil|TXA|ostala\s+th\s+na\s+odjelu|spO2|U\s+ovom\s+tren(?:u|utku)|Mi[šs]ljenja\s+sam|Bez\s+indikacije\s+za|Nastaviti\s+(?:sa\s+)?(?:dosada[šs]njom|preporu[čc]enom|ordiniranom)?\s*terapij\w*|Redovit[aei]?\s+kontrole?|Kontrola\s+nadle[žz]nog)\b/i.test(source)) {
      reasons.push('sadrži mogući nastavak plana ili preporuke');
    }
    if (findNonDiagnosisTailStartIndex(source) >= 0) {
      reasons.push('sadrži vitalne parametre');
    }
    if (!reasons.length) return '';
    return `Dijagnoza je sumnjiva (${reasons.join(' i ')}); moguće je da je parser povukao višak teksta. Provjerite ručno.`;
  }

  function stripDiagnosisIcdPrefixes(value) {
    return String(value || '')
      .replace(/(^|[\n,;])\s*[A-TV-Z]\d{2}(?:\.\d+)?\s*[-–—:]?\s+(?=\S)/gi, '$1')
      .replace(/(^|[\n,;])\s*[A-TV-Z]\d{2}(?:\.\d+)?\s*(?=$|[\n,;])/gi, '$1');
  }

  function normalizeOhbpDiagnosisAbbreviations(value) {
    return String(value || '')
      .replace(/\bi\.\s*o\.?\b/gi, 'i.o.')
      .replace(/\bbilalteralis\b/gi, 'bilateralis')
      .replace(/\bbillat\.?\b/gi, 'bilateralis')
      .replace(/\bbilat\.?\b/gi, 'bilateralis')
      .replace(/\bbil\.\b/gi, 'bilateralis');
  }

  function cleanOhbpDiagnosis(value) {
    return normalizeOhbpDiagnosisAbbreviations(stripDiagnosisIcdPrefixes(trimOhbpDiagnosisAtNarrativeBoundary(value)))
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]*/g, '\n')
      // Ako je početna OHBP dijagnoza oblika "R06.0 - Dispneja", na listu ide samo tekst dijagnoze.
      .replace(/(?:^|\s)-{5,}(?:\s|$).*/g, '')
      .replace(/^[;:.,\-–—\s]+/g, '')
      .replace(/^(?:[A-TV-Z]\d{2}(?:\.\d+)?\s*[-–—:]?\s*)+/i, '')
      .replace(/([,;])\s*[A-TV-Z]\d{2}(?:\.\d+)?\s*[-–—:]?\s*/gi, '$1 ')
      .replace(/[.;,\s]+$/g, '')
      .trim();
  }

  function normalizeVitalSignsNumber(value) {
    return String(value || '').replace(',', '.').trim();
  }

  function normalizeOxygenFlow(value) {
    const normalized = normalizeVitalSignsNumber(value);
    if (!normalized) return '';
    return normalized.replace(/\.0$/, '');
  }

  function extractOxygenContextFromSegment(segment, spo2Index = -1) {
    const text = String(segment || '');
    const windowText = spo2Index >= 0
      ? text.slice(Math.max(0, spo2Index - 90), Math.min(text.length, spo2Index + 160))
      : text;

    const oxygenMatch = windowText.match(/(?:uz|na|sa|preko|pod)\s*(?:O2|O₂|kisik(?:u|om)?|oksigenoterapij[aiu])\s*(?:protok(?:om)?\s*)?(\d+(?:[.,]\d+)?)\s*(?:l|L)\s*\/?\s*min/i)
      || windowText.match(/(?:O2|O₂|kisik|oksigenoterapij[aiu])\s*(\d+(?:[.,]\d+)?)\s*(?:l|L)\s*\/?\s*min/i)
      || windowText.match(/(\d+(?:[.,]\d+)?)\s*(?:l|L)\s*\/?\s*min\s*(?:O2|O₂|kisik)/i);
    if (oxygenMatch) return `uz kisik ${normalizeOxygenFlow(oxygenMatch[1])} L/min`;

    if (/\b(?:bez\s+(?:O2|O₂|kisika|oksigenoterapije|suplementacije\s+kisika)|na\s+sobnom\s+zraku|sobni\s+zrak|room\s+air)\b/i.test(windowText)) {
      return 'bez kisika';
    }
    return '';
  }

  function extractVitalSignsFromSegment(segment) {
    const source = normalizeLineBreaks(segment || '').replace(/\s+/g, ' ').trim();
    if (!source) return null;

    const rrMatch = source.match(/\bRR\s*[:=]?\s*(\d{2,3})\s*[/\\]\s*(\d{2,3})\s*(?:mm\s*Hg|mmHg)?/i)
      || source.match(/\b(?:krvni\s+tlak|tlak|TA)\s*[:=]?\s*(\d{2,3})\s*[/\\]\s*(\d{2,3})\s*(?:mm\s*Hg|mmHg)?/i);

    const pulseMatch = source.match(/\bPuls\s*[:=]?\s*(\d{2,3})\s*(?:\.\s*)?(?:\/\s*min|u\s*min|\/min\.|min\b)?/i)
      || source.match(/\bp\s*[:=]\s*(\d{2,3})\s*(?:\/\s*min|u\s*min|\/min\.|min\b)?/i)
      || source.match(/\b(?:cp|c\.p\.|sf)\s*[:=]?\s*(\d{2,3})\s*(?:\/\s*min|u\s*min|\/min\.|min\b)?/i)
      || source.match(/\b(?:sr[čc]ana\s+)?frekv(?:encija|\.)?\s*(?:srca)?\s*[:=]?\s*(\d{2,3})\s*(?:\/\s*min|u\s*min|\/min\.|min\b)/i);

    const respiratoryRateMatch = source.match(/\b(?:Respirac\.?|resp\.?|disanje|frekv\.?\s*disanja|frekvencija\s*disanja|RRf)\s*[:=]?\s*(\d{1,3})\s*(?:\/\s*min|u\s*min|\/min\.|min\b)?/i);

    const spo2Match = source.match(/\bSpO\s*2\s*[:=]?\s*(\d{2,3})\s*%?/i)
      || source.match(/\bSpO₂\s*[:=]?\s*(\d{2,3})\s*%?/i)
      || source.match(/\b(?:saturacija|sat\.?\s*O\s*2|sat\.?\s*O₂)\s*[:=]?\s*(\d{2,3})\s*%?/i);

    if (!rrMatch && !pulseMatch && !respiratoryRateMatch && !spo2Match) return null;

    const lines = [];
    if (rrMatch) lines.push(`${rrMatch[1]}/${rrMatch[2]}`);
    if (pulseMatch) lines.push(`${pulseMatch[1]}/min`);
    if (respiratoryRateMatch) lines.push(`${respiratoryRateMatch[1]}/min`);
    if (spo2Match) {
      const context = extractOxygenContextFromSegment(source, spo2Match.index ?? -1);
      lines.push(`${spo2Match[1]}%${context ? ` (${context})` : ''}`);
    }
    return lines.length ? lines.join('\n') : null;
  }

  function extractOhbpVitalSigns(rawText, compactText) {
    const text = normalizeLineBreaks(rawText || '');
    const compact = compactText || compactOhbpText(text);

    const objectiveMatch = compact.match(/\bObjektivna\s+procjena\s*:\s*([\s\S]*?)(?=\bTrija[žz]na\s+kategorija\b|\bPregled\s+pacijenta\b|\bAnamneza\b|\bStatus\b|\bKlini[čc]ki\s+status\b|\bLaboratorij\b|\bLAB\s*:|$)/i);
    if (objectiveMatch) {
      const vitalSigns = extractVitalSignsFromSegment(objectiveMatch[1]);
      if (vitalSigns) return vitalSigns;
    }

    const statusMatch = compact.match(/(?:\bKlini[čc]ki\s+status\s*:?|\bStatus\s*:?)([\s\S]*?)(?=\bLaboratorij\b|\bLaboratorijski\s+nalazi\b|\bLAB\s*:|\bEKG\b|\bRTG\b|\bUZV\b|\bZavr[šs]na\s+dijagnoza\b|\bDg\.\b|$)/i);
    if (statusMatch) {
      const vitalSigns = extractVitalSignsFromSegment(statusMatch[1]);
      if (vitalSigns) return vitalSigns;
    }

    const vitalLineCandidates = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => {
        if (/\b(?:monitor|monitorirati|pratiti|kontrol[aeu]?|kontrola|mjeriti|preporu)/i.test(line)) return false;
        const hasBloodPressure = /\b(?:RR|TA|krvni\s+tlak|tlak)\s*[:=]?\s*\d{2,3}\s*[/\\]\s*\d{2,3}\b/i.test(line);
        const hasPulse = /\b(?:Puls|cp|c\.p\.|sf)\s*[:=]?\s*\d{2,3}\b/i.test(line);
        const hasRespiratoryRate = /\b(?:Respirac\.?|resp\.?|disanje|frekv\.?\s*disanja|RRf)\s*[:=]?\s*\d{1,3}\b/i.test(line);
        const hasSpo2 = /\b(?:SpO\s*2|saturacija|sat\.?\s*O\s*2)\s*[:=]?\s*\d{2,3}\s*%?/i.test(line);
        return (hasBloodPressure && (hasPulse || hasRespiratoryRate || hasSpo2)) || (hasSpo2 && (hasPulse || hasRespiratoryRate));
      });
    for (const line of vitalLineCandidates) {
      const vitalSigns = extractVitalSignsFromSegment(line);
      if (vitalSigns) return vitalSigns;
    }

    return '';
  }

  const CLINICAL_SAFETY_FIELD_LABELS = Object.freeze({
    diagnosis: 'dijagnoza',
    allergies: 'alergije',
    therapy: 'kron. th',
    ohbpTherapy: 'OHBP th',
    vitalSigns: 'vitalni'
  });

  function makeClinicalSafety(status = 'empty', reason = '', candidate = '') {
    return { status, reason, candidate: String(candidate || '').trim() };
  }

  function isClinicalSafetySafe(parsed, fieldName) {
    return parsed?.clinicalSafety?.[fieldName]?.status === 'safe';
  }

  function hasUnsafeClinicalSafety(parsed, fieldName) {
    const status = parsed?.clinicalSafety?.[fieldName]?.status || '';
    return status === 'uncertain' || status === 'blocked';
  }

  function getUnsafeClinicalSafetySummaries(parsed = {}) {
    const safety = parsed.clinicalSafety || {};
    return Object.keys(CLINICAL_SAFETY_FIELD_LABELS)
      .filter((key) => hasUnsafeClinicalSafety(parsed, key))
      .map((key) => `${CLINICAL_SAFETY_FIELD_LABELS[key]}: ${safety[key].reason || 'nesigurno prepoznavanje'}`);
  }

  function hasClinicalFieldValue(parsed = {}, fieldName) {
    if (CLINICAL_SAFETY_FIELD_LABELS[fieldName]) return isClinicalSafetySafe(parsed, fieldName) && hasParsedValue(parsed[fieldName]);
    return hasParsedValue(parsed[fieldName]);
  }

  function assessClinicalParseSafety(data) {
    const safety = {};

    const diagnosis = String(data.diagnosis || '').trim();
    if (!diagnosis) {
      safety.diagnosis = makeClinicalSafety('empty');
    } else if (data.diagnosisWarning && /(?:sumnjiva|laborator|urinsk|plan|preporuk|vital|duža|duza|višak|visak|terapij)/i.test(data.diagnosisWarning)) {
      safety.diagnosis = makeClinicalSafety('uncertain', 'postoji upozorenje parsera uz dijagnozu', diagnosis);
    } else if (!/^(?:final-dg|unlabelled-final|final-icd)$/i.test(data.diagnosisSource || '')) {
      safety.diagnosis = makeClinicalSafety('uncertain', 'nije nađena jasna završna Dg. sekcija', diagnosis);
    } else if (/\b(?:Molim|Pacijent(?:a|ica|icu)?\s+pregledao|preuzel[aoa]?|Lije[Äc]nik|LAB|RTG|UZV|EKG|Th\.?|Terapija)\b/i.test(diagnosis)) {
      safety.diagnosis = makeClinicalSafety('blocked', 'dijagnoza sadrži tekst koji izgleda kao plan, nalaz ili terapija', diagnosis);
    } else {
      safety.diagnosis = makeClinicalSafety('safe', '', diagnosis);
    }

    const allergies = String(data.allergies || '').trim();
    if (!allergies) {
      safety.allergies = makeClinicalSafety('empty');
    } else if (allergies.length > 160 || /\b(?:Status|EKG|LAB|RTG|UZV|Lijekovi|Terapija|Th\.?|FiN)\b/i.test(allergies)) {
      safety.allergies = makeClinicalSafety('blocked', 'alergije sadrže tekst iz druge sekcije', allergies);
    } else {
      safety.allergies = makeClinicalSafety('safe', '', allergies);
    }

    const therapy = String(data.therapy || '').trim();
    if (!therapy) {
      safety.therapy = makeClinicalSafety('empty');
    } else if (data.therapyLabWarning || therapyTextContainsLabValues(therapy)) {
      safety.therapy = makeClinicalSafety('blocked', 'u kroničnoj terapiji su nađeni mogući laboratorijski parametri', therapy);
    } else if (therapy.length > 1800) {
      safety.therapy = makeClinicalSafety('uncertain', 'kronična terapija je neuobičajeno duga', therapy);
    } else {
      safety.therapy = makeClinicalSafety('safe', '', therapy);
    }

    const ohbpTherapy = String(data.ohbpTherapy || '').trim();
    if (!ohbpTherapy) {
      safety.ohbpTherapy = makeClinicalSafety('empty');
    } else if (ohbpTherapy.length > 1200 || /\b(?:Aleri(?:gje|gije)|Osobna\s+anamneza|Dosada[Å¡s]nje\s+bolesti|Status|EKG|LAB|RTG|UZV|Dg\.?)\b/i.test(ohbpTherapy)) {
      safety.ohbpTherapy = makeClinicalSafety('blocked', 'OHBP terapija sadrži tekst iz druge sekcije', ohbpTherapy);
    } else {
      safety.ohbpTherapy = makeClinicalSafety('safe', '', ohbpTherapy);
    }

    const vitalSigns = String(data.vitalSigns || '').trim();
    if (!vitalSigns) {
      safety.vitalSigns = makeClinicalSafety('empty');
    } else {
      const lines = vitalSigns.split('\n').map((line) => line.trim()).filter(Boolean);
      const invalidVitalLine = lines.find((line) => !/^(?:\d{2,3}\/\d{2,3}|\d{1,3}\/min|\d{2,3}%(?:\s+\([^)]+\))?)$/.test(line));
      const spo2Value = (vitalSigns.match(/\b(\d{2,3})%/) || [])[1];
      const pulseValue = (vitalSigns.match(/\b(\d{2,3})\/min\b/) || [])[1];
      const rrMatch = vitalSigns.match(/\b(\d{2,3})\/(\d{2,3})\b/);
      if (invalidVitalLine) {
        safety.vitalSigns = makeClinicalSafety('blocked', 'vitalni znakovi nisu u očekivanom formatu', vitalSigns);
      } else if ((spo2Value && Number(spo2Value) > 100) || (pulseValue && Number(pulseValue) > 260) || (rrMatch && (Number(rrMatch[1]) > 280 || Number(rrMatch[2]) > 180))) {
        safety.vitalSigns = makeClinicalSafety('blocked', 'vitalni znakovi imaju nemoguće vrijednosti', vitalSigns);
      } else {
        safety.vitalSigns = makeClinicalSafety('safe', '', vitalSigns);
      }
    }

    data.clinicalSafety = safety;
    return data;
  }


  function normalizeFollowUpControlLabItem(value) {
    let text = String(value || '').trim();
    if (!text) return '';
    text = text
      .replace(/^[\s,;:.\-–—]+|[\s,;:.\-–—]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return '';
    const normalized = therapyNormalizeText(text);
    if (/^(?:te|i|uz|sa|s|kontrola|kontrolni|nalaz|nalazi|laboratorij|laboratorijski|ponoviti|ponoviti\s+nalaze|učiniti|uciniti|izvaditi|napraviti|kontrolirati|ponavlja\s+se)$/i.test(normalized)) return '';
    const aliases = [
      { pattern: /^(?:crp)$/i, value: 'CRP' },
      { pattern: /^(?:kks|kompletna\s+krvna\s+slika)$/i, value: 'KKS' },
      { pattern: /^(?:d\s*[-–]?\s*dimeri?|ddimeri?)$/i, value: 'D-dimer' },
      { pattern: /^(?:na)$/i, value: 'Na' },
      { pattern: /^(?:k)$/i, value: 'K' },
      { pattern: /^(?:ast)$/i, value: 'AST' },
      { pattern: /^(?:alt)$/i, value: 'ALT' },
      { pattern: /^(?:ggt|gama\s*gt)$/i, value: 'GGT' },
      { pattern: /^(?:alp|alkalna\s+fosfataza)$/i, value: 'ALP' },
      { pattern: /^(?:guk|glukoza)$/i, value: 'GUK' },
      { pattern: /^(?:pv)$/i, value: 'PV' },
      { pattern: /^(?:aptv|aptt)$/i, value: 'APTV' },
      { pattern: /^(?:ldh)$/i, value: 'LDH' },
      { pattern: /^(?:ck)$/i, value: 'CK' }
    ];
    for (const alias of aliases) {
      if (alias.pattern.test(text)) return alias.value;
    }
    return text.toLowerCase() === 'kreatinin' ? 'kreatinin' : text;
  }

  function normalizeFollowUpControlLabList(value) {
    const source = normalizeLineBreaks(value || '')
      .replace(/\b(?:kada|kad)\s+(?:će|ce)\s+se\b/gi, ' ')
      .replace(/\b(?:ponoviti|kontrolirati|učiniti|uciniti|izvaditi|napraviti|odrediti)\b/gi, ' ')
      .replace(/\b(?:laboratorij(?:ski)?|nalaz(?:e|i)?|pretrag(?:e|a))\b/gi, ' ');
    const parts = source
      .split(/(?:\n|,|;|\bi\b|\bte\b|\+|\/)/i)
      .map(normalizeFollowUpControlLabItem)
      .filter(Boolean);
    const unique = [];
    parts.forEach((item) => {
      if (!unique.some((existing) => existing.toLowerCase() === item.toLowerCase())) unique.push(item);
    });
    return unique;
  }

  function buildFollowUpControlText(items) {
    const lines = ['Kontrola'];
    (items || []).forEach((item) => {
      const clean = normalizeFollowUpControlLabItem(item);
      if (clean) lines.push(clean);
    });
    return lines.join('\n');
  }

  function stripStoppedMedicationLinesForActiveTherapy(value, options = {}) {
    const lines = normalizeLineBreaks(value || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return '';
    const active = lines.filter((line) => !/(?:^|[\s,;()])ex\.?$/i.test(line));
    if (active.length) return active.join('\n');
    return options.emptyIfAllStopped ? '' : lines.join('\n');
  }

  function normalizeTherapyLineForDedupe(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[.;]+$/g, '')
      .trim();
  }

  function mergeTherapyTextBlocks(...blocks) {
    const seen = new Set();
    const merged = [];
    blocks.forEach((block) => {
      normalizeLineBreaks(block || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
          const key = normalizeTherapyLineForDedupe(line);
          if (!key || seen.has(key)) return;
          seen.add(key);
          merged.push(line);
        });
    });
    return merged.join('\n');
  }

  function parseControlDateToIso(dateText, referenceIso = '') {
    const raw = String(dateText || '').trim();
    if (!raw) return '';
    const fullMatch = raw.match(/(\d{1,2})[.\/\-\s]+(\d{1,2})[.\/\-\s]+(\d{4})/);
    if (fullMatch) return parseCroatianDateToIso(fullMatch[0]);
    const partialMatch = raw.match(/(\d{1,2})[.\/\-\s]+(\d{1,2})\.?/);
    if (!partialMatch) return '';
    let year = Number(String(referenceIso || '').slice(0, 4));
    if (!Number.isInteger(year) || year < 1900 || year > 2100) year = new Date().getFullYear();
    const candidate = parseCroatianDateToIso(`${partialMatch[1]}.${partialMatch[2]}.${year}.`);
    if (!candidate) return '';
    const reference = parseIsoDate(referenceIso);
    const candidateDate = parseIsoDate(candidate);
    if (reference && candidateDate && candidateDate.getTime() < reference.getTime()) {
      return parseCroatianDateToIso(`${partialMatch[1]}.${partialMatch[2]}.${year + 1}.`);
    }
    return candidate;
  }

  function isLikelyAmbulatoryInfectologyReport(rawText) {
    const source = compactOhbpText(rawText || '');
    if (!source.trim()) return false;
    const hasAmbulatoryStructure = /\bAnamneza\s+i\s+status\b/i.test(source) || /\bDatum\s+pregleda\s*:/i.test(source);
    // v238: u praksi se u aplikaciju ponekad lijepi samo tijelo ambulantnog nalaza bez zaglavlja.
    // Takav nalaz ipak treba tretirati kao ambulantni ako ima tipičan ambulantni slijed: anamneza/status, Dg., Th. i kontrola,
    // osobito kada piše da je pacijent upućen iz OHBP-a na infektološku obradu/kontrolu.
    const hasAmbulatoryBodyStructure = /\bKlini[čc]ki\s+status\s*:/i.test(source)
      && /\bDg\.\s*[A-ZČĆŽŠĐ]/i.test(source)
      && /\bTh\.?\s*:/i.test(source)
      && /\bKontrola\b/i.test(source);
    const hasAmbulatoryReferralFromOhbp = /\bUpu[ćc]en[ao]?\s+po\s+pregledu\s+i\s+obradi\s+iz\s+OHBP[-–—]?a\b/i.test(source)
      || /\bupu[ćc]en[ao]?\s+.*\biz\s+OHBP[-–—]?a\b/i.test(source);
    const hasAmbulatoryTherapyPlan = /\bOd\s+(?:sutra|danas)\s+uzimati\b/i.test(source)
      || /\bTerapija\s+dalje\b/i.test(source)
      || /\bKontrola\s+(?:po\s+potrebi|u\s+slu[čc]aju)\b/i.test(source);
    const hasFollowUp = /\bKontrola\s+(?:(?:u|na|za|dana)\b|\d{1,2}[.\/\-\s]+\d{1,2})/i.test(source)
      || /\bSvakodnevno\s+dolaziti\s+na\s+terapiju\b/i.test(source);
    const hasOhbpTriage = /\bPodaci\s+sa\s+trija[žz]e\b|\bTrija[žz]na\s+kategorija\b|\bGlavna\s+tegoba\b/i.test(source);
    const hasAmbulatorySignal = hasAmbulatoryStructure || hasAmbulatoryBodyStructure || hasAmbulatoryReferralFromOhbp;
    return hasAmbulatorySignal && (hasFollowUp || hasAmbulatoryTherapyPlan || /\bAnamneza\s+i\s+status\b/i.test(source) || hasAmbulatoryReferralFromOhbp) && !hasOhbpTriage;
  }

  function extractAmbulatoryFollowUpControl(rawText, referenceIso = '') {
    const source = compactOhbpText(rawText || '');
    if (!isLikelyAmbulatoryInfectologyReport(source)) return null;
    const patterns = [
      /\bKontrola\s+(?:(?:u|na|za|dana)\s+)?([^,.\n]{0,40}?(\d{1,2}[.\/\-\s]+\d{1,2}(?:[.\/\-\s]+\d{4})?\.?))\s*(?:,|\s+)\s*(?:kada\s+(?:će|ce)\s+se\s+)?(?:ponoviti|kontrolirati|učiniti|uciniti|izvaditi|napraviti|odrediti)\s+([^\n.]{1,220})/i,
      /\bKontrola\s+(?:(?:u|na|za|dana)\s+)?([^,.\n]{0,40}?(\d{1,2}[.\/\-\s]+\d{1,2}(?:[.\/\-\s]+\d{4})?\.?))[^\n.]{0,140}?\b(?:CRP|KKS|kreatinin|ureja|elektroliti|Na|K|AST|ALT|GGT|bilirubin|PV|APTV|D\s*[-–]?\s*dimer)\b([^\n.]{0,220})/i,
      // v229: “Kontrola 25.5., po potrebi ranije.” nema laboratorije; na listi se smije ispisati samo “Kontrola”.
      /\bKontrola\s+(?:(?:u|na|za|dana)\s+)?(?:[A-ZČĆŽŠĐa-zčćžšđ]+\s+)?([^,.\n]{0,20}?(\d{1,2}[.\/\-\s]+\d{1,2}(?:[.\/\-\s]+\d{4})?\.?))\s*,?\s*(?:po\s+potrebi\s+ranije|prema\s+potrebi|ranije\s+po\s+potrebi|ranije)?\s*(?:\.|\n|$)/i,
      /\bKontrola\s+(?:(?:u|na|za|dana)\s+)?([^,.\n]{0,40}?(\d{1,2}[.\/\-\s]+\d{1,2}(?:[.\/\-\s]+\d{4})?\.?))[^\n.]*\./i
    ];
    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (!match) continue;
      const dateIso = parseControlDateToIso(match[2], referenceIso);
      if (!dateIso) continue;
      const tail = match[3] || '';
      const labs = normalizeFollowUpControlLabList(tail);
      const safeLabs = labs.length ? labs : [];
      return {
        date: dateIso,
        text: buildFollowUpControlText(safeLabs),
        labs: safeLabs
      };
    }
    return null;
  }

  function extractAmbulatoryRecommendedTherapy(rawText) {
    const source = normalizeLineBreaks(rawText || '').replace(/[ \t]+/g, ' ').trim();
    if (!source) return '';
    const startPatterns = [
      /\bKod\s+ku[ćc]e\s+uzimati\s+/i,
      /\bOd\s+(?:sutra|danas)\s+uzimati\s+(?:sljede[ćc]u\s+|ovu\s+|preporu[čc]enu\s+)?terapij[uae]?\s*:?\s*/i,
      /\bUzimati\s+(?:sljede[ćc]u\s+|ovu\s+|preporu[čc]enu\s+)?terapij[uae]?\s*:?\s*/i,
      /\bTerapija\s+od\s+(?:sutra|danas)\s*:?\s*/i,
      /\bTerapija\s+dalje\s*:?\s*/i,
      /\bPreporu[čc]en[ae]?\s+terapij[ae]\s*:?\s*/i,
      /\bPreporu[čc]uje\s+se\s+terapij[ae]?\s*:?\s*/i
    ];
    const startMatch = findLastPatternMatch(source, startPatterns);
    if (!startMatch) return '';
    const tail = source.slice(startMatch.index + startMatch.length);
    const endPatterns = [
      /\n\s*Kontrola\b/i,
      /(?:^|\s)Svakodnevno\s+dolaziti\s+na\s+terapiju\b/i,
      /(?:^|\s)Sutra\s+(?:će|ce)\s+se\s+u[čc]initi\b/i,
      /(?:^|\s)Kontrola\b/i,
      /\n\s*Lije[čc]nik\s*:/i,
      /\n\s*Datum\s+izdavanja\s*:/i,
      /\n\s*Umjesto\s+preporu[čc]enog\s+lijeka\b/i,
      /\n\s*-{5,}\s*(?:\n|$)/i,
      /\n\s*MBOO\s*:/i,
      /\n\s*Dg\.\s*/i,
      /\n\s*Th\.?\s*:/i
    ];
    let endIndex = tail.length;
    endPatterns.forEach((pattern) => {
      const match = tail.match(pattern);
      if (match && match.index >= 0) endIndex = Math.min(endIndex, match.index);
    });
    const value = cleanAmbulatoryInlineTherapyInstruction(tail.slice(0, endIndex)
      .replace(/^\s*[-–—•]\s*/gmu, '')
      .replace(/\n\s*[-–—•]\s*/gmu, '\n')
      .trim())
      .replace(/[.;]+$/g, '')
      .trim();
    return value;
  }

  function parseOhbpText(rawText) {
    const text = normalizeLineBreaks(rawText);
    const compact = compactOhbpText(text);
    const data = {};

    const personNameResult = extractOhbpPersonNameResult(text, compact);
    if (personNameResult.fullName) data.fullName = personNameResult.fullName;
    if (personNameResult.nameValidationWarning) data.nameValidationWarning = personNameResult.nameValidationWarning;
    if (personNameResult.nameOrderWarning) data.nameOrderWarning = personNameResult.nameOrderWarning;

    const birthMatch = compact.match(/\bro(?:đ|d|dj|\?|\uFFFD)en[ao]?\s*:?\s*(\d{1,2}[.\/\-\s]+\d{1,2}[.\/\-\s]+(\d{4}))/iu);
    if (birthMatch) data.birthYear = birthMatch[2];

    const dateMatch = compact.match(/\bPrimljen[ao]?\s*:\s*(\d{1,2}[.\/\-\s]+\d{1,2}[.\/\-\s]+\d{4})/i) ||
      compact.match(/\bDatum\s+(?:nalaza|pregleda|prijema)\s*:\s*(\d{1,2}[.\/\-\s]+\d{1,2}[.\/\-\s]+\d{4})/i);
    if (dateMatch) data.admissionDate = parseCroatianDateToIso(dateMatch[1]);

    const patientOrigin = extractPatientOrigin(text);
    if (patientOrigin) data.patientOrigin = patientOrigin;

    if (isLikelyAmbulatoryInfectologyReport(text)) {
      data.reportType = 'ambulatory';
      const followUpControl = extractAmbulatoryFollowUpControl(text, data.admissionDate || '');
      if (followUpControl) {
        data.followUpControlDate = followUpControl.date;
        data.followUpControl = followUpControl.text;
      }
    }

    const vitalSigns = extractOhbpVitalSigns(text, compact);
    if (vitalSigns) data.vitalSigns = vitalSigns;

    let diagnosis = extractLastOhbpSection(compact, [
      /\bDg\.?\s*(?:[:;/]|[-–—])\s*/i,
      /\bDg\.?\s*\/\s*/i,
      /\bDg\.\s*/i,
      /\bDg\s+(?=[A-ZČĆŽŠĐ])/i,
      // Ne hvatati naslov "Završna dijagnoza, epikriza i preporuke" kao samu dijagnozu.
      /\bZavršna\s+dijagnoza\s*:\s*/i,
      /\bDijagnoze\s*:\s*/i,
      /\bDijagnoza\s*:\s*/i
    ], [
      /(?:^|\n|\s)-{5,}(?=\s|\n|$)/i,
      ...OHBP_FINAL_DIAGNOSIS_PLAN_BOUNDARY_PATTERNS,
      /\bkonzultiran[aoaei]?\b/i,
      /\bMolim\s+(?:pregled|aplicirati|ordinirati|dati|uzeti|u[čc]initi)\b/i,
      /\bPostavljen[ao]?\s+(?:T?UK|urinarni\s+kateter|kateter)\b/i,
      /\bNalaz\s+urina\s+u\s+izradi\b/i,
      /\bOrdiniran[aoaei]?\s+(?:priprem\w*|obrad\w*|pregled\w*|terapij\w*|aplikacij\w*)\b/i,
      /\bAd\s+(?:internist[auie]?|kirurg[auie]?|neurolog[auie]?|pulmolog[auie]?|kardiolog[auie]?|urolog[auie]?|ginekolog[auie]?)\b/i,
      /\bAd\s+[A-ZČĆŽŠĐa-zčćžšđ.]{3,30}\b/i,
      /\b(?:Internisti|Kirurzi|Neurolozi|Pulmolozi|Kardiolozi|Urolozi|Ginekolozi)\b/i,
      /\bPacijent(?:ica|icu|a)?\b.{0,140}\b(?:upućuje|upućuje\s+se|upušuje|upućena|upućen|preuzela|preuzeo|preuzeta|preuzet)\b/i,
      /\bindiciran[aoaei]?\b/i,
      /\bpreuzet[ao]?\s+od\s+prethodne\s+smjene\b/i,
      /\bpreuzet[ao]?\s+od\b/i,
      /\bU\s+dogovoru\s+s\b/i,
      /\bS\s+obzirom\s+na\b/i,
      /\bNaknadno\b/i,
      /\bPrema\s+dogovoru\b/i,
      /\bVraća\s+se\s+na\s+hospitalizaciju\b/i,
      /\bVraca\s+se\s+na\s+hospitalizaciju\b/i,
      /\bU\s+konzultaciji\s+s\b/i,
      /\bPacijent(?:ica)?\s+se\s+prima\s+u\b/i,
      /\bPacijent(?:ica)?\s+se\s+prima\b/i,
      /\bprima\s+se\s+u\s+(?:JIL|KARDIO|KARDIOLOGIJ[AU]|INTERN[AU]|KIRURGIJ[AU]|NEUROLOGIJ[AU]|PULMOLOGIJ[AU]|UROLOGIJ[AU]|GINEKOLOGIJ[AU])\b/i,
      /\bNalaz\s+(?:završil[ao]|zavrsil[ao]|dovršil[ao]|dovrsil[ao])\b/i,
      /\bprijem\s+(?:KARDIO|KARDIOLOGIJ[AU]|INTERN[AU]|KIRURGIJ[AU]|NEUROLOGIJ[AU]|PULMOLOGIJ[AU]|UROLOGIJ[AU]|GINEKOLOGIJ[AU])\b/i,
      /\bprijem\s*[-–—]?\s+[A-ZČĆŽŠĐa-zčćžšđ.]+\b/i,
      /\bPrema\s+dogovoru\b/i,
      /\bVraća\s+se\s+na\s+hospitalizaciju\b/i,
      /\bVraca\s+se\s+na\s+hospitalizaciju\b/i,
      /\bLiječnik\s*:/i,
      /\bLijecnik\s*:/i,
      /(?:^|\s)dr\.\s*[A-ZČĆŽŠĐ]/i,
      /\bDatum\s+i\s+vrijeme\s+nalaza\s*:/i,
      /\bpreporuk[ae]\b/i,
      /\bPredan[ao]?\s+zbog\b/i,
      /\bPreuzet[ao]?\s+zbog\b/i,
      /\bPrimljen[ao]?\s+zbog\b/i,
      /\bUpućen[ao]?\s+zbog\b/i,
      /\bUpućuje\s+se\s+zbog\b/i,
      /\bDolazi\s+zbog\b/i,
      /\bJavlja\s+se\s+zbog\b/i,
      /\bPregledan[ao]?\s+zbog\b/i,
      /\bObrađen[ao]?\s+zbog\b/i,
      /\bHospitaliziran[ao]?\s+zbog\b/i,
      /\bprijem\s+(?:KARDIO|KARDIOLOGIJ[AU]|INTERN[AU]|KIRURGIJ[AU]|NEUROLOGIJ[AU]|PULMOLOGIJ[AU]|UROLOGIJ[AU]|GINEKOLOGIJ[AU])\b/i,
      /\bprijem\s*[-–—]?\s+[A-ZČĆŽŠĐa-zčćžšđ.]+\b/i,
      /\bIndiciran\s+je\s+prijem\b/i,
      /\bPrema\s+dogovoru\b/i,
      /\bVraća\s+se\s+na\s+hospitalizaciju\b/i,
      /\bVraca\s+se\s+na\s+hospitalizaciju\b/i,
      /\bLiječnik\s*:/i,
      /\bLijecnik\s*:/i,
      /(?:^|\s)dr\.\s*[A-ZČĆŽŠĐ]/i,
      /\bDatum\s+i\s+vrijeme\s+nalaza\s*:/i,
      /\bTerapija\s+u\s+OHBP[-–—]?u\s*:/i,
      /\bOHBP\s+terapija\s*:/i,
      /\bOrdinirano\s*:/i,
      /\bLaboratorij\b/i,
      /\bLaboratorijsk[iaoe]\b/i,
      /\bNalazi\s*:/i,
      /\bNalaz\s*:/i,
      /\bU\s+nalazu\b/i,
      /\bPretrage\s*:/i,
      /\bObrada\s*:/i,
      /\bKonzilijarn[iaei]\s+(?:nalaz|pregled|obrada)\b/i,
      /\bNalaz\s+(?:neurologa|kirurga|internista|kardiologa|pulmologa|radiologa|urologa|ginekologa|konzilijarnog)\b/i,
      /\bU\s+prilogu\b/i,
      /\bTh\.?(?=\s|[:;/]|[-–—])\s*(?:[:;/]|[-–—])?\s*/i,
      /\bTerapija\s+u\s+OHBP[-–—]?u\s*:/i,
      /\bOHBP\s+terapija\s*:/i,
      /\bOrdinirano\s*:/i,
      /\bTerapija\s*:/i,
      /\bLijekovi\s*:/i,
      /\bAleri(?:gje|gije)(?:\s+na\s+lijekove)?\s*:?/i,
      /\bAL\.?\s+na\s+lijekove\s*:/i,
      /\bAL\.?\s*:/i,
      /\bFIN\s*:/i,
      /\bFiN\s*:/i,
      /\bPregled\s+pacijenta\b/i,
      /\bUčinjenom\s+obradom\b/i,
      /\bOtpušta\s+se\b/i,
      /\bSavjetuje\s+se\b/i,
      /\bU\s+slučaju\b/i,
      /\bAnamneza\b/i,
      /\bKlinički\s+status\b/i,
      /\bZaključak\s*[:;]/i,
      /\bZavršna\s+dijagnoza\b/i,
      /\bRTG\b/i,
      /\bMSCT\b/i,
      /\bCT\b/i,
      /\bUZV\b/i,
      /\bEKG\b/i,
      ...LAB_SECTION_START_PATTERNS,
      ...DIAGNOSIS_URINE_LAB_HARD_STOP_PATTERNS,
      /\bMBOO\s*:/i,
      /\bDatum\s+(?:nalaza|pregleda|prijema)\s*:/i,
      /\bPrimljen[ao]?\s*:/i
    ]);
    const explicitFinalDiagnosis = extractLastOhbpSection(compact, [
      /\bDg\.?\s*(?:[:;/]|[-–—])\s*/i,
      /\bDg\.?\s*\/\s*/i,
      /\bDg\.\s*/i,
      /\bDg\s+(?=[A-ZČĆŽŠĐ])/i
    ], [
      /(?:^|\n|\s)-{5,}(?=\s|\n|$)/i,
      ...OHBP_FINAL_DIAGNOSIS_PLAN_BOUNDARY_PATTERNS,
      /\bZavršna\s+dijagnoza\s*,?\s*(?:epikriza\s+i\s+preporuke)?\b/i,
      /\bTh\.?(?=\s|[:;/]|[-–—])\s*(?:[:;/]|[-–—])?\s*/i,
      /\bTerapija\s+u\s+OHBP[-–—]?u\s*:/i,
      /\bOHBP\s+terapija\s*:/i,
      /\bOrdinirano\s*:/i,
      /\bTerapija\s*:/i,
      /\bLijekovi\s*:/i,
      ...DIAGNOSIS_URINE_LAB_HARD_STOP_PATTERNS,
      /\bMSCT\b/i,
      /\bCT\b/i,
      /\bRTG\b/i,
      /\bUZV\b/i,
      /\bEKG\b/i,
      /\bS\s+obzirom\s+na\b/i,
      /\bNaknadno\b/i,
      /\bKonzultiran[aoaei]?\b/i,
      /\bPostavljen[ao]?\s+(?:T?UK|urinarni\s+kateter|kateter)\b/i,
      /\bNalaz\s+urina\s+u\s+izradi\b/i,
      /\bOrdiniran[aoaei]?\s+(?:priprem\w*|obrad\w*|pregled\w*|terapij\w*|aplikacij\w*)\b/i,
      /\bOpservacija\s+na\s+Odjelu\b/i,
      /\bOpservacija\b/i,
      /\bOpservirati\b/i,
      /\bU\s+ovom\s+tren(?:u|utku)\b/i,
      /\bU\s+ovom\s+\u010dasu\b/i,
      /\bMi[\u0161s]ljenja\s+sam\b/i,
      /\bBez\s+indikacije\s+za\b/i,
      /\bart\.?\s*braunil[aeu]?\b/i,
      /\ba\.?\s*brachialis\b/i,
      /\bIBP\b/i,
      /\b(?:Granisetron|Urapidil|Ebrantil|TXA|traneksami[čc]n[aeiou]*\s+kiselin[aeiou]*)\b/i,
      /\bostala\s+th\s+na\s+odjelu\b/i,
      /\bspO2\b/i,
      /\bO2\s*\d+(?:[.,]\d+)?\s*l\s*\/\s*min\b/i,
      /\bNastaviti\s+(?:sa\s+)?(?:dosada[\u0161s]njom|preporu[\u010dc]enom|ordiniranom)?\s*terapij\w*\b/i,
      /\bRedovit[aei]?\s+kontrole?\b/i,
      /\bKontrola\s+nadle[\u017ez]nog\b/i,
      /\bprijem\s*[-–—]?\s+[A-ZČĆŽŠĐa-zčćžšđ.]+\b/i,
      /\bAd\s+[A-ZČĆŽŠĐa-zčćžšđ.]{3,30}\b/i,
      /\bpreuzet[ao]?\s+od\s+prethodne\s+smjene\b/i,
      /\bpreuzet[ao]?\s+od\b/i,
      /\bU\s+dogovoru\s+s\b/i,
      /\bS\s+obzirom\s+na\b/i,
      /\bNaknadno\b/i,
      /\bPrema\s+dogovoru\b/i,
      /\bPacijent(?:ica)?\s+se\s+prima\b/i,
      /\bNalaz\s+(?:završil[ao]|zavrsil[ao]|dovršil[ao]|dovrsil[ao])\b/i,
      /(?:^|\s)dr\.\s*[A-ZČĆŽŠĐ]/i,
      /\bLiječnik\s*:/i,
      /\bLijecnik\s*:/i,
      /(?:^|\s)dr\.\s*[A-ZČĆŽŠĐ]/i,
      /\bZaključak\s*[:;]/i,
      /\bZakljucak\s*[:;]/i
    ]);
    let diagnosisSource = diagnosis ? 'labelled-diagnosis' : '';
    if (explicitFinalDiagnosis) {
      diagnosis = explicitFinalDiagnosis;
      diagnosisSource = 'final-dg';
    } else {
      const icdPrefixedDiagnosis = extractFinalIcdDiagnosisBlock(text);
      if (icdPrefixedDiagnosis) {
        diagnosis = icdPrefixedDiagnosis;
        diagnosisSource = 'final-icd';
      } else {
        const unlabelledDiagnosis = extractUnlabelledFinalDiagnosisBlock(text);
        if (unlabelledDiagnosis) {
          diagnosis = unlabelledDiagnosis;
          diagnosisSource = 'unlabelled-final';
        }
      }
    }

    if (diagnosis) {
      const cleanedDiagnosis = cleanOhbpDiagnosis(diagnosis);
      const diagnosisValidation = validateOhbpDiagnosisText(cleanedDiagnosis);
      if (diagnosisValidation.acceptedText) {
        // Završni Dg: redak smije sadržavati više dijagnoza odvojenih zarezima.
        // Nijedan prepoznati segment ne smije nestati; rječničko-latinska korekcija
        // ne dodaje oznaku [provjeriti] u tekst dijagnoze.
        data.diagnosis = normalizeOhbpDiagnosisAbbreviations(stripDiagnosisReviewMarkers(correctLatinDiagnosisText(diagnosisValidation.acceptedText)));
        data.diagnosisSource = diagnosisSource;
      }
      const diagnosisWarnings = [];
      const diagnosisWarning = buildOhbpDiagnosisWarning(cleanedDiagnosis);
      if (diagnosisWarning) diagnosisWarnings.push(diagnosisWarning);
      if (diagnosisValidation.warning) diagnosisWarnings.push(diagnosisValidation.warning);
      if (diagnosisWarnings.length) data.diagnosisWarning = diagnosisWarnings.join(' ');
    }

    const ambulatoryRecommendedTherapy = data.reportType === 'ambulatory' ? extractAmbulatoryRecommendedTherapy(text) : '';
    const finalTherapy = extractFinalOhbpTherapy(text);
    if (finalTherapy) {
      const finalTherapyText = splitMedicationList(finalTherapy, { includeMonitoring: true, skipNarrativeTrim: true });
      if (data.reportType === 'ambulatory') {
        // U ambulantnom nalazu “Th:” ide u glavno polje TERAPIJA/Kronična terapija,
        // a ne u zasebni OHBP okvir. Ako postoji dodatna kućna preporuka istog retka/odlomka,
        // spajamo samo stvarne lijekove i izbacujemo upute tipa kontrola/RTG/svakodnevni dolazak.
        const activeFinalTherapy = sanitizeAmbulatoryTherapyText(stripStoppedMedicationLinesForActiveTherapy(finalTherapyText, { emptyIfAllStopped: Boolean(ambulatoryRecommendedTherapy) }));
        if (activeFinalTherapy) data.therapy = activeFinalTherapy;
      } else {
        data.ohbpTherapy = finalTherapyText;
      }
    }

    if (ambulatoryRecommendedTherapy) {
      const recommendedTherapyText = splitMedicationList(ambulatoryRecommendedTherapy);
      data.therapy = data.reportType === 'ambulatory'
        ? sanitizeAmbulatoryTherapyText(mergeTherapyTextBlocks(data.therapy, recommendedTherapyText))
        : recommendedTherapyText;
    }

    const medications = extractOhbpSection(compact, new RegExp('\bLijekovi' + THERAPY_LABEL_WITH_OPTIONAL_SOURCE_PATTERN, 'i'), THERAPY_SECTION_END_PATTERNS);
    const chronicTherapy = medications || extractChronicTherapyFromAnamnesis(compact);
    if (chronicTherapy && !(data.reportType === 'ambulatory' && data.therapy)) {
      data.therapy = data.reportType === 'ambulatory'
        ? sanitizeAmbulatoryTherapyText(splitMedicationList(chronicTherapy))
        : splitMedicationList(chronicTherapy);
      if (therapyTextContainsLabValues(data.therapy)) {
        data.therapyLabWarning = 'Kronična terapija sadrži moguće laboratorijske parametre; provjerite je li laboratorij pogrešno ušao u terapiju.';
      }
    }

    const labResult = extractOhbpLabsResult(compact);
    if (labResult.value) {
      data.labRaw = labResult.value;
      if (labResult.foundWithoutMarker) {
        data.labWithoutMarkerWarning = 'Laboratorij je prepoznat bez jasnog naslova “Laboratorij:”. Provjerite je li ispravno izdvojen.';
      }
    }

    const allergies = extractOhbpAllergies(text);
    if (allergies) {
      data.allergies = allergies;
    }

    const radiology = extractOhbpRadiology(text);
    if (radiology) {
      data.radiologyRaw = radiology;
    }

    return assessClinicalParseSafety(data);
  }

  function parseDepartmentPatientText(rawText, context = {}) {
    const data = parseOhbpText(rawText);
    data.patientMode = PATIENT_MODES.WARD;
    data.parserMode = 'department';
    if (context?.source) data.parserSource = context.source;
    return data;
  }

  function findAmbulatoryBoundaryIndex(value) {
    const text = String(value || '');
    const boundaries = [
      /\bKontrola\b/i,
      /\bTh\.?\b/i,
      /\bTerapija\b/i,
      /\bPreporuka\b/i,
      /\bPlan\b/i,
      /\bNalaz\b/i
    ];
    return boundaries.reduce((best, pattern) => {
      const match = text.match(pattern);
      if (!match || match.index == null) return best;
      return best < 0 ? match.index : Math.min(best, match.index);
    }, -1);
  }

  function cleanAmbulatoryDiagnosis(value) {
    let text = normalizeLineBreaks(value || '')
      .replace(/\s+/g, ' ')
      .replace(/^[\s:;.,\-–—]+|[\s:;.,\-–—]+$/g, '')
      .trim();
    const boundary = findAmbulatoryBoundaryIndex(text);
    if (boundary >= 0) text = text.slice(0, boundary).trim();
    return text.replace(/[\s:;.,\-–—]+$/g, '').trim();
  }

  function extractAmbulatoryDiagnosis(rawText, fallback = '') {
    const source = normalizeLineBreaks(rawText || '');
    const labelled = source.match(/(?:^|\n)\s*(?:Dg\.?|Dijagnoza)\s*[:;\-–—]?\s*([\s\S]{1,400})/i);
    if (labelled) {
      const value = cleanAmbulatoryDiagnosis(labelled[1]);
      if (value) return value;
    }
    return cleanAmbulatoryDiagnosis(fallback || '');
  }

  function extractAmbulatoryControlPlan(rawText, referenceIso = '') {
    const source = compactOhbpText(rawText || '');
    if (!source.trim()) return null;
    const controlMatch = source.match(/\bKontrola\s+(?:(?:u|na|za|dana)\s+)?([^,\n]{0,50}?(\d{1,2}[.\/\-\s]+\d{1,2}(?:[.\/\-\s]+\d{4})?\.?))([\s\S]{0,260})/i);
    if (!controlMatch) return null;
    const dateIso = parseControlDateToIso(controlMatch[2], referenceIso);
    const tail = String(controlMatch[3] || '')
      .replace(/\b(?:kada|kad)\s+(?:ce|će)\s+se\b/gi, ' ')
      .replace(/\b(?:ponoviti|kontrolirati|uciniti|učiniti|izvaditi|napraviti|odrediti)\b/gi, ' ')
      .replace(/\b(?:nalazi?|pretrage?|laboratorij(?:ski)?)\b/gi, ' ');
    const labs = normalizeFollowUpControlLabList(tail)
      .map((item) => item.replace(/\burinokultur[aeu]?\b/i, 'urinokultura'))
      .map((item) => item.replace(/\burin\b/i, 'urin'))
      .filter(Boolean);
    return {
      date: dateIso,
      text: buildFollowUpControlText(labs),
      labs
    };
  }

  function parseAmbulatoryPatientText(rawText, context = {}) {
    const text = normalizeLineBreaks(rawText || '').trim();
    const fallback = parseOhbpText(text);
    const referenceIso = context.admissionDate || fallback.admissionDate || '';
    const control = extractAmbulatoryControlPlan(text, referenceIso)
      || extractAmbulatoryFollowUpControl(text, referenceIso);
    const diagnosis = extractAmbulatoryDiagnosis(text, context.diagnosis || fallback.diagnosis || '');
    const data = {
      patientMode: PATIENT_MODES.OUTPATIENT,
      parserMode: 'ambulatory',
      reportType: 'ambulatory-control'
    };
    ['fullName', 'birthYear', 'admissionDate', 'patientOrigin', 'allergies', 'therapy'].forEach((field) => {
      if (fallback[field]) data[field] = fallback[field];
    });
    if (diagnosis) data.diagnosis = diagnosis;
    if (control?.date) data.followUpControlDate = control.date;
    if (control?.text) data.followUpControl = control.text;
    if (Array.isArray(control?.labs)) data.followUpControlLabs = control.labs;
    if (fallback.nameValidationWarning) data.nameValidationWarning = fallback.nameValidationWarning;
    if (fallback.nameOrderWarning) data.nameOrderWarning = fallback.nameOrderWarning;
    if (fallback.clinicalSafety) data.clinicalSafety = fallback.clinicalSafety;
    return data;
  }

  function parsePatientTextByMode(rawText, mode, context = {}) {
    return normalizePatientMode(mode) === PATIENT_MODES.OUTPATIENT
      ? parseAmbulatoryPatientText(rawText, context)
      : parseDepartmentPatientText(rawText, context);
  }

  function clearPatientFormValuesForNextPatient() {
    const cleared = isPatientDataDifferentFromEmpty(getFormData());
    setFormData(getEmptyPatientData());
    [
      els.fullName,
      els.birthYear,
      els.admissionDate,
      els.diagnosis,
      els.allergies,
      els.patientOrigin,
      els.therapy,
      els.ohbpTherapy,
      els.vitalSigns,
      els.followUpControlDate,
      els.followUpControl,
      els.labRaw,
      els.radiologyRaw
    ].filter(Boolean).forEach((field) => {
      markAutofilled(field, false);
    });
    clearRadiologyShorteningHighlight();
    return cleared;
  }

  // Adds/removes the autofill visual signal on the nearest .collapsible-field or .input-row ancestor
  function markAutofilled(inputEl, on) {
    if (!inputEl) return;
    const wrapper = inputEl.closest('.collapsible-field') || inputEl.closest('.input-row');
    if (!wrapper) return;
    wrapper.classList.toggle('autofilled', on);
  }

  function markRadiologyNeedsShortening(on) {
    const field = els.radiologyRaw;
    const wrapper = field?.closest('.collapsible-field');
    if (!field || !wrapper) return;
    wrapper.classList.toggle('needs-shortening', Boolean(on));
    field.classList.toggle('needs-shortening-input', Boolean(on));
  }

  function clearRadiologyShorteningStatusIfCurrent() {
    const current = String(els.statusBar?.textContent || '');
    if (/^RTG\/UZV nalaz ima \d+ redaka na listi\./.test(current)) {
      setStatus('', false);
    }
  }

  function clearRadiologyShorteningHighlight() {
    markRadiologyNeedsShortening(false);
    clearRadiologyShorteningStatusIfCurrent();
  }

  function countNonEmptyTextLines(value) {
    return normalizeLineBreaks(value || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .length;
  }

  function getRenderedRadiologyLineCount() {
    const rawValue = els.radiologyRaw?.value || '';
    if (!rawValue.trim()) return 0;
    const fallbackLineCount = countNonEmptyTextLines(rawValue);
    try {
      const model = deriveDocumentModel(getFormData());
      if (!model?.radiologyText || model.admissionDayIndex == null) return fallbackLineCount;
      const layout = state.calibration?.[model.page1LayoutKey];
      if (!layout) return fallbackLineCount;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return fallbackLineCount;
      const dynamicLabYOffset = getDynamicLabYOffset(ctx, layout, model);
      const field = resolveRadiologyField(ctx, layout, model, model.admissionDayIndex, dynamicLabYOffset);
      if (!field) return fallbackLineCount;
      return getTextBoxLines(ctx, model.radiologyText, field, { noWrap: false })
        .map(line => String(line || '').trim())
        .filter(Boolean)
        .length;
    } catch (error) {
      console.warn('Nije moguće procijeniti duljinu RTG/UZV nalaza za automatski fokus.', error);
      return fallbackLineCount;
    }
  }

  function focusRadiologyForShorteningIfLong() {
    if (!els.radiologyRaw || !String(els.radiologyRaw.value || '').trim()) {
      clearRadiologyShorteningHighlight();
      return false;
    }
    const lineCount = getRenderedRadiologyLineCount();
    if (lineCount < 3) {
      clearRadiologyShorteningHighlight();
      return false;
    }

    setCollapsibleTextFieldExpanded('radiologyRaw', true);
    markRadiologyNeedsShortening(true);

    window.requestAnimationFrame(() => {
      els.radiologyRaw.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => {
        try {
          els.radiologyRaw.focus({ preventScroll: true });
        } catch (error) {
          els.radiologyRaw.focus();
        }
      }, 250);
    });

    setStatus(`RTG/UZV nalaz ima ${lineCount} redaka na listi. Polje je otvoreno i označeno plavim rubom — skrati ga prije ispisa.`, true);
    return true;
  }

  function applyOhbpText(rawText) {
    const text = normalizeLineBreaks(rawText).trim();
    if (!text) {
      setOhbpParseStatus('');
      return;
    }
    if (text === state.ohbpLastParsedText) return;
    state.ohbpLastParsedText = text;

    // Svaki novi OHBP nalaz počinje potpuno praznim podacima pacijenta.
    // Time se sprječava da zaglavlje, mikrobiologija, vitalni parametri ili drugi nalazi
    // od prethodnog pacijenta ostanu prikazani ako novi nalaz nema tu sekciju ili je parser ne prepozna.
    const clearedPatientFields = clearPatientFormValuesForNextPatient();

    const parsed = parseDepartmentPatientText(text, { source: 'ohbp-paste' });
    const recognitionStatus = buildOhbpRecognitionStatus(parsed);
    setCollapsibleTextFieldExpanded('ohbpTherapy', false);
    setCollapsibleTextFieldExpanded('vitalSigns', false);
    setCollapsibleTextFieldExpanded('followUpControl', false);
    setCollapsibleTextFieldExpanded('labRaw', false);
    setCollapsibleTextFieldExpanded('radiologyRaw', false);
    let changed = clearedPatientFields;

    if (parsed.fullName) {
      els.fullName.value = parsed.fullName;
      markAutofilled(els.fullName, true);
      changed = true;
    }
    if (parsed.birthYear) {
      els.birthYear.value = parsed.birthYear;
      markAutofilled(els.birthYear, true);
      changed = true;
    }
    if (parsed.admissionDate) {
      els.admissionDate.value = formatIsoDateToCroatian(parsed.admissionDate);
      updateAdmissionDateInputValidity();
      syncDatePickerFromText(els.admissionDate, els.admissionDatePicker);
      markAutofilled(els.admissionDate, true);
      changed = true;
    }
    if (parsed.diagnosis && isClinicalSafetySafe(parsed, 'diagnosis')) {
      els.diagnosis.value = normalizeClinicalDiagnosisText(parsed.diagnosis);
      markAutofilled(els.diagnosis, true);
      changed = true;
    }
    if (parsed.allergies && els.allergies && isClinicalSafetySafe(parsed, 'allergies')) {
      els.allergies.value = parsed.allergies;
      markAutofilled(els.allergies, true);
      changed = true;
    }
    if (parsed.patientOrigin && els.patientOrigin) {
      els.patientOrigin.value = parsed.patientOrigin;
      markAutofilled(els.patientOrigin, true);
      changed = true;
    }
    if (parsed.therapy && isClinicalSafetySafe(parsed, 'therapy')) {
      els.therapy.value = normalizeClinicalTherapyText(parsed.therapy);
      markAutofilled(els.therapy, true);
      changed = true;
    }
    if (parsed.ohbpTherapy && isClinicalSafetySafe(parsed, 'ohbpTherapy')) {
      els.ohbpTherapy.value = normalizeClinicalTherapyText(parsed.ohbpTherapy);
      markAutofilled(els.ohbpTherapy, true);
      setCollapsibleTextFieldExpanded('ohbpTherapy', true);
      changed = true;
    }
    if (parsed.vitalSigns && els.vitalSigns && isClinicalSafetySafe(parsed, 'vitalSigns')) {
      els.vitalSigns.value = parsed.vitalSigns;
      markAutofilled(els.vitalSigns, true);
      setCollapsibleTextFieldExpanded('vitalSigns', true);
      changed = true;
    }
    if (parsed.followUpControl && els.followUpControl) {
      els.followUpControl.value = parsed.followUpControl;
      if (els.followUpControlDate && parsed.followUpControlDate) {
        els.followUpControlDate.value = formatIsoDateToCroatian(parsed.followUpControlDate);
        syncDatePickerFromText(els.followUpControlDate, els.followUpControlDatePicker);
        markAutofilled(els.followUpControlDate, true);
      }
      markAutofilled(els.followUpControl, true);
      setCollapsibleTextFieldExpanded('followUpControl', true);
      changed = true;
    }
    if (parsed.labRaw) {
      els.labRaw.value = parsed.labRaw;
      markAutofilled(els.labRaw, true);
      setCollapsibleTextFieldExpanded('labRaw', true);
      changed = true;
    }
    if (parsed.radiologyRaw && els.radiologyRaw) {
      els.radiologyRaw.value = parsed.radiologyRaw;
      markAutofilled(els.radiologyRaw, true);
      setCollapsibleTextFieldExpanded('radiologyRaw', true);
      changed = true;
    }
    // v200: kronična terapija ostaje običan text box; bez automatske provjere/standardizacije terapije nakon OHBP parsera.

    const recognitionStatusWithWarnings = buildOhbpStatusWithAdmissionWarning(recognitionStatus.message, recognitionStatus.kind);
    setOhbpParseStatus(recognitionStatusWithWarnings.message, recognitionStatusWithWarnings.kind);

    if (changed) {
      scheduleAutoResizeTextareas();
      renderAll();
      savePatientDraftNow({ quiet: true });
      resetCurrentFirebasePatientContext();
      scheduleFirebasePatientAutoSave({ force: true });
      const radiologyNeedsReview = Boolean(parsed.radiologyRaw) && focusRadiologyForShorteningIfLong();
      if (!radiologyNeedsReview && state.lastLabWarningMessage) {
        setStatus(state.lastLabWarningMessage, true);
      } else if (!radiologyNeedsReview) {
        const admissionWarning = getChronicTherapyAdmissionWarningMessage();
        if (admissionWarning) {
          setStatus(admissionWarning, true);
        } else {
          setStatus('OHBP nalaz je obrađen. Provjerite označena polja prije ispisa.', recognitionStatus.kind === 'warn');
          clearStatusSoon();
        }
      }
    } else {
      setStatus('Iz zalijepljenog OHBP nalaza nisu prepoznati podaci za automatsko popunjavanje.', true);
    }
  }

  function setAmbulatoryParseStatus(message, kind = 'neutral') {
    if (!els.ambulatoryParserStatus) return;
    els.ambulatoryParserStatus.textContent = message || '';
    els.ambulatoryParserStatus.classList.toggle('ok', kind === 'ok');
    els.ambulatoryParserStatus.classList.toggle('warn', kind === 'warn');
  }

  function updateAmbulatoryParserPreview(parsed = {}) {
    const labs = Array.isArray(parsed.followUpControlLabs) ? parsed.followUpControlLabs : [];
    if (els.ambulatoryRecognizedControl) {
      els.ambulatoryRecognizedControl.textContent = parsed.followUpControlDate
        ? formatIsoDateToCroatian(parsed.followUpControlDate)
        : '-';
    }
    if (els.ambulatoryRecognizedTests) {
      els.ambulatoryRecognizedTests.textContent = labs.length ? labs.join(', ') : '-';
    }
    if (els.ambulatoryRecognizedDiagnosis) {
      els.ambulatoryRecognizedDiagnosis.textContent = parsed.diagnosis || '-';
    }
  }

  function applyAmbulatoryText(rawText) {
    const text = normalizeLineBreaks(rawText).trim();
    if (!text) {
      setAmbulatoryParseStatus('Zalijepi ambulantni tekst ili kontrolni plan.', 'warn');
      updateAmbulatoryParserPreview();
      return;
    }

    if (!isOutpatientMode()) {
      applyPatientMode(PATIENT_MODES.OUTPATIENT, { renderLists: false });
    }

    const currentAdmissionIso = parseCroatianDateToIso(els.admissionDate?.value || '') || '';
    const parsed = parsePatientTextByMode(text, PATIENT_MODES.OUTPATIENT, {
      source: 'ambulatory-paste',
      admissionDate: currentAdmissionIso,
      diagnosis: els.ambulatoryDiagnosis?.value || els.diagnosis?.value || ''
    });
    updateAmbulatoryParserPreview(parsed);

    let changed = false;
    if (parsed.fullName && els.fullName) {
      els.fullName.value = parsed.fullName;
      markAutofilled(els.fullName, true);
      changed = true;
    }
    if (parsed.birthYear && els.birthYear) {
      els.birthYear.value = parsed.birthYear;
      markAutofilled(els.birthYear, true);
      changed = true;
    }
    if (parsed.admissionDate && els.admissionDate) {
      els.admissionDate.value = formatIsoDateToCroatian(parsed.admissionDate);
      updateAdmissionDateInputValidity();
      syncDatePickerFromText(els.admissionDate, els.admissionDatePicker);
      markAutofilled(els.admissionDate, true);
      changed = true;
    }
    if (parsed.diagnosis) {
      const diagnosis = normalizeClinicalDiagnosisText(parsed.diagnosis);
      if (els.ambulatoryDiagnosis) {
        els.ambulatoryDiagnosis.value = diagnosis;
        els.ambulatoryDiagnosis.removeAttribute('aria-invalid');
      }
      if (els.diagnosis) {
        els.diagnosis.value = diagnosis;
        markAutofilled(els.diagnosis, true);
      }
      changed = true;
    } else if (els.ambulatoryDiagnosis) {
      els.ambulatoryDiagnosis.setAttribute('aria-invalid', 'true');
    }
    if (parsed.allergies && els.allergies) {
      els.allergies.value = parsed.allergies;
      markAutofilled(els.allergies, true);
      changed = true;
    }
    if (parsed.patientOrigin && els.patientOrigin) {
      els.patientOrigin.value = parsed.patientOrigin;
      markAutofilled(els.patientOrigin, true);
      changed = true;
    }
    if (parsed.therapy && els.therapy && isClinicalSafetySafe(parsed, 'therapy')) {
      els.therapy.value = normalizeClinicalTherapyText(parsed.therapy);
      markAutofilled(els.therapy, true);
      changed = true;
    }
    if (parsed.followUpControl && els.followUpControl) {
      els.followUpControl.value = parsed.followUpControl;
      markAutofilled(els.followUpControl, true);
      setCollapsibleTextFieldExpanded('followUpControl', true);
      changed = true;
    }
    if (parsed.followUpControlDate && els.followUpControlDate) {
      els.followUpControlDate.value = formatIsoDateToCroatian(parsed.followUpControlDate);
      syncDatePickerFromText(els.followUpControlDate, els.followUpControlDatePicker);
      markAutofilled(els.followUpControlDate, true);
      changed = true;
    }

    const hasDiagnosis = Boolean(parsed.diagnosis || els.ambulatoryDiagnosis?.value?.trim());
    const hasControl = Boolean(parsed.followUpControlDate || parsed.followUpControl);
    if (hasDiagnosis && hasControl) {
      setAmbulatoryParseStatus('Ambulantni tekst je parsiran. Provjeri dijagnozu i kontrolu prije spremanja/ispisa.', 'ok');
    } else if (hasDiagnosis) {
      setAmbulatoryParseStatus('Dijagnoza je prepoznata. Kontrolu ili pretrage upiši ručno ako ih tekst nema.', 'warn');
    } else {
      setAmbulatoryParseStatus('Nije prepoznata ambulantna dijagnoza. Upiši je u polje Ambulantna dijagnoza.', 'warn');
    }

    if (changed) {
      scheduleAutoResizeTextareas();
      renderAll();
      savePatientDraftNow({ quiet: true });
      resetCurrentFirebasePatientContext();
      scheduleFirebasePatientAutoSave({ force: true });
      setStatus('Ambulantni unos je obrađen. Provjeri označena polja prije ispisa.', !hasDiagnosis);
      if (hasDiagnosis) clearStatusSoon();
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }


  
