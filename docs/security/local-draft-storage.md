# Lokalni draft pacijenta

## Default ponašanje

Lokalni auto-save pacijentnih podataka je isključen po defaultu. Aplikacija ne smije zapisivati ime pacijenta, datume, dijagnoze, terapiju, alergije, laboratorije ili drugi klinički tekst u čitljivom obliku u `localStorage`, `sessionStorage` ili IndexedDB.

Firebase spremanje pacijenata ostaje primarni mehanizam spremanja.

Osobni prijedlozi dijagnoza i terapije, lokalne iznimke terapije te Ctrl+Alt+P parser test capture ne spremaju se više kao trajni cleartext u `localStorage`. Ti podaci mogu postojati samo privremeno u memoriji otvorene stranice, odnosno u Firebaseu kada je korisnik prijavljen i pravila to dopuštaju.

## Što se smije spremiti lokalno

Ako korisnik izričito uključi šifrirani lokalni oporavak, u `localStorage` se sprema samo omotnica šifriranog drafta:

- verzija sheme,
- `appVersion`,
- `savedAt`,
- `expiresAt`,
- random `salt`,
- random `iv`,
- AES-GCM encrypted payload.

Passphrase i izvedeni ključ ne spremaju se u browser storage.

## Kako radi šifrirani oporavak

Korisnik mora ručno uključiti šifrirani oporavak i unijeti passphrase. Payload pacijenta šifrira se Web Crypto API-jem:

- PBKDF2/SHA-256 izvodi ključ iz passphrasea i random salta,
- AES-GCM šifrira payload,
- za svaki zapis koristi se novi random salt i novi random IV,
- draft vrijedi ograničeno vrijeme, trenutno 12 sati.

Nakon reloadanja stranice ključ više nije u memoriji i aplikacija traži passphrase prije vraćanja drafta. Pogrešna passphrase odbija vraćanje.

## Legacy cleartext draft

Stari ključ `temperaturna_lista_pacijent_autosave_v1` smatra se legacy cleartext draftom. Aplikacija ga ne vraća automatski. Ako ga pronađe, korisniku se nudi:

- trajno brisanje lokalnog drafta,
- jednokratno otvaranje i migracija u šifrirani draft nakon postavljanja passphrasea.

## Ograničenja browser-side enkripcije

Šifrirani lokalni recovery štiti od običnog čitanja browser storagea, ali nije zamjena za sigurni server-side sustav. Ako je stranica kompromitirana zlonamjernim JavaScriptom dok je passphrase unesena, napadač može pokušati čitati podatke iz memorije ili iz same forme. Zato je lokalni recovery opcionalan, kratkotrajan i isključen po defaultu.
