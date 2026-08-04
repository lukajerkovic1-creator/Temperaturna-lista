# Unos i spremljeni predlošci terapije

## Dva polja

Svaki predložak i svaki uređivani redak kronične terapije sastoji se od:

- **Naziv lijeka**, primjerice `Amlopin 5 mg` ili `Meropenem`;
- **Nastavak terapije**, primjerice `0,0,1 tbl` ili `3x1 g i.v.`.

Aplikacija ih spaja jednim razmakom. Nastavak je slobodan tekst. Uobičajeni zapisi s `x` i rasporedima jutro/podne/večer normaliziraju se, dok se posebne upute poput `kont. inf.` ili `svakih 8 h` čuvaju. Prazan nastavak dopušten je samo nakon izričite potvrde.

Odabir spremljenog predloška ispunjava oba polja. Izmjene polja dok je vezan postojeći redak odmah mijenjaju samo terapiju trenutačnog pacijenta; spremljeni predložak ostaje nepromijenjen. Brisanje predloška također ne briše već umetnuti redak pacijenta.

## Prijedlozi i tipkovnica

Polje nastavka nudi fiksne česte nastavke i nastavke iz spremljenih predložaka. Strelice mijenjaju aktivni prijedlog, a `Enter` ga prihvaća. Ručni tekst uvijek je dopušten.

`Page Up` i `Page Down` djeluju isključivo dok je fokus u polju **Nastavak terapije**:

- `1x1`, `2x1`, `3x1`, `4x1` čine kružni niz;
- `1,0,0`, `0,1,0`, `0,0,1` čine drugi kružni niz;
- mijenja se samo režim, a ostatak nastavka ostaje isti;
- `p.p.`, `kont. inf.` i neprepoznati nastavci ne mijenjaju se.

Kod vezanog retka promjena se odmah vidi u višerednom polju terapije i živom pregledu.

## Spremljeni predlošci

Predlošci koriste shemu `temperaturna-lista-therapy-favorites-v2`:

```json
{
  "id": "...",
  "medicationName": "Meropenem",
  "continuation": "3x1 g i.v.",
  "updatedAt": "...",
  "updatedBy": "...",
  "schemaVersion": 2
}
```

Isti lijek može imati više nastavaka. Potpuno isti normalizirani zapis sprema se samo jednom. Popis je poredan prema nazivu lijeka, zatim nastavku.

Osobni predlošci ostaju lokalna korisnička lista. Zajednički predlošci čitaju se sa svih uređaja iz izdvojenog Firestore dokumenta `appConfig/sharedTherapyFavoritesV2`. Samo potvrđeni administrator može pisati taj dokument. Firestore pravila i produkcijski klijent i dalje ne dopuštaju online spremanje pacijenata; sinkronizira se isključivo neklinička lista terapijskih predložaka.

## Migracija

Pri prvom čitanju stare v1 liste aplikacija:

1. sprema cijeli izvorni payload u `temperaturna_lista_terapije_legacy_backup_v2`;
2. razdvaja stari zapis na naziv i nastavak samo kada prepozna režim;
3. kod nepouzdanog razdvajanja zadržava cijeli tekst kao naziv i ostavlja nastavak prazan;
4. zapisuje v2 shemu i migracijsku oznaku.

Migracija je idempotentna. Stari lokalni JSON pacijenta i dalje se uvozi, a sljedeći izvoz uz tekstualno polje sadrži `therapyEntries`, verziju migracije i izvornu sigurnosnu kopiju redaka.

## Kliničko ograničenje

Predlošci i autocomplete ne potvrđuju dozu, interakcije, alergije, bubrežnu prilagodbu ni indikaciju. Svaki umetnuti redak mora se klinički provjeriti.
