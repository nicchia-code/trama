---
created: 2026-10-20T20:20:12.382Z
updated: 2026-10-20T20:20:12.382Z
summary: Ogni comando ha la forma oggetto-verbo con input JSON validato da zod; un solo registro in src/cli ne deriva help, scelta e documentazione, e i nomi vecchi sono tolti.
tasks:
  - 8nwzs00k
  - 31pdfny3
  - 7l925inx
  - 7pihp6em
  - 7ubrh2ld
  - u3a4ki9p
cleared:
  u3a4ki9p:
    title: Comandi dei Drift
    proposal: lvblkg0l
    tag: CLI oggetto-verbo
    finished: 2026-10-20T20:19:13.550Z
    refs:
      - requirements/tech#drift
      - requirements/rules#drift
      - requirements/ui#drift
      - requirements/data#drift
      - requirements/rules#work
      - requirements/tech#work
  7pihp6em:
    title: Comandi delle Proposal
    proposal: lvblkg0l
    tag: CLI oggetto-verbo
    finished: 2026-10-20T20:13:25.798Z
    refs:
      - requirements/tech#proposal
      - requirements/rules#proposal
      - requirements/rules#proposal/Approved
      - requirements/ui#proposal
      - requirements/tech#design-request
      - requirements/tech#panel/Board
  7l925inx:
    title: Annunci, History e autopilota
    proposal: lvblkg0l
    tag: CLI oggetto-verbo
    finished: 2026-10-20T20:12:04.085Z
    refs:
      - requirements/tech#announcement
      - requirements/tech#voce-history
      - requirements/rules#voce-history
      - requirements/data#voce-history
      - requirements/tech#drift-resolution
      - requirements/rules#drift-resolution
      - requirements/ui#drift-resolution
  31pdfny3:
    title: Comandi dei Task
    proposal: lvblkg0l
    tag: CLI oggetto-verbo
    finished: 2026-10-20T20:05:19.151Z
    refs:
      - requirements/tech#task
      - requirements/rules#task
      - requirements/ui#task
      - requirements/quality#agent-terminal
      - requirements/tech#agent-launching
      - requirements/rules#agent-terminal
  7ubrh2ld:
    title: Hook e domande
    proposal: lvblkg0l
    tag: CLI oggetto-verbo
    finished: 2026-10-20T20:01:41.362Z
    refs:
      - agent-hook
      - requirements/tech#agent-hook
      - requirements/tech#editor-chat
      - requirements/quality#editor-chat
      - requirements/tech#question-round
      - requirements/rules#question-round
  8nwzs00k:
    title: Registro dei comandi
    proposal: lvblkg0l
    tag: CLI oggetto-verbo
    finished: 2026-10-20T19:53:07.161Z
    refs:
      - requirements/cli#General
      - requirements/tech#General
      - requirements/data#General
      - requirements/rules#project
      - requirements/tech#project
      - requirements/tech#panel
      - requirements/ui#General
---
# CLI oggetto-verbo con registro dei comandi

Registro dei comandi (T6) con zod, --input e --help; comandi del Modello e del progetto. Poi i comandi dei Task, delle Proposal, dei Drift e dei confronti, degli annunci, della History e dell'autopilota, gli hook e question new, con skill, prompt e documentazione sui nomi nuovi.
