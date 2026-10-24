---
created: 2026-10-23T12:55:25.635Z
updated: 2026-10-23T12:55:25.635Z
summary: "La colonna System Activities non c'è più: i fantasmi stanno in fondo a Backlog o Active, gli altri in una voce della status bar che ne apre i dettagli sulla Board."
tasks:
  - 6i1i8h14
  - gkb00sd8
  - w6tubwj6
cleared:
  w6tubwj6:
    title: Ghost nella barra di stato
    proposal: hf9h1qab
    tag: System Activities
    finished: 2026-10-23T12:51:48.626Z
    refs:
      - announcement
      - announcement/Announced
      - requirements/tech#announcement
      - agent-terminal
      - voce-history
      - work
      - requirements/ui#developer.ASK_MORE
      - requirements/ui#developer.OPEN_QUICK_TASK
  gkb00sd8:
    title: Fantasmi nelle colonne
    proposal: hf9h1qab
    tag: System Activities
    finished: 2026-10-23T12:48:00.764Z
    refs:
      - panel/Board
      - panel/Open/developer.SHOW_BOARD
      - design-request/Writing/developer.ASK_AGENT
      - requirements/ui#panel/Board
      - requirements/data#task
      - requirements/ui#drift-resolution
      - requirements/ui#drift-resolution/Unifying
      - requirements/ui#announcement
      - requirements/rules#announcement
  6i1i8h14:
    title: Dettagli dalla barra
    proposal: hf9h1qab
    tag: System Activities
    finished: 2026-10-23T12:46:51.348Z
    refs:
      - developer.OPEN_GHOST_DETAILS
      - panel/Closed/developer.OPEN_GHOST_DETAILS
      - panel/Open/developer.OPEN_GHOST_DETAILS
---
# Fantasmi in colonna e nella status bar

La Board ha tre colonne: Backlog, Active e History. Una funzione pura in `src/core` decide la colonna di ogni fantasma: Proposal, Resolve, Drift e Unify in Backlog, i Task in Active, mentre check/Scan, comparison e work (Import, Quick, Ask) non hanno colonna. I fantasmi stanno dopo le carte vere e non si contano.

I fantasmi senza colonna compaiono come un'unica voce riassuntiva `Trama Activities` nella barra di stato, con tooltip e QuickPick quando sono più di uno. Sceglierne uno apre il pannello sulla Board con la finestra dei dettagli di quel fantasma; alla chiusura il focus va a Backlog.
