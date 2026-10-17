---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Running tasks/agent.FINISH_CHECK
proposal: null
task: muvh0qqt
origin: null
critical: false
option: 1
note: null
resolvedBy: feyjukk9
created: 2026-10-16T12:25:49.647Z
---
# Dopo un controllo finale fallito, il Run automatico ferma anche i Task indipendenti

## What happens

Quando il controllo finale di un Run automatico dichiara un esito fallito, il sistema smette di autorizzare ogni altro Task di quel Run. Anche i Task che non dipendono dal lavoro che il controllo ha segnato restano in To do, e quelli non ancora conclusi vengono segnati come falliti con il motivo "the final check of the automatic Run failed".

## What should happen

Il Modello dice che, dopo un controllo finale fallito, il Run **continua soltanto sui casi indipendenti**: la prosecuzione automatica compromessa resta ferma, ma i Task indipendenti proseguono. Le nuove raccolte, dopo la fine del Run, non sono sospese.

## Fix options

### Continuare sui Task non bloccati dal lavoro fallito

Il Run continua a far partire i Task autorizzati che nessun Task non concluso blocca, cioè quelli che non dipendono dal lavoro coinvolto. I Task che dipendono da un Task non concluso restano in To do con il motivo del blocco. Costo: il Run deve leggere i blocchi già visibili sulla Board a ogni gruppo, e il lavoro già fatto dal Run può restare a metà fino a un intervento del developer.

### Ripartire con un Run successivo sui soli casi indipendenti

Il Run si chiude come oggi, ma subito dopo parte un Run nuovo limitato ai Task autorizzati che non dipendono dal lavoro fallito, con la stessa autorizzazione e lo stesso controllo finale. I Task dipendenti restano fermi con il motivo. Costo: un Run in più, con un altro pre-flight e un altro controllo finale, e una coda di Run che il developer deve poter seguire.

## Where in the code

extension/src/host/controller.ts, funzione authorizedCollectionTasks: il ramo che restituisce nessun Task quando il controllo finale del Run è fallito; funzione advanceCollection: il ramo che segna come falliti i Task non conclusi di un Run il cui controllo finale è fallito. extension/src/host/drift-resolution.ts, funzione recordRunFailure e runCheckFailed.
