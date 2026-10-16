---
status: resolved
resolution: proposal
refs:
  - requirements/tech#project
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: mi0ehofo
created: 2026-10-16T05:22:47.983Z
---
# L'estensione si avvia anche nelle cartelle senza progetto Trama

## What happens

Il manifest dell'estensione la fa partire a ogni avvio dell'editor, in qualsiasi cartella, anche in quelle che non sono un progetto Trama. Così il pulsante Trama della barra di stato e il pannello sono attivi ovunque, senza che il developer abbia usato un comando.

## What should happen

Il Requisito dice che l'estensione si avvia da sola solo nelle cartelle che contengono il Modello (`.trama/model/system.md`). Altrove si avvia solo quando il developer usa uno dei suoi comandi o l'icona Open Trama, e non si aggiunge nessun evento di attivazione nuovo.

## Fix options

### Togliere l'avvio a ogni apertura

Si toglie dal manifest la voce che fa partire l'estensione a ogni avvio, e resta solo l'avvio nelle cartelle con un progetto Trama e quello sui comandi. Nei progetti non cambia nulla. Nelle altre cartelle Trama si apre solo con un comando o con l'icona Open Trama, come dice il Requisito. Costo: nessuno, la modifica è di una riga.

### Ripristinare il manifest dell'ultimo commit

Il manifest torna com'è nell'ultimo commit, e l'avvio a ogni apertura sparisce insieme alle altre modifiche non committate allo stesso file. Il risultato è lo stesso, ma si perdono quelle modifiche: prima va controllato che non servano a un lavoro in corso.

## Where in the code

extension/package.json, la lista activationEvents (la voce onStartupFinished, accanto a workspaceContains:.trama/model/system.md)
