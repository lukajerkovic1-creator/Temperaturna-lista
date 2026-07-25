# FHIR Export

Status: **eksperimentalni radni tehnicki nacrt**. Ovo nije FHIR server niti odobrena bolnicka integracija.

## Svrha

Aplikacija moze iz `ClinicalRecordV1` generirati osnovni FHIR-kompatibilni JSON `Bundle` za buduce integracije s bolnickim sustavima. Export deklarira FHIR R4 `4.0.1` i uvijek nosi oznaku `experimental`.

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
- `Provenance` koji navodi lokalnog autora izvoza, vrijeme, izvorni ClinicalRecord schema/build i sve resurse koje export pokriva.

## Eksperimentalni profili

Svaki generirani resurs deklarira lokalni eksperimentalni profil. Strojno citljiv popis i lokalna pravila nalaze se u `fhir-profile-manifest.v1.json`. Ti URN profili nisu objavljeni ni odobreni nacionalni ili bolnicki profili i ne smiju se tako predstavljati.

Automatska fixture validacija provjerava:

- Bundle tip, timestamp, FHIR verziju i eksperimentalnu oznaku;
- obavezni `Patient`, `Encounter` i `Provenance`;
- profil na svakom generiranom resursu;
- jedinstvene `fullUrl` vrijednosti i valjane resource ID-eve;
- razrjesavanje internih referenci;
- da Provenance cilja svaki ne-Provenance resurs i ima autora/vrijeme.

## Ogranicenja

Lokalna validacija nije zamjena za sluzbeni HL7 FHIR validator. Ne provodi punu validaciju baznih R4 StructureDefinition pravila, terminolosko mapiranje, obavezne nacionalne profile ni provjeru kodnih sustava. Prije integracije potreban je pregled bolnicke informatike i validacija odobrenim vanjskim validatorom/profilima.

Kopiranje FHIR podataka u clipboard fizicki je uklonjeno iz produkcijskog bundlea. Eksperimentalni download ostaje lokalna datoteka i ne salje podatke na server.
