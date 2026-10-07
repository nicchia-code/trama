---
status: approved
base:
  work/announcement.md: 869d7c68b42ea31fc58634ff5478839a394f7bf8c47f96c88915deaae68f001d
  actors/agent.md: b9ba7d0aeac3934e1fb76f178715f1005ce70c9d551560a47948c81db4debaa5
  editor-panel/panel.md: 4c559af6f467339551d4e8ddc2262504688da3bcd99da0cd510d7d8a6eb8d2e3
  requirements/rules/tasks.md: ca1f83812fd94508dd508fba0e0c5bbc81150e0d28ffd530ab517720b0c40a59
  requirements/data/work.md: 52f0741e273550f43642f309f825bcff462316f91e4e667f89bb5ff99c1f4078
  requirements/tech/work.md: 4f8b1f3ad6e3f791f4a194692e86360324619280392442730fe96ee65c529072
  requirements/ui/panel.md: 8f3775826064046237c8f31435dfb4867b925735b9b007e4c0a7f3dc48ea5ba7
  requirements/tech/announcements.md: new
delete: []
created: 2026-10-06T21:26:06.431Z
scanScope:
  - ref: agent.CHANGE_CHECK_PHASE
    reason: changed
  - ref: agent.FINISH_CHECK
    reason: changed
  - ref: panel/Board
    reason: changed
  - ref: announcement
    reason: changed
  - ref: announcement/Announced
    reason: changed
  - ref: announcement/Delivered
    reason: changed
  - ref: panel/Open/developer.SHOW_BOARD
    reason: leads into a change
  - ref: requirements/data#announcement
    reason: changed
  - ref: requirements/rules#announcement
    reason: changed
  - ref: requirements/tech#announcement
    reason: changed
  - ref: requirements/ui#panel/Board
    reason: changed
---
# Activity ghost for final checks and scans

Quando l'ultimo Task di un design va in Done, la scheda di design passa in Done e la colonna In progress si svuota, ma l'agente sta ancora facendo la verifica finale e lo scan del System: la Board non dà alcun feedback, e se lo scan non trova nulla non ne darà mai.

Decisioni:
- Un ghost di attività separato in In progress, per ogni corsa nella sua fase finale; la scheda di design va in Done come oggi.
- Lo dichiara l'agente, con un nuovo tipo di annuncio `check` di `trama announce`: `trama announce check "<title>" --phase verifying|scanning`, `trama announce phase <id> <phase>`, `trama announce done <id>`.
- Due fasi: Verifying (test, lint, build) e Scanning.
- Fine riuscita: il ghost sparisce senza avviso. Ritiro senza fine dichiarata (comando finito, terminale chiuso, interruzione della chat di Cursor, 15 minuti di quiete): avviso «The agent stopped before finishing <title>.».
- Quiete di 15 minuti come per gli annunci; ogni cambio di fase la riazzera.
- Titolo dal lavoro della corsa (Final check of <Proposal>, Final check after Task <n>, Final check after all Tasks, Scan of <Proposal>, Scan of the System, Scan of Feature <a>, Scan after merge).
- Vale per: corse di un design, Task singolo, Run all To do, scansione dopo l'approvazione, scan chiesto a mano, scan dopo l'unione di un giro di worktree.

Assunzioni da verificare:
- Una corsa in un worktree non dichiara il controllo finale (lì non c'è lo scan finale e la sua Board è quella del progetto aperto).
- Con la scansione automatica seguita dall'implementazione, il ghost dello scan finisce quando finisce lo scan; il controllo finale dell'implementazione ne apre uno nuovo.
- Il ghost di attività non conta in nessuna colonna, come gli altri ghost, e un ritiro alla chiusura della conversazione di Cursor non dà avviso.
