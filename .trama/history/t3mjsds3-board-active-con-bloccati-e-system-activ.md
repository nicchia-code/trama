---
created: 2026-10-21T06:01:44.743Z
updated: 2026-10-21T06:01:44.743Z
summary: "La Board ha Backlog, Active, System Activities e History: i Task bloccati restano in Active con badge blocked e waiting cliccabili, e tutti i ghost stanno in System Activities."
tasks:
  - 8tmr33pe
  - elq7ks00
  - g91d4sjs
  - smye6bwb
  - vtyo7yf3
  - bwrnc463
cleared:
  smye6bwb:
    title: Ghost della richiesta in System Activities
    proposal: c9fp4trm
    tag: System Activities
    finished: 2026-10-21T05:53:57.849Z
    refs:
      - design-request/Writing/developer.ASK_AGENT
  vtyo7yf3:
    title: Ghost in System Activities
    proposal: c9fp4trm
    tag: System Activities
    finished: 2026-10-21T05:53:05.354Z
    refs:
      - announcement
      - requirements/rules#announcement
      - requirements/ui#announcement
  g91d4sjs:
    title: Colonne Board e System Activities
    proposal: c9fp4trm
    tag: System Activities
    finished: 2026-10-21T05:51:35.655Z
    refs:
      - panel/Open/developer.SHOW_BOARD
      - requirements/ui#panel/Board
      - requirements/tech#panel/Board
  8tmr33pe:
    title: Badge blocked e waiting
    proposal: c9fp4trm
    tag: System Activities
    finished: 2026-10-21T05:48:55.080Z
    refs:
      - panel/Board
      - requirements/rules#panel/Board
  elq7ks00:
    title: Task bloccati in Active, niente Run automatici
    proposal: c9fp4trm
    tag: System Activities
    finished: 2026-10-21T05:48:25.763Z
    refs:
      - task
      - requirements/rules#task
      - requirements/tech#task
      - requirements/data#task
  bwrnc463:
    title: Annunci senza job
    proposal: c9fp4trm
    tag: System Activities
    finished: 2026-10-21T05:45:06.120Z
    refs:
      - requirements/tech#announcement
      - requirements/data#announcement
---
# Board: Active con bloccati e System Activities

La colonna Blocked non c'è più: i Task bloccati da Drift o in attesa di una correzione stanno in Active con i badge `blocked` e `waiting` e i loro popup. `System Activities` mostra i ghost di ogni annuncio, compreso quello della richiesta di design. Gli annunci non hanno più il campo `job`; `announcement move failed` consegna il controllo come `delivered`.
