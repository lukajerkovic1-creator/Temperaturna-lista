# Medication Autocomplete vs Safety Check

Status: radni tehnicki nacrt. Potrebna je validacija klinickog farmaceuta / AMS tima prije produkcijske klinicke uporabe.

## Autocomplete

`MedicationAutocomplete` pomaze pri brzom unosu naziva lijeka i poznatog tekstualnog obrasca.

Smije:

- predloziti naziv lijeka;
- predloziti tekstualni oblik/dozu ako postoji u bazi ili korisnikovim prijedlozima;
- umetnuti tekst u polje terapije.

Ne smije:

- tvrditi da je terapija sigurna;
- potvrditi dozu;
- potvrditi interakcije;
- potvrditi alergije;
- potvrditi bubrežnu prilagodbu;
- preporuciti antibiotik po dijagnozi.

## Safety Check

`MedicationSafetyCheck` je odvojeni panel. Trenutno radi osnovne provjere:

- duplikat lijeka po normaliziranom nazivu;
- tekstualno poklapanje alergije i terapije;
- antimikrobni lijek bez navedene indikacije;
- antimikrobni lijek bez trajanja ili review datuma;
- eGFR < 60 uz lijek oznacen kao `renalAdjustmentRequired`;
- terapijski redak bez prepoznate doze ili puta primjene.

## AMS i renalna ogranicenja

Lista antimikrobnih i renalnih keyworda je minimalna i lako prosiriva u kodu. Aplikacija ne daje preporuku doze i ne mijenja terapiju automatski.

## Plan prosirenja

Prije siri uporabe treba:

- pregledati listu lijekova s klinickim farmaceutom;
- potvrditi AMS pravila;
- definirati bolnicke standarde za review datume;
- uvesti strukturirane doze i puteve primjene gdje je moguce.
