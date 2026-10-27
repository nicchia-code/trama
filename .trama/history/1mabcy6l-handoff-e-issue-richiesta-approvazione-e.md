---
created: 2026-10-25T18:29:08.299Z
updated: 2026-10-27T06:13:10.279Z
summary: Il Manager chiede una handoff con una richiesta scritta; la skill trama-handoff la trasforma in Proposal con issue, che il Manager decide nella scheda Decisions e vede nella scheda Issues. Dopo l'approvazione l'agente le pubblica su GitHub.
tasks:
  - zqvcu5u3
  - xw0lnxlj
  - 3r98u5d9
  - 423h0xtf
  - rvngdax2
  - obo8y3em
---
# Handoff e issue: richiesta, approvazione e pubblicazione

La Proposal ha il tipo `handoff`, con card in `.trama/issues/` al posto dei Task. Prima di consegnarla Trama controlla assegnatari, stime e dipendenze. Non compare mai in Backlog e si approva solo dalla vista Team. New handoff apre la richiesta scritta e la skill `trama-handoff` prepara la Proposal, con assegnatario, reviewer, stima e sprint per ogni issue. Nella scheda Decisions il Manager approva, rifiuta o rielabora, vede l'anteprima delle issue e può cambiarne i campi o dividerle (Split) se stimate più di 3 giorni. L'approvazione scrive le card e lancia la pubblicazione. La scheda Issues le elenca per epica con il loro stato. Un'issue che non si pubblica va in `not-published` e si può rilanciare con Publish again. `trama issue` ha i comandi list, show, move e edit.
