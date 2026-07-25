# Lokalna pohrana pacijenta

> Sigurnosna tehnička bilješka. Ovaj dokument nije tvrdnja o GDPR ili produkcijskoj usklađenosti. Postupak moraju odobriti DPO, pravna služba i bolnička informatika.

## Produkcijsko pravilo

Produkcijska aplikacija ne sprema pacijenta u Firebase, drugi online servis, `localStorage`, `sessionStorage` ili IndexedDB. Ne postoji automatski browser draft ni opcija njegova uključivanja.

Jedini dopušteni trajni zapis pacijenta je eksplicitni korisnički postupak:

- **Spremi JSON** preuzima lokalnu JSON datoteku na računalo;
- **Otvori JSON** učitava datoteku koju korisnik izričito odabere;
- šifrirani downtime backup preuzima se kao zasebna datoteka s identitetski neutralnim nazivom.

GitHub Pages poslužuje samo statički aplikacijski kod i lokalnu bazu prijedloga lijekova. Pacijentni JSON nije dio repozitorija niti se šalje GitHubu.

## Podatci koji ne smiju u browser storage

U `localStorage`, `sessionStorage` i IndexedDB ne smiju se zapisivati:

- ime ili drugi identifikator pacijenta;
- datum rođenja, prijema ili kontrole;
- dijagnoza, alergija, terapija ili drugi klinički tekst;
- laboratorij, mikrobiologija, vitalni znakovi ili radiološki nalaz;
- parserov izvorni nalaz ili patient JSON payload.

Produkcijski startup briše oba povijesna ključa:

- `temperaturna_lista_pacijent_autosave_v1`;
- `temperaturna_lista_pacijent_sifrirani_draft_v2`.

Njihov sadržaj se nikad ne vraća niti migrira. Ovo je namjerno fail-closed ponašanje.

## Šifrirani downtime backup

Downtime backup je preuzeta datoteka, ne browser draft. Payload se prije downloada šifrira Web Crypto API-jem:

- AES-GCM-256;
- PBKDF2/SHA-256 derivacija ključa iz passphrasea;
- nasumični salt i IV za svaki export;
- passphrase i izvedeni ključ ne spremaju se.

Browser-side enkripcija ne štiti podatke od kompromitiranog JavaScripta, zlonamjerne ekstenzije, snimke zaslona, neovlaštenog pristupa otključanom računalu ili pogrešnog rukovanja preuzetom datotekom. Lokaciju datoteka, rok čuvanja, backup medij i postupak brisanja mora definirati bolnica.

## Lokalni QA artefakt

Odvojeni localhost QA bundle može sadržavati povijesne testove šifriranog drafta isključivo sa sintetičkim podatcima. QA bundle se ne učitava na GitHub Pages i zahtijeva localhost, `?qa=` te eksplicitnu pre-bootstrap testnu zastavicu. Statički build gate provjerava da production bundle nema storage adapter ni mogućnost zapisivanja patient drafta.
