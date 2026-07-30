# ClinicalRecordV1

Status: radni tehnicki nacrt. Ovo nije klinicki certificirani podatkovni model.

## Svrha

`ClinicalRecordV1` je centralni strukturirani model koji aplikacija gradi iz postojeceg obrasca bez razbijanja starog UI-ja i ispisa. Stari `data` payload ostaje zbog kompatibilnosti, a novi `clinicalRecord` se dodaje uz njega.

## Pokrivena podrucja

Model pokriva:

- pacijenta: ime, godiste i spol;
- boravak: datum prijema, izvor, odjel i mod pacijenta;
- dijagnoze;
- alergije;
- terapiju;
- vitalne znakove;
- laboratorije;
- mikrobiologiju;
- izolaciju / epidemioloske mjere;
- originalni slobodni tekst za kompatibilnost parsera i ispisa.

## Kompatibilnost

Postojeci ispis i forma nastavljaju koristiti podrzane vrijednosti. `ClinicalRecordV1` se gradi iz njih i izvozi samo u lokalne datoteke.

Stari lokalni backupi mogu sadrzavati umirovljena bolnicka polja. Jedina legacy import-sanitizacija ta polja tiho odbacuje prije validacije; ona se ne vracaju u aktivni model ni u novi izvoz.

## Ogranicenja

Model trenutno parsira dio podataka iz slobodnog teksta heuristicki. Ne smije se smatrati potpunim medicinskim zapisom ili zamjenom za bolnicki informacijski sustav.
