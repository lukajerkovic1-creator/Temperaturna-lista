# FHIR Export

Status: radni tehnicki nacrt. Ovo nije FHIR server.

## Svrha

Aplikacija moze iz `ClinicalRecordV1` generirati osnovni FHIR-kompatibilni JSON `Bundle` za buduce integracije s bolnickim sustavima.

## Funkcije

Glavne funkcije:

- `clinicalRecordToFhirBundle(record, options)`;
- `downloadFhirBundle(record)`;
- `copyFhirBundleToClipboard(record)`;
- `validateBasicFhirBundle(bundle)`.

## Resursi u Bundleu

Exporter trenutno moze generirati:

- `Patient`;
- `Encounter`;
- `Condition`;
- `AllergyIntolerance`;
- `MedicationStatement`;
- `Observation` za vitalne znakove i laboratorij;
- `DiagnosticReport` za mikrobiologiju.

## Ogranicenja

Validacija je osnovna: provjerava da postoji `Bundle`, `Patient`, `Encounter` i `entry`. Ne radi punu FHIR profilnu validaciju, terminolosko mapiranje ni provjeru kodnih sustava.
