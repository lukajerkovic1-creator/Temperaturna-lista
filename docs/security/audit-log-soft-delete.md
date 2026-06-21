# Audit log i soft-delete pacijenata

## Sto se auditira

Aplikacija upisuje audit dogadaje u kolekciju `patientAuditEvents` za vazne radnje nad pacijentom:

- kreiranje i azuriranje zapisa;
- preimenovanje;
- arhiviranje umjesto brisanja;
- vracanje arhiviranog zapisa;
- otvaranje pacijenta;
- ispis;
- ispis bez potvrdenog Firebase spremanja;
- neuspjelo spremanje kada je moguce zapisati audit.

Audit dogadaj sadrzi shemu, tip dogadaja, Firebase dokument pacijenta, klinicki kontekst, korisnika, vrijeme, okidac radnje, popis promijenjenih polja i SHA-256 hash prethodnog/novog stanja. Ne sprema se cijeli tekst pacijenta u audit dogadaj.

## Soft-delete model

Klijentska aplikacija ne koristi `deleteDoc` za pacijente. Umjesto toga pacijent dobiva:

- `status: "deleted"`;
- `deletedAt`;
- `deletedByUid`;
- `deletedByEmail`;
- `deleteReason`.

Aktivni popisi pacijenata po defaultu prikazuju samo `status: "active"`. Arhivirani zapisi se prikazuju samo korisniku s ovlastenom admin ulogom kroz filter `Prikazi arhivirane`.

## Restore

Vracanje arhiviranog pacijenta smije pokrenuti samo ovlastena admin uloga. Restore vraca `status: "active"` i upisuje `patient.restore` audit dogadaj.

## Firestore pravila

Firestore rules eksplicitno zabranjuju `delete` nad `patients`. Audit kolekcija dopusta samo `create` i `read` kroz isti organizacijski i odjelni kontekst. Update i delete audit dogadaja nisu dopusteni.
