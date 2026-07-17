# Parser Test Privacy

Status: radni tehnicki nacrt. Prije uporabe sa stvarnim klinickim podacima treba ga pregledati DPO, pravna sluzba i bolnicka informatika.

## Pravilo

Parser regression testovi smiju sadrzavati samo sinteticke ili anonimizirane podatke. Ctrl+Alt+P capture ne smije spremiti originalni OHBP tekst ako sadrzi stvarne identifikatore.

## Sto se uklanja ili mijenja

Prije lokalnog ili Firebase spremanja aplikacija prolazi kroz `sanitizeParserTestCaseForStorage`.

Uklanja ili maskira:

- ime i prezime pacijenta;
- OIB;
- MBO / broj osiguranika;
- telefon;
- e-mail;
- adresu;
- brojeve nalaza i bolesnicke/protokol brojeve;
- datume koji mogu sluziti kao identifikator;
- slobodni tekst s ocitim identifikatorima.

Za regresiju parsera ostaju samo tekstualni obrasci koji su potrebni za provjeru parsiranja.

## Metadata

Spremljeni test case mora imati:

- `privacyStatus`: `anonymized` ili `synthetic`;
- `sanitizedAt`;
- `sanitizerVersion`;
- `removedSensitiveFieldsCount`.

## Dodavanje novog test casea

Ako se u aplikaciji vidi krivo parsiranje, koristi Ctrl+Alt+P. Aplikacija ce upozoriti da se stvarni pacijentni podaci ne spremaju i spremiti samo anonimiziranu verziju.

Ne kopirati raw produkcijske nalaze u repozitorij.
