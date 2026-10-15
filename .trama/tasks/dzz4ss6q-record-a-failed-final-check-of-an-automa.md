---
column: done
technical: false
refs:
  - drift-resolution/Running tasks/agent.FINISH_CHECK
  - requirements/rules#drift-resolution
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:41:23.866Z
finished: 2026-10-14T09:25:46.411Z
---
# Record a failed final check of an automatic Run

Quando il controllo finale di un Run automatico è dichiarato con esito fallito, il coordinatore lo registra: il fallimento è mostrato al developer con l'identità del caso e il motivo. Il Run continua soltanto sui casi indipendenti, la prosecuzione automatica compromessa resta ferma, e i casi già completati non vengono annullati. Le nuove raccolte, dopo la fine del Run, non sono sospese. Oggi un controllo di verifica dichiarato fallito non cambia nulla nel coordinatore: nessun caso viene escluso e nessun fallimento è mostrato.
