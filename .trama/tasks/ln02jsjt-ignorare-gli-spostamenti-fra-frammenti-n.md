---
column: done
technical: false
refs:
  - proposal/Approved
  - proposal/Open/developer.APPROVE_PROPOSAL
  - requirements/rules#proposal/Approved
drift: null
proposal: euf9nx59
agent: false
created: 2026-10-05T13:21:55.852Z
---
# Ignorare gli spostamenti fra frammenti nella scelta delle Feature da scansionare

Dopo l'approvazione di una Proposal ordinaria, le sezioni dei Requisiti si confrontano per Area e riferimento, indipendentemente dal frammento in cui stanno:
- una sezione spostata da un frammento a un altro con lo stesso testo non conta come cambiata;
- il titolo o la descrizione di un frammento, e la nascita o la scomparsa di un frammento, non fanno scansionare nulla;
- un cambio della descrizione o dell'introduzione dell'Area (in `area.md`) o della sua sezione General, in qualunque frammento stia, riguarda ogni Feature, come prima.

Lo stesso confronto vale per la scelta fatta in un giro di worktree.
