# Conflict Resolution

Status: radni tehnicki nacrt.

## Problem

Ako dva korisnika otvore istog pacijenta, jedan korisnik ne smije tiho pregaziti promjene drugog korisnika.

## Verzija dokumenta

Pacijentni Firebase dokument ima:

- `version`;
- `updatedAt`;
- `updatedByUid`;
- `updatedByEmail`;
- `dataHash`;
- `lastKnownVersion`;
- `lastKnownUpdatedAt`;
- `previousDataHash`.

Kada se pacijent otvori, aplikacija lokalno pamti verziju i hash iz kojih je korisnik krenuo.

## Spremanje

Prije updatea aplikacija ponovno cita Firebase dokument. Konflikt nastaje ako je udaljena verzija novija ili se hash udaljenog dokumenta promijenio u odnosu na lokalnu bazu.

## Opcije korisnika

Kada postoji konflikt:

1. ucitati noviju verziju i odbaciti lokalne promjene;
2. spremiti lokalnu verziju kao novu kopiju;
3. pokusati spojiti nepreklapajuce promjene;
4. odustati i ostaviti lokalne promjene na ekranu.

Automatsko spremanje ne bira umjesto korisnika.

## Merge pravila

Sigurni merge prihvaca samo polja koja su promijenjena lokalno, a nisu promijenjena udaljeno. Ako su obje strane promijenile isto polje, automatsko spajanje se blokira.

## Audit

Konflikti stvaraju audit evente:

- `patient.conflictDetected`;
- `patient.conflictMerged`;
- `patient.conflictSavedAsCopy`.

## Ogranicenja

Ovo je optimistic concurrency u statickoj klijentskoj aplikaciji. Za punu produkcijsku uporabu treba dodatno razmotriti server-side transakcije, role i administrativni pregled konflikata.
