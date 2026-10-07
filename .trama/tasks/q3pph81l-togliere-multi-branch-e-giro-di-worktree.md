---
column: done
technical: true
refs:
  - requirements/tech#General
  - requirements/rules#announcement
drift: null
proposal: null
agent: false
created: 2026-10-07T05:28:51.963Z
finished: 2026-10-07T05:56:45.894Z
---
# Togliere multi-branch e giro di worktree da skill, documentazione e verifiche

Nessun testo del progetto descrive più il multi-branch o il giro di worktree come funzionalità supportata:

- La skill `trama-scan` non parla più della scansione dopo l'unione di un giro né del titolo `Scan after merge`; i titoli dei controlli sono quelli di `rules#announcement`.
- README, `docs/cli.md`, `docs/model-format.md` e `docs/uat.md` non descrivono più l'interruttore, `trama.worktreeAgent`, `trama proposal withdraw`, il giro, l'unione e la riconciliazione; i casi di accettazione che li provano spariscono.
- I test del giro, dell'interruttore e delle schede dei worktree sono tolti o riscritti per la sola cartella aperta, e la suite passa.
