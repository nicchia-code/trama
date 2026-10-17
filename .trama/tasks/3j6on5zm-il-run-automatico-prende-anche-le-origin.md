---
column: done
technical: false
refs:
  - drift-resolution/Running tasks
  - requirements/rules#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-17T18:47:39.459Z
finished: 2026-10-17T19:06:58.497Z
---
# Il Run automatico prende anche le origini delle correzioni

Quando le correzioni di una risoluzione automatica sono Done, la loro origine torna eseguibile e il Run automatico la prende nella sequenza, nel gruppo del suo modello, senza aspettare una nuova raccolta. Un'origine che aspetta la sua correzione non viene data per finita né resta ferma senza motivo; un'origine già Done non si riapre; i gruppi già pianificati non cambiano.
