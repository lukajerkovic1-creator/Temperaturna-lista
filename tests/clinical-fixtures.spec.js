const { test, expect } = require('@playwright/test');
const fixtures = require('./clinical-fixtures/synthetic-patients.v1.json');
const {
  openAppWithoutFirebase,
} = require('./support/quality-helpers');

const TEXT_FIELD_IDS = [
  'fullName',
  'birthYear',
  'admissionDate',
  'patientOrigin',
  'diagnosis',
  'allergies',
  'therapy',
  'ohbpTherapy',
  'vitalSigns',
  'followUpControl',
  'labRaw',
  'radiologyRaw',
];

const MICROBIOLOGY_FIELD_IDS = [
  'microHemocultures',
  'microUrineCulture',
  'microStoolBacteriology',
  'microStoolCdiff',
  'microStoolVirology',
];

function collectTextDeep(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(collectTextDeep).join('\n');
  if (typeof value === 'object') return Object.values(value).map(collectTextDeep).join('\n');
  return String(value);
}

function getFixtureText() {
  return collectTextDeep(fixtures.patients);
}

async function fillFixturePatient(page, input) {
  await page.evaluate(({ input, textFieldIds, microbiologyFieldIds }) => {
    const setValue = (id, value) => {
      const element = document.getElementById(id);
      if (!element) return;
      element.value = value || '';
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const setChecked = (id, value) => {
      const element = document.getElementById(id);
      if (!element) return;
      element.checked = Boolean(value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    };

    textFieldIds.forEach((id) => setValue(id, ''));
    microbiologyFieldIds.forEach((id) => setChecked(id, false));

    Object.entries(input || {}).forEach(([key, value]) => {
      if (key === 'microbiology') return;
      if (textFieldIds.includes(key)) setValue(key, value);
    });
    Object.entries(input?.microbiology || {}).forEach(([key, value]) => setChecked(key, value));
  }, { input, textFieldIds: TEXT_FIELD_IDS, microbiologyFieldIds: MICROBIOLOGY_FIELD_IDS });
}

test.describe('Synthetic clinical fixture set', () => {
  test('catalog is synthetic and covers required clinical workflows', async ({}, testInfo) => {
    test.skip(/mobile/i.test(testInfo.project.name), 'Fixture catalog is project-independent.');

    expect(fixtures.schema).toBe('temperaturna-lista-clinical-fixtures-v1');
    expect(fixtures.privacy.status).toBe('synthetic');
    expect(fixtures.patients.length).toBeGreaterThanOrEqual(10);

    const covered = new Set(fixtures.patients.flatMap((patient) => patient.coverage || []));
    for (const required of fixtures.requiredCoverage) {
      expect(covered.has(required), `Missing fixture coverage: ${required}`).toBe(true);
    }

    for (const patient of fixtures.patients) {
      expect(patient.input.fullName, `${patient.id} must use synthetic name`).toMatch(/^TEST PACIJENT\b/);
      expect(patient.input.fullName, `${patient.id} must not look like a real full name`).not.toMatch(/\b(Ivan|Marko|Ana|Marija|Horvat|Novak|Juric|Jerkovic)\b/i);
    }

    const fixtureText = getFixtureText();
    expect(fixtureText).not.toMatch(/\b\d{11}\b/);
    expect(fixtureText).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(fixtureText).not.toMatch(/\+?\d[\d\s/-]{7,}\d/);
    expect(fixtureText).not.toMatch(/\b(OIB|MBO|broj osiguranika|telefon|mobitel|adresa)\b/i);
  });

  test('all synthetic patients produce clinical records, validation output and FHIR bundles', async ({ page }, testInfo) => {
    test.skip(/mobile/i.test(testInfo.project.name), 'Clinical fixtures are model-level smoke tests and run once on desktop.');

    const browserSignals = await openAppWithoutFirebase(page);

    for (const patient of fixtures.patients) {
      await fillFixturePatient(page, patient.input);

      const result = await page.evaluate(() => {
        const record = window.TemperaturnaListaClinical.fromCurrentForm();
        const validation = window.TemperaturnaListaClinical.validateClinicalRecord(record);
        const safety = window.TemperaturnaListaClinical.runMedicationSafetyChecks(record);
        const bundle = window.TemperaturnaListaClinical.clinicalRecordToFhirBundle(record);
        const bundleValidation = window.TemperaturnaListaClinical.validateBasicFhirBundle(bundle);
        return {
          record,
          validation,
          safety,
          bundleValidation,
          bundleSummary: {
            profile: bundle.meta?.profile || [],
            tags: bundle.meta?.tag || [],
            resourceTypes: bundle.entry.map(entry => entry.resource.resourceType),
            allResourcesProfiled: bundle.entry.every(entry => Array.isArray(entry.resource.meta?.profile) && entry.resource.meta.profile.length === 1),
            provenanceTargetCount: bundle.entry.find(entry => entry.resource.resourceType === 'Provenance')?.resource?.target?.length || 0,
            nonProvenanceCount: bundle.entry.filter(entry => entry.resource.resourceType !== 'Provenance').length
          }
        };
      });

      expect(result.record.schema, patient.id).toBe('temperaturna-lista-clinical-record-v1');
      expect(result.record.patient.fullName, patient.id).toBe(patient.input.fullName);
      expect(['form', 'current-form'], patient.id).toContain(result.record.metadata.source);
      expect(result.bundleValidation.ok, patient.id).toBe(true);
      expect(result.bundleValidation.valid, patient.id).toBe(true);
      expect(result.bundleValidation.fhirVersion, patient.id).toBe('4.0.1');
      expect(result.bundleValidation.experimental, patient.id).toBe(true);
      expect(result.bundleValidation.issues, patient.id).toEqual([]);
      expect(result.bundleSummary.profile, patient.id).toContain('urn:temperaturna-lista:fhir:StructureDefinition:bundle-experimental-v1');
      expect(result.bundleSummary.tags, patient.id).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'experimental' }),
        expect.objectContaining({ code: '4.0.1' })
      ]));
      expect(result.bundleSummary.resourceTypes, patient.id).toContain('Provenance');
      expect(result.bundleSummary.allResourcesProfiled, patient.id).toBe(true);
      expect(result.bundleSummary.provenanceTargetCount, patient.id).toBe(result.bundleSummary.nonProvenanceCount);

      for (const fragment of patient.expected?.conditionContains || []) {
        expect(JSON.stringify(result.record.conditions).toLocaleLowerCase('hr'), patient.id)
          .toContain(String(fragment).toLocaleLowerCase('hr'));
      }
      for (const fragment of patient.expected?.medicationContains || []) {
        expect(JSON.stringify(result.record.medications).toLocaleLowerCase('hr'), patient.id)
          .toContain(String(fragment).toLocaleLowerCase('hr'));
      }
      for (const analyte of patient.expected?.labAnalytes || []) {
        expect(result.record.labs.map((lab) => lab.analyte), patient.id).toEqual(expect.arrayContaining([analyte]));
      }
      if (patient.expected?.microbiologyCountAtLeast != null) {
        expect(result.record.microbiology.length, patient.id).toBeGreaterThanOrEqual(patient.expected.microbiologyCountAtLeast);
      }
      if (typeof patient.expected?.validationOk === 'boolean') {
        expect(result.validation.ok, patient.id).toBe(patient.expected.validationOk);
      }
      for (const field of patient.expected?.validationFields || []) {
        expect(result.validation.issues.map((issue) => issue.field), patient.id).toContain(field);
      }

      const safetyTypes = result.safety.issues.map((issue) => issue.metadata?.type).filter(Boolean);
      for (const type of patient.expected?.safetyTypes || []) {
        expect(safetyTypes, patient.id).toContain(type);
      }
      for (const type of patient.expected?.safetyTypesNot || []) {
        expect(safetyTypes, patient.id).not.toContain(type);
      }
    }

    browserSignals.assertCleanBrowserSignals();
  });

  test('FHIR validator rejects missing profiles, Provenance and unresolved references', async ({ page }, testInfo) => {
    test.skip(/mobile/i.test(testInfo.project.name), 'FHIR negative fixture validation runs once on desktop.');
    const browserSignals = await openAppWithoutFirebase(page);
    await fillFixturePatient(page, fixtures.patients[0].input);
    const result = await page.evaluate(() => {
      const api = window.TemperaturnaListaClinical;
      const bundle = api.clinicalRecordToFhirBundle(api.fromCurrentForm(), { timestamp: '2026-01-01T12:00:00.000Z' });
      bundle.meta.profile = [];
      bundle.entry = bundle.entry.filter(entry => entry.resource.resourceType !== 'Provenance');
      const encounter = bundle.entry.find(entry => entry.resource.resourceType === 'Encounter');
      encounter.resource.subject.reference = 'Patient/missing-patient';
      return api.validateBasicFhirBundle(bundle);
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'bundle-profile',
      'provenance-required',
      'unresolved-reference'
    ]));
    browserSignals.assertCleanBrowserSignals();
  });
});
