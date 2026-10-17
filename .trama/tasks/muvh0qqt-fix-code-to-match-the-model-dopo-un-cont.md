---
column: done
technical: false
refs:
  - drift-resolution/Running tasks/agent.FINISH_CHECK
drift: 296dd3d9
proposal: null
agent: false
created: 2026-10-16T12:32:57.800Z
finished: 2026-10-16T12:39:51.802Z
---
# Fix code to match the Model: Dopo un controllo finale fallito, il Run automatico ferma anche i Task indipendenti

## What happens

Quando il controllo finale di un Run automatico dichiara un esito fallito, il sistema smette di autorizzare ogni altro Task di quel Run. Anche i Task che non dipendono dal lavoro che il controllo ha segnato restano in To do, e quelli non ancora conclusi vengono segnati come falliti con il motivo "the final check of the automatic Run failed".

## What should happen

Il Modello dice che, dopo un controllo finale fallito, il Run **continua soltanto sui casi indipendenti**: la prosecuzione automatica compromessa resta ferma, ma i Task indipendenti proseguono. Le nuove raccolte, dopo la fine del Run, non sono sospese.

## Chosen option

**Continuare sui Task non bloccati dal lavoro fallito**

Il Run continua a far partire i Task autorizzati che nessun Task non concluso blocca, cioè quelli che non dipendono dal lavoro coinvolto. I Task che dipendono da un Task non concluso restano in To do con il motivo del blocco. Costo: il Run deve leggere i blocchi già visibili sulla Board a ogni gruppo, e il lavoro già fatto dal Run può restare a metà fino a un intervento del developer.

## Where in the code

extension/src/host/controller.ts, funzione authorizedCollectionTasks: il ramo che restituisce nessun Task quando il controllo finale del Run è fallito; funzione advanceCollection: il ramo che segna come falliti i Task non conclusi di un Run il cui controllo finale è fallito. extension/src/host/drift-resolution.ts, funzione recordRunFailure e runCheckFailed.
