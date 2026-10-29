---
column: done
technical: true
refs:
  - specs#ci
  - requirements/tech#website
drift: null
proposal: 1wxpccmi
agent: false
created: 2026-10-29T12:24:32.921Z
finished: 2026-10-29T12:28:13.719Z
---
# Bun 1.4.4 nei workflow

Il workflow della release (`.github/workflows/release.yml`) e quello del sito (`.github/workflows/pages.yml`) installano Bun 1.4.4 con `oven-sh/setup-bun` al posto di Bun 1.4.0, e nessun workflow del repository usa un'altra versione di Bun.

Con Bun 1.4.4 il type-check e l'intera suite (`bun test --isolate`) passano su `ubuntu-latest`, `macos-14` e `windows-latest`, e la build del sito (`bun run site:build`) passa. Ciò che la nuova versione cambia nei test o nella build si corregge nel codice o nei test, senza saltare test.

Il motivo: con Bun 1.4.0 la suite si è bloccata in CI su macOS (intorno a `test/published-issues.test.ts`, senza che scattasse alcun timeout) e su Windows (un `listen` di named pipe che non finiva mai in `test/team-show.test.ts`); in sviluppo, con Bun 1.4.3, non si è mai bloccata.

`CHANGELOG.md` registra il cambio di versione sotto la prossima versione.
