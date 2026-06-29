// ============================================================
  // MODULE: 30-parser-tests.js
  // Source module; tools/build-offline-html.js inlines modules for offline use.
  // ============================================================
const BUILT_IN_PARSER_TEST_CASES = Object.freeze([
`PSEUDO PACIJENT ANA, rođena 12.03.1984, administrativni djelatnik, TESTNA 1, 47000 KARLOVAC

Dijagnoza: N10 - Akutni pijelonefritis
Datum nalaza: 05.05.2026
Vrijeme početka pregleda: 08:10
Vrijeme završetka pregleda: 09:05
________________________________________

Podaci sa trijaže
Glavna tegoba: febrilitet i bol lijevo lumbalno
Objektivna procjena: SpO2 97 Puls 102 ./min. RR 135/85 mmHg Temp 38,7 °C GCS 15
Trijažna kategorija: 03

Pregled pacijenta
Anamneza Razlog dolaska: febrilitet. Unazad 2 dana febrilna do 39 uz tresavicu i bol lijevo lumbalno. Bez hematurije.
Dosadašnje bolesti: AH, hipotireoza.
Alergije: negira.
Lijekovi: Amlodipin 5 mg 1x1, levotiroksin 75 mcg 1x1.

Laboratorij: L 14,2 NEUTRO 82 rel % LIMFO 10 rel % MONO 6 rel % EO 1 rel % BAZO 1 rel % CRP 188 Hb 132 Trc 244 kreatinin 82 ureja 6,4 Na 138 K 4,2 GUK 7,1
Urin: nitriti poz, L ++, E +, bakterije dosta
Terapija u OHBP-u: ceftriakson 2 g i.v., paracetamol 1 g i.v., 500 ml NaCl.`,

`PSEUDO PACIJENT MARKO, rođen 22.11.1972, skladištar, TESTNA 2, 47000 KARLOVAC

Dijagnoza: J18 - Pneumonija, nespecificirana
Datum nalaza: 05.05.2026
Vrijeme početka pregleda: 10:30
Vrijeme završetka pregleda: 11:40

Podaci sa trijaže
Glavna tegoba: kašalj i temperatura
Objektivna procjena: SpO2 92 Respirac. 22 Puls 108 RR 145/90 Temp 38,4 °C GCS 15
Trijažna kategorija: 03

Pregled pacijenta
Anamneza Febrilan 4 dana, kašlje, zadnja 24 h zaduha u naporu. Bez bolova u prsima.
Osobna anamneza: KOPB, AH.
Lijekovi: ramipril 5 mg 1x1, salbutamol po potrebi.

Lab. nalazi: CRP 245 L 17,8 Hb 141 Trc 310 ureja 9,8 kreatinin 116 Na 134 K 4,7 AST 32 ALT 28
Th.: amoksicilin/klavulanat 1,2 g i.v., azitromicin 500 mg p.o., kisik 2 L/min.`,

`PSEUDO PACIJENT IVAN, rođen 01.01.1960, umirovljenik, TESTNA 3, 47000 KARLOVAC

Dijagnoza: R50 - Vrućica
CRP 155 L 17,3 Hb 140 Trc 220 GUK 8,1 kreatinin 120 ureja 11,2 Na 133 K 4,5
Datum nalaza: 05.05.2026
Vrijeme početka pregleda: 12:15
Vrijeme završetka pregleda: 13:05

Pregled pacijenta
Anamneza Dolazi zbog febriliteta do 39 °C uz zimicu. Bez jasnog fokusa infekta.
Dosadašnje bolesti: DM2, AH.
Terapija: metformin 1000 mg 2x1, perindopril 5 mg 1x1.
Terapija u OHBP-u: paracetamol 1 g i.v., 1000 ml Ringer.`,

`PSEUDO KOVAČ ANA MARIJA, rođena 14.07.1995, studentica, TESTNA 4, 47000 KARLOVAC

Dijagnoza: A09 - Gastroenteritis i kolitis vjerojatno infektivnog podrijetla
Datum nalaza: 05.05.2026
Vrijeme početka pregleda: 14:00
Vrijeme završetka pregleda: 14:55

Pregled pacijenta
Anamneza Unazad 24 h proljev 8x, mučnina i povraćanje 2x. Afebrilna. Bez krvi u stolici.
Alergije: penicilin - osip.
Kronična terapija: nema.

Laboratorij: L 9,1 CRP 34 Hb 128 Trc 270 kreatinin 72 Na 136 K 3,3 Cl 101
Th: ondansetron 4 mg i.v., 1000 ml Ringer, kalij per os po nalazu.`,

`PSEUDO PACIJENT LUKA, rođen 30.09.2001, učenik, TESTNA 5, 47000 KARLOVAC

Dijagnoza: S00 - Površinska ozljeda glave
Uzrok povrede: W01 - Pad na istoj razini prilikom okliznuća, spoticanja ili posrtanja
Datum nalaza: 05.05.2026
Vrijeme početka pregleda: 15:20
Vrijeme završetka pregleda: 16:00

Podaci sa trijaže
Glavna tegoba: udarac glavom
Objektivna procjena: SpO2 99 Puls 78 RR 120/75 GCS 15 Temp 36,6 °C Bol 2

Pregled pacijenta
Anamneza Poskliznuo se i udario zatiljak. Bez gubitka svijesti, bez povraćanja, bez neurološkog ispada.
Lijekovi: ne uzima.
Terapija u OHBP-u: obrada manje oguljotine, analgezija po potrebi.`,

`202338 ŽUTO MUŠKO, rođen 01.01.1995, 31214 LASLOVO

Dijagnoza: S30 - Površinska ozljeda trbuha, zdjelice i donjeg dijela leđa
Datum nalaza: 05.05.2026
Vrijeme početka pregleda: 00:50
Vrijeme završetka pregleda: 01:47

Podaci sa trijaže
Glavna tegoba: kontuzijski biljeg na trbuhu
Objektivna procjena: SpO2 93 Puls 85 RR 150/100 GCS 15 Temp 34 °C
Trijažna kategorija: 03

Pregled pacijenta
Anamneza Dovežen kolima HMP. Navodno pao u jamu. Vidljiv manji hematom na desnoj trbušnoj stijenci.
Lijekovi: nepoznato.
Laboratorij: L 12,4 CRP 18 Hb 151 Trc 210 kreatinin 89 GUK 6,2
Terapija u OHBP-u: grijanje, opservacija, analgezija po potrebi.`,

`PSEUDO PACIJENT PETRA, rođena 09.05.1948, umirovljenica, TESTNA 7, 47000 KARLOVAC

Dijagnoza: I50 - Zatajivanje srca
Datum nalaza: 05.05.2026
Vrijeme početka pregleda: 17:05
Vrijeme završetka pregleda: 18:30

Pregled pacijenta
Anamneza Gušenje zadnja 3 dana, ortopneja, otoci potkoljenica. Afebrilna, bez produktivnog kašlja.
Dosadašnje bolesti: kronično srčano popuštanje, fibrilacija atrija, KBB III.
Lijekovi: bisoprolol 2,5 mg 1x1, furosemid 40 mg 1x1, apiksaban 5 mg 2x1.

PV 0,91 APTV 31 fibrinogen 4,2 D-dimeri 1,4
Laboratorij: L 8,7 CRP 12 Hb 118 Trc 190 kreatinin 146 ureja 18,0 Na 132 K 5,1
Terapija: furosemid 40 mg i.v., kisik 2 L/min.`,

`PSEUDO PACIJENT NIKOLA, rođen 18.02.1955, vozač, TESTNA 8, 47000 KARLOVAC

Dijagnoza: L03 - Celulitis
Datum nalaza: 05.05.2026
Vrijeme početka pregleda: 19:10
Vrijeme završetka pregleda: 20:05

Pregled pacijenta
Anamneza Crvenilo i bol lijeve potkoljenice 3 dana. Febrilan do 38,5. Nema rane, nema ugriza.
Osobna anamneza: DM2, periferna neuropatija.
Terapija: inzulin glargin 20 ij navečer, metformin 1000 mg 2x1.

KKS L 16,2 E 4,6 Hb 129 Htc 0,39 Trc 355
Biokemija CRP 211 GUK 14,2 kreatinin 98 Na 137 K 4,4
OHBP terapija: cefazolin 2 g i.v., paracetamol 1 g i.v.`,

`PSEUDO PACIJENT MARIJA, rođena 03.12.1988, trgovkinja, TESTNA 9, 47000 KARLOVAC

Dijagnoza: N39 - Infekcija mokraćnog sustava, sijelo neoznačeno
Datum nalaza: 05.05.2026
Vrijeme početka pregleda: 21:15
Vrijeme završetka pregleda: 21:50

Pregled pacijenta
Anamneza Dizurija i učestalo mokrenje 2 dana. Subfebrilna, bez lumbalne boli, bez povraćanja.
Alergije: negira.
Lijekovi: oralna kontracepcija.

Urin: izgled mutan, nitriti poz, L +++, E +, bakterije dosta
Laboratorij: CRP 26 L 10,1 kreatinin 69 GUK 5,2
Terapija u OHBP-u: nitrofurantoin 100 mg p.o.`,

`PSEUDO HORVAT KOVAČ ANA MARIJA, rođena 25.04.1976, liječnica, TESTNA 10, 47000 KARLOVAC

Dijagnoza: B34 - Virusna infekcija nespecificirane lokalizacije
Datum nalaza: 05.05.2026
Vrijeme početka pregleda: 22:10
Vrijeme završetka pregleda: 22:45

Podaci sa trijaže
Glavna tegoba: temperatura i bolovi u mišićima
Objektivna procjena: SpO2 98 Puls 94 RR 118/70 Temp 38,1 °C GCS 15

Pregled pacijenta
Anamneza Febrilna 1 dan, mialgije, glavobolja. Bez dispneje, bez dizurije, bez proljeva.
Lijekovi: ne uzima.
Laboratorij: L 5,2 CRP 8 Hb 136 Trc 205 kreatinin 74 Na 139 K 4,0
Terapija u OHBP-u: paracetamol 1 g p.o., simptomatske mjere.`,

`VUKOVIĆ-MOTTL SRNA, rođena 08.09.1940, umirovljenik ULICA HUGA BADALIĆA 16, 10000 ZAGREB

Dijagnoza: R10 - Boli u trbuhu i u zdjelici
Datum nalaza: 04.05.2026

Pregled pacijenta
Anamneza Bolovi u trbuhu.
Lijekovi: Emanera 40 mg 2x1, apiksaban 2.5 mg 2x1.
LAB: E 4.33 [1e12]/L, Hb 113 g/L, Lkc 16.5 [1e9]/L, CRP 152.6 mg/L
RTG: Nativna snimka abdomena bez znakova perforacije.
Dg. Haematochezia, Diarrhoea
Th: FO 250ml iv. od HMP + 250ml ovdje.`,

`PSEUDO TURKOVIĆ MIJO, rođen 28.04.1958, pom. radnik, TESTNA 12, 47000 OGULIN

Datum pregleda: 13.03.2026.
Dijagnoza: R10 - Boli u trbuhu i u zdjelici

Pregled pacijenta
Anamneza Boli u trbuhu.

RTG: Na nativnoj snimci abdomena stojeći ne nalazim znakova pneumoperitoneuma, patoloških aerolikvidnih nivoa niti distenzije crijevnih vijuga. Umjereni crijevni meteorizam.
Na sumacijskoj snimci srca i pluća sa LP sjena srca je dobi primjerene veličine i oblika. Pleuralnog izljeva ili pneumotoraksa se ne vidi.

LAB: E 5.44 [1e12]/L, Hb 164 g/L, Trc 259 [1e9]/L, Lkc 9.0 [1e9]/L, SEGm 68 rel %, LIMFOm 20 rel %, MONOm 11 rel %, EOm 1 rel %, BAZOm 0 rel %, PV 0.52 1, INR 1.6, APTV 45.4 s, GUK 8.7 mmol/L, UREJA 8.9 mmol/L, KREA 97 µmol/L, AST 99 U/L, ALT 124 U/L, ALP 143 U/L, GGT 99 U/L, Na 136 mmol/L, K 4.2 mmol/L, PROKAL 0.40 µg/L, CRP 118.8 mg/L

Dg. Diverticulitis ac susp.
Th: analgezija.`,

`PSEUDO PACIJENT DIJAGNOZA VALIDACIJA, rođen 02.02.1962, TESTNA 13, 47000 KARLOVAC

Dijagnoza: R50 - Vrućica
Datum nalaza: 06.05.2026
LAB: L 11.1 [1e9]/L, CRP 88 mg/L
Dg. Uroinfectio, Diabetes mellitus, Prema dogovoru s dežurnim kirurgom pacijent se vraća na hospitalizaciju.
Th: ceftriakson 2 g i.v.`,

`PSEUDO KOSIĆ RANKA, rođena 10.05.1953, TESTNA 14, 47000 KARLOVAC

Dijagnoza: R50 - Vrućica nepoznata podrijetla
Datum nalaza: 08.05.2026
Pregled pacijenta
Anamneza Onkološka bolesnica, febrilna 8 dana.
Lijekovi: Helex pp, nadoknada željeza
Alergije na lijekove: negira
LAB: E 3.38 [1e12]/L, Hb 91 g/L, Trc 472 [1e9]/L, Lkc 12.7 [1e9]/L, PV 0.80 1, INR 1.2, GUK 6.0 mmol/L, UREJA 3.2 mmol/L, KREA 56 µmol/L, Na 131 mmol/L, K 3.5 mmol/L, CRP 238.6 mg/L, Boja svijetlo žuta, Izgled jako zamućen, RVM 1.015 kg/L, pH 7.5 pH j., Lkc 3, Nitriti neg., Erc trag, Leukociti masa, Eritrociti dosta
RTG: Bez svježih infiltrativnih promjena.
Th: paracetamol 1000mg iv u 100mL F.O. + F.O. 500mL iv, Kalinor eff

Završna dijagnoza, epikriza i preporuke
Dg: St febrilis, Anaemia microcytica, Uroinfectio

Prijem- ZARAZNI (konzultiran infektolog dr. Jerković)

Molim aplicirati ceftriakson 2g iv.
Uzeti HKx2, UKx2.`,

`PSEUDO PACIJENT DG ORDINIRANA PRIPREMA, rođen 01.01.1970, TESTNA 15, 47000 KARLOVAC

Dijagnoza: R10 - Boli u trbuhu i u zdjelici
Datum nalaza: 05.05.2026
Pregled pacijenta
LAB: Lkc 11.8 [1e9]/L, CRP 31.2 mg/L, KREA 218 µmol/L, K 2.1 mmol/L
Th: Acipan 80mg iv, Reglan 10mg iv, Glukoza 5% 500mL iv, Analgin 1amp iv u 100mL F.O. K 30mEq u 500mL F.O.+K 40mEq u 500mL F.O.

Završna dijagnoza, epikriza i preporuke
Dg: Collicae abdominales, Hypokaliaemia, Melaena ex anamnesis, St. post Bilroth II, St post ulcus duodeni

Ordinirana priprema za CT abdomena (dr. Test, u nastavku dr. Test)
Ad internist`,

`PSEUDO PACIJENT DG SLASH TH SLASH, rođen 01.01.1965, TESTNA 16, 47000 KARLOVAC

Dijagnoza: R53 - Slabost i umor
Datum nalaza: 10.05.2026
Pregled pacijenta
LAB: E 2.79 [1e12]/L, Hb 80 g/L, Lkc 13.5 [1e9]/L, GUK 23.1 mmol/L, KREA 834 µmol/L, CRP 116.3 mg/L
Dg/ St.febrilis, Hyperglicemia, Tussis, Enteritis i.o., Insuff.renalis chr. in acutisatio

Th / Reglan ampl iv, Apidra 10 IJ sc, Analgin u 100 ml FO iv x1, 500 ml FO iv x1

Molim`,

`PSEUDO PACIJENT KRONICNA TERAPIJA LABEL TERAPIJA, rođena 10.11.1943, TESTNA 17, 47000 KARLOVAC

Dijagnoza: R53 - Slabost i umor
Datum nalaza: 08.05.2026
Pregled pacijenta
Anamneza Malaksalost nekoliko dana.
Osobna anamneza: onkološka bolest, arterijska hipertenzija.
Alergije na lijekove: negira.
Terapija: Cefuroxim, Pinox, Osan plus

Status: Pri svijesti, kontaktibilna, orijentirana.
Na sumacijskoj snimci torakalnih organa ne nalazi se svježih infiltrativnih promjena.
LAB: E 3.61 [1e12]/L, Hb 108 g/L, Lkc 14.0 [1e9]/L, CRP 296.7 mg/L, KREA 65 µmol/L, K 3.8 mmol/L
Dg: Langouor et lassitudo, hernia ventralis
konzultiran dr. Test`,

`PSEUDO PACIJENT RADIOLOGIJA BEZ DVOTOCKE, rođen 06.04.1958, TESTNA 18, 47000 KARLOVAC

Dijagnoza: R10 - Boli u trbuhu i u zdjelici
Datum nalaza: 12.05.2026
Pregled pacijenta
Anamneza Krv u stolici.
LAB:
Laboratorijski nalaz
E 3.36 [1e12]/L, Hb 88 g/L, Lkc 9.4 [1e9]/L, PV 0.93 1, INR 1.1, APTV 40.7 s, Fib 7.8 g/L
KREA 106 µmol/L, CKD-EPI 62 mL/min/1,73m2, K 2.5 mmol/L

RTG
Nativna snimka abdomena učinjena ležeći na lijevom boku ne pokazuje znakova perforacije šupljeg organa niti patološke distenzije lumena crijeva.

Datum i vrijeme nalaza: 12.5.2026. 15:38:42
Liječnik:
Pseudo Radiolog, dr. med.

Dg: Rectoragija
Hipokalijemia

molim pregled interniste`,

`PSEUDO PACIJENT MSCT NAKON LABA, rođena 10.11.1943, TESTNA 19, 47000 KARLOVAC

Dijagnoza: R53 - Slabost i umor
Datum nalaza: 08.05.2026
Pregled pacijenta
Anamneza Malaksalost.
LAB: E 3.61 [1e12]/L, Hb 108 g/L, Lkc 14.0 [1e9]/L, CRP 296.7 mg/L, KREA 65 µmol/L, K 3.8 mmol/L

Hitni MSCT abdomena i zdjelice nativno i postkontrastno:

Na presjecima započetim u bazi toraksa vidi se pleuralni izljev u području lijeve plućne baze širine plašta 3 cm.
Stanje nakon lijevostrane nefrektomije. U lijevoj bubrežnoj loži je vidljiv lokalni recidiv dimenzija 8 x 6 cm.

Datum i vrijeme nalaza: 8.5.2026. 19:37:31
Liječnik:
Pseudo Radiolog, dr. med.

Dg: Langouor et lassitudo, hernia ventralis`,

`PSEUDO PACIJENT RTG UZV OPISNI NASLOVI, rođena 26.04.1998, TESTNA 20, 47000 KARLOVAC

Dijagnoza: R10 - Boli u trbuhu i u zdjelici
Datum nalaza: 11.05.2026
Pregled pacijenta
Anamneza Febrilitet i bol u desnom donjem kvadrantu.
LAB: E 4.95 [1e12]/L, Hb 136 g/L, Lkc 11.2 [1e9]/L, CRP 118.8 mg/L, KREA 70 µmol/L, K 3.9 mmol/L

RTG srca i pluća: Na sumacijskoj snimci srca i pluća sa LP uredna je prozračnost plućnog parenhima bez akutnih zastojnih promjena ili formiranog upalnog infiltrata. Pleuralnog izljeva ili pneumotoraksa se ne vidi.

RTG abdomena: Na nativnoj snimci abdomena stojeći ne nalazi pneumoperitoneuma. Vidljive su meteoristične vijuge jejunuma sa formiranim aerolikvidnim nivoima.

UZV abdomena: Jetra je primjerene veličine, pravilnih kontura, homogene ehostrukture bez žarišnih lezija. U dnu zdjelice manja količina slobodnog tekućeg sadržaja. Apendiks ne prikazujem.

Dg: Colicae abd.
Th: Perfalgan 1 g i.v. x1`,

`PSEUDO PACIJENT KRONICNA LIJEKOVI KOMORBIDITETI, rođena 27.08.1956, TESTNA 21, 47000 KARLOVAC

Dijagnoza: Z48 - Drugo kirurško praćenje i zbrinjavanje
Datum nalaza: 13.05.2026
Pregled pacijenta
Anamneza Kontrolna obrada zbog bolova u trbuhu.
Lijekovi: Tomid, Andol 100, Controloc, Gapulsid, Concor.
Komorbiditeti: polipi debelog crijeva, obostrana ovariektomija i histerektomija.
Alergija na Sinersul.

Status
Abdomen mekan, bez peritonealnog nadražaja.
Laboratorijski nalazi, RTG, UZV, EKG
Nativni abdomen stojeći bez slobodnog zraka pod ošitima.
LAB: AST 23 U/L, ALT 34 U/L, GGT 89 U/L, CRP 261.9 mg/L, E 4.29 [1e12]/L, Hb 127 g/L, Lkc 9.3 [1e9]/L, KREA 80 µmol/L, K 4.4 mmol/L
Hitni MSCT toraksa, abdomena i zdjelice nativno i postkontrastno:
Zadebljanje retikularnog intersticija sa ground glasom u donjim režnjevima.
Dg colicae abdominales
Th: pregledana, bez indikacije za hitnim kirurškim zbrinjavanjem.`,


`PSEUDO PACIJENT RTG U OCITANJU DG SLASH, rođen 21.09.1952, TESTNA 22, 47000 KARLOVAC

Dijagnoza: R06 - Nepravilnosti disanja
Datum nalaza: 08.05.2026
Pregled pacijenta
Anamneza Dispneja nekoliko dana. Ordiniran Solumedrol 40 mg iv, Aminofilin iv.
Od lijekova : Vilspox, Gliclada, Andol, Ultibro, za ostalu terapiju nisu sigurni
LAB: E 3.55 [1e12]/L, Hb 81 g/L, Lkc 11.5 [1e9]/L, GUK 6.4 mmol/L, KREA 173 µmol/L, K 5.5 mmol/L, CRP 30.1 mg/L

RTG: u očitanju

Dg/ Oedema pulmonum hypertensivum, Insuff. respiratoria acuta, Cor decompensatum, KOBP in exacerbatio, Anaemia microcytica, Insuff. renalis chr., Hyperkalaemia

Th / MONITORING
Fursemid 2 ampl iv
Solumedrol 40 mg iv
Nitronal 1 ampl u 500 ml FO 10 ml/h

Molim pregled interniste`,

`PSEUDO PACIJENT LIJEKOVI IZ MED DOK SE NE POVLACE, rođena 19.10.1955, TESTNA 23, 47000 KARLOVAC

Datum pregleda: 06.05.2026.
Dijagnoza: R10 - Boli u trbuhu i u zdjelici
Pregled pacijenta
Anamneza Dispneja nekoliko dana.
Dosadašnje bolesti: arterijska hipertenzija, FA, DM tip 2.
Lijekovi iz med. dok.: Tresiba 40 j jednom dnevno sc., Ozempic 1 mg 1x tjedno sc., Synjardy 12,5/1000 mg 1,0,0 tbl., Siofor 1000 mg 0, 1/2, 1 tbl, Gliclada 60 mg 1,0,0 tbl.
Alergije na lijekove do sada nije manifestirala.
Status: pri svijesti, orijentirana.
LAB: E 5.10 [1e12]/L, Hb 110 g/L, Lkc 9.4 [1e9]/L, INR 2.8, GUK 6.1 mmol/L, KREA 78 µmol/L, CRP 6.2 mg/L
RTG: AP snimka torakalnih organa upućuje na zastojne promjene.
Dg: Cor decompensatum
Th: Fursemid 40 mg i.v., Lanitop 1 amp i.v.`,

`PSEUDO PACIJENT PROKALCITONIN DUPLA OZNAKA, rođen 18.12.1965, TESTNA 24, 47000 KARLOVAC

Dijagnoza: R10 - Boli u trbuhu i u zdjelici
Datum nalaza: 18.04.2026
Pregled pacijenta
Anamneza Bolovi u trbuhu i slabost.
LAB: E 4.93 [1e12]/L, Hb 146 g/L, Lkc 10.9 [1e9]/L, CRP 117.0 mg/L
Prokalcitonin: PROKAL 1.13 µg/L
Dg. Laesio hepatis
Th: Concor 2.5 mg p.o.`,

`PSEUDO PACIJENT DG ACS PRIJE ZAVRSNOG NASLOVA, rođena 21.05.1948, TESTNA 25, 47000 KARLOVAC

Dijagnoza: R06.0 - Dispneja
Datum nalaza: 04.05.2026
Pregled pacijenta
Anamneza Dispneja i pritisak u prsima.
Lijekovi: Gluformin 850 mg, Concor COR 2.5 mg, Controloc 20 mg.
Alergije na lijekove: negira.
EKG: Sinus ritam, ST denivelacija.
LAB: E 3.96 [1e12]/L, Hb 106 g/L, Lkc 8.7 [1e9]/L, hs Trop 2388.7 ng/L, CRP 14.4 mg/L
RTG: Na preglednoj PA i LP snimci torakalnih organa ne nalazim svježeg upalnog infiltrata.

Dg. ACS

Završna dijagnoza, epikriza i preporuke
Ad internist.
Liječnik:
Pseudo Liječnik, dr. med.`,

`PSEUDO PACIJENT RADIOLOGIJA NE POVLACI ABS, rođen 05.07.1937, TESTNA 26, 47000 KARLOVAC

Dijagnoza: R07 - Bol u grlu i prsištu
Datum pregleda: 23.04.2026.
Pregled pacijenta
Anamneza Bolovi u trbuhu.
Laboratorijski nalaz:
E 5.13 [1e12]/L, Hb 150 g/L, Lkc 12.1 [1e9]/L, GUK 13.4 mmol/L, KREA 163 µmol/L, CRP 134.7 mg/L, Leukociti dosta, Bakterije masa

RTG: Na AP snimci torakalnih organa aorta je sklerotična uz uredan preostali intratorakalni status.

UZV abd: Jetra uredne ehostrukture. Desni bubreg atrofičan, lijevi uredne veličine. Mokraćni mjehur je kateteriziran i prazan. Pregledom ileocekalne regije ne prikaže se patološkog supstrata.

(aK) pH 7.503 pH jedinica, (aK) pCO2 3.86 kPa, (aK) pO2 19.42 kPa, (aK) HCO3 22 mmol/L

kontrolno troponin I u 16:30 - u izradi

Th - FO 500 ml i.v., Perfalgan 1 g i.v.
Dg. Uroinfectio, Colicae abd., Hypotensio arterialis

U dogovoru s anesteziologom, pacijent se prima u JIL.`,

`PSEUDO PACIJENT DIJAGNOZE NE POVLACE UK, rođen 04.09.1942, TESTNA 27, 47000 KARLOVAC

Dijagnoza: R06.0 - Dispneja
Datum nalaza: 05.05.2026
Pregled pacijenta
Anamneza Otežano disanje i kašalj.
Lijekovi: nema kroničnu th, doksiciklin unazad 6 dana.
Alergije: nepoznate.
LAB: E 2.50 [1e12]/L, Hb 84 g/L, Lkc 9.7 [1e9]/L, KREA 892 µmol/L, CRP 173.5 mg/L
RTG: Na sumacijskoj AP snimci torakalnih organa obostrano manji razliveni pleuralni izljevi.

Terapija: Cipla inh., FO 500 ml i.v.
Dijagnoze: Insuff renalis, Anaemia macrocytica, Eff pleurae

Postavljen UK, 300 ml retencije, nalaz urina u izradi.

Završna dijagnoza, epikriza i preporuke
Ad internist.`,

`PSEUDO PACIJENT KRONICNA TH CRTA PREMA ZADNJEM NALAZU, rođen 24.02.1948, TESTNA 28, 47000 KARLOVAC

Dijagnoza: R06 - Nepravilnosti disanja
Datum nalaza: 06.05.2026
Pregled pacijenta
Anamneza Dispneja i otoci nekoliko dana.
Dosadašnje bolesti: DM tip 2, AH, astma, BHP.
Th - ne zna što troši, ovo je prema zadnjem nalazu: NovoMix (30) 24, 14, 6-6 j sc, Eliquis 2x2.5mg, Lercanil 10mg 0,0,1 tbl, Lasix 1 tbl svaki treći dan, Vesomni 0,0,1 caps, Reglan tbl pp.
Alergije na lijekove negira.
Status: pri svijesti, tahipnoičan.
LAB: E 3.21 [1e12]/L, Hb 85 g/L, Lkc 3.8 [1e9]/L, D-D 2.12 mg/L FEU, KREA 110 µmol/L, K 5.5 mmol/L, CRP 3.0 mg/L
Urin: naknadno poslan, u izradi
PA i LL snimke torakalnih organa pokazuju bilateralna opsežnija homogena zasjenjenja u smislu pleuralnih izljeva.
Dg. Anasarca, Acydosis metabolica, Cor decomp, Effusio pleurales billat.
Th: Fursemid 60mg i.v.`,

`PSEUDO PACIJENT MANUAL DKS, rođen 01.01.1951, TESTNA 11, 47000 KARLOVAC

Dijagnoza: R50 - Vrućica
Datum nalaza: 01.10.2025
Pregled pacijenta
Anamneza Febrilan uz zimicu.

LAB: E 5.10 [1e12]/L, Hb 154 g/L, Trc 186 [1e9]/L, Lkc 2.8 [1e9]/L, NEUm# 2.21 [1e9]/L, NESEGm# 0.25 [1e9]/L, LIMFOm# 0.25 [1e9]/L, MONOm# 0.06 [1e9]/L, EOm# 0.00 [1e9]/L, BAZOm# 0.00 [1e9]/L, METAm# 0.03 [1e9]/L, SEGm 79 rel %, NESEGm 9 rel %, LIMFOm 9 rel %, MONOm 2 rel %, EOm 0 rel %, BAZOm 0 rel %, METAm 1 rel %, GUK 18.5 mmol/L, UREJA 9.6 mmol/L, KREA 114 µmol/L, CRP 161.7 mg/L

Th: 500 mL FO + 1 g paracetamol i.v.`
  ]);

  function truncateForParserTest(value, maxLength = 120) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1)}…`;
  }

  function splitParserTestCases(rawText) {
    const normalized = normalizeLineBreaks(rawText).trim();
    if (!normalized) return [];

    let parts = normalized
      .split(/\n\s*(?:-{3,}|={3,}|#{3,})\s*\n/g)
      .map(part => part.trim())
      .filter(Boolean);

    if (parts.length <= 1) {
      parts = normalized
        .split(/\n(?=(?:\d{3,}\s+)?[A-ZČĆŽŠĐ][A-ZČĆŽŠĐA-Z'’\- ]{2,},?\s+(?:rođen|rođena|roden|rodena)\b)/gi)
        .map(part => part.trim())
        .filter(Boolean);
    }

    return parts.slice(0, 30);
  }

  function getParserTestWarnings(parsed) {
    const warnings = [];
    if (parsed.nameValidationWarning) warnings.push(parsed.nameValidationWarning);
    if (parsed.nameOrderWarning) warnings.push(parsed.nameOrderWarning);
    if (parsed.diagnosisWarning) warnings.push(parsed.diagnosisWarning);
    if (parsed.therapyLabWarning) warnings.push(parsed.therapyLabWarning);
    if (parsed.labWithoutMarkerWarning) warnings.push(parsed.labWithoutMarkerWarning);
    if (typeof getUnsafeClinicalSafetySummaries === 'function') warnings.push(...getUnsafeClinicalSafetySummaries(parsed));
    return warnings;
  }

  function getParserTestStatus(parsed) {
    const detectedFields = ['fullName', 'birthYear', 'admissionDate', 'diagnosis', 'vitalSigns', 'labRaw', 'radiologyRaw']
      .filter(key => typeof hasClinicalFieldValue === 'function' ? hasClinicalFieldValue(parsed, key) : hasParsedValue(parsed[key]));
    const warnings = getParserTestWarnings(parsed);
    const notes = [...warnings];

    if (detectedFields.length === 0) {
      return {
        className: 'fail',
        outcome: 'fail',
        label: 'FAIL',
        notes: ['Parser nije prepoznao nijedno ključno polje.']
      };
    }

    if (detectedFields.length < 3) {
      notes.push('Prepoznato je manje od tri ključna polja; nalaz može biti nepotpun.');
    }

    if (notes.length) {
      return {
        className: 'pass-warn',
        outcome: 'passWarn',
        label: 'PASS + upozorenje',
        notes
      };
    }

    return { className: 'pass', outcome: 'pass', label: 'PASS', notes: [] };
  }

  function parserTestCell(parsed, key) {
    if (typeof hasUnsafeClinicalSafety === 'function' && hasUnsafeClinicalSafety(parsed, key)) return '<span class="warn">?</span>';
    const hasValue = typeof hasClinicalFieldValue === 'function' ? hasClinicalFieldValue(parsed, key) : hasParsedValue(parsed[key]);
    if (hasValue) return '<span class="ok">✓</span>';
    return '<span class="bad">—</span>';
    return hasParsedValue(parsed[key]) ? '<span class="ok">✓</span>' : '<span class="bad">—</span>';
  }

  function renderParserTestResults(cases) {
    if (!els.parserTestResults || !els.parserTestSummary) return;

    if (!cases.length) {
      els.parserTestSummary.textContent = 'Nema teksta za testiranje.';
      els.parserTestSummary.classList.add('warn');
      els.parserTestResults.innerHTML = '';
      return;
    }

    const rows = cases.map((text, index) => {
      const parsed = parseOhbpText(text);
      const status = getParserTestStatus(parsed);
      const statusNotes = status.notes || [];
      const jsonPreview = JSON.stringify(parsed, null, 2);
      const statusClassName = safeHtmlClassToken(status.className, 'bad');
      return {
        html: `<tr>
          <td>${index + 1}</td>
          <td><span class="${statusClassName}">${escapeHtml(status.label)}</span></td>
          <td>${parserTestCell(parsed, 'fullName')}<br>${escapeHtml(truncateForParserTest(parsed.fullName, 70))}</td>
          <td>${parserTestCell(parsed, 'birthYear')}<br>${escapeHtml(parsed.birthYear || '')}</td>
          <td>${parserTestCell(parsed, 'admissionDate')}<br>${escapeHtml(parsed.admissionDate || '')}</td>
          <td>${parserTestCell(parsed, 'diagnosis')}<br>${escapeHtml(truncateForParserTest(parsed.diagnosis, 120))}</td>
          <td>${parserTestCell(parsed, 'therapy')}</td>
          <td>${parserTestCell(parsed, 'ohbpTherapy')}</td>
          <td>${parserTestCell(parsed, 'labRaw')}<br>${escapeHtml(truncateForParserTest(parsed.labRaw, 120))}</td>
          <td>${parserTestCell(parsed, 'radiologyRaw')}<br>${escapeHtml(truncateForParserTest(parsed.radiologyRaw, 120))}</td>
          <td>${statusNotes.length ? escapeHtml(statusNotes.join(' ')) : '<span class="ok">nema</span>'}<details><summary>JSON</summary><pre>${escapeHtml(jsonPreview)}</pre></details></td>
        </tr>`,
        status,
        warnings: statusNotes
      };
    });

    const failCount = rows.filter(row => row.status.outcome === 'fail').length;
    const passWarnCount = rows.filter(row => row.status.outcome === 'passWarn').length;
    const passCount = rows.filter(row => row.status.outcome === 'pass').length;
    els.parserTestSummary.textContent = `Testirano: ${rows.length}. PASS: ${passCount}. PASS + upozorenje: ${passWarnCount}. FAIL: ${failCount}.`;
    els.parserTestSummary.classList.toggle('warn', failCount > 0);
    els.parserTestResults.innerHTML = `<table class="parser-test-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Status</th>
          <th>Ime</th>
          <th>God.</th>
          <th>Datum</th>
          <th>Dg.</th>
          <th>Kron. th</th>
          <th>OHBP th</th>
          <th>Lab</th>
          <th>RTG/UZV</th>
          <th>Upozorenja / detalji</th>
        </tr>
      </thead>
      <tbody>${rows.map(row => row.html).join('')}</tbody>
    </table>`;

    setStatus(`Test parsera dovršen: ${rows.length} nalaza. PASS ${passCount}, PASS + upozorenje ${passWarnCount}, FAIL ${failCount}.`, failCount > 0);
  }

  function runBuiltInParserTests() {
    if (!els.parserTestInput) return;
    const builtInText = BUILT_IN_PARSER_TEST_CASES.join('\n\n---\n\n');
    els.parserTestInput.value = builtInText;
    setStatus(`Pokrenut ugrađeni testni paket: ${BUILT_IN_PARSER_TEST_CASES.length} pseudo-OHBP nalaza.`, false);
    renderParserTestResults(splitParserTestCases(builtInText));
  }

  function runParserTest() {
    const raw = els.parserTestInput?.value || '';
    const cases = splitParserTestCases(raw);
    if (cases.length >= 30 && splitParserTestCases(raw + '\n---\nX').length > 30) {
      setStatus('Test parsera ograničen je na prvih 30 nalaza radi brzine i preglednosti.', true);
    }
    renderParserTestResults(cases);
  }

  function clearParserTest() {
    if (els.parserTestInput) els.parserTestInput.value = '';
    if (els.parserTestSummary) {
      els.parserTestSummary.textContent = 'Nema pokrenutog testa.';
      els.parserTestSummary.classList.remove('warn');
    }
    if (els.parserTestResults) els.parserTestResults.innerHTML = '';
    setStatus('Test parsera očišćen.');
  }


  const PARSER_REGRESSION_FIELDS = Object.freeze([
    'fullName', 'birthYear', 'admissionDate', 'diagnosis', 'therapy', 'ohbpTherapy', 'vitalSigns', 'followUpControlDate', 'followUpControl', 'labRaw', 'radiologyRaw', 'allergies'
  ]);

  const PARSER_REGRESSION_EXPECTED_ALIASES = Object.freeze({
    chronicTherapyContains: { field: 'therapy', mode: 'contains' },
    chronicTherapyNotContains: { field: 'therapy', mode: 'notContains' },
    kronicnaTerapijaContains: { field: 'therapy', mode: 'contains' },
    kronicnaTerapijaNotContains: { field: 'therapy', mode: 'notContains' },
    labContains: { field: 'labRaw', mode: 'contains' },
    labNotContains: { field: 'labRaw', mode: 'notContains' },
    radiologyContains: { field: 'radiologyRaw', mode: 'contains' },
    radiologyNotContains: { field: 'radiologyRaw', mode: 'notContains' },
    rtgContains: { field: 'radiologyRaw', mode: 'contains' },
    rtgNotContains: { field: 'radiologyRaw', mode: 'notContains' },
    vitalSignsContains: { field: 'vitalSigns', mode: 'contains' },
    vitalSignsNotContains: { field: 'vitalSigns', mode: 'notContains' },
    vitalsContains: { field: 'vitalSigns', mode: 'contains' },
    vitalsNotContains: { field: 'vitalSigns', mode: 'notContains' },
    followUpControlContains: { field: 'followUpControl', mode: 'contains' },
    followUpControlNotContains: { field: 'followUpControl', mode: 'notContains' },
    followUpControlDate: { field: 'followUpControlDate', mode: 'equals' }
  });

  function normalizeForParserRegression(value) {
    return String(value ?? '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Regresijski test ne smije padati samo zbog uobičajenih medicinskih kratica.
      // Primjeri: i.v. ↔ i.v, p.o. ↔ p.o, lat. dex. ↔ lateris dextri.
      .replace(/\bi\s*\.\s*v\.?\b/g, 'iv')
      .replace(/\bp\s*\.\s*o\.?\b/g, 'po')
      .replace(/\bs\s*\.\s*c\.?\b/g, 'sc')
      .replace(/\bi\s*\.\s*m\.?\b/g, 'im')
      .replace(/\blat\.?\s+dex\.?\b/g, 'lateris dextri')
      .replace(/\blat\.?\s+sin\.?\b/g, 'lateris sinistri')
      .replace(/\bbillat\.?\b/g, 'bilateralis')
      .replace(/\bbilat\.?\b/g, 'bilateralis')
      .replace(/\bbil\.\b/g, 'bilateralis')
      .replace(/\bnegira\b/g, 'nema')
      .replace(/[.;:]+/g, '')
      .replace(/×/g, 'x');
  }

  function normalizeFlatForParserRegression(value) {
    return normalizeForParserRegression(value).replace(/\s+/g, ' ');
  }

  function hasExpectedKey(expected, key) {
    return Object.prototype.hasOwnProperty.call(expected || {}, key);
  }

  function expectedList(value) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === '') return [];
    return [value];
  }

  function parserRegressionFieldValue(parsed, field) {
    return String((parsed && parsed[field]) ?? '');
  }

  function parserRegressionAssertEqual(parsed, expected, field, errors) {
    if (!hasExpectedKey(expected, field)) return;
    const gotRaw = parserRegressionFieldValue(parsed, field);
    const wantRaw = expected[field];
    const got = normalizeFlatForParserRegression(gotRaw);
    const want = normalizeFlatForParserRegression(wantRaw);
    if (got !== want) {
      errors.push(`${field}: očekivano “${String(wantRaw)}”, dobiveno “${String(gotRaw)}”`);
    }
  }

  function parserRegressionAssertContains(parsed, expected, field, expectedKey, errors) {
    if (!hasExpectedKey(expected, expectedKey)) return;
    const got = normalizeFlatForParserRegression(parserRegressionFieldValue(parsed, field));
    expectedList(expected[expectedKey]).forEach((item) => {
      if (!got.includes(normalizeFlatForParserRegression(item))) {
        errors.push(`${field}: nedostaje “${String(item)}”`);
      }
    });
  }

  function parserRegressionAssertNotContains(parsed, expected, field, expectedKey, errors) {
    if (!hasExpectedKey(expected, expectedKey)) return;
    const got = normalizeFlatForParserRegression(parserRegressionFieldValue(parsed, field));
    expectedList(expected[expectedKey]).forEach((item) => {
      const normalizedItem = normalizeFlatForParserRegression(item);
      if (normalizedItem && got.includes(normalizedItem)) {
        errors.push(`${field}: ne smije sadržavati “${String(item)}”`);
      }
    });
  }

  function parserRegressionWarnings(parsed) {
    return getParserTestWarnings(parsed || {});
  }

  function compareParserRegressionCase(parsed, expected = {}) {
    const errors = [];
    const warnings = parserRegressionWarnings(parsed);

    PARSER_REGRESSION_FIELDS.forEach((field) => {
      parserRegressionAssertEqual(parsed, expected, field, errors);
      parserRegressionAssertContains(parsed, expected, field, `${field}Contains`, errors);
      parserRegressionAssertNotContains(parsed, expected, field, `${field}NotContains`, errors);
    });

    Object.entries(PARSER_REGRESSION_EXPECTED_ALIASES).forEach(([expectedKey, config]) => {
      if (config.mode === 'contains') parserRegressionAssertContains(parsed, expected, config.field, expectedKey, errors);
      if (config.mode === 'notContains') parserRegressionAssertNotContains(parsed, expected, config.field, expectedKey, errors);
    });

    expectedList(expected.requiredFields).forEach((field) => {
      if (!hasParsedValue(parsed[field])) errors.push(`${field}: obavezno polje nije prepoznato`);
    });

    expectedList(expected.emptyFields).forEach((field) => {
      if (hasParsedValue(parsed[field])) errors.push(`${field}: očekivano prazno, dobiveno “${String(parsed[field])}”`);
    });

    if (expected.noWarnings === true && warnings.length) {
      errors.push(`warnings: očekivano bez upozorenja, dobiveno “${warnings.join(' | ')}”`);
    }

    parserRegressionAssertContains({ warnings: warnings.join(' | ') }, expected, 'warnings', 'warningContains', errors);
    parserRegressionAssertNotContains({ warnings: warnings.join(' | ') }, expected, 'warnings', 'warningNotContains', errors);

    return { pass: errors.length === 0, errors, warnings };
  }

  function normalizeParserRegressionCasesPayload(payload) {
    const rawCases = Array.isArray(payload) ? payload :
      Array.isArray(payload?.cases) ? payload.cases :
      Array.isArray(payload?.testCases) ? payload.testCases :
      Array.isArray(payload?.tests) ? payload.tests : [];

    return rawCases.map((item, index) => {
      const raw = String(item?.raw ?? item?.text ?? item?.input ?? '');
      return {
        id: String(item?.id ?? `CASE-${String(index + 1).padStart(3, '0')}`),
        scenario: String(item?.scenario ?? item?.name ?? item?.description ?? ''),
        raw,
        expected: item?.expected ?? item?.expect ?? {}
      };
    }).filter(item => item.raw.trim());
  }

  function renderParserRegressionLoadedState() {
    if (!els.parserRegressionSummary) return;
    const count = state.parserRegressionCases.length;
    const source = state.parserRegressionSourceName ? ` Izvor: ${state.parserRegressionSourceName}.` : '';
    els.parserRegressionSummary.textContent = count
      ? `Učitano: ${count} regresijskih testova.${source}`
      : 'Nema učitanih regresijskih testova.';
    els.parserRegressionSummary.classList.toggle('warn', count === 0);
    if (els.parserRegressionResults && !count) els.parserRegressionResults.innerHTML = '';
  }

  function loadParserRegressionCasesFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || ''));
        const cases = normalizeParserRegressionCasesPayload(payload);
        if (!cases.length) throw new Error('JSON ne sadrži valjane testne slučajeve.');
        state.parserRegressionCases = cases;
        state.parserRegressionSourceName = file.name || 'učitana JSON datoteka';
        state.parserRegressionReport = null;
        renderParserRegressionLoadedState();
        if (els.parserRegressionResults) els.parserRegressionResults.innerHTML = '';
        setStatus(`Učitano ${cases.length} regresijskih testova parsera.`, false);
      } catch (error) {
        state.parserRegressionCases = [];
        state.parserRegressionSourceName = '';
        state.parserRegressionReport = null;
        renderParserRegressionLoadedState();
        setStatus(`Ne mogu učitati regresijske testove: ${error.message}`, true);
      }
    };
    reader.onerror = () => setStatus('Ne mogu pročitati JSON datoteku regresijskih testova.', true);
    reader.readAsText(file, 'utf-8');
  }

  function parserRegressionParsedSummary(parsed) {
    return [
      `Ime: ${parsed.fullName || '—'}`,
      `God.: ${parsed.birthYear || '—'}`,
      `Datum: ${parsed.admissionDate || '—'}`,
      `Dg: ${truncateForParserTest(parsed.diagnosis || '', 90) || '—'}`,
      `Kron. th: ${parsed.therapy ? '✓' : '—'}`,
      `OHBP th: ${parsed.ohbpTherapy ? '✓' : '—'}`,
      `Vitalni: ${parsed.vitalSigns || '—'}`,
      `Lab: ${parsed.labRaw ? '✓' : '—'}`,
      `RTG/UZV: ${parsed.radiologyRaw ? '✓' : '—'}`
    ].join('\n');
  }

  function renderParserRegressionReport(report) {
    if (!els.parserRegressionSummary || !els.parserRegressionResults) return;

    if (!report || !Array.isArray(report.results) || !report.results.length) {
      els.parserRegressionSummary.textContent = 'Nema rezultata regresijskog testa.';
      els.parserRegressionSummary.classList.add('warn');
      els.parserRegressionResults.innerHTML = '';
      return;
    }

    const failed = report.results.filter(item => !item.pass).length;
    const passed = report.results.length - failed;
    const percent = Math.round((passed / report.results.length) * 1000) / 10;
    els.parserRegressionSummary.textContent = `Regresijski test: ${report.results.length} slučajeva. OK: ${passed}. FAIL: ${failed}. Prolaznost: ${percent}%.`;
    els.parserRegressionSummary.classList.toggle('warn', failed > 0);

    const rows = report.results.map((item, index) => {
      const errors = item.errors?.length ? item.errors.join('\n') : 'nema';
      const warnings = item.warnings?.length ? item.warnings.join('\n') : 'nema';
      const parsedJson = JSON.stringify(item.parsed, null, 2);
      const resultClassName = item.pass ? 'pass' : 'fail';
      const resultLabel = item.pass ? 'PASS' : 'FAIL';
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.id)}</td>
        <td><span class="${resultClassName}">${resultLabel}</span></td>
        <td>${escapeHtml(truncateForParserTest(item.scenario || '', 100))}</td>
        <td>${escapeHtml(errors)}<details><summary>Detalji</summary><pre>Upozorenja:\n${escapeHtml(warnings)}\n\nParsed JSON:\n${escapeHtml(parsedJson)}</pre></details></td>
        <td><pre>${escapeHtml(parserRegressionParsedSummary(item.parsed || {}))}</pre></td>
      </tr>`;
    }).join('');

    els.parserRegressionResults.innerHTML = `<table class="parser-test-table">
      <thead>
        <tr>
          <th>#</th>
          <th>ID</th>
          <th>Status</th>
          <th>Scenarij</th>
          <th>Greške / detalji</th>
          <th>Sažetak parsera</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function runParserRegressionTests(cases = state.parserRegressionCases) {
    if (!Array.isArray(cases) || !cases.length) {
      setStatus('Nema učitanih regresijskih testova. Učitaj JSON ili generiraj 300 pseudo-testova.', true);
      renderParserRegressionLoadedState();
      return;
    }

    const startedAt = new Date();
    const results = cases.map((testCase, index) => {
      const parsed = parseOhbpText(testCase.raw || '');
      const comparison = compareParserRegressionCase(parsed, testCase.expected || {});
      return {
        id: testCase.id || `CASE-${String(index + 1).padStart(3, '0')}`,
        scenario: testCase.scenario || '',
        pass: comparison.pass,
        errors: comparison.errors,
        warnings: comparison.warnings,
        expected: testCase.expected || {},
        parsed
      };
    });

    const finishedAt = new Date();
    const failed = results.filter(item => !item.pass).length;
    const passed = results.length - failed;
    state.parserRegressionReport = {
      appVersion: APP_VERSION,
      generatedAt: finishedAt.toISOString(),
      sourceName: state.parserRegressionSourceName || 'memorija aplikacije',
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      total: results.length,
      passed,
      failed,
      results
    };

    renderParserRegressionReport(state.parserRegressionReport);
    setStatus(`Regresijski test parsera dovršen: ${results.length} slučajeva. OK ${passed}, FAIL ${failed}.`, failed > 0);
  }

  function parserRegressionTimestampForFile() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }

  function downloadParserRegressionCases() {
    const cases = state.parserRegressionCases.length ? state.parserRegressionCases : buildGeneratedParserRegressionCases(3);
    const payload = {
      appVersion: APP_VERSION,
      generatedAt: new Date().toISOString(),
      note: state.parserRegressionCases.length
        ? 'Regresijski testni slučajevi iz aplikacije.'
        : 'Primjer formata. Za puni paket klikni “Generiraj + pokreni 300”, zatim ponovno “Preuzmi JSON testova”.',
      cases
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(`parser_regression_cases_${parserRegressionTimestampForFile()}.json`, blob);
  }

  function downloadParserRegressionReportJson() {
    if (!state.parserRegressionReport) {
      setStatus('Nema izvještaja za preuzimanje. Najprije pokreni regresijski test.', true);
      return;
    }
    const blob = new Blob([JSON.stringify(state.parserRegressionReport, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(`parser_regression_report_${parserRegressionTimestampForFile()}.json`, blob);
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  function parserRegressionReportToCsv(report) {
    const header = [
      'id', 'scenario', 'status', 'error_count', 'errors', 'warnings',
      'fullName', 'birthYear', 'admissionDate', 'diagnosis', 'therapy', 'ohbpTherapy', 'vitalSigns', 'followUpControlDate', 'followUpControl', 'labRaw', 'radiologyRaw', 'allergies'
    ];
    const lines = [header.map(csvCell).join(',')];
    (report?.results || []).forEach((item) => {
      const parsed = item.parsed || {};
      lines.push([
        item.id,
        item.scenario,
        item.pass ? 'PASS' : 'FAIL',
        item.errors?.length || 0,
        (item.errors || []).join(' | '),
        (item.warnings || []).join(' | '),
        parsed.fullName || '',
        parsed.birthYear || '',
        parsed.admissionDate || '',
        parsed.diagnosis || '',
        parsed.therapy || '',
        parsed.ohbpTherapy || '',
        parsed.vitalSigns || '',
        parsed.labRaw || '',
        parsed.radiologyRaw || '',
        parsed.allergies || ''
      ].map(csvCell).join(','));
    });
    return lines.join('\r\n');
  }

  function downloadParserRegressionReportCsv() {
    if (!state.parserRegressionReport) {
      setStatus('Nema CSV izvještaja za preuzimanje. Najprije pokreni regresijski test.', true);
      return;
    }
    const blob = new Blob([parserRegressionReportToCsv(state.parserRegressionReport)], { type: 'text/csv;charset=utf-8' });
    downloadBlob(`parser_regression_report_${parserRegressionTimestampForFile()}.csv`, blob);
  }

  function detectParserTestPrivacyRisks(value, path = '') {
    const risks = [];
    const scanText = (text, fieldPath) => {
      const source = String(text || '');
      if (!source) return;
      const patterns = [
        ['oib', /\b(?:OIB[:\s]*)?\d{11}\b/i],
        ['email', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
        ['phone', /\b(?:\+?\d{1,3}[\s/-]?)?(?:0\d{1,2}[\s/-]?)?\d{3}[\s/-]?\d{3,4}\b/],
        ['mbo', /\b(?:MBO|broj osiguranika|osiguranik)\s*[:#]?\s*\d{7,13}\b/i],
        ['hospital-id', /\b(?:broj nalaza|nalaz br|m broj|mbroj|bolesni(?:čki|cki) broj|protokol)\s*[:#]?\s*[A-Z0-9/-]{5,}\b/i],
        ['address', /\b(?:ulica|trg|cesta|put|odvojak|naselje|ku(?:ć|c)ni broj)\b.{0,80}\d{1,4}[A-Za-z]?\b/i],
        ['full-name-date', /\b[A-ZČĆŽŠĐ][a-zčćžšđ]{2,}\s+[A-ZČĆŽŠĐ][a-zčćžšđ]{2,}\b.{0,80}\b\d{1,2}\.\d{1,2}\.\d{4}\b/u]
      ];
      patterns.forEach(([type, pattern]) => {
        if (pattern.test(source)) risks.push({ type, path: fieldPath });
      });
    };

    const walk = (input, fieldPath) => {
      if (input == null) return;
      if (typeof input === 'string' || typeof input === 'number') {
        scanText(String(input), fieldPath);
        return;
      }
      if (Array.isArray(input)) {
        input.forEach((item, index) => walk(item, `${fieldPath}[${index}]`));
        return;
      }
      if (typeof input === 'object') {
        Object.entries(input).forEach(([key, item]) => walk(item, fieldPath ? `${fieldPath}.${key}` : key));
      }
    };
    walk(value, path);
    return risks;
  }

  function replaceKnownPatientNames(text, data = {}) {
    let output = String(text || '');
    const names = [
      data.fullName,
      data.patient?.fullName,
      data.patientLabel
    ].map(value => String(value || '').replace(/\s+/g, ' ').trim()).filter(value => value.length >= 3);
    names.forEach((name) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      output = output.replace(new RegExp(escaped, 'gi'), 'TEST PACIJENT');
    });
    output = output.replace(/\b(ime i prezime|pacijent|bolesnik)\s*[:.-]?\s*[A-ZČĆŽŠĐ][a-zčćžšđ]{2,}\s+[A-ZČĆŽŠĐ][a-zčćžšđ]{2,}\b/giu, '$1: TEST PACIJENT');
    return output;
  }

  function sanitizeParserTextForStorage(text, context = {}) {
    let output = replaceKnownPatientNames(String(text || ''), context);
    let removed = 0;
    const replace = (pattern, replacement) => {
      output = output.replace(pattern, (...args) => {
        removed += 1;
        return typeof replacement === 'function' ? replacement(...args) : replacement;
      });
    };
    replace(/\b(?:OIB[:\s]*)?\d{11}\b/gi, 'OIB: TEST00000000');
    replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, 'test.pacijent@example.test');
    replace(/\b(?:\+?\d{1,3}[\s/-]?)?(?:0\d{1,2}[\s/-]?)?\d{3}[\s/-]?\d{3,4}\b/g, '000-000-000');
    replace(/\b(?:MBO|broj osiguranika|osiguranik)\s*[:#]?\s*\d{7,13}\b/gi, 'MBO: TEST000000');
    replace(/\b(?:broj nalaza|nalaz br|m broj|mbroj|bolesni(?:čki|cki) broj|protokol)\s*[:#]?\s*[A-Z0-9/-]{5,}\b/gi, 'broj nalaza: TEST-NALAZ');
    replace(/\b(?:ulica|trg|cesta|put|odvojak|naselje|ku(?:ć|c)ni broj)\b.{0,80}\d{1,4}[A-Za-z]?\b/giu, 'TEST ADRESA 1');
    replace(/\b\d{1,2}\.\d{1,2}\.\d{4}\.?\b/g, '01.01.2026.');
    return { text: output, removed };
  }

  function sanitizeParserPatientDataForStorage(data = {}) {
    const validation = validatePatientDataObject({ ...getEmptyPatientData(), ...(isPlainJsonObject(data) ? data : {}) });
    const sanitized = validation.data || getEmptyPatientData();
    const textFields = ['diagnosis', 'allergies', 'patientOrigin', 'therapy', 'ohbpTherapy', 'vitalSigns', 'followUpControl', 'labRaw', 'radiologyRaw'];
    let removed = 0;
    sanitized.fullName = 'TEST PACIJENT';
    sanitized.birthYear = '1970';
    sanitized.admissionDate = sanitized.admissionDate ? '2026-01-01' : '';
    sanitized.followUpControlDate = sanitized.followUpControlDate ? '2026-01-15' : '';
    textFields.forEach((field) => {
      const result = sanitizeParserTextForStorage(sanitized[field] || '', data);
      sanitized[field] = result.text;
      removed += result.removed;
    });
    return { data: sanitized, removed };
  }

  function sanitizeParserExpectedForStorage(expected = {}, context = {}) {
    const out = {};
    let removed = 0;
    Object.entries(isPlainJsonObject(expected) ? expected : {}).forEach(([key, value]) => {
      if (typeof value === 'string') {
        if (key === 'fullName') {
          out[key] = 'TEST PACIJENT';
          removed += value && value !== out[key] ? 1 : 0;
        } else if (key === 'birthYear') {
          out[key] = '1970';
          removed += value && value !== out[key] ? 1 : 0;
        } else if (/date/i.test(key)) {
          out[key] = '2026-01-01';
          removed += value && value !== out[key] ? 1 : 0;
        } else {
          const result = sanitizeParserTextForStorage(value, context);
          out[key] = result.text;
          removed += result.removed;
        }
      } else if (Array.isArray(value)) {
        out[key] = value.map(item => {
          if (typeof item !== 'string') return item;
          const result = sanitizeParserTextForStorage(item, context);
          removed += result.removed;
          return result.text;
        });
      } else {
        out[key] = value;
      }
    });
    return { expected: out, removed };
  }

  function sanitizeParserTestCaseForStorage(rawCase) {
    const source = normalizeParserTestCaptureItem(rawCase) || {};
    const riskInput = {
      raw: source.raw || '',
      expected: source.expected || {},
      currentData: source.currentData || {},
      parsedAtCapture: source.parsedAtCapture || {},
      patientLabel: source.patientLabel || '',
      scenario: source.scenario || ''
    };
    const risks = detectParserTestPrivacyRisks(riskInput);
    const context = source.currentData || {};
    const rawResult = sanitizeParserTextForStorage(source.raw || '', context);
    const currentResult = sanitizeParserPatientDataForStorage(source.currentData || {});
    const expectedResult = sanitizeParserExpectedForStorage(source.expected || {}, context);
    const parsedResult = sanitizeParserPatientDataForStorage(source.parsedAtCapture || {});
    const noteResult = sanitizeParserTextForStorage(source.note || '', context);
    const scenarioResult = sanitizeParserTextForStorage(source.scenario || 'Parser test', context);
    const removedSensitiveFieldsCount = risks.length + rawResult.removed + currentResult.removed + expectedResult.removed + parsedResult.removed + noteResult.removed + scenarioResult.removed;
    const sanitizedRaw = rawResult.text || (source.rawMissing ? '' : [
      'TEST PACIJENT, rođen 01.01.1970.',
      currentResult.data.diagnosis ? `Dg. ${currentResult.data.diagnosis}` : '',
      currentResult.data.therapy ? `Kronična terapija: ${currentResult.data.therapy}` : ''
    ].filter(Boolean).join('\n'));
    const parsedAtCapture = sanitizedRaw ? parseOhbpText(sanitizedRaw) : {};
    const privacyStatus = risks.length || removedSensitiveFieldsCount ? 'anonymized' : 'synthetic';
    return {
      ...source,
      scenario: scenarioResult.text || 'Anonimizirani parser test',
      patientLabel: 'TEST PACIJENT (1970)',
      note: noteResult.text,
      raw: sanitizedRaw,
      rawMissing: !sanitizedRaw,
      expected: {
        ...expectedResult.expected,
        fullName: 'TEST PACIJENT',
        birthYear: '1970',
        ...(currentResult.data.admissionDate ? { admissionDate: currentResult.data.admissionDate } : {})
      },
      currentData: currentResult.data,
      parsedAtCapture,
      parserWarningsAtCapture: getParserTestWarnings(parsedAtCapture),
      privacyStatus,
      sanitizedAt: new Date().toISOString(),
      sanitizerVersion: PARSER_TEST_SANITIZER_VERSION,
      removedSensitiveFieldsCount,
      privacyRisks: risks.map(risk => risk.type).slice(0, 20)
    };
  }

  function normalizeParserTestCaptureItem(item, index = 0) {
    if (!item || typeof item !== 'object') return null;
    const raw = normalizeLineBreaks(item.raw ?? item.text ?? item.input ?? '').trim();
    const currentData = isPlainJsonObject(item.currentData) ? item.currentData : {};
    const expected = isPlainJsonObject(item.expected) ? item.expected : {};
    const note = String(item.note ?? item.issueNote ?? '').trim();
    const capturedAt = String(item.capturedAt || item.createdAt || '');
    const id = String(item.id || `CAPTURE-${String(index + 1).padStart(3, '0')}`);
    const scenario = String(item.scenario || note || buildFirebasePatientLabel(currentData) || id).trim();

    return {
      ...item,
      id,
      scenario,
      raw,
      expected,
      note,
      capturedAt,
      currentData,
      source: String(item.source || 'ctrl-alt-p')
    };
  }

  function readParserTestCapturesFromStorage() {
    safeLocalStorageRemoveItem(STORAGE_KEYS.parserTestCaptures);
    return (state.parserTestCapture.localCases || [])
      .map(normalizeParserTestCaptureItem)
      .filter(Boolean)
      .slice(0, PARSER_TEST_CAPTURE_LOCAL_LIMIT);
  }

  function buildParserRegressionExpectedFromPatientData(data = {}) {
    const expected = {};
    PARSER_REGRESSION_FIELDS.forEach((field) => {
      const value = normalizeLineBreaks(data[field] || '').trim();
      if (value) expected[field] = value;
    });
    return expected;
  }

  function buildParserTestCaptureId(date = new Date()) {
    return `CAPTURE-${date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
  }

  function buildParserTestCaptureScenario(data = {}, issueNote = '') {
    const patientLabel = buildFirebasePatientLabel(data);
    const note = String(issueNote || '').replace(/\s+/g, ' ').trim();
    if (note) return `${patientLabel} - ${truncateForParserTest(note, 80)}`;
    return patientLabel;
  }

  function getParserTestCaptureRawText() {
    const outpatientRaw = normalizeLineBreaks(els.ambulatoryPasteBox?.value || '').trim();
    const wardRaw = normalizeLineBreaks(els.ohbpPasteBox?.value || state.ohbpLastParsedText || '').trim();
    return isOutpatientMode() ? (outpatientRaw || wardRaw) : (wardRaw || outpatientRaw);
  }

  function parseParserTestCaptureRawText(raw, mode = getCurrentPatientMode()) {
    if (!String(raw || '').trim()) return {};
    return parsePatientTextByMode(raw, mode, { source: 'ctrl-alt-p-capture' });
  }

  function buildParserTestCaptureCase(issueNote) {
    const capturedAt = new Date();
    const currentData = getFormData();
    const parserMode = getCurrentPatientMode();
    const raw = getParserTestCaptureRawText();
    const parsedAtCapture = parseParserTestCaptureRawText(raw, parserMode);

    return sanitizeParserTestCaseForStorage({
      id: buildParserTestCaptureId(capturedAt),
      schema: 'temperaturna-lista-parser-test-case-v1',
      appVersion: APP_VERSION,
      source: 'ctrl-alt-p',
      parserMode,
      capturedAt: capturedAt.toISOString(),
      scenario: buildParserTestCaptureScenario(currentData, issueNote),
      patientLabel: buildFirebasePatientLabel(currentData),
      note: String(issueNote || '').trim(),
      raw,
      rawMissing: !raw,
      expected: buildParserRegressionExpectedFromPatientData(currentData),
      currentData,
      parsedAtCapture,
      parserWarningsAtCapture: getParserTestWarnings(parsedAtCapture)
    });
  }

  function downloadParserTestCaptureCase(testCase) {
    const normalized = sanitizeParserTestCaseForStorage(testCase);
    const payload = {
      ...buildParserTestCaptureStoragePayload([normalized]),
      schema: 'temperaturna-lista-parser-test-capture-download-v1',
      source: 'ctrl-alt-p',
      issueNote: normalized.note || '',
      caseId: normalized.id || '',
      case: normalized
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const safeId = String(normalized.id || parserRegressionTimestampForFile()).replace(/[^a-z0-9_-]+/gi, '_');
    downloadBlob(`krivo_parsiran_nalaz_${safeId}.json`, blob);
  }

  function buildParserTestCaptureStoragePayload(cases) {
    return {
      schema: 'temperaturna-lista-parser-test-captures-v1',
      appVersion: APP_VERSION,
      storageKey: STORAGE_KEYS.parserTestCaptures,
      firebaseCollection: FIREBASE_PARSER_TEST_CASES_COLLECTION,
      exportedAt: new Date().toISOString(),
      note: 'Ctrl+Alt+P testni slučajevi parsera. Svi zapisi moraju biti sintetski ili anonimizirani prije spremanja.',
      cases
    };
  }

  function writeParserTestCapturesToStorage(cases) {
    state.parserTestCapture.localCases = (cases || [])
      .map(normalizeParserTestCaptureItem)
      .filter(Boolean)
      .slice(0, PARSER_TEST_CAPTURE_LOCAL_LIMIT);
    safeLocalStorageRemoveItem(STORAGE_KEYS.parserTestCaptures);
    return true;
  }

  function saveParserTestCaptureLocally(testCase) {
    testCase = sanitizeParserTestCaseForStorage(testCase);
    const existing = readParserTestCapturesFromStorage();
    const cases = [
      normalizeParserTestCaptureItem(testCase),
      ...existing.filter(item => item.id !== testCase.id)
    ].filter(Boolean).slice(0, PARSER_TEST_CAPTURE_LOCAL_LIMIT);
    return {
      saved: writeParserTestCapturesToStorage(cases),
      count: cases.length
    };
  }

  function getCapturedParserRegressionCases() {
    return readParserTestCapturesFromStorage()
      .filter(item => String(item.raw || '').trim())
      .map((item) => ({
        id: item.id,
        scenario: item.scenario || item.note || item.patientLabel || item.id,
        raw: item.raw,
        expected: item.expected || {},
        note: item.note || '',
        capturedAt: item.capturedAt || ''
      }));
  }

  function loadCapturedParserTestsIntoRegression() {
    const cases = getCapturedParserRegressionCases();
    if (!cases.length) {
      setStatus('Nema lokalno spremljenih Ctrl+Alt+P testova s izvornim OHBP tekstom.', true);
      return;
    }
    state.parserRegressionCases = cases;
    state.parserRegressionSourceName = 'lokalni Ctrl+Alt+P testovi';
    state.parserRegressionReport = null;
    renderParserRegressionLoadedState();
    if (els.parserRegressionResults) els.parserRegressionResults.innerHTML = '';
    setStatus(`Učitano ${cases.length} lokalnih Ctrl+Alt+P testova parsera.`);
  }

  function downloadCapturedParserTestCases() {
    const cases = readParserTestCapturesFromStorage();
    if (!cases.length) {
      setStatus('Nema Ctrl+Alt+P testova parsera u ovoj sesiji za preuzimanje.', true);
      return;
    }
    const blob = new Blob([JSON.stringify(buildParserTestCaptureStoragePayload(cases), null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(`parser_test_captures_${parserRegressionTimestampForFile()}.json`, blob);
    setStatus(`Preuzeto ${cases.length} Ctrl+Alt+P testova parsera iz trenutne sesije.`);
  }

  async function saveParserTestCaptureToFirebase(testCase) {
    if (LOCAL_PATIENT_STORAGE_ONLY) {
      return { saved: false, message: 'Online spremanje parser testova je isključeno; koristi se lokalni JSON.' };
    }
    testCase = sanitizeParserTestCaseForStorage(testCase);
    const authContext = refreshFirebaseAuthContext();
    if (!state.firebasePatients.user || !authContext.hasValidClinicalContext) {
      return { saved: false, message: getFirebaseClinicalContextErrorMessage() };
    }
    const client = await getFirebasePatientsClient();
    const nowIso = new Date().toISOString();
    const user = state.firebasePatients.user;
    const clinicalPartitionKey = getClinicalPartitionKey(authContext);
    const payload = {
      schema: 'temperaturna-lista-parser-test-case-v1',
      appVersion: APP_VERSION,
      source: 'ctrl-alt-p',
      accessModel: CLINICAL_ACCESS_MODEL_VERSION,
      organizationId: authContext.organizationId,
      wardId: authContext.activeWardId,
      wardIds: authContext.wardIds,
      roles: authContext.roles,
      clinicalPartitionKey,
      ownerUid: user.uid,
      ownerEmail: user.email || '',
      ownerDepartment: state.firebasePatients.userProfile?.department || '',
      ownerDisplayName: getFirebaseProfileDisplayName(state.firebasePatients.userProfile || {}),
      label: testCase.patientLabel || testCase.scenario || 'Parser test',
      issueNote: testCase.note || '',
      capturedAt: testCase.capturedAt || nowIso,
      privacyStatus: testCase.privacyStatus || 'anonymized',
      sanitizedAt: testCase.sanitizedAt || nowIso,
      sanitizerVersion: testCase.sanitizerVersion || PARSER_TEST_SANITIZER_VERSION,
      removedSensitiveFieldsCount: Number(testCase.removedSensitiveFieldsCount || 0),
      updatedAt: nowIso,
      expiresAt: getParserTestCaseExpiresAtIso(new Date(nowIso)),
      case: testCase,
      raw: testCase.raw || '',
      expected: testCase.expected || {},
      currentData: testCase.currentData || {},
      parsedAtCapture: testCase.parsedAtCapture || {},
      parserWarningsAtCapture: testCase.parserWarningsAtCapture || [],
      serverCreatedAt: client.serverTimestamp(),
      serverUpdatedAt: client.serverTimestamp()
    };
    const docRef = await client.addDoc(client.collection(client.db, FIREBASE_PARSER_TEST_CASES_COLLECTION), payload);
    markFirebaseAvailabilityAvailable();
    return { saved: true, id: docRef.id };
  }

  async function captureParserTestCaseFromShortcut() {
    if (state.parserTestCapture.saving) {
      setStatus('Parser test se već sprema. Pričekajte trenutak.', true);
      return;
    }

    const currentData = getFormData();
    const raw = getParserTestCaptureRawText();
    if (!raw && !isPatientDataDifferentFromEmpty(currentData)) {
      setStatus('Nema OHBP teksta ni podataka pacijenta za spremanje parser testa.', true);
      return;
    }

    const confirmed = window.confirm('Želite li spremiti pacijenta za test parsera?\n\nParser testovi smiju sadržavati samo sintetske ili anonimizirane podatke. Stvarni pacijentni podaci neće biti spremljeni.');
    if (!confirmed) return;

    const issueNote = window.prompt('Što parser krivo radi? Ako ste ručno ispravili polja, ona se spremaju kao očekivane vrijednosti.', '');
    if (issueNote === null) return;
    if (!String(issueNote).trim()) {
      setStatus('Opis greške parsera je obavezan za spremanje testnog slučaja.', true);
      return;
    }

    state.parserTestCapture.saving = true;
    try {
      const testCase = buildParserTestCaptureCase(issueNote);
      const localResult = saveParserTestCaptureLocally(testCase);
      downloadParserTestCaptureCase(testCase);
      let firebaseResult = { saved: false, message: 'Nema Firebase prijave.' };
      if (state.firebasePatients.user) {
        try {
          firebaseResult = await saveParserTestCaptureToFirebase(testCase);
        } catch (error) {
          console.warn('Spremanje parser testa u Firebase nije uspjelo.', error);
          markFirebaseAvailabilityUnavailable(error);
          firebaseResult = { saved: false, message: getFirebaseAuthErrorMessage(error) };
        }
      }

      const rawWarning = testCase.rawMissing ? ' Nema izvornog OHBP teksta; slučaj je spremljen kao bilješka s trenutnim poljima.' : '';
      if (firebaseResult.saved && localResult.saved) {
        setStatus(`Parser test spremljen privremeno u ovoj sesiji i preuzet kao lokalni JSON. Testova u sesiji: ${localResult.count}.${rawWarning}`);
      } else if (localResult.saved) {
        const firebaseNote = LOCAL_PATIENT_STORAGE_ONLY ? ' Online spremanje parser testova je iskljuceno.' : (state.firebasePatients.user ? ` Online zapis nije uspio: ${firebaseResult.message}` : ' Online zapis ceka prijavu.');
        setStatus(`Parser test spremljen privremeno u ovoj sesiji i preuzet kao lokalni JSON. Testova u sesiji: ${localResult.count}.${firebaseNote}${rawWarning}`, Boolean(!LOCAL_PATIENT_STORAGE_ONLY && state.firebasePatients.user && !firebaseResult.saved));
      } else if (firebaseResult.saved) {
        setStatus(`Parser test preuzet je kao lokalni JSON.${rawWarning}`);
      } else {
        setStatus(`Parser test preuzet je kao lokalni JSON. ${firebaseResult.message || 'Online spremanje parser testova je iskljuceno.'}`, Boolean(!LOCAL_PATIENT_STORAGE_ONLY));
      }
    } finally {
      state.parserTestCapture.saving = false;
    }
  }

  function exposeParserTestCaptureHelpers() {
    document.documentElement.dataset.parserTestStorageKey = STORAGE_KEYS.parserTestCaptures;
    document.documentElement.dataset.parserTestFirebaseCollection = FIREBASE_PARSER_TEST_CASES_COLLECTION;
    window.TemperaturnaListaParserTests = {
      appVersion: APP_VERSION,
      storageKey: STORAGE_KEYS.parserTestCaptures,
      firebaseCollection: FIREBASE_PARSER_TEST_CASES_COLLECTION,
      exportLocal: () => readParserTestCapturesFromStorage(),
      exportRegressionCases: () => getCapturedParserRegressionCases(),
      buildDownloadPayload: () => buildParserTestCaptureStoragePayload(readParserTestCapturesFromStorage()),
      sanitizeForStorage: sanitizeParserTestCaseForStorage,
      detectPrivacyRisks: detectParserTestPrivacyRisks
    };
  }

  function twoDigit(value) {
    return String(value).padStart(2, '0');
  }

  function makeParserRegressionDate(index) {
    const day = (index % 28) + 1;
    const month = ((Math.floor(index / 28) % 6) + 1);
    return {
      cro: `${twoDigit(day)}.${twoDigit(month)}.2026`,
      iso: `2026-${twoDigit(month)}-${twoDigit(day)}`
    };
  }

  function buildGeneratedParserRegressionCases(count = 300) {
    // v209: generator uključuje i Tandarić/Obradović-like rubne obrasce: Th prema nalazu..., Dg. u anamnezi, Iz statusa bez dvotočke i ECOG status.
    // v204: generator je temeljen na stvarnom rubnom tipu nalaza:
    // konzilijarni/pulmološki OHBP nalaz s početnom R06 dijagnozom,
    // alergijama neposredno prije "Iz statusa", završnim "Dg." blokom,
    // terapijom označenom kao "Th.", BAT nalazom i linijom "Prijem".
    // Svi podaci su pseudo-anonimizirani; struktura ostaje slična problematičnom uzorku.
    const patients = [
      { name: 'PSEUDO NIKOLA RESP', born: '11.09.1964', year: '1964', sex: 'M', address: 'TESTNO NASELJE 3/E' },
      { name: 'PSEUDO MARKO BRONH', born: '24.02.1948', year: '1948', sex: 'M', address: 'TESTNA ULICA 25' },
      { name: 'PSEUDO ANA PULMO', born: '08.05.1971', year: '1971', sex: 'F', address: 'TESTNI ODVOJAK 7' },
      { name: 'PSEUDO MARIJA KISIK', born: '06.12.1936', year: '1936', sex: 'F', address: 'PSEUDO ADRESA 12' },
      { name: 'PSEUDO IVAN DISPNEJA', born: '01.01.1951', year: '1951', sex: 'M', address: 'PROBNA CESTA 4' },
      { name: 'PSEUDO JANA FEBRIS', born: '18.04.1991', year: '1991', sex: 'F', address: 'PSEUDO TRG 2' },
      { name: 'PSEUDO PETAR AERUGINOSA', born: '17.07.1959', year: '1959', sex: 'M', address: 'TESTNA 19' },
      { name: 'PSEUDO LUCIJA BRONHIEKTAZIJE', born: '03.03.1980', year: '1980', sex: 'F', address: 'TESTNA 88' }
    ];

    const diseaseProfiles = [
      {
        final: 'Pneumonia l.dex., Status febrilis, LTOT 1.5 l/min tijekom 16-18 h, Sy Mounier-Kuhn, Bronchiectasiae',
        expectedDiagnosis: 'Pneumonia lateris dextri',
        symptom: 'otežano disanje, febrilitet i produktivan kašalj',
        anamnesis: 'Od jučer otežano disanje, febrilan do 38.8°C, kašlje produktivno uz iskašljavanje zelenkastoga sekreta. Nema bolova u prsima. Supruga zadnjih dana ima slične respiratorne simptome. Inače boluje od Sy Mounier-Kuhn uz bronhiektazije, kronična RI, na oksigenoterapiji 1.5 l/min tijekom 16-18 h.',
        radiology: 'Na sumacijskoj AP snimci torakalnih organa učinjenoj ležeći obostrano difuzno je izrazito naglašen plućni intersticij. Sada se dobija dojam dodatno smanjene prozračnosti plućnog parenhima desno apikalno i bazalno moguće u sklopu akutnih upalnih promjena. Sjena srca je dobi primjerena. Desni lateralni fc sinus je zasjenjen vjerojatno manjim pleuralnim izljevom.',
        radiologyContains: ['smanjene prozračnosti', 'desno apikalno'],
        ohbp: 'Solu-Medrol 80 mg i.v., Cipla inh. x1, kisik 2 l/min',
        ohbpContains: 'Solu-Medrol 80 mg i.v.',
        ward: 'PLUĆNI'
      },
      {
        final: 'Pneumonia lat. sin., Status febrilis, Insufficientia respiratoria chronica, Bronchiectasiae',
        expectedDiagnosis: 'Pneumonia lateris sinistri',
        symptom: 'dispneja i febrilitet',
        anamnesis: 'Unazad dva dana progresivno otežano disanje uz povišenu temperaturu do 38.5°C i produktivan kašalj. Bolove u prsima negira. Od ranije poznate bronhiektazije i kronična respiratorna insuficijencija na kućnoj oksigenoterapiji.',
        radiology: 'RTG torakalnih organa pokazuje kronično naglašen intersticij obostrano, uz novonastalu smanjenu prozračnost lijevo bazalno, moguće u sklopu akutnih upalnih promjena. Pleuralni izljevi se jasno ne diferenciraju.',
        radiologyContains: ['lijevo bazalno', 'upalnih promjena'],
        ohbp: 'ceftriakson 2 g i.v., kisik 3 l/min, paracetamol 1 g i.v.',
        ohbpContains: 'ceftriakson 2 g i.v.',
        ward: 'PULMOLOGIJA'
      },
      {
        final: 'Bronchopneumonia acuta, Status febrilis, LTOT, Bronchiectasiae',
        expectedDiagnosis: 'Bronchopneumonia acuta',
        symptom: 'kašalj i subfebrilitet',
        anamnesis: 'Zadnja tri dana kašlje produktivno, uz povremeni subfebrilitet i pojačanu potrebu za kisikom. Nema hemoptiza. U kroničnoj anamnezi bronhiektazije i učestale respiratorne infekcije.',
        radiology: 'RTG pluća pokazuje peribronhalno naglašene promjene i diskretne mrljaste infiltrate obostrano bazalno, bez jasnog pleuralnog izljeva.',
        radiologyContains: ['mrljaste infiltrate', 'bazalno'],
        ohbp: 'amoksicilin/klavulanska kiselina 1.2 g i.v., inhalacija salbutamol/ipratropij x1',
        ohbpContains: 'amoksicilin/klavulanska kiselina 1.2 g i.v.',
        ward: 'INTERNI'
      },
      {
        final: 'Exacerbatio COPD, Status subfebrilis, Insufficientia respiratoria chronica',
        expectedDiagnosis: 'Exacerbatio COPD',
        symptom: 'pogoršanje disanja i kašlja',
        anamnesis: 'Unazad nekoliko dana pogoršanje zaduhe i kašlja uz oskudniji iskašljaj. Afebrilan do subfebrilan. Poznata kronična respiratorna bolest, koristi inhalacijsku terapiju i kisik po potrebi.',
        radiology: 'RTG torakalnih organa bez jasne svježe konsolidacije, uz hiperinflaciju pluća i kronične intersticijske promjene.',
        radiologyContains: ['hiperinflaciju', 'kronične intersticijske promjene'],
        ohbp: 'Solu-Medrol 80 mg i.v., Ventolin inh. x1, kisik 2 l/min',
        ohbpContains: 'Solu-Medrol 80 mg i.v.',
        ward: 'PULMOLOGIJA'
      },
      {
        final: 'Pneumonia billat., Status febrilis, LTOT, Insufficientia respiratoria chronica',
        expectedDiagnosis: 'Pneumonia bilateralis',
        symptom: 'temperatura, kašalj i hipoksemija',
        anamnesis: 'Od jutros febrilan do 39°C, pojačano kašlje i zaduha je izraženija nego inače. Na kućnom kisiku saturacije niže od uobičajenih. Bol u prsima i sinkopu negira.',
        radiology: 'RTG pluća pokazuje obostrano bazalno i parakardijalno infiltrativne promjene, više desno, uz kronično naglašenu intersticijsku strukturu.',
        radiologyContains: ['obostrano bazalno', 'infiltrativne promjene'],
        ohbp: 'piperacilin/tazobaktam 4.5 g i.v., kisik 4 l/min',
        ohbpContains: 'piperacilin/tazobaktam 4.5 g i.v.',
        ward: 'PLUĆNI'
      },
      {
        final: 'Insuff resp partialis, Pneumonia bilalteralis, St febrilis, Meta pulmonum, Anaemia normocytica hypochromica, Npl mammae l. sin.',
        expectedDiagnosis: 'Pneumonia bilateralis',
        symptom: 'nedostatak zraka, bol u prsima i hipoksemija',
        anamnesis: 'Tegobe traju od noćas. Cijelu noć osjeća nedostatak zraka i otežano disanje, uz povremenu bol u prsima. Subjektivno bolje nakon terapije hitne službe. Ranije liječena zbog maligne bolesti dojke i metastatske bolesti kostiju.',
        radiology: 'Hitna MSCT plućna angiografija. Plućne arterije uredno su opacificirane, bez jasno vidljivih embolusa. Obostrano posterobazalno manje zone konsolidacije plućnog parenhima uz obostrane minimalne pleuralne izljeve. Nema pneumotoraksa niti pneumomedijastinuma.',
        radiologyContains: ['bez jasno vidljivih embolusa', 'posterobazalno', 'pleuralne izljeve'],
        ohbp: 'Kisik 4 L/min, Fursemid 20 mg i.v., Cipla inhalacije, Paracetamol 1 g i.v.',
        ohbpContains: 'Fursemid 20 mg i.v.',
        ward: 'PLUĆNI'
      }
    ];

    const chronicTherapies = [
      'Azitromicin 500 mg 3x tjedno (pon, sri, pet), Acipan 40 mg 1,0,0, Byol 5 mg 1,0,1/2 tbl, Atoris 20 mg 0,0,1, Andol 100 mg 0,1,0, Helex 0.25 mg 1,0,0, kisik 1.5 l/min tijekom 16 h',
      'Cink 25 mg 1x1, Pantoprazol 40 mg 1,0,0, Bisoprolol 2.5 mg 1,0,0, Rosuvastatin 20 mg 0,0,1, Doreta tbl pp, Spiriva inh. 1x1',
      'Ramipril 5 mg 1,0,0, Amlodipin 5 mg 1,0,0, Atoris 20 mg 0,0,1, Andol 100 mg 1x1, Salbutamol inh. pp, kisik 2 l/min noću',
      'Euthyrox 75 mcg 1,0,0, Zipantol 40 mg 1,0,0, Eliquis 5 mg 2x1, Forxiga 10 mg 1x1, Trelegy Ellipta 1x1, kisik 1 l/min tijekom noći',
      'anastrazol 1 mg 1x1, Euthyrox 100 ug 1,0,0, Valsacombi 160/12.5 mg 1x1, Ensure Plus Advance 2x1, Paracetamol 1000 mg 2-3x1, Brufen tbl pp., Requip Modutab 8 mg 1x1 tbl, Transtec 35 ug/h - subotom i utorkom, opisuje danas novi stavila',
      'CoPerineva 8/2,5, Physiotens 0.2 mg + 0.4 mg, Byol 5 mg + 2.5 mg, Amlopin 10 mg 0,0,1, Alopurinol 100 mg 1x1, Atorvox 20 mg 0,0,1, Fragmin 5000 1,0,0 - Zaracet pp',
      'Aldactone 100 mg 1x1, Fursemid 40 mg 1x1, Controloc 40 mg 1,0,0, Reglan tbl pp, Durogesic 25 ug/h, Prosure 2x1 TTP',
      'Ne uzima kroničnu terapiju'
    ];

    const allergies = [
      { raw: 'navodi cink i parabeni', expected: 'cink i parabeni' },
      { raw: 'negira', expected: 'nema' },
      { raw: 'penicilin', expected: 'penicilin' },
      { raw: 'nisu poznate', expected: 'nisu poznate' },
      { raw: 'navodi osip na cefalosporine', expected: 'osip na cefalosporine' }
    ];

    const labVariants = [
      { raw: 'Lab. E 4.46 [1e12]/L, Hb 135 g/L, Htc 0.415 L/L, Trc 176 [1e9]/L, Lkc 6.6 [1e9]/L, PV 0.99 1, INR 1.0, APTV 35.7 s, GUK 5.3 mmol/L, UREJA 6.3 mmol/L, KREA 110 µmol/L, CKD-EPI 62 mL/min/1,73m2, Na 143 mmol/L, K 4.4 mmol/L, hs Trop < 3.7 ng/L, CRP 64.1 mg/L, (aK) pH 7.493, (aK) pCO2 4.08 kPa, (aK) pO2 9.72 kPa', contains: ['Lkc 6.6', 'KREA 110', 'CRP 64.1'] },
      { raw: 'Lab. E 4.12 [1e12]/L, Hb 128 g/L, Trc 205 [1e9]/L, Lkc 12.8 [1e9]/L, GUK 7.1 mmol/L, UREJA 8.4 mmol/L, KREA 98 µmol/L, Na 139 mmol/L, K 4.1 mmol/L, CRP 118.7 mg/L, PCT 0.18 ng/mL', contains: ['Lkc 12.8', 'KREA 98', 'CRP 118.7'] },
      { raw: 'Lab. E 5.01 [1e12]/L, Hb 151 g/L, Trc 244 [1e9]/L, Lkc 9.2 [1e9]/L, PV 0.94 1, INR 1.1, APTV 31.2 s, GUK 6.4 mmol/L, UREJA 5.9 mmol/L, KREA 87 µmol/L, Na 141 mmol/L, K 3.9 mmol/L, CRP 32.5 mg/L', contains: ['Lkc 9.2', 'KREA 87', 'CRP 32.5'] },
      { raw: 'Lab. E 3.88 [1e12]/L, Hb 112 g/L, Trc 155 [1e9]/L, Lkc 15.4 [1e9]/L, NEUTRO 88 rel %, LIMFO 7 rel %, GUK 9.3 mmol/L, UREJA 12.2 mmol/L, KREA 132 µmol/L, Na 136 mmol/L, K 5.1 mmol/L, CRP 211.4 mg/L', contains: ['Lkc 15.4', 'KREA 132', 'CRP 211.4'] }
    ];

    const statusVariants = [
      'ECOG 3, pri svijesti, orijentiran, teško pokretan uz pomoć, kahektičan, eupnoičan, afebrilan. Pluća: desno nečujan šum disanja. Srce: akcija tahiritmična, tonovi jasni, šum ne čujem, RR: 100/60 mmHg, cp: 133/min. Trbuh iznad razine prsnoga koša, prisutan tenzijski ascites. Ekstremiteti: bez edema.',
      'RR 160/80 mmHg, cp: 100/min, resp. 20/min, spO2 75%, Tax 37,5°C\nPri svijesti, u kontaktu, orijentiran, pokretan, srednje OM građe, tahidispnoičan u mirovanju, subfebrilan, blijed. Cor: akcija ritmična, tonovi jasni, šuma ne čujem. Pulmo: obostrano bazalno krepitacije. Abdomen mekan, bezbolan. LS neg. Ekstremiteti simetrični, bez edema.',
      'RR 145/85 mmHg, cp: 92/min, resp. 22/min, spO2 88% uz 2 l/min O2, Tax 38,2°C\nPri svijesti, kontaktibilan, dispnoičan pri govoru. Pulmo: difuzno produljen ekspirij, bazalno desno krepitacije. Cor: akcija ritmična, tonovi tihi, bez šumova. Trbuh mekan, bezbolan. Udovi bez edema.',
      'RR 130/75 mmHg, cp: 105/min, resp. 24/min, spO2 91%, Tax 38,6°C\nBistre svijesti, tahipnoična, blaže klonula. Pulmo: obostrano hropci i krepitacije bazalno. Srce akcija ritmična, tonovi mukli. Abdomen mekan, bezbolan. Udovi bez edema.',
      'RR 118/70 mmHg, cp: 84/min, resp. 18/min, spO2 94% uz O2, Tax 37,4°C\nPri svijesti, eupnoičan u mirovanju uz kisik. Pulmo: oslabljen šum disanja bazalno, pojedinačni hropci. Cor: akcija ritmična, bez šumova. Abdomen mekan, bezbolan. Ekstremiteti bez edema.'
    ];

    const cases = [];
    for (let index = 0; index < count; index += 1) {
      const patient = patients[index % patients.length];
      const profile = diseaseProfiles[index % diseaseProfiles.length];
      const chronicText = chronicTherapies[index % chronicTherapies.length];
      const allergy = allergies[index % allergies.length];
      const lab = labVariants[index % labVariants.length];
      const statusText = statusVariants[index % statusVariants.length];
      const date = makeParserRegressionDate(index);
      const id = `DOTLIC-LIKE-${String(index + 1).padStart(3, '0')}`;
      const timeStart = `${twoDigit(8 + (index % 10))}:${twoDigit((index * 7) % 60)}`;
      const timeEnd = `${twoDigit(9 + (index % 8))}:${twoDigit((index * 11) % 60)}`;
      const covidLine = index % 4 === 0
        ? 'BAT na Covid 19 i Influenzu neg.'
        : index % 4 === 1
          ? 'Brzi antigenski test na SARS-CoV-2 negativan, Influenza A/B negativna.'
          : index % 4 === 2
            ? 'BAT na Covid 19 negativan.'
            : 'PCR na SARS-CoV-2 u obradi.';
      const therapyLabel = index % 6 === 0
        ? 'Th prema nalazu iz Zaboka, nema th pri otpustu:'
        : index % 6 === 1
          ? 'Lijekovi:'
          : index % 6 === 2
            ? 'Kronična terapija:'
            : index % 6 === 3
              ? 'Th. od kuće:'
              : 'Lijekovi:';
      const statusLabel = index % 5 === 0 ? 'Iz statusa' : 'Iz statusa:';
      const initialDiagnosis = index % 7 === 0 ? 'D64.9 - Anemija, nespecificirana' : 'R06 - Nepravilnosti disanja';
      const anamnesisDgSentence = index % 6 === 0
        ? ' Pod kontrolom specijalista pod Dg. Arthritis urica, Coxalgia lat sin i.o., Syndroma lumbosacrale.'
        : '';

      const raw = `${patient.name}\nRođen: ${patient.born} Adresa: ${patient.address}, 47000 KARLOVAC \nMatični list: 2026/${String(4000 + index).padStart(6, '0')}, Primljen: ${date.cro}. \n \n \nDatum pregleda: ${date.cro}. \nDijagnoza: R06 - Nepravilnosti disanja \n\n--------------------------------------------------------------------------------\n \nKonzilijarni pregled \n \n  ${timeStart} ${timeEnd}  \n\n\n\n \n ${profile.anamnesis}\n\nDosadašnje bolesti: art. hipertenzija, hiperlipidemija, CV bolest, PTSP, kronična bubrežna insuficijencija, ranije respiratorne infekcije.${anamnesisDgSentence}\n\nFunkcije i navike: bivši pušač, stolica i mokrenje uredni.\n\n${therapyLabel} ${chronicText}\n\nAlergije na lijekove: ${allergy.raw}\n\n${statusLabel} \n\n${statusText}\n\nEKG: sr, frekv. ${80 + (index % 35)}/min, lijeva el os.\n\n${lab.raw}\n\n${profile.radiology}\n\nDg. ${profile.final}\n\nTh. ${profile.ohbp}\n\n${covidLine}\n\nPrijem ${profile.ward}\n \n--------------------------------------------------------------------------------\n \nLiječnik: \n Pseudo Liječnik, dr.med. \nDatum izdavanja: ${date.cro}. 17:02`;

      const expected = {
        fullName: patient.name,
        birthYear: patient.year,
        admissionDate: date.iso,
        diagnosisContains: [profile.expectedDiagnosis],
        diagnosisNotContains: ['R06 - Nepravilnosti disanja', 'Th.', 'BAT na', 'Prijem', 'Liječnik'],
        therapyContains: [chronicText.split(',')[0]],
        therapyNotContains: ['Iz statusa', 'ECOG 3', 'RR ', 'Lab.', 'Dg.', 'opisuje danas novi stavila', 'opsiuje danas novi stavila'],
        ohbpTherapyContains: [profile.ohbpContains],
        ohbpTherapyNotContains: ['BAT na', 'Prijem', 'Liječnik'],
        labRawContains: lab.contains,
        labRawNotContains: ['Na sumacijskoj AP snimci', 'RTG torakalnih organa', 'Dg.', 'Th.'],
        radiologyRawContains: profile.radiologyContains,
        radiologyRawNotContains: ['Dg.', 'Th.', 'BAT na'],
        allergiesContains: [allergy.expected],
        allergiesNotContains: ['Iz statusa', 'ECOG 3', 'RR ', 'Pri svijesti', 'EKG', 'Lab.', 'Pulmo'],
        requiredFields: ['fullName', 'birthYear', 'admissionDate', 'diagnosis', 'therapy', 'ohbpTherapy', 'labRaw', 'radiologyRaw', 'allergies']
      };

      cases.push({
        id,
        scenario: `Dotlić-obrazac ${index + 1}: konzilijarni pulmološki nalaz / ${profile.expectedDiagnosis}`,
        raw,
        expected
      });
    }
    return cases;
  }

  function generateAndRunParserRegressionTests() {
    const cases = buildGeneratedParserRegressionCases(300);
    state.parserRegressionCases = cases;
    state.parserRegressionSourceName = 'automatski generirani pseudo-OHBP paket 300';
    state.parserRegressionReport = null;
    renderParserRegressionLoadedState();
    runParserRegressionTests(cases);
  }

  function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function labLabelToPattern(label) {
    return escapeRegex(label)
      .replace(/-/g, '[-–]?')
      .replace(/\s+/g, '\\s+');
  }

  // Kratice koje su rizične u slobodnom tekstu.
  // L/E/K su jedno slovo, a SE se u hrvatskom tekstu često pojavljuje kao riječ "se".
  // Prihvaćamo ih samo ako nakon oznake odmah slijedi brojčana laboratorijska vrijednost.
  const STRICT_SINGLE_LETTER_LAB_LABELS = Object.freeze(['L', 'E', 'K', 'SE']);

  function isStrictSingleLetterLabLabel(label) {
    return STRICT_SINGLE_LETTER_LAB_LABELS.some(item => item.toLowerCase() === String(label || '').toLowerCase());
  }

  function startsWithImmediateNumericLabValue(value) {
    return /^(?:[<>≤≥]=?\s*)?-?\d+(?:[.,]\d+)?(?:\s*[-–]\s*-?\d+(?:[.,]\d+)?)?/u.test(String(value || '').trim());
  }

  function requiresNumericLabValue(label) {
    return /^(?:SE|Sedimentacija)$/i.test(String(label || '').trim());
  }

  function stripRepeatedProcalcitoninLabelPrefix(rawValue, currentLabel) {
    const cleaned = String(rawValue || '').trim();
    if (!/^(?:PROKAL|PCT|Prokalcitonin)$/i.test(String(currentLabel || '').trim())) {
      return cleaned;
    }
    return cleaned
      .replace(/^(?:PROKAL|PCT|Prokalcitonin)\b\s*(?=[:=]?\s*[<>≤≥]?\s*\d)/i, '')
      .replace(/^[:=]\s*/, '')
      .trim();
  }

  function splitLabItems(rawText) {
    const text = String(rawText || '')
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return [];

    // Parser više ne ovisi o zarezima: nalazi početke poznatih laboratorijskih
    // parametara i uzima vrijednost do sljedećeg poznatog parametra.
    // Diferencijalna krvna slika se uzima iz relativnih oznaka NEUTRO/LIMFO/MONO/EO/BAZO
    // i iz manualnog DKS obrasca SEGm/LIMFOm/MONOm/EOm/BAZOm;
    // apsolutne oznake NEUaps/LIMFOaps/MONOaps/EOaps/BAZOaps i oznake s # namjerno se ne koriste za prikaz.
    // Time rade i unosi razdvojeni novim redovima, točka-zarezima ili samo razmacima.
    const labels = [
      'Sediment urina', 'Leukocitna esteraza', 'Protrombinsko vrijeme',
      'Prokalcitonin', 'Fibrinogen', 'Fib', 'FIB', 'D-dimeri', 'D Dimeri', 'D-Dimeri', 'D-dimer', 'D dimer',
      'hs-Troponin', 'hs Troponin', 'hs Trop', 'Troponin', 'Trop',
      'Sedimentacija', 'Kreatinin', 'Bilirubin', 'Leukociti', 'Eritrociti',
      'Stanice pločastog epitela', 'Male epitelne stanice', 'Hijalini cilindri', 'Grubo granulirani cilindri',
      'Specifična težina', 'Specifična gustoća', 'Urobilinogen',
      'Proteini', 'Nitriti', 'Glukoza', 'Ketoni', 'Uro', 'Boja', 'Izgled', 'Bakterije', 'Gljivice', 'Urin',
      'PROKAL', 'UREJA', 'KREA', 'TBIL', 'T-BIL', 'BIL',
      'APTV R', 'APTV', 'APTT', 'aPTT', 'PV-INR', 'PV INR',
      'NEUTRO rel %', 'NEUT rel %', 'NEU rel %', 'NEUTRO%', 'NEUT%', 'NEU%', 'NEUTRO %', 'NEUT %', 'NEU %',
      'LIMFO rel %', 'LYMFO rel %', 'LYM rel %', 'LY rel %', 'LIMFO%', 'LYMFO%', 'LYM%', 'LY%', 'LIMFO %', 'LYMFO %', 'LYM %', 'LY %',
      'MONO rel %', 'MONO%', 'MONO %', 'EO rel %', 'EO%', 'EO %', 'BAZO rel %', 'BASO rel %', 'BAZO%', 'BASO%', 'BAZO %', 'BASO %',
      'NEUTRO', 'NEUT', 'NEU', 'NEUm', 'SEGm', 'NESEGm', 'LIMFO', 'LYMFO', 'LYM', 'LY', 'LIMFOm', 'MONO', 'MONOm', 'EO', 'EOm', 'BAZO', 'BASO', 'BAZOm', 'BASOm', 'METAm',
      'CRP', 'Trc', 'GUK', 'AST', 'ALT', 'ALP', 'GGT', 'LDH', 'LD', 'RVM',
      'PCT', 'Lkc', 'Erc', 'Hb', 'SE', 'Na', 'Cl', 'CK', 'AP', 'PV', 'pH', 'L', 'E', 'K'
    ];

    const labelPattern = labels
      .slice()
      .sort((a, b) => b.length - a.length)
      .map(labLabelToPattern)
      .join('|');

    const labelRegex = new RegExp(`(^|[\\s,;])(${labelPattern})(?=\\s|[:=,;]|$)\\s*(?::|=)?\\s*`, 'gi');
    const matches = [];
    let match;
    while ((match = labelRegex.exec(text)) !== null) {
      const rawLabel = match[2];
      const valueStart = labelRegex.lastIndex;

      // Kratice L, E i K su rizične jer se sastoje od jednog slova.
      // Prihvaćamo ih samo ako nakon oznake odmah slijedi brojčana laboratorijska vrijednost
      // (npr. L 11,2; E 4,50; K 4,1). Time se izbjegava prepoznavanje slova iz slobodnog teksta.
      if (isStrictSingleLetterLabLabel(rawLabel) && !startsWithImmediateNumericLabValue(text.slice(valueStart))) {
        continue;
      }

      matches.push({
        index: match.index + match[1].length,
        label: rawLabel,
        valueStart
      });
    }

    if (!matches.length) {
      return text
        .split(/[;,]+/)
        .map(item => item.trim())
        .filter(Boolean);
    }

    return matches.map((current, idx) => {
      const next = matches[idx + 1];
      const valueEnd = next ? next.index : text.length;
      const value = text.slice(current.valueStart, valueEnd)
        .replace(/^[\s,;:=-]+/, '')
        .replace(/[\s,;:=-]+$/, '')
        .replace(/\s+/g, ' ')
        .trim();
      const isUrineHeader = /^urin$/i.test(current.label);
      const isSedimentHeader = /^sediment\s+urina$/i.test(current.label);
      const separator = isUrineHeader || isSedimentHeader ? ':' : '';
      return `${current.label}${separator}${value ? ' ' + value : ''}`.trim();
    }).filter(Boolean);
  }

  function labItemStartsWithAnyLabel(item, labels) {
    const source = String(item || '').trim();
    if (!source) return false;
    return (labels || []).some(label => {
      const labelRegex = new RegExp(`^(${labLabelToPattern(label)})(?=\\s|:|$)`, 'i');
      return labelRegex.test(source);
    });
  }

  function findUrineStartIndex(items) {
    // BIL je serumni bilirubin i ne smije se koristiti kao početak urina.
    // Samostalni pH također nije dovoljan marker jer se u OHBP-u često javlja u acidobaznom nalazu: (aK) pH.
    const urineStartLabels = [
      'Urin',
      'Sediment urina',
      'Boja',
      'Izgled',
      'RVM',
      'Nitriti'
    ];
    const index = (items || []).findIndex(item => labItemStartsWithAnyLabel(item, urineStartLabels));

    // v241: ambulantni urin često se izdvoji od "pH" nadalje jer parser izostavi početne
    // riječi "Boja/Izgled/RVM". Ako pH neposredno prethodi jasnim urin-parametrima
    // (Lkc trag, nitriti, proteini, glukoza, ketoni...), taj pH je urinski pH i cijeli
    // blok mora ići u urin, a ne da se "Lkc trag" ispiše kao krvni "L trag".
    const pHIndex = (items || []).findIndex(item => labItemStartsWithAnyLabel(item, ['pH']));
    if (pHIndex >= 0 && (index < 0 || pHIndex < index)) {
      const urineContextLabels = ['Lkc', 'Nitriti', 'Proteini', 'Glukoza', 'Ketoni', 'Uro', 'Erc', 'Leukociti', 'Eritrociti', 'Stanice pločastog epitela', 'Hijalini cilindri'];
      const hasUrineContextAfterPh = (items || [])
        .slice(pHIndex + 1, Math.min((items || []).length, pHIndex + 9))
        .some(item => labItemStartsWithAnyLabel(item, urineContextLabels));
      const hasBloodClusterAfterPh = hasBloodClusterFromIndex(items || [], pHIndex + 1);
      if (hasUrineContextAfterPh && !hasBloodClusterAfterPh) return pHIndex;
    }

    return index >= 0 ? index : (items || []).length;
  }

  const BLOOD_RESTART_LABELS = Object.freeze([
    'SE', 'PCT', 'PROKAL', 'Prokalcitonin', 'CRP',
    'E', 'Hb', 'Trc',
    'GUK', 'UREJA', 'Urea', 'KREA', 'Kreatinin', 'Na', 'K', 'Cl',
    'T-BIL', 'TBIL', 'AST', 'ALT', 'ALP', 'AP', 'GGT', 'CK', 'LDH', 'LD',
    'Troponin', 'hs-Troponin', 'hs Troponin', 'hs Trop', 'Trop',
    'PV', 'APTV', 'APTT', 'aPTT', 'Fib', 'FIB', 'Fibrinogen', 'D-dimeri', 'D Dimeri', 'D-Dimeri'
  ]);

  function getMatchingLabItemLabel(item, labels) {
    const source = String(item || '').trim();
    return (labels || []).find(label => {
      const labelRegex = new RegExp(`^(${labLabelToPattern(label)})(?=\\s|:|$)`, 'i');
      return labelRegex.test(source);
    }) || '';
  }

  function isBloodRestartItem(item) {
    return Boolean(getMatchingLabItemLabel(item, BLOOD_RESTART_LABELS));
  }

  function hasBloodClusterFromIndex(items, startIndex) {
    const labelsInWindow = new Set();
    for (let i = startIndex; i < Math.min((items || []).length, startIndex + 8); i += 1) {
      const matchedLabel = getMatchingLabItemLabel(items[i], BLOOD_RESTART_LABELS);
      if (matchedLabel) labelsInWindow.add(matchedLabel.toLowerCase());
    }
    return labelsInWindow.size >= 2;
  }

  function findUrineEndIndex(items, urineStartIndex) {
    if (!Array.isArray(items) || urineStartIndex >= items.length) return items?.length || 0;
    for (let i = urineStartIndex + 1; i < items.length; i += 1) {
      // Ne prekidamo urin na Bil/Erc/Leukociti iz sedimenta samo zato što se kasnije u prozoru pojavljuju E/Hb.
      // Prvi kandidat za prekid mora sam biti očiti krvni/biokemijski/koagulacijski parametar.
      if (isBloodRestartItem(items[i]) && hasBloodClusterFromIndex(items, i)) return i;
    }
    return items.length;
  }

  function splitBloodAndUrineItems(items) {
    const safeItems = Array.isArray(items) ? items : [];
    const urineStart = findUrineStartIndex(safeItems);
    const urineEnd = findUrineEndIndex(safeItems, urineStart);
    return {
      bloodItems: safeItems.slice(0, urineStart).concat(safeItems.slice(urineEnd)),
      urineItems: normalizeUrineItems(safeItems.slice(urineStart, urineEnd)),
      urineStart
    };
  }

  function normalizeUrineItems(items) {
    return items
      .map(item => String(item || '')
        .trim()
        .replace(/^urin\s*:\s*/i, '')
        .replace(/^sediment\s+urina\b\s*:?\s*/i, '')
        .trim())
      .filter(Boolean);
  }

  function extractLabValueFromRaw(rawValue) {
    const cleaned = String(rawValue || '')
      .trim()
      .replace(/^(?:rel\.?\s*)?%\s*/i, '')
      .replace(/^rel\.?\s*%?\s*/i, '');
    // Rasponi moraju biti prije samostalnih brojeva; inače se npr. 20-30 skrati na 20.
    // Podržava i razmake oko crtice: 20-30, 20 – 30, 0-1, 1-2.
    const match = cleaned.match(/^([<>≤≥]=?\s*-?\d+(?:[.,]\d+)?|-?\d+(?:[.,]\d+)?\s*[-–]\s*-?\d+(?:[.,]\d+)?|-?\d+(?:[.,]\d+)?\s*[+]+|trag|norm\.?|neg\.?|poz\.?|masa|dosta|nešto|nesto|malo|[+]+|-?\d+(?:[.,]\d+)?)/i);
    return match
      ? match[0]
          .replace(/(\d(?:[.,]\d+)?)\s*[-–]\s*(-?\d)/g, '$1-$2')
          .replace(/\s+/g, ' ')
          .trim()
      : cleaned.split(/\s+/)[0] || '';
  }

  function getLabValueMatches(items, labels) {
    const matches = [];
    (items || []).forEach((item, itemIndex) => {
      const source = String(item || '').trim();
      if (!source) return;
      for (const label of labels) {
        const labelRegex = new RegExp(`^(${labLabelToPattern(label)})(?=\\s|$)`, 'i');
        const labelMatch = source.match(labelRegex);
        if (!labelMatch) continue;
        if (/^(?:APTV|APTT|aPTT)\s+R\b/i.test(source) && /^(?:APTV|APTT|aPTT)$/i.test(labelMatch[0])) {
          continue;
        }
        const rawValue = stripRepeatedProcalcitoninLabelPrefix(source.slice(labelMatch[0].length), labelMatch[0]);
        if (isStrictSingleLetterLabLabel(labelMatch[0]) && !startsWithImmediateNumericLabValue(rawValue)) {
          continue;
        }
        const value = extractLabValueFromRaw(rawValue);
        if (value && requiresNumericLabValue(labelMatch[0]) && !startsWithImmediateNumericLabValue(value)) {
          continue;
        }
        if (value) {
          matches.push({
            label: labelMatch[0],
            value,
            itemIndex,
            item: source
          });
        }
        break;
      }
    });
    return matches;
  }

  function getLabValue(items, labels) {
    const matches = getLabValueMatches(items, labels);
    return matches.length ? matches[0].value : '';
  }

  function isSedimentLikeUrineValue(value) {
    const text = String(value || '').trim();
    if (!text) return false;
    return /\d+\s*[-–]\s*\d+/.test(text)
      || /\d\+|^[+]+$/i.test(text)
      || /^(trag|norm\.?|neg\.?|poz\.?|masa|dosta|nešto|nesto|malo)$/i.test(text);
  }

  function detectPossibleUnmarkedUrineSediment(items, urineStartIndex) {
    if (!Array.isArray(items) || !items.length) return null;
    if (urineStartIndex < items.length) return null;

    // Bez jasnog urin-markera ne prebacujemo automatski nalaz u urin, ali
    // sedimentni obrasci s rasponima/plusovima zaslužuju ručnu provjeru.
    const leukocytes = getLabValue(items, ['Leukociti']);
    const erythrocytes = getLabValue(items, ['Eritrociti']);
    const hasSedimentPair = leukocytes && erythrocytes
      && (isSedimentLikeUrineValue(leukocytes) || isSedimentLikeUrineValue(erythrocytes));

    const urineChemistryLabels = ['Proteini', 'Nitriti', 'Leukocitna esteraza', 'RVM', 'Izgled'];
    const hasUrineChemistry = urineChemistryLabels.some(label => Boolean(getLabValue(items, [label])));

    if (!hasSedimentPair && !hasUrineChemistry) return null;
    return {
      type: 'possible-unmarked-urine-sediment',
      message: 'Mogući urin/sediment nije sigurno prepoznat – provjerite ručno.'
    };
  }

  function isRelativeDifferentialMatch(match) {
    const text = `${match?.label || ''} ${match?.item || ''}`;
    return /%|\brel\b/i.test(text) && !isAbsoluteDifferentialMatch(match);
  }

  function isAbsoluteDifferentialMatch(match) {
    const text = `${match?.label || ''} ${match?.item || ''}`;
    return /#|\b(?:abs|aps)\b|\[\s*1e?9\s*\]|10\s*\^?\s*9|x\s*10\s*\^?\s*9|\/\s*L\b/i.test(text);
  }

  function chooseLabValueMatch(matches, options = {}) {
    const list = Array.isArray(matches) ? matches : [];
    if (!list.length) return null;
    if (options.preferRelativeDifferential) {
      const relative = list.find(isRelativeDifferentialMatch);
      if (relative) return relative;
      const nonAbsolute = list.find(match => !isAbsoluteDifferentialMatch(match));
      return nonAbsolute || null;
    }
    return list[0];
  }

  function getWarningLabValueMatches(matches, options = {}) {
    const list = Array.isArray(matches) ? matches : [];
    if (!options.preferRelativeDifferential) return list;
    const relative = list.filter(isRelativeDifferentialMatch);
    if (relative.length) return relative;
    return list.filter(match => !isAbsoluteDifferentialMatch(match));
  }

  function buildLabLines(items, descriptors, warnings = []) {
    return descriptors
      .map(({ output, labels, preferRelativeDifferential }) => {
        const matches = getLabValueMatches(items, labels);
        const warningMatches = getWarningLabValueMatches(matches, { preferRelativeDifferential });
        const distinctValues = Array.from(new Set(warningMatches.map(match => match.value)));
        if (distinctValues.length > 1) {
          warnings.push({
            type: 'duplicate-lab-value',
            output,
            values: warningMatches.map(match => match.value),
            labels: warningMatches.map(match => match.label)
          });
        }
        const chosenMatch = chooseLabValueMatch(matches, { preferRelativeDifferential });
        const value = chosenMatch ? chosenMatch.value : '';
        return value ? `${output} ${value}` : '';
      })
      .filter(Boolean)
      .join('\n');
  }

  function buildLabDuplicateWarningMessage(warnings = []) {
    const warningMessages = [];
    if ((warnings || []).some(warning => warning?.type === 'possible-unmarked-urine-sediment')) {
      warningMessages.push('Mogući urin/sediment nije sigurno prepoznat – provjerite ručno.');
    }

    const duplicates = (warnings || []).filter(warning => warning?.type === 'duplicate-lab-value');
    if (duplicates.length) {
      const details = duplicates.slice(0, 4).map((warning) => {
        const values = (warning.values || []).join(' / ');
        return `${warning.output}: ${values}`;
      }).join('; ');
      const suffix = duplicates.length > 4 ? `; još ${duplicates.length - 4}` : '';
      warningMessages.push(`Upozorenje: više vrijednosti za isti laboratorijski parametar (${details}${suffix}). Ispisana je prva vrijednost; provjerite nalaz.`);
    }

    return warningMessages.join(' ');
  }

  function buildUrineSummary(urineItems) {
    const isInformativeUrineValue = (value) => {
      const text = String(value || '').replace(',', '.').trim();
      if (!text) return false;
      return !/^(?:0+(?:\.0+)?|neg\.?|negativno|norm\.?|normalno|uredno)$/i.test(text);
    };
    const mainParts = [
      { output: 'Lkc', labels: ['Lkc', 'Leukocitna esteraza'] },
      { output: 'nit', labels: ['Nitriti'] },
      { output: 'prot', labels: ['Proteini'] },
      { output: 'glu', labels: ['Glukoza'] },
      { output: 'ket', labels: ['Ketoni'] },
      { output: 'uro', labels: ['Uro', 'Urobilinogen'] },
      { output: 'bil', labels: ['BIL', 'Bilirubin'] },
      { output: 'Erc', labels: ['Erc'] }
    ].map(({ output, labels }) => {
      const value = getLabValue(urineItems, labels);
      return isInformativeUrineValue(value) ? `${output} ${value}` : '';
    }).filter(Boolean);

    const sedimentParts = [
      { output: 'L', labels: ['Leukociti'] },
      { output: 'E', labels: ['Eritrociti'] },
      { output: 'bakt', labels: ['Bakterije'] },
      { output: 'gljiv', labels: ['Gljivice'] },
      { output: 'pl.ep', labels: ['Stanice pločastog epitela'] },
      { output: 'm.ep', labels: ['Male epitelne stanice'] },
      { output: 'hij.cil', labels: ['Hijalini cilindri'] },
      { output: 'gr.gr.cil', labels: ['Grubo granulirani cilindri'] }
    ].map(({ output, labels }) => {
      const value = getLabValue(urineItems, labels);
      return value ? `${output} ${value}` : '';
    }).filter(Boolean);

    const urineParts = [];
    if (mainParts.length) urineParts.push(mainParts.join(', '));
    if (sedimentParts.length) urineParts.push(`sed: ${sedimentParts.join(', ')}`);
    return urineParts.length ? `urin: ${urineParts.join('; ')}` : '';
  }

  function updateLabWarningStatus(warnings = []) {
    const message = buildLabDuplicateWarningMessage(warnings);
    state.lastLabWarningMessage = message;
    if (message) {
      setStatus(message, true);
      if (els.statusBar) els.statusBar.dataset.autoLabWarning = 'true';
    } else if (els.statusBar?.dataset?.autoLabWarning === 'true') {
      setStatus('', false);
      delete els.statusBar.dataset.autoLabWarning;
    }
  }

  function formatLabFindings(rawText) {
    const items = splitLabItems(rawText);
    const { bloodItems, urineItems, urineStart } = splitBloodAndUrineItems(items);
    const duplicateWarnings = [];
    const possibleUnmarkedUrineWarning = detectPossibleUnmarkedUrineSediment(items, urineStart);
    if (possibleUnmarkedUrineWarning) duplicateWarnings.push(possibleUnmarkedUrineWarning);

    const labBox1 = buildLabLines(bloodItems, [
      { output: 'SE', labels: ['SE', 'Sedimentacija'] },
      { output: 'PCT', labels: ['PROKAL', 'PCT', 'Prokalcitonin'] },
      { output: 'CRP', labels: ['CRP'] },
      { output: 'E', labels: ['Erc', 'E'] },
      { output: 'Hb', labels: ['Hb'] },
      { output: 'Trc', labels: ['Trc'] },
      { output: 'L', labels: ['Lkc', 'L'] },
      { output: 'neu', labels: ['NEUTRO rel %', 'NEUT rel %', 'NEU rel %', 'NEUTRO%', 'NEUT%', 'NEU%', 'NEUTRO %', 'NEUT %', 'NEU %', 'NEUTRO', 'NEUT', 'NEU', 'NEUm', 'SEGm'], preferRelativeDifferential: true },
      { output: 'ly', labels: ['LIMFO rel %', 'LYMFO rel %', 'LYM rel %', 'LY rel %', 'LIMFO%', 'LYMFO%', 'LYM%', 'LY%', 'LIMFO %', 'LYMFO %', 'LYM %', 'LY %', 'LIMFO', 'LYMFO', 'LYM', 'LY', 'LIMFOm'], preferRelativeDifferential: true },
      { output: 'mo', labels: ['MONO rel %', 'MONO%', 'MONO %', 'MONO', 'MONOm'], preferRelativeDifferential: true },
      { output: 'eo', labels: ['EO rel %', 'EO%', 'EO %', 'EO', 'EOm'], preferRelativeDifferential: true },
      { output: 'ba', labels: ['BAZO rel %', 'BASO rel %', 'BAZO%', 'BASO%', 'BAZO %', 'BASO %', 'BAZO', 'BASO', 'BAZOm', 'BASOm'], preferRelativeDifferential: true }
    ], duplicateWarnings);

    const labBox2 = buildLabLines(bloodItems, [
      { output: 'GUK', labels: ['GUK'] },
      { output: 'ureja', labels: ['UREJA', 'Urea'] },
      { output: 'kreat.', labels: ['KREA', 'Kreatinin'] },
      { output: 'Na', labels: ['Na'] },
      { output: 'K', labels: ['K'] },
      { output: 'Cl', labels: ['Cl'] },
      { output: 'bil', labels: ['T-BIL', 'TBIL', 'BIL', 'Bilirubin'] },
      { output: 'AST', labels: ['AST'] },
      { output: 'ALT', labels: ['ALT'] },
      { output: 'AP', labels: ['ALP', 'AP'] },
      { output: 'GGT', labels: ['GGT'] },
      { output: 'CK', labels: ['CK'] },
      { output: 'LDH', labels: ['LDH', 'LD'] },
      { output: 'Trop.', labels: ['Troponin', 'hs-Troponin', 'hs Troponin', 'hs Trop', 'Trop'] }
    ], duplicateWarnings);

    const labBox4 = buildLabLines(items, [
      { output: 'PV', labels: ['PV', 'PV-INR', 'PV INR', 'Protrombinsko vrijeme'] },
      { output: 'APTV', labels: ['APTV', 'APTT', 'aPTT'] },
      { output: 'fibrinogen', labels: ['Fibrinogen', 'Fib', 'FIB'] },
      { output: 'D-dimeri', labels: ['D-dimeri', 'D dimeri', 'D-Dimeri', 'D-dimer', 'D dimer'] }
    ], duplicateWarnings);

    const labBox3 = buildUrineSummary(urineItems);

    const urineMain = [
      { output: 'leukocitna esteraza', labels: ['Lkc', 'Leukocitna esteraza'] },
      { output: 'proteini', labels: ['Proteini'] },
      { output: 'eritrociti', labels: ['Erc'] }
    ].map(({ output, labels }) => {
      const value = getLabValue(urineItems, labels);
      return value ? `${output} ${value}` : '';
    }).filter(Boolean);

    const sedimentLeukocytes = getLabValue(urineItems, ['Leukociti']);
    const sedimentErythrocytes = getLabValue(urineItems, ['Eritrociti']);

    const urineSediment = [];
    if (sedimentLeukocytes) urineSediment.push(`leukociti ${sedimentLeukocytes}`);
    if (sedimentErythrocytes) urineSediment.push(`eritrociti ${sedimentErythrocytes}`);

    let legacyLabBox3 = '';
    if (urineMain.length || urineSediment.length) {
      const mainLine = urineMain
        .map(line => String(line || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(', ');
      const sedimentLine = urineSediment.length
        ? `sediment: ${urineSediment.join(', ')}`
        : '';
      const urineParts = [];
      if (mainLine) urineParts.push(`urin: ${mainLine}`);
      if (sedimentLine) urineParts.push(sedimentLine);
      // Urin ostaje jedan kontinuirani tekstualni niz, bez ručno ubačenog prijeloma retka.
      // drawTextBox ga zatim automatski omata unutar širine text boxa.
      legacyLabBox3 = urineParts.join(', ');
    }

    const labBoxes = [labBox1, labBox2, labBox3, labBox4];
    labBoxes.warnings = duplicateWarnings;
    return labBoxes;
  }

  function formatRadiologyFindings(rawText) {
    return normalizeLineBreaks(rawText)
      .split('\n')
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  function buildPatientHeader(fullName, birthYear) {
    const safeName = (fullName || '').trim();
    const safeYear = (birthYear || '').trim();
    if (safeName && safeYear) return `${safeName}, ${safeYear}.`;
    if (safeName) return safeName;
    if (safeYear) return `${safeYear}.`;
    return '';
  }

  function parseIsoDate(value) {
    const iso = normalizeAdmissionDateInput(value);
    if (!iso) return null;
    const [year, month, day] = iso.split('-').map(Number);
    if (![year, month, day].every(Number.isFinite)) return null;
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function addDays(date, days) {
    const copy = new Date(date.getTime());
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function getMondayIndex(date) {
    const jsDay = date.getDay();
    return jsDay === 0 ? 6 : jsDay - 1; // pon=0 ... ned=6
  }

  function formatShortDate(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.`;
  }

  function getHospitalDayNumber(date, admission) {
    if (!date || !admission) return '';
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((date.getTime() - admission.getTime()) / millisecondsPerDay);
    return diffDays >= 0 ? String(diffDays + 1) : '';
  }


  function cleanPatientOriginCandidate(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/^[\s:;,.,"'“”„-]+|[\s:;,.,"'“”„-]+$/g, '')
      .trim();
  }

  function trimPatientOriginClinicalTail(value) {
    return String(value || '')
      .replace(/\s+\b(?:zbog|radi|poradi|uslijed|usled|sa\s+znakovima|s\s+tegobama|u\s+pratnji)\b[\s\S]*$/i, '')
      .replace(/\s+\b(?:febriliteta|temperature|otežanog|otezanog|dispneje|kašlja|kaslja|somnolencije|pogoršanja|pogorsanja|bolova|boli|mučnine|mucnine|proljeva)\b[\s\S]*$/i, '')
      .trim();
  }

  function normalizeInstitutionPatientOrigin(value) {
    let text = trimPatientOriginClinicalTail(cleanPatientOriginCandidate(value))
      .replace(/^Doma\b/i, 'Dom')
      .replace(/^Domu\b/i, 'Dom')
      .replace(/^Udomiteljstva\b/i, 'Udomiteljstvo')
      .trim();
    if (!text || /^dom\s+zdravlja\b/i.test(text)) return '';
    if (!/^(?:dom|obiteljski\s+dom|udomiteljstvo|udomiteljska\s+obitelj|ustanova)\b/i.test(text)) {
      text = `Dom ${text}`;
    }
    return toTitleCaseHr(text);
  }

  function hasMedicationHomeSourceBeforeOrigin(line) {
    const normalized = therapyNormalizeText(line || '');
    const marker = normalized.search(/\b(?:iz|s|sa|u)\s+dom[au]\b|\bdom[au]\b/);
    const before = marker >= 0 ? normalized.slice(0, marker) : normalized;
    return /\b(?:lijekovi|lijek|terapija|kronicna|th|lista|popis|medikacij)\b/.test(before);
  }

  function extractInstitutionPatientOrigin(text) {
    const lines = normalizeLineBreaks(text || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const nameStart = '[A-ZČĆŽŠĐ][^,.;:\\n]{1,80}';
    const fromHomePattern = new RegExp(`\\b(?:iz|s|sa|u)\\s+(Doma?|Domu)\\s+((?:za\\s+starije(?:\\s+i\\s+nemo[cć]ne)?\\s+)?${nameStart})`, 'iu');
    const directHomePattern = new RegExp(`\\b((?:Dom|DOM)\\s+(?:za\\s+starije(?:\\s+i\\s+nemo[cć]ne)?\\s+)?${nameStart})`, 'iu');
    const residentPattern = new RegExp(`\\b(?:korisnik|korisnica|štićenik|sticenik|štićenica|sticenica)\\s+(?:je\\s+)?(?:doma|ustanove)\\s+(${nameStart})`, 'iu');
    const fosterPattern = new RegExp(`\\b((?:Obiteljski\\s+dom|Udomiteljstvo|Udomiteljska\\s+obitelj)\\s+${nameStart})`, 'u');
    const fromFosterPattern = new RegExp(`\\b(?:iz|s|sa)\\s+(udomiteljstva|udomiteljstvo|udomiteljske\\s+obitelji)\\s*(${nameStart})?`, 'iu');

    for (const line of lines) {
      const directFoster = line.match(fosterPattern);
      if (directFoster) {
        const origin = normalizeInstitutionPatientOrigin(directFoster[1]);
        if (origin) return origin;
      }

      const fromFoster = line.match(fromFosterPattern);
      if (fromFoster) {
        const prefix = /obitelji/i.test(fromFoster[1]) ? 'Udomiteljska obitelj' : 'Udomiteljstvo';
        const origin = normalizeInstitutionPatientOrigin(`${prefix} ${fromFoster[2] || ''}`);
        if (origin) return origin;
        return prefix;
      }

      if (!hasMedicationHomeSourceBeforeOrigin(line)) {
        const fromHome = line.match(fromHomePattern);
        if (fromHome) {
          const origin = normalizeInstitutionPatientOrigin(`Dom ${fromHome[2]}`);
          if (origin) return origin;
        }

        const resident = line.match(residentPattern);
        if (resident) {
          const origin = normalizeInstitutionPatientOrigin(`Dom ${resident[1]}`);
          if (origin) return origin;
        }
      }

      const directHome = line.match(directHomePattern);
      if (directHome) {
        const origin = normalizeInstitutionPatientOrigin(directHome[1]);
        if (origin) return origin;
      }
    }
    return '';
  }

  function extractPatientAddressText(text) {
    const source = normalizeLineBreaks(text || '');
    const patterns = [
      /\bAdresa\s*:?\s*([^\n]{1,180})/i,
      /\bPrebivalište\s*:?\s*([^\n]{1,180})/i,
      /\bPrebivaliste\s*:?\s*([^\n]{1,180})/i,
      /\bBoravište\s*:?\s*([^\n]{1,180})/i,
      /\bBoraviste\s*:?\s*([^\n]{1,180})/i
    ];
    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (!match) continue;
      const address = cleanPatientOriginCandidate(match[1])
        .replace(/\b(?:OIB|MBO|MBOO|Telefon|Mobitel|Kontakt|Datum|Primljen[ao]?)\b.*$/i, '')
        .trim();
      if (address) return address;
    }
    const headerAddress = source
      .split('\n')
      .slice(0, 8)
      .map((line) => line.trim())
      .find((line) => /\b(?:HR[-\s]?)?\d{5}\s+[A-ZČĆŽŠĐ]/u.test(line) && !/\b(?:Laboratorij|LAB|CRP|Hb|Trc|L|Na|K|GUK|ureja|kreatinin)\b/i.test(line));
    if (headerAddress) return headerAddress;
    return '';
  }

  function cleanPatientAddressPlace(value) {
    let text = cleanPatientOriginCandidate(value)
      .replace(/\b(?:HRVATSKA|CROATIA)\b.*$/i, '')
      .replace(/\b(?:OIB|MBO|MBOO|Telefon|Mobitel|Kontakt)\b.*$/i, '')
      .trim();
    if (!text || /\d/.test(text)) return '';
    if (/\b(?:ulica|ul\.|trg|cesta|put|naselje|kbr|kućni|kucni|broj|bb)\b/i.test(text)) return '';
    if (!/[A-ZČĆŽŠĐa-zčćžšđ]{3,}/.test(text)) return '';
    return toTitleCaseHr(text);
  }

  function extractPlaceFromPatientAddress(address) {
    const source = String(address || '').trim();
    if (!source) return '';
    const zipMatch = source.match(/\b(?:HR[-\s]?)?\d{5}\s+([A-ZČĆŽŠĐ][A-ZČĆŽŠĐa-zčćžšđ .'-]{2,80})/u);
    if (zipMatch) {
      const place = cleanPatientAddressPlace(zipMatch[1].split(/[,;]/)[0]);
      if (place) return place;
    }
    const parts = source.split(',').map(cleanPatientOriginCandidate).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const place = cleanPatientAddressPlace(parts[i]);
      if (place) return place;
    }
    return '';
  }

  function extractPatientOrigin(text) {
    const institution = extractInstitutionPatientOrigin(text);
    if (institution) return institution;
    const address = extractPatientAddressText(text);
    return extractPlaceFromPatientAddress(address);
  }

  function normalizePatientOriginValue(value) {
    return cleanPatientOriginCandidate(value)
      .replace(/^Od\s+kuda(?:\s+(?:je\s+)?pacijent)?\s*[:.-]?\s*/i, '')
      .trim();
  }

  function formatPatientOriginForList(value) {
    const normalized = normalizePatientOriginValue(value);
    if (!normalized) return '';
    return normalized.toLocaleUpperCase('hr-HR');
  }

  function normalizeAllergyValue(value) {
    let text = normalizeLineBreaks(value || '').trim();
    if (!text) return '';
    text = text
      .replace(/^\bAlergij(?:e|a)(?:\s+na(?:\s+lijekove)?)?\b\s*[:.-]?\s*/i, '')
      .trim();
    if (/\b(?:do\s+sada\s+)?nije\s+manifestira(?:o|la|lo|li|le)\b/i.test(text)) return 'nema';
    if (!text) return '';
    const lower = text.toLowerCase();
    if (/\b(negira|nema|bez poznatih|nije poznat|nisu poznate|nepoznate)\b/i.test(lower)) {
      if (/\b(nije poznat|nisu poznate|nepoznate|bez poznatih)\b/i.test(lower)) return 'nisu poznate';
      return 'nema';
    }
    text = text.replace(/\bna lijekove\b/gi, '').replace(/[.。]+$/g, '').trim();
    return text;
  }

  function formatAllergiesForList(value) {
    const normalized = normalizeAllergyValue(value);
    if (!normalized) return '';
    return `Alergije: ${normalized}`;
  }

  function extractOhbpAllergies(text) {
    const source = normalizeLineBreaks(text || '');
    const boundary = String.raw`(?:\b(?:Lijekovi|Kronična\s+terapija|Dosadašnja\s+terapija|Redovita\s+terapija|Kućna\s+terapija|Th\.?\s+od\s+ku[ćc]e|Terapija|Th\.?|Iz\s+statusa|Status|Klinički\s+status|Pri\s+svijesti|RR\s*\d|cp\s*:|resp\.?\s*\d|spO2|Tax|Pulmo|Cor|EKG|LAB|Laboratorij|Laboratorijski|RTG|UZV|CT|MSCT|Dg\.?\s*(?:[:;/]|[-–—])|Završna\s+dijagnoza|Funkcije\s+i\s+navike|Osobna\s+anamneza|Dosadašnje\s+bolesti|Komorbiditeti|Liječnik|Lijecnik)\b|$)`;
    const patterns = [
      /\bAlergije\s+na\s+lijekove\s*:?\s*([\s\S]*?)(?=\b(?:FiN|FIN)\b)/i,
      /\bAlerigje\s+na\s+lijekove\s*:?\s*([\s\S]*?)(?=\b(?:FiN|FIN)\b)/i,
      /\bAlergije\s*:?\s*([\s\S]*?)(?=\b(?:FiN|FIN)\b)/i,
      /\bAlerigje\s*:?\s*([\s\S]*?)(?=\b(?:FiN|FIN)\b)/i,
      new RegExp('\\bAlergije\\s+na\\s+lijekove\\s*:?\\s*([\\s\\S]*?)(?=' + boundary + ')', 'i'),
      new RegExp('\\bAlerigje\\s+na\\s+lijekove\\s*:?\\s*([\\s\\S]*?)(?=' + boundary + ')', 'i'),
      new RegExp('\\bAlergije\\s*:?\\s*([\\s\\S]*?)(?=' + boundary + ')', 'i'),
      new RegExp('\\bAlerigje\\s*:?\\s*([\\s\\S]*?)(?=' + boundary + ')', 'i'),
      new RegExp('\\bAlergija\\s+na\\s+([^\\n.]{1,120})(?:[.\\n]|$)', 'i'),
      new RegExp('\\bAlergije\\s+na\\s+lijekove\\s+([^\\n.]{1,120})(?:[.\\n]|$)', 'i')
    ];
    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match) {
        const raw = match[1] || '';
        const cleaned = normalizeAllergyValue(raw);
        if (cleaned) return cleaned;
      }
    }
    return '';
  }


  function isSameCalendarDate(a, b) {
    return Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
  }

  function findDateIndexInList(dates, targetDate) {
    if (!targetDate) return -1;
    return (dates || []).findIndex((dateValue) => isSameCalendarDate(dateValue, targetDate));
  }

  const PREVIEW_PAGE_PAIR_SIZE = 2;
  const FIRST_PREVIEW_PAGE_PAIR_START = 1;

  function normalizePreviewPagePairStart(value) {
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed) || parsed < FIRST_PREVIEW_PAGE_PAIR_START) return FIRST_PREVIEW_PAGE_PAIR_START;
    return parsed % PREVIEW_PAGE_PAIR_SIZE === 0 ? parsed - 1 : parsed;
  }

  function getPreviewPagePairStart() {
    return normalizePreviewPagePairStart(state.previewPagePairStart || state.previewListIndex || FIRST_PREVIEW_PAGE_PAIR_START);
  }

  function getPreviewPairPageNumbers(pairStart = getPreviewPagePairStart()) {
    const start = normalizePreviewPagePairStart(pairStart);
    return [start, start + 1];
  }

  function getContinuationPageMonday(admission, pageNumber) {
    if (!admission || pageNumber < 2) return null;
    const dow = getMondayIndex(admission);
    const nextMonday = addDays(admission, 7 - dow);
    return addDays(nextMonday, (pageNumber - 2) * 7);
  }

  function shouldCarryTherapyToContinuationPage(pageNumber, data) {
    if (pageNumber < 2 || !(data?.therapy || '').trim()) return false;
    if (pageNumber === 2) return Boolean(data.showTherapyMonday2);
    const pairStart = normalizePreviewPagePairStart(pageNumber);
    return state.previewTherapyCarryByPair?.[pairStart] === true;
  }

  function buildPreviewPageModel(pageNumber, data, admission, page1LayoutKey) {
    const isAdmissionPage = pageNumber === 1;
    const layoutKey = isAdmissionPage ? page1LayoutKey : 'page2Anchor1';
    const dates = Array(7).fill(null);
    const hospitalDays = Array(7).fill('');
    const therapy = Array(7).fill('');
    let admissionDayIndex = null;
    let inactiveBefore = 0;
    let title = `Stranica ${pageNumber}`;

    if (admission) {
      if (isAdmissionPage) {
        const dow = getMondayIndex(admission);
        admissionDayIndex = dow;
        inactiveBefore = dow;
        for (let i = dow; i < 7; i += 1) {
          dates[i] = addDays(admission, i - dow);
          hospitalDays[i] = getHospitalDayNumber(dates[i], admission);
        }
        if ((data.therapy || '').trim()) therapy[dow] = data.therapy;
        title = dow === 0
          ? 'Stranica 1 - prijem u ponedjeljak'
          : `Stranica 1 - prijem ${['u utorak','u srijedu','u cetvrtak','u petak','u subotu','u nedjelju'][dow - 1]}`;
      } else {
        const continuationMonday = getContinuationPageMonday(admission, pageNumber);
        for (let i = 0; i < 7; i += 1) {
          dates[i] = addDays(continuationMonday, i);
          hospitalDays[i] = getHospitalDayNumber(dates[i], admission);
        }
        if (shouldCarryTherapyToContinuationPage(pageNumber, data)) {
          therapy[0] = data.therapy;
        }
        const start = dates.find(Boolean);
        const end = dates.slice().reverse().find(Boolean);
        title = start && end
          ? `Stranica ${pageNumber} - nastavak (${formatShortDate(start)}-${formatShortDate(end)})`
          : `Stranica ${pageNumber} - nastavak`;
      }
    }

    return {
      pageNumber,
      layoutKey,
      dates,
      hospitalDays,
      therapy,
      title,
      isAdmissionPage,
      admissionDayIndex,
      inactiveBefore
    };
  }

  function normalizePreviewListCount(value) {
    const parsed = Math.floor(Number(value));
    return Number.isFinite(parsed) && parsed >= 2 ? parsed : 2;
  }

  function getPreviewListCount() {
    return normalizePreviewListCount(state.previewListCount);
  }

  function normalizePreviewListIndex(value) {
    return normalizePreviewPagePairStart(value);
  }

  function deriveDocumentModel(data) {
    const patientMode = getPatientModeFromData(data);
    const outpatient = isOutpatientMode(patientMode);
    const admission = parseIsoDate(data.admissionDate);
    const previewPagePairStart = getPreviewPagePairStart();
    const previewPageNumbers = getPreviewPairPageNumbers(previewPagePairStart);
    const previewListIndex = previewPagePairStart;
    const previewListCount = Math.max(getPreviewListCount(), previewPagePairStart + 1);
    const page1LayoutKey = admission && getMondayIndex(admission) !== 0 ? 'page1Anchor2' : 'page1Anchor1';
    const previewPages = previewPageNumbers.map((pageNumber) => buildPreviewPageModel(pageNumber, data, admission, page1LayoutKey));
    const firstPreviewPage = previewPages[0] || buildPreviewPageModel(1, data, admission, page1LayoutKey);
    const secondPreviewPage = previewPages[1] || buildPreviewPageModel(2, data, admission, page1LayoutKey);
    const page1Dates = firstPreviewPage.dates;
    const page2Dates = secondPreviewPage.dates;
    const page1HospitalDays = firstPreviewPage.hospitalDays;
    const page2HospitalDays = secondPreviewPage.hospitalDays;
    const page1Therapy = firstPreviewPage.therapy;
    const page2Therapy = secondPreviewPage.therapy;
    const inactiveBefore = firstPreviewPage.isAdmissionPage ? firstPreviewPage.inactiveBefore : 0;
    const page1Title = firstPreviewPage.title;

    const displaySettings = {
      showDiagnosisOnList: defaultTrue(data.showDiagnosisOnList),
      showAllergiesOnList: defaultTrue(data.showAllergiesOnList),
      showPatientOriginOnList: defaultTrue(data.showPatientOriginOnList),
      showTherapyOnList: defaultTrue(data.showTherapyOnList),
      showOhbpTherapyOnList: !outpatient && defaultTrue(data.showOhbpTherapyOnList),
      showVitalSignsOnList: defaultTrue(data.showVitalSignsOnList),
      showFollowUpControlOnList: defaultTrue(data.showFollowUpControlOnList),
      showLabsOnList: !outpatient && defaultTrue(data.showLabsOnList),
      showRadiologyOnList: !outpatient && defaultTrue(data.showRadiologyOnList)
    };

    const formattedLabBoxes = formatLabFindings(data.labRaw || '');
    const formattedRadiology = formatRadiologyFindings(data.radiologyRaw || '');
    const microbiologySamples = getMicrobiologySamplesFromData(data);
    const followUpControlRenderParts = buildFollowUpControlRenderParts(data.followUpControl || '');
    const followUpControlText = outpatient
      ? buildOutpatientFollowUpControlText(data.followUpControl || '')
      : followUpControlRenderParts.manualText;
    const followUpControlLabBoxes = outpatient
      ? ['', '', '', '']
      : followUpControlRenderParts.labBoxes;
    const followUpControlDate = parseIsoDate(data.followUpControlDate || '');
    const followUpControlPage1DayIndex = findDateIndexInList(page1Dates, followUpControlDate);
    const followUpControlPage2DayIndex = findDateIndexInList(page2Dates, followUpControlDate);

    return {
      data,
      patientMode,
      isOutpatient: outpatient,
      previewPagePairStart,
      previewPageNumbers,
      previewPages,
      previewListIndex,
      previewListCount,
      page2ListIndex: secondPreviewPage.pageNumber,
      admission,
      admissionDayIndex: admission ? getMondayIndex(admission) : null,
      page1LayoutKey: firstPreviewPage.layoutKey,
      page2LayoutKey: secondPreviewPage.layoutKey,
      inactiveBefore,
      headerText: buildPatientHeader(data.fullName, data.birthYear),
      page1Dates,
      page2Dates,
      page1HospitalDays,
      page2HospitalDays,
      page1Therapy,
      page2Therapy,
      diagnosis: data.diagnosis || '',
      allergies: data.allergies || '',
      allergiesDisplayText: formatAllergiesForList(data.allergies || ''),
      patientOrigin: data.patientOrigin || '',
      patientOriginDisplayText: formatPatientOriginForList(data.patientOrigin || ''),
      ohbpTherapy: data.ohbpTherapy || '',
      vitalSigns: data.vitalSigns || '',
      followUpControlDate,
      followUpControl: followUpControlText,
      followUpControlRaw: data.followUpControl || '',
      followUpControlLabBoxes,
      microbiologySamples,
      followUpControlPage1DayIndex,
      followUpControlPage2DayIndex,
      labBoxes: formattedLabBoxes,
      radiologyText: formattedRadiology,
      labWarnings: formattedLabBoxes.warnings || [],
      displaySettings,
      page1Title,
      page2Title: '2. stranica – sljedeći puni tjedan (ponedjeljak–nedjelja)'
    };
  }

  function loadImages() {
    const entries = Object.entries(BACKGROUND_SOURCES);
    const promises = entries.map(([key, src]) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        state.images[key] = img;
        resolve();
      };
      img.onerror = () => reject(new Error(`Neuspjelo učitavanje podloge: ${key}`));
      img.src = src;
    }));
    return Promise.all(promises);
  }

  function wrapTextPreserveBreaks(ctx, text, maxWidth) {
    const paragraphs = normalizeLineBreaks(text).split('\n');
    const lines = [];
    paragraphs.forEach((paragraph, paragraphIndex) => {
      if (paragraph.trim() === '') {
        lines.push('');
      } else {
        const words = paragraph.split(/\s+/);
        let current = '';
        words.forEach((word) => {
          const candidate = current ? `${current} ${word}` : word;
          if (ctx.measureText(candidate).width <= maxWidth || !current) {
            if (ctx.measureText(candidate).width <= maxWidth) {
              current = candidate;
            } else {
              const pieces = breakLongWord(ctx, word, maxWidth);
              if (current) lines.push(current);
              lines.push(...pieces.slice(0, -1));
              current = pieces[pieces.length - 1] || '';
            }
          } else {
            lines.push(current);
            if (ctx.measureText(word).width <= maxWidth) {
              current = word;
            } else {
              const pieces = breakLongWord(ctx, word, maxWidth);
              lines.push(...pieces.slice(0, -1));
              current = pieces[pieces.length - 1] || '';
            }
          }
        });
        lines.push(current);
      }
      if (paragraphIndex < paragraphs.length - 1 && paragraph.trim() !== '' && paragraphs[paragraphIndex + 1].trim() === '') {
        // prazni red će se dodati kroz sljedeći paragraph
      }
    });
    return lines;
  }

  function breakLongWord(ctx, word, maxWidth) {
    const parts = [];
    let chunk = '';
    Array.from(word).forEach((char) => {
      const candidate = chunk + char;
      if (ctx.measureText(candidate).width <= maxWidth || chunk.length === 0) {
        chunk = candidate;
      } else {
        parts.push(chunk);
        chunk = char;
      }
    });
    if (chunk) parts.push(chunk);
    return parts;
  }

  function getTextBoxLines(ctx, text, field, options = {}) {
    if (!field || field.visible === false || !text) return [];
    ctx.save();
    ctx.font = `${options.fontWeight || 'bold'} ${field.fontSize}px "Times New Roman", Times, serif`;
    const maxWidth = Math.max(8, field.width);
    const lines = options.noWrap
      ? normalizeLineBreaks(text).split('\n').map(line => line.replace(/\s+/g, ' ').trim())
      : wrapTextPreserveBreaks(ctx, text, maxWidth);
    ctx.restore();
    return lines;
  }

  function getLabTextRenderOptions(index) {
    // Krvni i koagulacijski nalazi moraju ostati kao "CRP 125" u jednom retku.
    // Urin ostaje omotan jer je najčešće dugačak opisni niz.
    return { noWrap: index !== 2 };
  }

  function getLabOverflowWarningOptions(index) {
    const base = getLabTextRenderOptions(index);
    // Standardni krvni stupci imaju 12-14 uobičajenih parametara; to je vizualno uredno
    // i ne treba paliti narančasto upozorenje samo zato što je stara kalibracija stroga.
    return {
      ...base,
      overflowToleranceLines: index === 2 ? 2 : 6
    };
  }

  const LAB_PREVIEW_HIGHLIGHT_FILL = 'rgba(255, 229, 83, 0.72)';
  const LAB_PREVIEW_REFERENCE_RANGES = Object.freeze({
    se: { high: 20 },
    pct: { high: 0.05 },
    crp: { high: 5 },
    e: { low: 4.0, high: 5.9 },
    hb: { low: 120, high: 175 },
    trc: { low: 150, high: 450 },
    l: { low: 4.0, high: 10.0 },
    neu: { low: 40, high: 75 },
    ly: { low: 20, high: 45 },
    mo: { high: 12 },
    eo: { high: 5 },
    ba: { high: 1 },
    guk: { low: 3.5, high: 11.1 },
    ureja: { high: 8.3 },
    kreat: { low: 45, high: 110 },
    na: { low: 135, high: 145 },
    k: { low: 3.5, high: 5.2 },
    cl: { low: 98, high: 107 },
    bil: { high: 21 },
    ast: { high: 40 },
    alt: { high: 45 },
    ap: { high: 120 },
    ggt: { high: 60 },
    ck: { high: 190 },
    ldh: { high: 250 },
    trop: { high: 14 },
    pv: { low: 0.7, high: 1.3 },
    aptv: { low: 23, high: 38 },
    fibrinogen: { low: 2, high: 4 },
    'd-dimeri': { high: 0.5, highLargeUnit: 500 }
  });

  const LAB_PREVIEW_LABEL_KEYS = Object.freeze([
    ['leukocitna esteraza', 'urin'],
    ['fibrinogen', 'fibrinogen'],
    ['d-dimeri', 'd-dimeri'],
    ['kreat.', 'kreat'],
    ['trop.', 'trop'],
    ['guk', 'guk'],
    ['ureja', 'ureja'],
    ['crp', 'crp'],
    ['pct', 'pct'],
    ['trc', 'trc'],
    ['ldh', 'ldh'],
    ['ast', 'ast'],
    ['alt', 'alt'],
    ['ggt', 'ggt'],
    ['ap', 'ap'],
    ['ck', 'ck'],
    ['pv', 'pv'],
    ['aptv', 'aptv'],
    ['bil', 'bil'],
    ['hb', 'hb'],
    ['se', 'se'],
    ['na', 'na'],
    ['cl', 'cl'],
    ['neu', 'neu'],
    ['ne', 'neu'],
    ['ly', 'ly'],
    ['mo', 'mo'],
    ['eo', 'eo'],
    ['ba', 'ba'],
    ['e', 'e'],
    ['l', 'l'],
    ['k', 'k']
  ]);

  function normalizeLabPreviewLine(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseLabPreviewNumber(value) {
    const source = String(value || '').replace(',', '.');
    const rangeMatch = source.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      const first = Number(rangeMatch[1]);
      const second = Number(rangeMatch[2]);
      if (Number.isFinite(first) && Number.isFinite(second)) {
        return { value: Math.max(first, second), min: Math.min(first, second), max: Math.max(first, second) };
      }
    }
    const match = source.match(/[<>≤≥]?\s*(-?\d+(?:\.\d+)?)/);
    if (!match) return null;
    const valueNumber = Number(match[1]);
    return Number.isFinite(valueNumber) ? { value: valueNumber, min: valueNumber, max: valueNumber } : null;
  }

  function getLabPreviewLineKey(line) {
    const normalized = normalizeLabPreviewLine(line).replace(/[.:]/g, ' ');
    for (const [label, key] of LAB_PREVIEW_LABEL_KEYS) {
      const normalizedLabel = normalizeLabPreviewLine(label).replace(/[.:]/g, ' ');
      const pattern = new RegExp(`^${normalizedLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`);
      if (pattern.test(normalized)) return key;
    }
    return '';
  }

  function hasPathologicUrinePreviewValue(line) {
    const normalized = normalizeLabPreviewLine(line);
    if (!normalized) return false;
    if (!/\b(?:urin|sediment|leukocit|proteini|eritrocit)\b/.test(normalized)) return false;
    if (/\b(?:trag|poz|masa|dosta|malo)\b/.test(normalized)) return true;
    if (/[+]{1,4}/.test(normalized)) return true;
    const numbers = Array.from(normalized.matchAll(/-?\d+(?:[.,]\d+)?/g)).map(match => Number(String(match[0]).replace(',', '.'))).filter(Number.isFinite);
    return numbers.some(value => value > 0);
  }

  function isLabPreviewValueOutsideRange(valueInfo, range) {
    if (!valueInfo || !range) return false;
    if (Number.isFinite(range.low) && valueInfo.min < range.low) return true;
    if (Number.isFinite(range.highLargeUnit) && valueInfo.max >= 50) return valueInfo.max > range.highLargeUnit;
    if (Number.isFinite(range.high) && valueInfo.max > range.high) return true;
    return false;
  }

  function isPathologicLabDisplayLine(line, labBoxIndex) {
    const normalized = normalizeLabPreviewLine(line);
    if (!normalized) return false;
    if (labBoxIndex === 2 || /^urin\b|^sediment\b/.test(normalized)) {
      return hasPathologicUrinePreviewValue(line);
    }
    const key = getLabPreviewLineKey(line);
    const range = LAB_PREVIEW_REFERENCE_RANGES[key];
    if (!range) return false;
    return isLabPreviewValueOutsideRange(parseLabPreviewNumber(line), range);
  }

  function getLabPreviewRenderOptions(index, enableHighlights) {
    const base = getLabTextRenderOptions(index);
    if (!enableHighlights) return base;
    return {
      ...base,
      highlightPredicate: (line) => isPathologicLabDisplayLine(line, index)
    };
  }

  function getTextBoxRenderedBottom(ctx, text, field, options = {}) {
    const lines = getTextBoxLines(ctx, text, field, options);
    if (!lines.length) return field?.y || 0;
    return field.y + (lines.length * field.lineHeight);
  }

  function getTextBoxOverflowInfo(ctx, text, field, options = {}) {
    if (!field || field.visible === false || !text) return null;
    const lines = getTextBoxLines(ctx, text, field, options);
    const lineHeight = Number(field.lineHeight || 0);
    const availableHeight = Number(field.height || 0);
    if (!lines.length || !lineHeight || !availableHeight) {
      return null;
    }
    const requiredHeight = lines.length * lineHeight;
    const overflowToleranceLines = Math.max(0, Number(options.overflowToleranceLines || 0));
    const overflowTolerancePx = Math.max(0, Number(options.overflowTolerancePx || 0));
    const toleratedHeight = availableHeight + overflowTolerancePx + (overflowToleranceLines * lineHeight);
    return {
      overflow: requiredHeight > toleratedHeight + 0.5,
      lineCount: lines.length,
      requiredHeight,
      availableHeight,
      maxLines: Math.floor(availableHeight / lineHeight) + overflowToleranceLines
    };
  }

  function addTextOverflowWarning(ctx, warnings, pageLabel, label, text, field, options = {}) {
    const info = getTextBoxOverflowInfo(ctx, text, field, options);
    if (!info?.overflow) return;
    warnings.push({
      pageLabel,
      label,
      lineCount: info.lineCount,
      maxLines: info.maxLines,
      requiredHeight: info.requiredHeight,
      availableHeight: info.availableHeight
    });
  }

  function withYOffset(field, offsetY) {
    if (!field || !offsetY) return field;
    return { ...field, y: field.y + offsetY };
  }

  function rectsOverlap(a, b) {
    if (!a || !b) return false;
    return a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y;
  }

  function getRenderedFieldRect(ctx, text, field, options = {}) {
    if (!field) return null;
    const lines = text ? getTextBoxLines(ctx, text, field, options) : [];
    const renderedHeight = lines.length
      ? Math.max(Number(field.height || 0), lines.length * Number(field.lineHeight || field.fontSize || 12))
      : Number(field.height || 0);
    return {
      x: Number(field.x || 0),
      y: Number(field.y || 0),
      width: Number(field.width || 0),
      height: renderedHeight
    };
  }

  function getTextContentRect(ctx, text, field, options = {}) {
    if (!field || !text) return null;
    const lines = getTextBoxLines(ctx, text, field, options);
    if (!lines.length) return null;
    const lineHeight = Number(field.lineHeight || field.fontSize || 12);
    return {
      x: Number(field.x || 0),
      y: Number(field.y || 0),
      width: Number(field.width || 0),
      height: lines.length * lineHeight
    };
  }

  function formatUrineLabTextForList(text) {
    const cleanText = String(text || '').replace(/\s+/g, ' ').trim();
    if (!cleanText) return '';
    if (/^urin\s*:/i.test(cleanText)) return cleanText;
    return `urin: ${cleanText}`;
  }

  function getLabBoxTextForRender(model, labBoxIndex) {
    const text = model?.labBoxes?.[labBoxIndex] || '';
    return labBoxIndex === 2 ? formatUrineLabTextForList(text) : text;
  }

  function resolveUrineLabBaseY(ctx, layout, model) {
    const ohbpText = model?.ohbpTherapy || '';
    const showDiagnosis = model?.displaySettings?.showDiagnosisOnList !== false;
    const ohbpField = ctx && ohbpText
      ? resolveOhbpTherapyField(ctx, layout, model, ohbpText, { showDiagnosis })
      : layout?.ohbpTherapyBox;
    return Number(ohbpField?.y ?? layout?.ohbpTherapyBox?.y ?? URINE_LAB_DEFAULT_Y);
  }

  function resolveUrineLabField(ctx, layout, model, dayIndex, dynamicLabYOffset = 0) {
    const baseField = layout?.labBox3Days?.[dayIndex];
    if (!baseField || baseField.visible === false) return baseField;
    const urineBaseY = resolveUrineLabBaseY(ctx, layout, model);
    const fieldAtOhbpLevel = { ...baseField, y: urineBaseY };
    if (!ctx || model?.displaySettings?.showLabsOnList === false) {
      return fieldAtOhbpLevel;
    }

    const referenceLabs = [
      { root: 'labBox1Days', textIndex: 0 },
      { root: 'labBox2Days', textIndex: 1 },
      { root: 'labBox4Days', textIndex: 3 }
    ];
    const renderedBottoms = referenceLabs
      .map(({ root, textIndex }) => {
        const field = withYOffset(layout?.[root]?.[dayIndex], dynamicLabYOffset);
        if (!field || field.visible === false) return null;
        const text = getLabBoxTextForRender(model, textIndex);
        const rect = getRenderedFieldRect(ctx, text, field, getLabTextRenderOptions(textIndex));
        return rect;
      })
      .filter(Boolean);

    const urineText = getLabBoxTextForRender(model, 2);
    const urineRect = getRenderedFieldRect(ctx, urineText, fieldAtOhbpLevel, getLabTextRenderOptions(2));
    const overlappingLabs = urineRect
      ? renderedBottoms.filter((rect) => rectsOverlap(urineRect, rect))
      : [];
    if (!overlappingLabs.length) return fieldAtOhbpLevel;

    const bottomAfterLabs = Math.max(...overlappingLabs.map((rect) => Number(rect.y || 0) + Number(rect.height || 0))) + URINE_LAB_GAP_AFTER_LABS;
    return { ...fieldAtOhbpLevel, y: Math.ceil(bottomAfterLabs) };
  }

  function resolveLabFieldForRender(ctx, layout, model, dayIndex, labBoxIndex, dynamicLabYOffset = 0) {
    const labRoots = ['labBox1Days', 'labBox2Days', 'labBox3Days', 'labBox4Days'];
    if (labBoxIndex === 2) return resolveUrineLabField(ctx, layout, model, dayIndex, dynamicLabYOffset);
    return withYOffset(layout?.[labRoots[labBoxIndex]]?.[dayIndex], dynamicLabYOffset);
  }

  function makeMicrobiologyField(x, y, width, lineCount = 1) {
    return {
      x,
      y,
      width,
      height: Math.max(MICROBIOLOGY_LINE_HEIGHT, lineCount * MICROBIOLOGY_LINE_HEIGHT),
      fontSize: MICROBIOLOGY_FONT_SIZE,
      lineHeight: MICROBIOLOGY_LINE_HEIGHT,
      textAlign: 'left',
      visible: true
    };
  }

  function moveMicrobiologyFieldBelowOverlaps(ctx, text, field, avoidRects, renderOptions = {}) {
    if (!ctx || !field || !Array.isArray(avoidRects) || !avoidRects.length) return field;
    const textOptions = { noWrap: true, ...renderOptions };
    let resolved = { ...field };
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const rect = getRenderedFieldRect(ctx, text, resolved, textOptions);
      if (!rect) return resolved;
      const overlappingRects = avoidRects.filter((avoidRect) => rectsOverlap(rect, avoidRect));
      if (!overlappingRects.length) return resolved;
      const nextY = Math.ceil(Math.max(...overlappingRects.map((avoidRect) => Number(avoidRect.y || 0) + Number(avoidRect.height || 0))) + MICROBIOLOGY_AFTER_URINE_GAP);
      if (nextY <= Number(resolved.y || 0)) return resolved;
      resolved = { ...resolved, y: nextY };
    }
    return resolved;
  }

  function getMicrobiologyAvoidanceRects(ctx, layout, model, dynamicLabYOffset = 0) {
    if (!ctx || !layout || model?.admissionDayIndex == null) return [];
    const dayIndex = model.admissionDayIndex;
    const rects = [];
    [0, 1, 2, 3].forEach((labBoxIndex) => {
      const text = getLabBoxTextForRender(model, labBoxIndex);
      const field = resolveLabFieldForRender(ctx, layout, model, dayIndex, labBoxIndex, dynamicLabYOffset);
      if (!text || !field || field.visible === false) return;
      const rect = getTextContentRect(ctx, text, field, getLabTextRenderOptions(labBoxIndex));
      if (rect) rects.push(rect);
    });
    if (model?.displaySettings?.showRadiologyOnList !== false && model?.radiologyText) {
      const radiologyField = resolveRadiologyField(ctx, layout, model, dayIndex, dynamicLabYOffset);
      const radiologyRect = getTextContentRect(ctx, model.radiologyText, radiologyField, { noWrap: false });
      if (radiologyRect) rects.push(radiologyRect);
    }
    return rects;
  }

  function getMicrobiologyFirstLabTop(layout, dayIndex, dynamicLabYOffset = 0) {
    const roots = ['labBox1Days', 'labBox2Days', 'labBox3Days', 'labBox4Days'];
    const tops = roots
      .map((root) => withYOffset(layout?.[root]?.[dayIndex], dynamicLabYOffset)?.y)
      .filter((value) => Number.isFinite(Number(value)))
      .map(Number);
    return tops.length ? Math.min(...tops) : null;
  }

  function resolveMicrobiologyHemocultureField(ctx, layoutKey, layout, model, dynamicLabYOffset = 0) {
    if (!model?.microbiologySamples?.microHemocultures || model.admissionDayIndex == null) return null;
    const dayIndex = model.admissionDayIndex;
    const therapyField = resolveTherapyField(layoutKey, layout, dayIndex);
    const firstLabTop = getMicrobiologyFirstLabTop(layout, dayIndex, dynamicLabYOffset);
    const therapyText = model.displaySettings?.showTherapyOnList === false ? '' : (model.page1Therapy?.[dayIndex] || '');
    const therapyBottom = therapyText && therapyField
      ? getTextBoxRenderedBottom(ctx, therapyText, therapyField, { noWrap: false })
      : Number(therapyField?.y || 0) + Number(therapyField?.height || 0);
    const yFromLab = Number.isFinite(firstLabTop) ? firstLabTop - HEMOCULTURE_LINE_HEIGHT - HEMOCULTURE_GAP_ABOVE_LAB : null;
    const y = Math.max(Math.ceil(therapyBottom + 6), Number.isFinite(yFromLab) ? yFromLab : Math.ceil(therapyBottom + 6));
    return {
      ...makeMicrobiologyField(Number(therapyField?.x || 372), y, 88, 1),
      height: HEMOCULTURE_LINE_HEIGHT,
      fontSize: HEMOCULTURE_FONT_SIZE,
      lineHeight: HEMOCULTURE_LINE_HEIGHT
    };
  }

  function resolveMicrobiologyUrineFields(ctx, layout, model, dynamicLabYOffset = 0) {
    if (!model?.microbiologySamples || model.admissionDayIndex == null) return [];
    const samples = model.microbiologySamples;
    const urineLabels = getSelectedMicrobiologyLabels(samples, 'urine');
    const stoolLabels = getSelectedMicrobiologyLabels(samples, 'stool');
    if (!urineLabels.length && !stoolLabels.length) return [];

    const dayIndex = model.admissionDayIndex;
    const urineField = resolveUrineLabField(ctx, layout, model, dayIndex, dynamicLabYOffset);
    if (!urineField || urineField.visible === false) return [];
    const urineText = getLabBoxTextForRender(model, 2);
    const urineRect = ctx
      ? getTextContentRect(ctx, urineText, urineField, getLabTextRenderOptions(2))
      : null;
    const baseX = Number(urineField.x || layout?.dates?.[dayIndex]?.x || 372);
    const microbiologyWidth = Math.max(116, Math.min(190, Number(urineField.width || 190)));
    let nextY = Math.ceil(
      (urineRect
        ? Number(urineRect.y || 0) + Number(urineRect.height || 0)
        : Number(urineField.y || 0)
      ) + MICROBIOLOGY_AFTER_URINE_GAP
    );
    const occupiedRects = getMicrobiologyAvoidanceRects(ctx, layout, model, dynamicLabYOffset);
    const microbiologyRenderOptions = { noWrap: true, fontWeight: MICROBIOLOGY_FONT_WEIGHT };
    const fields = [];
    const pushMicrobiologyField = (text, lineCount, width, x = baseX, y = nextY) => {
      const baseField = makeMicrobiologyField(x, y, width, lineCount);
      const field = moveMicrobiologyFieldBelowOverlaps(ctx, text, baseField, occupiedRects, microbiologyRenderOptions);
      const item = {
        text,
        field
      };
      fields.push(item);
      const rect = getRenderedFieldRect(ctx, text, field, microbiologyRenderOptions);
      if (rect) occupiedRects.push(rect);
      nextY = Math.ceil(Number(field.y || 0) + Number(field.height || 0) + 2);
      return item;
    };
    let urineMicrobiologyItem = null;
    if (urineLabels.length) {
      urineMicrobiologyItem = pushMicrobiologyField(urineLabels.join('\n'), urineLabels.length, Math.min(130, microbiologyWidth));
    }
    if (stoolLabels.length) {
      const stoolText = stoolLabels.join('\n');
      const radiologyField = ctx && model?.displaySettings?.showRadiologyOnList !== false && model?.radiologyText
        ? resolveRadiologyField(ctx, layout, model, dayIndex, dynamicLabYOffset)
        : null;
      const rightLimit = Number(radiologyField?.x || (PAGE.widthPx - 18)) - 8;
      const preferredStoolX = urineMicrobiologyItem ? baseX + 134 : baseX;
      const canUseRightColumn = urineMicrobiologyItem && preferredStoolX + microbiologyWidth <= rightLimit;
      pushMicrobiologyField(
        stoolText,
        stoolLabels.length,
        microbiologyWidth,
        canUseRightColumn ? preferredStoolX : baseX,
        canUseRightColumn ? urineMicrobiologyItem.field.y : nextY
      );
    }
    return fields;
  }

  function getMicrobiologyUrineAreaBottom(ctx, layout, model, dynamicLabYOffset = 0) {
    return resolveMicrobiologyUrineFields(ctx, layout, model, dynamicLabYOffset)
      .reduce((bottom, item) => Math.max(bottom, Number(item.field.y || 0) + Number(item.field.height || 0)), 0);
  }

  function getDefaultVitalSignsTopBelowUrineCulture(ctx, layout, model, dayIndex, dynamicLabYOffset = 0) {
    const urineField = resolveUrineLabField(ctx, layout, model, dayIndex, dynamicLabYOffset);
    if (!urineField || urineField.visible === false) return VITAL_SIGNS_DEFAULT_Y;
    const urineText = getLabBoxTextForRender(model, 2);
    const urineRect = getTextContentRect(ctx, urineText, urineField, getLabTextRenderOptions(2));
    const urineBottom = urineRect
      ? Number(urineRect.y || 0) + Number(urineRect.height || 0)
      : Number(urineField.y || 0);
    const hasUrineCulture = Boolean(model?.microbiologySamples?.microUrineCulture);
    const microbiologyReserve = hasUrineCulture
      ? MICROBIOLOGY_AFTER_URINE_GAP + MICROBIOLOGY_LINE_HEIGHT
      : 0;
    return Math.ceil(urineBottom + microbiologyReserve + VITAL_SIGNS_URINE_GAP);
  }

  function drawMicrobiologySamples(ctx, layoutKey, layout, model, dynamicLabYOffset = 0) {
    if (!hasSelectedMicrobiologySamples(model?.microbiologySamples || {})) return;
    const hemocultureField = resolveMicrobiologyHemocultureField(ctx, layoutKey, layout, model, dynamicLabYOffset);
    if (hemocultureField) drawTextBox(ctx, 'HKx2', hemocultureField, { noWrap: true, fontWeight: MICROBIOLOGY_FONT_WEIGHT });
    resolveMicrobiologyUrineFields(ctx, layout, model, dynamicLabYOffset)
      .forEach((item) => drawTextBox(ctx, item.text, item.field, { noWrap: true, fontWeight: MICROBIOLOGY_FONT_WEIGHT }));
  }

  function resolveRadiologyField(ctx, layout, model, dayIndex, dynamicLabYOffset = 0) {
    const baseField = withYOffset(layout?.radiologyDays?.[dayIndex], dynamicLabYOffset);
    if (!baseField || baseField.visible === false) return baseField;
    if (model?.displaySettings?.showLabsOnList === false) return baseField;

    const labRects = [0, 1, 3, 2]
      .map((textIndex) => {
        const text = getLabBoxTextForRender(model, textIndex);
        const field = resolveLabFieldForRender(ctx, layout, model, dayIndex, textIndex, dynamicLabYOffset);
        if (!text || !field || field.visible === false) return null;
        return getRenderedFieldRect(ctx, text, field, getLabTextRenderOptions(textIndex));
      })
      .filter(Boolean);

    if (!labRects.length) return baseField;

    const baseRect = getRenderedFieldRect(ctx, model?.radiologyText || '', baseField, { noWrap: false });
    const overlapsLab = labRects.some(rect => rectsOverlap(baseRect, rect));
    if (!overlapsLab) return baseField;

    const verticalLabRects = labRects.filter(rect => rect.y < baseRect.y + baseRect.height && rect.y + rect.height > baseRect.y);
    const relevantRects = verticalLabRects.length ? verticalLabRects : labRects;
    const labLeft = Math.min(...relevantRects.map(rect => rect.x));
    const labRight = Math.max(...relevantRects.map(rect => rect.x + rect.width));
    const gap = 12;
    const minPageLeft = 24;
    const maxPageRight = PAGE.widthPx - 18;
    const desiredWidth = Math.max(180, Number(baseField.width || 0));
    const minimumUsefulWidth = Math.min(260, desiredWidth);

    const rightSpace = maxPageRight - (labRight + gap);
    if (rightSpace >= minimumUsefulWidth) {
      return {
        ...baseField,
        x: labRight + gap,
        width: Math.min(desiredWidth, rightSpace)
      };
    }

    const leftSpace = labLeft - gap - minPageLeft;
    if (leftSpace > 0) {
      const width = Math.max(80, Math.min(desiredWidth, leftSpace));
      return {
        ...baseField,
        x: Math.max(minPageLeft, labLeft - gap - width),
        width
      };
    }

    return baseField;
  }


  function resolveOhbpTherapyField(ctx, layout, model, ohbpTherapyText, options = {}) {
    const baseField = layout?.ohbpTherapyBox;
    if (!baseField || baseField.visible === false || !ohbpTherapyText) return baseField;
    if (options.showDiagnosis === false || !model?.diagnosis || layout?.diagnosis?.visible === false) return baseField;

    const diagnosisRect = getRenderedFieldRect(ctx, model.diagnosis, layout.diagnosis, { noWrap: false });
    const therapyFullText = `Th. OHBP:\n${ohbpTherapyText}`;
    const therapyRect = getRenderedFieldRect(ctx, therapyFullText, baseField, { noWrap: false });
    if (!diagnosisRect || !therapyRect || !rectsOverlap(diagnosisRect, therapyRect)) return baseField;

    const gap = 12;
    const pageBottom = PAGE.heightPx - 18;
    const pageRight = PAGE.widthPx - 18;
    const pageLeft = 24;
    const therapyHeight = Math.max(therapyRect.height, Number(baseField.height || 0));
    const therapyWidth = Math.max(160, Number(baseField.width || 0));

    // Prvo pokušaj zadržati isti stupac i spustiti OHBP terapiju ispod dijagnoze.
    const belowY = Math.ceil(diagnosisRect.y + diagnosisRect.height + gap);
    if (belowY + therapyHeight <= pageBottom) {
      return {
        ...baseField,
        y: belowY
      };
    }

    // Ako nema mjesta ispod dijagnoze, pomakni OHBP terapiju desno od dijagnoze.
    const rightX = Math.ceil(diagnosisRect.x + diagnosisRect.width + gap);
    const rightSpace = pageRight - rightX;
    if (rightSpace >= Math.min(therapyWidth, 180)) {
      return {
        ...baseField,
        x: rightX,
        y: baseField.y,
        width: Math.min(therapyWidth, rightSpace)
      };
    }

    // Zadnja rezerva: desni rub stranice, uz zadržavanje korisne širine.
    return {
      ...baseField,
      x: Math.max(pageLeft, pageRight - therapyWidth),
      y: baseField.y
    };
  }

  function getDynamicLabYOffset(ctx, layout, model, layoutKey = model?.page1LayoutKey) {
    if (!layout || model.admissionDayIndex == null) return 0;
    if (model.displaySettings?.showTherapyOnList === false) return 0;
    const dayIndex = model.admissionDayIndex;
    const therapyText = model.page1Therapy?.[dayIndex] || '';
    const therapyField = resolveTherapyField(layoutKey, layout, dayIndex);
    if (!therapyText || !therapyField) return 0;

    const labRoots = ['labBox1Days', 'labBox2Days', 'labBox3Days', 'labBox4Days'];
    const contentTops = model.labBoxes
      .map((labText, i) => {
        const field = layout[labRoots[i]]?.[dayIndex];
        return labText && field ? field.y : null;
      });
    if (model.displaySettings?.showRadiologyOnList !== false && model.radiologyText) {
      const radiologyField = layout.radiologyDays?.[dayIndex];
      if (radiologyField) contentTops.push(radiologyField.y);
    }
    const visibleLabTops = contentTops.filter(value => Number.isFinite(value));

    if (!visibleLabTops.length) return 0;

    const firstLabTop = Math.min(...visibleLabTops);
    const therapyBottom = getTextBoxRenderedBottom(ctx, therapyText, therapyField, { noWrap: false });
    const paddingAfterTherapy = model.microbiologySamples?.microHemocultures
      ? MICROBIOLOGY_LINE_HEIGHT + 18
      : 12;
    return Math.max(0, Math.ceil(therapyBottom + paddingAfterTherapy - firstLabTop));
  }

  function resolveVitalSignsField(ctx, layout, model, dynamicLabYOffset = 0) {
    if (!layout || model?.admissionDayIndex == null) return null;
    const dayIndex = model.admissionDayIndex;
    const baseField = layout.vitalSignsDays?.[dayIndex];
    const dateField = layout.dates?.[dayIndex];
    if (!baseField) return null;
    const resolvedField = dateField
      ? { ...baseField, x: dateField.x, width: dateField.width }
      : { ...baseField };
    resolvedField.y = Math.max(Number(resolvedField.y || 0), VITAL_SIGNS_DEFAULT_Y);
    // v218: vitalni parametri se moraju ispisati u istom stupcu kao datum prijema.
    // Time se poništava svako ranije vodoravno pomicanje kalibracije koje ih je
    // moglo vizualno gurnuti u sljedeći dan.
    if (!ctx) return resolvedField;

    const urineField = resolveUrineLabField(ctx, layout, model, dayIndex, dynamicLabYOffset);
    if (!urineField || urineField.visible === false) return resolvedField;

    const vitalRect = getRenderedFieldRect(ctx, model.vitalSigns || '', resolvedField, { noWrap: false });
    if (!vitalRect) return resolvedField;

    const defaultVitalY = getDefaultVitalSignsTopBelowUrineCulture(ctx, layout, model, dayIndex, dynamicLabYOffset);
    const urineText = getLabBoxTextForRender(model, 2);
    const urineRect = getTextContentRect(ctx, urineText, urineField, getLabTextRenderOptions(2));
    const microbiologyBottom = getMicrobiologyUrineAreaBottom(ctx, layout, model, dynamicLabYOffset);
    const lowerContentBottom = Math.max(
      urineRect ? Number(urineRect.y || 0) + Number(urineRect.height || 0) : 0,
      microbiologyBottom
    );
    const desiredY = Math.max(
      defaultVitalY,
      lowerContentBottom ? Math.ceil(lowerContentBottom + VITAL_SIGNS_URINE_GAP) : 0
    );
    const vitalHeight = Math.max(Number(vitalRect.height || 0), Number(resolvedField.height || 0));
    const pageBottom = PAGE.heightPx - 2;
    const maxYInsidePage = pageBottom - vitalHeight;
    const y = desiredY <= maxYInsidePage || maxYInsidePage <= lowerContentBottom
      ? desiredY
      : Math.max(defaultVitalY, maxYInsidePage);

    return {
      ...resolvedField,
      y
    };
  }

  function drawTextBox(ctx, text, field, options = {}) {
    if (!field || field.visible === false || !text) return;
    ctx.save();
    ctx.fillStyle = '#000000';
    // VAŽNO: font se nikada ne smanjuje automatski zbog overflowa.
    // Ako tekst ne stane u okvir, ispisuje se izvan okvira istom kalibriranom veličinom.
    const fontSize = Number(field.fontSize || 12);
    const lineHeight = Number(field.lineHeight || fontSize);
    ctx.font = `${options.fontWeight || 'bold'} ${fontSize}px "Times New Roman", Times, serif`;
    ctx.textBaseline = 'top';
    const lines = getTextBoxLines(ctx, text, field, options);
    const drawX = field.textAlign === 'center'
      ? field.x + field.width / 2
      : field.textAlign === 'right'
        ? field.x + field.width
        : field.x;
    ctx.textAlign = field.textAlign || 'left';
    if (typeof options.highlightPredicate === 'function') {
      const previousFill = ctx.fillStyle;
      ctx.fillStyle = options.highlightFill || LAB_PREVIEW_HIGHLIGHT_FILL;
      lines.forEach((line, index) => {
        if (!options.highlightPredicate(line, index)) return;
        const textWidth = Math.max(8, Math.ceil(ctx.measureText(line).width));
        const highlightX = field.textAlign === 'center'
          ? drawX - (textWidth / 2) - 2
          : field.textAlign === 'right'
            ? drawX - textWidth - 2
            : drawX - 2;
        const highlightY = field.y + (index * lineHeight) - 1;
        const maxWidth = Math.max(8, PAGE.widthPx - highlightX - 4);
        ctx.fillRect(highlightX, highlightY, Math.min(textWidth + 4, maxWidth), Math.max(8, lineHeight - 1));
      });
      ctx.fillStyle = previousFill;
    }
    lines.forEach((line, index) => {
      ctx.fillText(line, drawX, field.y + (index * lineHeight));
    });
    ctx.restore();
  }

  function drawAdmissionMarker(ctx, layout, dayIndex) {
    if (!ADMISSION_MARKER.enabled || dayIndex == null || dayIndex <= 0) return;
    const dateField = layout?.dates?.[dayIndex];
    if (!dateField) return;

    const centerX = dateField.x + (dateField.width / 2);
    const dotY = Math.max(12, dateField.y - ADMISSION_MARKER.offsetAboveDate);

    ctx.save();
    ctx.globalAlpha = ADMISSION_MARKER.opacity;
    ctx.fillStyle = ADMISSION_MARKER.color;
    ctx.strokeStyle = ADMISSION_MARKER.color;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(centerX, dotY, ADMISSION_MARKER.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(centerX, dotY + ADMISSION_MARKER.radius + 2);
    ctx.lineTo(centerX, dotY + ADMISSION_MARKER.radius + 2 + ADMISSION_MARKER.stemHeight);
    ctx.stroke();

    ctx.restore();
  }


  function resolveTherapyField(layoutKey, layout, dayIndex) {
    if (dayIndex == null || dayIndex < 0) return null;

    // v245: Kronična terapija je klinički važno polje i ne smije nestati zbog
    // stare/ugrađene kalibracije u kojoj je pojedini therapy okvir nevidljiv ili nedostaje.
    // Checkbox "Prikaži na listi" ostaje jedina korisnička kontrola vidljivosti terapije.
    const calibratedField = layout?.therapy?.[dayIndex];
    const defaultField = DEFAULT_COORDS?.[layoutKey]?.therapy?.[dayIndex] || buildTherapyFields()[dayIndex];
    if (!calibratedField && !defaultField) return null;

    const field = calibratedField || defaultField;
    const fallback = defaultField || calibratedField;
    return {
      ...fallback,
      ...field,
      x: Number.isFinite(Number(field.x)) ? Number(field.x) : Number(fallback.x || 0),
      y: Number.isFinite(Number(field.y)) ? Number(field.y) : Number(fallback.y || 0),
      width: Number(field.width || fallback.width || 120),
      height: Number(field.height || fallback.height || 120),
      fontSize: Number(field.fontSize || fallback.fontSize || 20),
      lineHeight: Number(field.lineHeight || fallback.lineHeight || field.fontSize || fallback.fontSize || 24),
      textAlign: field.textAlign || fallback.textAlign || 'left',
      visible: true
    };
  }

  function resolveFollowUpControlField(layout, model, pageNumber) {
    const dayIndex = pageNumber === 1 ? model.followUpControlPage1DayIndex : model.followUpControlPage2DayIndex;
    if (dayIndex == null || dayIndex < 0) return null;

    // v231: kontrola mora biti vidljiva i na 2. stranici te spuštena u zonu
    // standardnog laboratorija. Stara kalibracija može imati followUpControlDays.visible=false
    // ili previsok Y za page2Anchor1, pa se vidljivost i minimalni Y ovdje forsiraju.
    const fromCalibration = layout?.followUpControlDays?.[dayIndex] || {};
    const labField = layout?.labBox1Days?.[dayIndex] || buildLabDayFields(1, true)[dayIndex];
    const baseField = labField || fromCalibration || buildFollowUpControlDayFields(true)[dayIndex];
    if (!baseField) return null;

    return {
      ...fromCalibration,
      x: Number(baseField.x ?? fromCalibration.x ?? 0),
      y: Math.max(Number(baseField.y ?? fromCalibration.y ?? 0), FOLLOW_UP_CONTROL_DEFAULT_LAB_Y),
      width: Number(baseField.width ?? fromCalibration.width ?? 120),
      height: Math.max(Number(fromCalibration.height || 0), Number(baseField.height || 0), 118),
      fontSize: Number(fromCalibration.fontSize || baseField.fontSize || 18),
      lineHeight: Number(fromCalibration.lineHeight || baseField.lineHeight || 22),
      textAlign: fromCalibration.textAlign || baseField.textAlign || 'left',
      visible: true
    };
  }

  function getPreviewPageSlot(model, pageNumber) {
    return model?.previewPages?.[Number(pageNumber) - 1] || null;
  }

  function isAdmissionRenderPage(model, pageNumber) {
    return getPreviewPageSlot(model, pageNumber)?.isAdmissionPage === true;
  }

  function getRenderPageLabel(model, pageNumber) {
    const actualPageNumber = getPreviewPageSlot(model, pageNumber)?.pageNumber || pageNumber;
    return `${actualPageNumber}. str.`;
  }

  function getRenderPageDates(model, pageNumber) {
    return getPreviewPageSlot(model, pageNumber)?.dates || (pageNumber === 1 ? model.page1Dates : model.page2Dates) || [];
  }

  function getRenderPageHospitalDays(model, pageNumber) {
    return getPreviewPageSlot(model, pageNumber)?.hospitalDays || (pageNumber === 1 ? model.page1HospitalDays : model.page2HospitalDays) || [];
  }

  function getRenderPageTherapy(model, pageNumber) {
    return getPreviewPageSlot(model, pageNumber)?.therapy || (pageNumber === 1 ? model.page1Therapy : model.page2Therapy) || [];
  }

  function getFollowUpControlDayIndex(model, pageNumber) {
    const dayIndex = pageNumber === 1 ? model?.followUpControlPage1DayIndex : model?.followUpControlPage2DayIndex;
    return dayIndex != null && dayIndex >= 0 ? dayIndex : null;
  }

  function hasFollowUpControlLabBoxes(model) {
    return Array.isArray(model?.followUpControlLabBoxes) &&
      model.followUpControlLabBoxes.some((labText) => String(labText || '').trim());
  }

  function buildOutpatientFollowUpControlText(value) {
    const lines = getFollowUpControlLinesFromValue(value);
    if (!lines.length) return '';
    const output = ['KONTROLA'];
    const seen = new Set(['kontrola']);
    lines.forEach((line) => {
      const normalized = normalizeFollowUpControlLabLabel(line);
      if (!normalized || normalized === 'kontrola') return;
      const display = normalized === 'urinokultura'
        ? 'urinokultura'
        : normalized === 'urin'
          ? 'urin'
          : line;
      const key = normalizeFollowUpControlLabLabel(display);
      if (seen.has(key)) return;
      seen.add(key);
      output.push(display);
    });
    return output.join('\n');
  }

  function getFollowUpControlLabModel(model) {
    return {
      ...model,
      labBoxes: Array.isArray(model?.followUpControlLabBoxes) ? model.followUpControlLabBoxes : []
    };
  }

  function resolveFollowUpControlLabFieldForRender(ctx, layout, model, labModel, dayIndex, labBoxIndex, dynamicLabYOffset = 0) {
    const followUpField = resolveLabFieldForRender(ctx, layout, labModel, dayIndex, labBoxIndex, 0);
    if (!followUpField) return followUpField;
    const referenceDayIndex = model?.admissionDayIndex;
    if (referenceDayIndex == null || referenceDayIndex < 0) return followUpField;
    const referenceField = resolveLabFieldForRender(ctx, layout, model, referenceDayIndex, labBoxIndex, dynamicLabYOffset);
    if (!referenceField) return followUpField;
    return {
      ...followUpField,
      y: referenceField.y
    };
  }

  function drawFollowUpControlLabBoxes(ctx, layout, model, pageNumber, renderOptions) {
    if (!hasFollowUpControlLabBoxes(model)) return;
    const dayIndex = getFollowUpControlDayIndex(model, pageNumber);
    if (dayIndex == null) return;

    const labModel = getFollowUpControlLabModel(model);
    const isAdmissionPage = isAdmissionRenderPage(model, pageNumber);
    const dynamicLabYOffset = isAdmissionPage ? getDynamicLabYOffset(ctx, layout, model) : 0;
    labModel.labBoxes.forEach((labText, index) => {
      const renderedText = String(labText || '').trim();
      if (!renderedText) return;
      const field = isAdmissionPage
        ? resolveFollowUpControlLabFieldForRender(ctx, layout, model, labModel, dayIndex, index, dynamicLabYOffset)
        : resolveLabFieldForRender(ctx, layout, labModel, dayIndex, index, 0);
      if (field) drawTextBox(ctx, renderedText, field, getLabPreviewRenderOptions(index, renderOptions.showLabHighlights));
    });
  }

  function renderPageToCanvas(canvas, layoutKey, model, pageNumber, options = {}) {
    const ctx = canvas.getContext('2d');
    const displaySettings = model.displaySettings || {};
    const isAdmissionPage = isAdmissionRenderPage(model, pageNumber);
    const renderOptions = {
      showHeader: true,
      showDiagnosis: isAdmissionPage && displaySettings.showDiagnosisOnList !== false,
      showAllergies: isAdmissionPage && displaySettings.showAllergiesOnList !== false,
      showPatientOrigin: isAdmissionPage && displaySettings.showPatientOriginOnList !== false,
      showLabs: isAdmissionPage && displaySettings.showLabsOnList !== false,
      showRadiology: isAdmissionPage && displaySettings.showRadiologyOnList !== false,
      showDates: true,
      showTherapy: displaySettings.showTherapyOnList !== false,
      showOhbpTherapy: isAdmissionPage && displaySettings.showOhbpTherapyOnList !== false,
      showVitalSigns: isAdmissionPage && displaySettings.showVitalSignsOnList !== false,
      showFollowUpControl: displaySettings.showFollowUpControlOnList !== false,
      showAdmissionMarker: isAdmissionPage,
      forceWhiteBackground: false,
      suppressBackground: false,
      showLabHighlights: false,
      showAdminPlaceholders: Boolean(state.admin?.enabled),
      ...options
    };
    renderOptions.showLabHighlights = Boolean(
      renderOptions.showLabHighlights &&
      !renderOptions.forceWhiteBackground &&
      !renderOptions.suppressBackground
    );
    renderOptions.showAdminPlaceholders = Boolean(
      renderOptions.showAdminPlaceholders &&
      !renderOptions.forceWhiteBackground &&
      !renderOptions.suppressBackground
    );

    // Važno: kalibracija ostaje u starom koordinatnom sustavu PAGE.widthPx × PAGE.heightPx.
    // Za ispis se canvas može renderirati u većoj rezoluciji, a ovdje se sve skalira proporcionalno.
    const renderScaleX = canvas.width / PAGE.widthPx;
    const renderScaleY = canvas.height / PAGE.heightPx;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(renderScaleX, renderScaleY);

    const bg = state.images[layoutKey];
    if (renderOptions.suppressBackground || renderOptions.forceWhiteBackground) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, PAGE.widthPx, PAGE.heightPx);
    }
    if (!renderOptions.suppressBackground && bg) {
      ctx.drawImage(bg, 0, 0, PAGE.widthPx, PAGE.heightPx);
      if (BACKGROUND_LIGHTEN_OPACITY > 0) {
        ctx.save();
        ctx.globalAlpha = BACKGROUND_LIGHTEN_OPACITY;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, PAGE.widthPx, PAGE.heightPx);
        ctx.restore();
      }
    }

    const layout = state.calibration[layoutKey];
    if (!layout) {
      ctx.restore();
      return;
    }

    if (renderOptions.showHeader) {
      drawTextBox(ctx, model.headerText, layout.patientHeader);
    }
    const ohbpTherapyPreviewText = model.ohbpTherapy || (renderOptions.showAdminPlaceholders ? 'Primjer Th. iz OHBP-a' : '');
    const resolvedOhbpTherapyField = renderOptions.showOhbpTherapy && isAdmissionPage
      ? resolveOhbpTherapyField(ctx, layout, model, ohbpTherapyPreviewText, { showDiagnosis: renderOptions.showDiagnosis })
      : layout.ohbpTherapyBox;

    if (renderOptions.showDiagnosis && isAdmissionPage) {
      drawTextBox(ctx, model.diagnosis, layout.diagnosis);
    }
    if (renderOptions.showAllergies && isAdmissionPage && model.allergiesDisplayText && layout.allergiesBox?.visible !== false) {
      drawTextBox(ctx, model.allergiesDisplayText, layout.allergiesBox, { noWrap: false });
    }
    if (renderOptions.showPatientOrigin && isAdmissionPage && model.patientOriginDisplayText && layout.patientOriginBox?.visible !== false) {
      drawTextBox(ctx, model.patientOriginDisplayText, layout.patientOriginBox, { noWrap: false });
    }
    if (renderOptions.showOhbpTherapy && ohbpTherapyPreviewText && resolvedOhbpTherapyField?.visible !== false) {
      drawTextBox(ctx, `Th. OHBP:
${ohbpTherapyPreviewText}`, resolvedOhbpTherapyField, { noWrap: false });
    }
    if (renderOptions.showLabs && isAdmissionPage && model.admissionDayIndex != null) {
      const labRoots = ['labBox1Days', 'labBox2Days', 'labBox3Days', 'labBox4Days'];
      const dynamicLabYOffset = getDynamicLabYOffset(ctx, layout, model);
      model.labBoxes.forEach((labText, i) => {
        const renderedLabText = getLabBoxTextForRender(model, i);
        const field = resolveLabFieldForRender(ctx, layout, model, model.admissionDayIndex, i, dynamicLabYOffset);
        if (renderedLabText && field) {
          // Laboratoriji se automatski spuštaju ako duga kronična terapija prelazi u njihov prostor.
          // Urin ostaje kontinuirani niz, ali se omata unutar širine text boxa.
          drawTextBox(ctx, renderedLabText, field, getLabPreviewRenderOptions(i, renderOptions.showLabHighlights));
        }
      });
    }
    if (renderOptions.showRadiology && isAdmissionPage && model.admissionDayIndex != null && model.radiologyText) {
      const dynamicLabYOffset = getDynamicLabYOffset(ctx, layout, model);
      const field = resolveRadiologyField(ctx, layout, model, model.admissionDayIndex, dynamicLabYOffset);
      drawTextBox(ctx, model.radiologyText, field, { noWrap: false });
    }
    if (isAdmissionPage && model.admissionDayIndex != null && hasSelectedMicrobiologySamples(model.microbiologySamples)) {
      const dynamicLabYOffset = getDynamicLabYOffset(ctx, layout, model);
      drawMicrobiologySamples(ctx, layoutKey, layout, model, dynamicLabYOffset);
    }
    if (renderOptions.showVitalSigns && isAdmissionPage && model.admissionDayIndex != null && model.vitalSigns) {
      const dynamicLabYOffset = getDynamicLabYOffset(ctx, layout, model);
      const field = resolveVitalSignsField(ctx, layout, model, dynamicLabYOffset);
      drawTextBox(ctx, model.vitalSigns, field, { noWrap: false });
    }
    if (renderOptions.showFollowUpControl) {
      drawFollowUpControlLabBoxes(ctx, layout, model, pageNumber, renderOptions);
    }
    if (renderOptions.showFollowUpControl && model.followUpControl) {
      const field = resolveFollowUpControlField(layout, model, pageNumber);
      if (field) drawTextBox(ctx, model.followUpControl, field, { noWrap: model.isOutpatient === true });
    }

    const dates = getRenderPageDates(model, pageNumber);
    const hospitalDays = getRenderPageHospitalDays(model, pageNumber);
    const therapy = getRenderPageTherapy(model, pageNumber);

    if (renderOptions.showDates) {
      dates.forEach((dateValue, i) => {
        if (dateValue) drawTextBox(ctx, formatShortDate(dateValue), layout.dates[i]);
      });
      if (Array.isArray(layout.hospitalDays)) {
        hospitalDays.forEach((hospitalDayValue, i) => {
          if (hospitalDayValue) drawTextBox(ctx, hospitalDayValue, layout.hospitalDays[i]);
        });
      }
    }

    if (renderOptions.showTherapy) {
      therapy.forEach((therapyText, i) => {
        if (therapyText) drawTextBox(ctx, therapyText, resolveTherapyField(layoutKey, layout, i));
      });
    }

    if (renderOptions.showAdmissionMarker && isAdmissionPage) {
      drawAdmissionMarker(ctx, layout, model.admissionDayIndex);
    }

    ctx.restore();
  }

  function handleAdminFieldSelection(event, layoutKey, fieldPath) {
    if (!state.admin.enabled) return false;
    const multiSelect = Boolean(event.ctrlKey || event.metaKey);
    const key = makeSelectionKey(layoutKey, fieldPath);

    if (multiSelect) {
      state.admin.selectAllTextBoxes = false;
      state.admin.selectedLayout = layoutKey;
      state.admin.selectedField = fieldPath;
      pruneSelectedFields();
      const existingIndex = state.admin.selectedFields.indexOf(key);
      if (existingIndex >= 0) {
        state.admin.selectedFields.splice(existingIndex, 1);
      } else {
        state.admin.selectedFields.push(key);
      }
      if (!state.admin.selectedFields.length) {
        ensureSingleSelection(layoutKey, fieldPath);
      }
      updateAdminSelectionUI();
      return true;
    }

    pruneSelectedFields();
    const selectedBeforeClick = state.admin.selectAllTextBoxes || state.admin.selectedFields.includes(key);
    const hasMultiSelection = state.admin.selectAllTextBoxes || state.admin.selectedFields.length > 1;
    state.admin.selectedLayout = layoutKey;
    state.admin.selectedField = fieldPath;

    if (selectedBeforeClick && hasMultiSelection) {
      updateAdminSelectionUI();
      return false;
    }

    ensureSingleSelection(layoutKey, fieldPath);
    updateAdminSelectionUI();
    return false;
  }

  function startAdminDrag(event, layoutKey, fieldPath, field, shell, mode = 'move', handle = 'se') {
    if (!state.admin.enabled) return;
    event.preventDefault();
    event.stopPropagation();
    const selectionOnly = handleAdminFieldSelection(event, layoutKey, fieldPath);
    if (selectionOnly) return;
    const shellRect = shell.getBoundingClientRect();
    const activeItems = getActiveEditableFields();
    const selectedDragOrigins = activeItems.map(({ layoutKey: itemLayoutKey, path, field: itemField }) => ({
      layoutKey: itemLayoutKey || layoutKey,
      path,
      originX: itemField.x,
      originY: itemField.y,
      originWidth: itemField.width,
      originHeight: itemField.height
    }));
    state.admin.drag = {
      layoutKey,
      fieldPath,
      mode,
      handle,
      selectedDragOrigins,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: field.x,
      originY: field.y,
      originWidth: field.width,
      originHeight: field.height,
      beforeSnapshot: snapshotCalibration(),
      scaleX: shellRect.width / PAGE.widthPx,
      scaleY: shellRect.height / PAGE.heightPx
    };
  }

  function makeFieldBox(fieldPath, field, overlay, layoutKey) {
    if (!field) return;
    const shell = overlay.parentElement;
    const scaleX = shell.clientWidth / PAGE.widthPx;
    const scaleY = shell.clientHeight / PAGE.heightPx;
    const box = document.createElement('div');
    box.className = 'field-box';
    if (isFieldSelected(layoutKey, fieldPath)) {
      box.classList.add('selected');
    }
    box.style.left = `${field.x * scaleX}px`;
    box.style.top = `${field.y * scaleY}px`;
    box.style.width = `${Math.max(16, field.width * scaleX)}px`;
    box.style.height = `${Math.max(16, field.height * scaleY)}px`;
    const label = document.createElement('span');
    label.className = 'tag';
    label.textContent = prettyFieldName(fieldPath);
    box.appendChild(label);
    if (fieldPath === 'ohbpTherapyBox') {
      box.title = 'Okvir za Th. iz OHBP-a. U admin načinu se prikazuje primjer teksta ako je polje Th. OHBP prazno; stvarni tekst se prikazuje čim ga upišeš ili parsiraš iz OHBP nalaza.';
    }

    box.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    box.addEventListener('pointerdown', (event) => {
      startAdminDrag(event, layoutKey, fieldPath, field, shell, 'move', 'move');
    });

    ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach((handleName) => {
      const handle = document.createElement('span');
      handle.className = `resize-handle handle-${handleName}`;
      handle.title = `Promjena dimenzije (${handleName})`;
      handle.addEventListener('pointerdown', (event) => {
        startAdminDrag(event, layoutKey, fieldPath, field, shell, 'resize', handleName);
      });
      box.appendChild(handle);
    });

    overlay.appendChild(box);
  }

  function prettyFieldName(fieldPath) {
    const dayLabels = ['pon', 'uto', 'sri', 'čet', 'pet', 'sub', 'ned'];
    if (fieldPath === 'patientHeader') return 'Ime';
    if (fieldPath === 'diagnosis') return 'Dijagnoza';
    if (fieldPath === 'allergiesBox') return 'Alergije';
    if (fieldPath === 'patientOriginBox') return 'Od kuda';
    if (fieldPath === 'ohbpTherapyBox') return 'Th. OHBP';
    if (fieldPath.startsWith('labBox1Days.')) return `Lab 1 ${dayLabels[Number(fieldPath.split('.')[1])]}`;
    if (fieldPath.startsWith('labBox2Days.')) return `Lab 2 ${dayLabels[Number(fieldPath.split('.')[1])]}`;
    if (fieldPath.startsWith('labBox4Days.')) return `Lab koagulacija ${dayLabels[Number(fieldPath.split('.')[1])]}`;
    if (fieldPath.startsWith('labBox3Days.')) return `Lab urin ${dayLabels[Number(fieldPath.split('.')[1])]}`;
    if (fieldPath.startsWith('radiologyDays.')) return `RTG/UZV ${dayLabels[Number(fieldPath.split('.')[1])]}`;
    if (fieldPath.startsWith('vitalSignsDays.')) return `Vitalni ${dayLabels[Number(fieldPath.split('.')[1])]}`;
    if (fieldPath.startsWith('followUpControlDays.')) return `Kontrola ${dayLabels[Number(fieldPath.split('.')[1])]}`;
    if (fieldPath.startsWith('dates.')) return `Datum ${Number(fieldPath.split('.')[1]) + 1}`;
    if (fieldPath.startsWith('hospitalDays.')) return `Dan hosp. ${Number(fieldPath.split('.')[1]) + 1}`;
    if (fieldPath.startsWith('therapy.')) return `Terapija ${Number(fieldPath.split('.')[1]) + 1}`;
    return fieldPath;
  }

  function updateAdminSelectionUI() {
    populateAdminFieldSelect();
    updateSelectAllTextBoxesButton();
    renderAdminOverlays();
  }

  function renderAdminOverlays() {
    const overlays = [
      { el: els.overlay1, layoutKey: els.shell1.dataset.layout },
      { el: els.overlay2, layoutKey: els.shell2.dataset.layout }
    ];
    overlays.forEach(({ el, layoutKey }) => {
      el.innerHTML = '';
      if (!state.admin.enabled) return;
      const layout = state.calibration[layoutKey];
      if (!layout) return;
      const fieldOptions = getFieldPathLabels(layoutKey);
      fieldOptions.forEach(({ path }) => {
        const field = getFieldRef(layoutKey, path);
        if (field) makeFieldBox(path, field, el, layoutKey);
      });
    });
  }


  function collectTextOverflowWarnings(model) {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE.widthPx;
    canvas.height = PAGE.heightPx;
    const ctx = canvas.getContext('2d');
    const warnings = [];
    const dayLabels = ['pon', 'uto', 'sri', 'čet', 'pet', 'sub', 'ned'];
    const labRoots = [
      { root: 'labBox1Days', label: 'Laboratorij – lijevi stupac' },
      { root: 'labBox2Days', label: 'Laboratorij – desni stupac' },
      { root: 'labBox3Days', label: 'Laboratorij – urin' },
      { root: 'labBox4Days', label: 'Laboratorij – koagulacija' }
    ];

    const checkPage = (layoutKey, pageNumber) => {
      const layout = state.calibration[layoutKey];
      if (!layout) return;
      const pageLabel = getRenderPageLabel(model, pageNumber);
      const isAdmissionPage = isAdmissionRenderPage(model, pageNumber);
      const displaySettings = model.displaySettings || {};
      const getDisplayDateLabel = (index) => {
        const datesForPage = getRenderPageDates(model, pageNumber);
        const dateValue = datesForPage?.[index];
        return dateValue ? formatShortDate(dateValue) : `stupac ${index + 1}`;
      };

      addTextOverflowWarning(ctx, warnings, pageLabel, 'Ime i prezime + godište', model.headerText, layout.patientHeader);

      if (isAdmissionPage && displaySettings.showDiagnosisOnList !== false) {
        addTextOverflowWarning(ctx, warnings, pageLabel, 'Dijagnoza', model.diagnosis, layout.diagnosis, { overflowToleranceLines: 2 });
      }

      if (isAdmissionPage && displaySettings.showAllergiesOnList !== false && model.allergiesDisplayText && layout.allergiesBox?.visible !== false) {
        addTextOverflowWarning(ctx, warnings, pageLabel, 'Alergije na lijekove', model.allergiesDisplayText, layout.allergiesBox, { noWrap: false });
      }

      if (isAdmissionPage && displaySettings.showPatientOriginOnList !== false && model.patientOriginDisplayText && layout.patientOriginBox?.visible !== false) {
        addTextOverflowWarning(ctx, warnings, pageLabel, 'Od kuda je pacijent', model.patientOriginDisplayText, layout.patientOriginBox, { noWrap: false });
      }

      if (isAdmissionPage && displaySettings.showOhbpTherapyOnList !== false && model.ohbpTherapy && layout.ohbpTherapyBox?.visible !== false) {
        const ohbpField = resolveOhbpTherapyField(ctx, layout, model, model.ohbpTherapy, { showDiagnosis: displaySettings.showDiagnosisOnList !== false });
        addTextOverflowWarning(ctx, warnings, pageLabel, 'Terapija u OHBP-u', `Th. OHBP:
${model.ohbpTherapy}`, ohbpField, { noWrap: false, overflowToleranceLines: 2 });
      }

      if (isAdmissionPage && displaySettings.showVitalSignsOnList !== false && model.admissionDayIndex != null && model.vitalSigns) {
        const dynamicLabYOffset = getDynamicLabYOffset(ctx, layout, model);
        addTextOverflowWarning(ctx, warnings, pageLabel, `Vitalni parametri ${getDisplayDateLabel(model.admissionDayIndex)}`, model.vitalSigns, resolveVitalSignsField(ctx, layout, model, dynamicLabYOffset), { noWrap: false });
      }

      if (displaySettings.showFollowUpControlOnList !== false) {
        const followUpIndex = getFollowUpControlDayIndex(model, pageNumber);
        if (followUpIndex != null && hasFollowUpControlLabBoxes(model)) {
          const labModel = getFollowUpControlLabModel(model);
          const followUpDynamicLabYOffset = isAdmissionPage ? getDynamicLabYOffset(ctx, layout, model) : 0;
          labModel.labBoxes.forEach((labText, i) => {
            const renderedLabText = String(labText || '').trim();
            if (!renderedLabText) return;
            const labelRoot = labRoots[i]?.label || `Laboratorij ${i + 1}`;
            const field = isAdmissionPage
              ? resolveFollowUpControlLabFieldForRender(ctx, layout, model, labModel, followUpIndex, i, followUpDynamicLabYOffset)
              : resolveLabFieldForRender(ctx, layout, labModel, followUpIndex, i, 0);
            addTextOverflowWarning(ctx, warnings, pageLabel, `Kontrola ${labelRoot}, ${getDisplayDateLabel(followUpIndex)}`, renderedLabText, field, getLabOverflowWarningOptions(i));
          });
        }
        if (followUpIndex != null && model.followUpControl) {
          addTextOverflowWarning(ctx, warnings, pageLabel, `Kontrola ${getDisplayDateLabel(followUpIndex)}`, model.followUpControl, resolveFollowUpControlField(layout, model, pageNumber), { noWrap: false });
        }
      }

      if (isAdmissionPage && displaySettings.showLabsOnList !== false && model.admissionDayIndex != null) {
        const dynamicLabYOffset = getDynamicLabYOffset(ctx, layout, model);
        model.labBoxes.forEach((labText, i) => {
          const renderedLabText = getLabBoxTextForRender(model, i);
          const labelRoot = labRoots[i]?.label || `Lab ${i + 1}`;
          const field = resolveLabFieldForRender(ctx, layout, model, model.admissionDayIndex, i, dynamicLabYOffset);
          addTextOverflowWarning(ctx, warnings, pageLabel, `${labelRoot}, ${getDisplayDateLabel(model.admissionDayIndex)}`, renderedLabText, field, getLabOverflowWarningOptions(i));
        });
      }
      if (isAdmissionPage && displaySettings.showRadiologyOnList !== false && model.admissionDayIndex != null && model.radiologyText) {
        const dynamicLabYOffset = getDynamicLabYOffset(ctx, layout, model);
        const field = resolveRadiologyField(ctx, layout, model, model.admissionDayIndex, dynamicLabYOffset);
        addTextOverflowWarning(ctx, warnings, pageLabel, `RTG/UZV ${getDisplayDateLabel(model.admissionDayIndex)}`, model.radiologyText, field, { noWrap: false });
      }

      const dates = getRenderPageDates(model, pageNumber);
      const therapy = getRenderPageTherapy(model, pageNumber);

      dates.forEach((dateValue, i) => {
        if (dateValue) addTextOverflowWarning(ctx, warnings, pageLabel, `Datum ${dayLabels[i]}`, formatShortDate(dateValue), layout.dates[i]);
      });

      if (displaySettings.showTherapyOnList !== false) {
        therapy.forEach((therapyText, i) => {
          addTextOverflowWarning(ctx, warnings, pageLabel, `Terapija ${dayLabels[i]}`, therapyText, resolveTherapyField(layoutKey, layout, i), { noWrap: false });
        });
      }
    };

    checkPage(model.page1LayoutKey, 1);
    checkPage(model.page2LayoutKey, 2);
    return warnings;
  }

  function buildTextOverflowWarningMessage(warnings = []) {
    if (!warnings.length) return '';
    const details = warnings.slice(0, 3).map((warning) => {
      const lineInfo = Number.isFinite(warning.maxLines) && warning.maxLines > 0
        ? ` ima ${warning.lineCount} redaka, a stane ${warning.maxLines}`
        : ' je predugo za predviđeni prostor';
      return `${warning.label} na ${warning.pageLabel}${lineInfo}`;
    }).join('; ');
    const suffix = warnings.length > 3 ? ` Još ${warnings.length - 3} polja treba provjeriti.` : '';
    return `Upozorenje prije ispisa: jedan tekst je duži od podešenog okvira na listi. Ispis nije blokiran i ovo nije greška parsera. Provjerite: ${details}.${suffix} Ako vizualno stane, upozorenje se može ignorirati; ako prelazi u susjedno polje, skratite tekst ili povećajte okvir u admin načinu.`;
  }

  const CHRONIC_THERAPY_ADMISSION_WARNING = 'Kronična terapija je upisana, ali nije unesen ispravan datum prijema — terapija se neće prikazati na temperaturnoj listi.';

  function getChronicTherapyAdmissionWarningMessage() {
    const therapyText = (els.therapy?.value || '').trim();
    const shouldShowTherapy = !els.showTherapyOnList || els.showTherapyOnList.checked;
    const hasValidAdmissionDate = Boolean(normalizeAdmissionDateInput((els.admissionDate?.value || '').trim()));
    if (therapyText && shouldShowTherapy && !hasValidAdmissionDate) return CHRONIC_THERAPY_ADMISSION_WARNING;
    return '';
  }

  function updateChronicTherapyAdmissionWarningStatus() {
    const message = getChronicTherapyAdmissionWarningMessage();
    if (els.chronicTherapyAdmissionWarning) {
      els.chronicTherapyAdmissionWarning.textContent = message;
      els.chronicTherapyAdmissionWarning.classList.toggle('hidden', !message);
    }
    return message;
  }

  function buildOhbpStatusWithAdmissionWarning(baseMessage, baseKind = 'neutral') {
    const admissionWarning = getChronicTherapyAdmissionWarningMessage();
    if (!admissionWarning) return { message: baseMessage || '', kind: baseKind || 'neutral' };
    return {
      message: [baseMessage || '', admissionWarning].filter(Boolean).join(' '),
      kind: 'warn'
    };
  }

  function updateTextOverflowWarningStatus(warnings = []) {
    state.lastTextOverflowWarnings = warnings || [];
    if (!els.overflowWarningStatus) return;
    const message = buildTextOverflowWarningMessage(warnings);
    els.overflowWarningStatus.textContent = message;
    els.overflowWarningStatus.classList.toggle('visible', Boolean(message));
    els.overflowWarningStatus.classList.toggle('hidden', !message);

    const hasRadiologyOverflow = (warnings || []).some(warning => String(warning?.label || '').startsWith('RTG/UZV'));
    if (!hasRadiologyOverflow) clearRadiologyShorteningStatusIfCurrent();
  }

  function setFastFocusCardState(card, isReady) {
    if (!card) return;
    card.classList.toggle('is-ready', Boolean(isReady));
    card.classList.toggle('needs-review', !isReady);
  }

  function renderPrintChecklist(container, items) {
    if (!container) return;
    container.textContent = '';
    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = `print-checklist-item ${item.done ? 'is-done' : 'needs-review'}`;
      li.textContent = item.label;
      li.title = item.done ? 'Popunjeno, ručno provjeriti' : 'Nedostaje ili treba provjeriti';
      container.appendChild(li);
    });
  }

  function updateFastFocusPanel(model) {
    if (!els.quickIdentityCard) return;

    const name = (els.fullName?.value || '').trim();
    const birthYear = (els.birthYear?.value || '').trim();
    const admissionDateText = (els.admissionDate?.value || '').trim();
    const normalizedAdmissionDate = normalizeAdmissionDateInput(admissionDateText);
    const hasValidAdmissionDate = Boolean(normalizedAdmissionDate);
    const hasValidBirthYear = !birthYear || /^(?:18|19|20)\d{2}$/.test(birthYear);
    const identityReady = Boolean(name && birthYear && hasValidBirthYear && hasValidAdmissionDate);
    const hasDiagnosis = Boolean((els.diagnosis?.value || '').trim());
    const hasAllergies = Boolean((els.allergies?.value || '').trim());
    const hasChronicTherapy = Boolean((els.therapy?.value || '').trim());
    const hasTherapy = Boolean(hasChronicTherapy || (els.ohbpTherapy?.value || '').trim());
    const hasVitalSigns = Boolean((els.vitalSigns?.value || '').trim());
    const hasPatientOrigin = Boolean((els.patientOrigin?.value || '').trim());
    const hasFollowUpControl = Boolean((els.followUpControlDate?.value || '').trim() || (els.followUpControl?.value || '').trim());
    const hasMicrobiologySamplesReady = hasSelectedMicrobiologySamples(getFormData());
    const outpatient = isOutpatientMode(model?.patientMode || getCurrentPatientMode());
    const chronicTherapyAdmissionWarning = updateChronicTherapyAdmissionWarningStatus();
    let checklistItems = [
      { label: 'Ime/godište', done: Boolean(name && birthYear && hasValidBirthYear) },
      { label: 'Datum prijema', done: hasValidAdmissionDate },
      { label: 'Dijagnoza', done: hasDiagnosis },
      { label: 'Alergije', done: hasAllergies },
      { label: 'Terapija', done: hasTherapy },
      { label: 'Vitalni znakovi', done: hasVitalSigns }
    ];
    if (outpatient) {
      checklistItems = [
        { label: 'Ime/godiste', done: Boolean(name && birthYear && hasValidBirthYear) },
        { label: 'Datum prijema', done: hasValidAdmissionDate },
        { label: 'Alergije', done: hasAllergies },
        { label: 'Od kuda', done: hasPatientOrigin },
        { label: 'Mikrobiologija', done: hasMicrobiologySamplesReady },
        { label: 'Vitalni znakovi', done: hasVitalSigns },
        { label: 'Kontrola', done: hasFollowUpControl }
      ];
    }
    if (!outpatient && hasChronicTherapy && (!els.showTherapyOnList || els.showTherapyOnList.checked)) {
      checklistItems.push({ label: 'Kron. terapija ima datum', done: hasValidAdmissionDate });
    }
    const checklistDoneCount = checklistItems.filter(item => item.done).length;
    const checklistReady = checklistDoneCount === checklistItems.length;

    setFastFocusCardState(els.quickIdentityCard, identityReady);
    if (els.quickIdentityStatus) {
      els.quickIdentityStatus.textContent = identityReady ? 'Spremno' : 'Provjeri';
    }
    if (els.quickIdentitySummary) {
      const missing = [];
      if (!name) missing.push('ime');
      if (!birthYear) missing.push('godište');
      if (birthYear && !hasValidBirthYear) missing.push('ispravno godište');
      if (!hasValidAdmissionDate) missing.push('datum prijema');
      els.quickIdentitySummary.textContent = identityReady
        ? `${name}, ${birthYear}; prijem ${admissionDateText}.`
        : `Nedostaje ili treba ispraviti: ${missing.join(', ')}.`;
    }

    const hasOverflowWarnings = Boolean(state.lastTextOverflowWarnings && state.lastTextOverflowWarnings.length);
    const printReady = checklistReady && !hasOverflowWarnings;
    setFastFocusCardState(els.quickPrintCard, printReady);
    if (els.quickPrintStatus) {
      els.quickPrintStatus.textContent = printReady ? 'Spremno' : `${checklistDoneCount}/${checklistItems.length}`;
    }
    if (els.printChecklistStatus) {
      els.printChecklistStatus.textContent = printReady ? 'Spremno' : `${checklistDoneCount}/${checklistItems.length}`;
    }
    renderPrintChecklist(els.quickPrintChecklist, checklistItems);
    renderPrintChecklist(els.printChecklist, checklistItems);
    if (els.quickPrintSummary) {
      if (chronicTherapyAdmissionWarning) {
        els.quickPrintSummary.textContent = chronicTherapyAdmissionWarning;
      } else if (hasOverflowWarnings) {
        els.quickPrintSummary.textContent = 'Prije ispisa skrati polje navedeno u narančastom upozorenju.';
      } else if (!checklistReady) {
        els.quickPrintSummary.textContent = `Checklist prije ispisa: ${checklistDoneCount}/${checklistItems.length} stavki je popunjeno.`;
      } else {
        els.quickPrintSummary.textContent = 'Sve stavke su popunjene; napravi završni pogled i ispiši.';
      }
    }
  }


  
