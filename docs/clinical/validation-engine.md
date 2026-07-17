# Clinical Validation Engine

Status: radni tehnicki nacrt.

## Svrha

Validation engine smanjuje ocite greske unosa prije spremanja i integracija. Funkcija `validateClinicalRecord(record)` vraca listu upozorenja i kriticnih problema.

## Trenutne provjere

Provjerava:

- datume prijema i buduce datume;
- vitalne znakove izvan fizioloskog raspona;
- nelogican krvni tlak;
- terapijske duplikate;
- retke terapije bez jasno prepoznate doze ili puta primjene;
- alergije bez navedene tvari;
- negativne laboratorijske vrijednosti;
- mikrobioloske zapise bez uzorka.

## Severity

Nalazi mogu biti:

- `info`: korisna napomena;
- `warning`: treba provjeriti;
- `critical`: ne smije se tiho ignorirati.

## Ogranicenja

Validacije ne potvrdjuju klinicku ispravnost terapije, dijagnoze ili nalaza. One hvataju tehnicke i ocite nelogicnosti.
