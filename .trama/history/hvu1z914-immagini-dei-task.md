---
created: 2026-10-22T05:54:58.511Z
updated: 2026-10-22T05:54:58.511Z
summary: "Un Task di una Proposal può portare immagini per chi lo realizza: salvate in locale, mostrate in anteprima nel pannello e seguono il ciclo di vita della Proposal."
tasks:
  - 2i2661ds
  - arfajqbt
  - y1x2yspi
  - qm8bovip
  - yoz881i6
  - zufskix3
cleared:
  qm8bovip:
    title: Anteprime immagini nei Task
    proposal: drdvf0p2
    tag: Immagini ai Task
    finished: 2026-10-22T05:52:05.746Z
    refs:
      - requirements/ui#task
      - panel/Board
      - panel/Open/developer.SHOW_BOARD
  zufskix3:
    title: Skill e immagini all'esecuzione
    proposal: drdvf0p2
    tag: Immagini ai Task
    finished: 2026-10-22T05:50:06.601Z
    refs:
      - design-request
      - requirements/rules#design-request
  yoz881i6:
    title: Immagini nel ciclo della Proposal
    proposal: drdvf0p2
    tag: Immagini ai Task
    finished: 2026-10-22T05:49:58.476Z
    refs:
      - proposal
      - proposal/Draft/agent.EDIT_PROPOSAL
  2i2661ds:
    title: Immagini dei Task in core
    proposal: drdvf0p2
    tag: Immagini ai Task
    finished: 2026-10-22T05:48:22.131Z
    refs:
      - design-request/Consumed
      - design-request/Sent/proposal.SUBMITTED
      - design-request/Sent/workspace.REQUEST_DELETED
      - requirements/tech#design-request
  arfajqbt:
    title: Immagini dei Task salvate
    proposal: drdvf0p2
    tag: Immagini ai Task
    finished: 2026-10-22T05:46:15.253Z
    refs:
      - task
      - requirements/data#task
  y1x2yspi:
    title: "CLI: campi delle immagini"
    proposal: drdvf0p2
    tag: Immagini ai Task
    finished: 2026-10-22T05:46:05.026Z
    refs:
      - requirements/cli#General
---
# Immagini dei Task

Le immagini legate ai Task stanno in .trama/task-images/<identità del Task>/, non versionate. Core e riga di comando le gestiscono (campi images e removeImages di proposal edit), il pannello mostra le anteprime nei dettagli del Task, la cartella segue approvazione, rifiuto e fine del Task, e le skill di design, setup e implement spiegano come le immagini di una richiesta arrivano a chi realizza i Task.
