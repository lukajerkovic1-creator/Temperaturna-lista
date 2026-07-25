const { test, expect } = require('@playwright/test');
const { openApp } = require('./support/quality-helpers');

const SYNTHETIC_OHBP = [
  'logo TESTNA BOLNICA',
  'Nalaz hitne',
  'Protokol broj: TEST-2026-0001',
  '',
  'TESTIC PARSERICA, ro\u0111ena 01.01.1970, TESTNO ZANIMANJE, TESTNA ADRESA 1',
  '',
  'Dijagnoza: R07.4 - Bol u prsistu, nespecificirano',
  'Datum nalaza: 27.06.2026',
  '',
  'Podaci sa trijaze',
  'Objektivna procjena: SpO2 99 Respirac. 16 Puls 78 RR 160/100 Temp 36,2',
  '',
  'Pregled pacijenta',
  'Lijekovi: Controloc 40 mg 1x1 tbl.',
  'Alergije na lijekove: negira.',
  'Dg. cor decomp',
  'Th: Fursemid 20 mg i.v.'
].join('\n');

function makeFormattingVariants(source, count = 120) {
  const variants = [];
  let seed = 0x51f15e;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  for (let index = 0; index < count; index += 1) {
    let value = source;
    value = value.replace(/\n/g, () => {
      const roll = next();
      if (roll < 0.25) return '\r\n';
      if (roll < 0.5) return '\n\n';
      return '\n';
    });
    value = value.replace(/[ \t]+/g, whitespace => {
      if (next() < 0.35) return whitespace;
      return next() < 0.25 ? '\t' : ' '.repeat(1 + Math.floor(next() * 3));
    });
    const prefix = index % 4 === 0 ? '\n\nTESTNI IZVOZ\n' : '';
    const suffix = index % 3 === 0 ? '\n\n--------------------------------\n' : '';
    variants.push(`${prefix}${value}${suffix}`);
  }
  return variants;
}

function makeRandomSyntheticInputs(count = 160) {
  const alphabet = ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.:,;/-_()[]\n\t<>"\'';
  const values = [];
  let seed = 0x0badc0de;
  const next = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed;
  };
  for (let index = 0; index < count; index += 1) {
    const length = next() % 1400;
    let value = '';
    for (let offset = 0; offset < length; offset += 1) {
      value += alphabet[next() % alphabet.length];
    }
    values.push(value);
  }
  return values;
}

function normalizeSemanticText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('hr-HR');
}

async function openQaParser(page) {
  await page.addInitScript(() => {
    window.__TEMPERATURNA_LISTA_ENABLE_QA_HOOKS__ = true;
  });
  const browserSignals = await openApp(page, './?qa=parser-fuzz');
  await expect.poll(() => page.evaluate(() => typeof window.TemperaturnaListaParserTests?.parseByMode)).toBe('function');
  return browserSignals;
}

test.describe('Deterministic parser fuzz and properties', () => {
  test('preserves critical synthetic fields across harmless formatting mutations', async ({ page }) => {
    const browserSignals = await openQaParser(page);
    const variants = makeFormattingVariants(SYNTHETIC_OHBP);
    const result = await page.evaluate(({ baselineText, inputs }) => {
      const parse = window.TemperaturnaListaParserTests.parseByMode;
      const baseline = parse(baselineText, 'inpatient');
      return {
        baseline,
        parsed: inputs.map(input => parse(input, 'inpatient'))
      };
    }, { baselineText: SYNTHETIC_OHBP, inputs: variants });

    expect(result.baseline.fullName).toBe('Parserica Testic');
    expect(result.baseline.birthYear).toBe('1970');
    expect(result.baseline.admissionDate).toBe('2026-06-27');
    expect(result.baseline.diagnosis).toBe('Cor decomp');
    expect(result.baseline.allergies.toLocaleLowerCase('hr-HR')).toContain('nema');
    expect(result.parsed).toHaveLength(120);
    result.parsed.forEach((parsed, index) => {
      expect(parsed.fullName, `fullName mutation ${index}`).toBe(result.baseline.fullName);
      expect(parsed.birthYear, `birthYear mutation ${index}`).toBe(result.baseline.birthYear);
      expect(parsed.admissionDate, `admissionDate mutation ${index}`).toBe(result.baseline.admissionDate);
      expect(parsed.allergies, `allergies mutation ${index}`).toBe(result.baseline.allergies);
      expect(normalizeSemanticText(parsed.diagnosis), `diagnosis mutation ${index}`).toBe(normalizeSemanticText(result.baseline.diagnosis));
    });
    browserSignals.assertCleanBrowserSignals();
  });

  test('never throws or returns an invalid shape for bounded random synthetic input', async ({ page }) => {
    const browserSignals = await openQaParser(page);
    const inputs = makeRandomSyntheticInputs();
    const results = await page.evaluate((randomInputs) => {
      const parse = window.TemperaturnaListaParserTests.parseByMode;
      return randomInputs.map((input) => {
        try {
          const parsed = parse(input, 'inpatient');
          const stringLengths = Object.values(parsed || {})
            .filter(value => typeof value === 'string')
            .map(value => value.length);
          return {
            threw: false,
            isPlainObject: Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed),
            maxStringLength: stringLengths.length ? Math.max(...stringLengths) : 0
          };
        } catch (error) {
          return { threw: true, message: String(error?.message || error) };
        }
      });
    }, inputs);

    expect(results).toHaveLength(160);
    results.forEach((result, index) => {
      expect(result.threw, `parser throw for random input ${index}: ${result.message || ''}`).toBe(false);
      expect(result.isPlainObject, `parser shape for random input ${index}`).toBe(true);
      expect(result.maxStringLength, `bounded parser output ${index}`).toBeLessThanOrEqual(10_000);
    });
    browserSignals.assertCleanBrowserSignals();
  });
});
