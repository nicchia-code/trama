---
status: approved
base:
  requirements/tech/general.md: 8548159fac3957ea8e08427a82bd2ea0283697a7f4dc46c4acbadd69110a06d7
  requirements/tech/website.md: 6cedabe3db2d46139ce45c1353a9593b507661b964f26fc908bd28464a51356e
  specs.yaml: 9080fd39bda4f88b32a2ac196031d6a3c73810b615ba509cbb036af5552db3bf
delete: []
created: 2026-10-29T11:30:25.192Z
label: CI release
---
# CI senza blocchi

Nelle corse della release della 0.1.6 la suite di test si è bloccata su macOS in 3 corse su 6, intorno a `test/published-issues.test.ts`, senza che scattasse alcun timeout di `bun test`, e su Windows in `test/team-show.test.ts`, dove con Bun 1.4.0 il `listen` di una named pipe non finiva mai. Un job bloccato occupava il runner fino al limite di 15 minuti, senza dire quale file era fermo, e la release non veniva pubblicata. Su `windows-latest` type-check e suite occupano già 10–13 dei 15 minuti.

Decisioni:
- La CI della release usa Bun 1.4.4 invece di 1.4.0.
- Il workflow del sito usa la stessa versione di Bun della release.
- Il passo dei test fallisce dopo 3 minuti senza nuova uscita e stampa il file di test in corso.
- I job che costruiscono i pacchetti hanno un limite di 25 minuti; gli altri job restano a 15.
