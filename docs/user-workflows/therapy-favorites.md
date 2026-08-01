# Kontrolirani favoriti kronične terapije

## Svrha

Autocomplete kronične terapije ne uči iz pacijentnog teksta. Ručno upisana ili odabrana terapija nikada se automatski ne dodaje u prijedloge. Time se pogrešan, nepotpun ili slučajan unos ne pretvara u trajni obrazac.

Postavke čestih terapija nalaze se ispod polja **Kronična terapija** i sadrže dvije odvojene liste:

- **Moje terapije**: korisnik ih izričito dodaje, uređuje, briše i raspoređuje;
- **Zajedničke terapije**: predviđene su za centralno uređivanje samo uz potvrđenu administratorsku ovlast na sigurnom backendu.

Svaki zapis je strukturiran kao naziv lijeka, jačina s jedinicom, farmaceutski oblik i zadani režim. Konačni tekst vidljiv je prije spremanja. Prazni i nevaljani zapisi odbijaju se, a kombinacija istog naziva, jačine i oblika ne može se spremiti dvaput.

## Redoslijed prijedloga

Autocomplete daje prednost ovim izvorima:

1. osobni favoriti;
2. zajednički favoriti;
3. ugrađeni katalog lijekova.

Ista kombinacija naziva, jačine i oblika prikazuje se jednom. Različite jačine istog lijeka ostaju zasebni prijedlozi.

## Promjena režima tipkovnicom

Dok je pokazivač u polju kronične terapije:

- `Page Down` kruži `1,0,0`, `0,1,0`, `0,0,1`, `p.p.`;
- `Page Up` kruži istim redoslijedom unatrag;
- `Arrow Left` i `Arrow Right` normalno pomiču pokazivač.

Mijenja se samo redak u kojem je pokazivač. Ako označeni tekst prelazi preko više redaka, sadržaj se ne mijenja. Privremena promjena režima u pacijentnom unosu ne mijenja zadani režim spremljenog favorita.

## Lokalna pohrana i sigurnosne kopije

Osobni favoriti trenutačno se čuvaju u lokalnoj predmemoriji preglednika i ne sadrže podatke pacijenta. Mogu se zasebno izvesti i uvesti kao verzionirana JSON sigurnosna kopija sheme `temperaturna-lista-therapy-favorites-backup-v1`. Uvoz validira zapise, odbacuje nevaljane vrijednosti i uklanja duplikate. Terapijska sigurnosna kopija ne mijenja podatke pacijenata.

Stari automatski naučeni prijedlozi brišu se jednokratnom migracijom. Legacy ključevi u starim profilima ili backupima tiho se zanemaruju i ne izvoze ponovno.

## Infrastrukturno ograničenje

Produkcijska aplikacija nema autentificirani backend za terapijske postavke. Firebase spremanje pacijenata uklonjeno je i Firestore pravila su `deny-all`. Zato se ne simulira sinkronizacija preko `localStorage`:

- osobni favoriti nisu sinkronizirani među uređajima;
- zajednički favoriti nisu centralno dostupni;
- zajedničko uređivanje i uvoz ostaju zaključani.

Za stvarnu sinkronizaciju potreban je zaseban backend koji provjerava stabilni korisnički ID i administratorski claim, ograničava osobne zapise vlasniku te čuva `updatedAt`, `updatedBy` i verziju sheme. Tek nakon sigurnosnog pregleda može se spojiti na postojeći adapter. Taj nedostatak ne utječe na lokalni JSON workflow pacijenata.

## Kliničko ograničenje

Favoriti i autocomplete ubrzavaju unos, ali ne potvrđuju dozu, interakcije, alergije, bubrežnu prilagodbu ni indikaciju. Svaki umetnuti redak mora se klinički provjeriti.
