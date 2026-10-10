---
status: resolved
resolution: fix-code
refs:
  - project/Trama project/developer.REWRITE_IDENTITIES
  - requirements/rules#project
proposal: null
task: powt47ib
origin: null
option: 1
note: null
resolvedBy: vgoluaem
created: 2026-10-10T10:21:11.602Z
---
# Identity rewrite leaves numbered Drifts in a resolution's Drift list

## What happens

Quando il developer riscrive le identità, i riferimenti fra schede seguono le identità nuove solo nei campi elencati dal Requisito: Proposal richieste, Proposal e Drift di un Task, Proposal, Task e origine di un Drift.

L'**elenco dei Drift di una Proposal di risoluzione** non viene toccato: se una risoluzione elenca un Drift ancora numerato, dopo la riscrittura cita un numero che non esiste più. La risoluzione non si può più consegnare né approvare, perché il suo Drift non si trova, e il developer deve rifarla a mano. Il Requisito, scritto prima che esistessero le risoluzioni, non nomina questo elenco.

## What should happen

Il Modello dice che **i riferimenti fra Proposal, Task e Drift seguono le identità nuove** e che lo stato di ogni scheda non cambia: una risoluzione aperta o in scrittura che elenca un Drift numerato deve continuare a citare lo stesso Drift, con la stessa decisione, sotto la sua identità nuova.

Il Requisito di `rules#project` elenca però i campi riscritti in modo esaustivo, quindi seguire il Modello richiede anche di aggiungere l'elenco dei Drift delle risoluzioni a quei campi.

## Fix options

### Riscrivere anche l'elenco delle risoluzioni

Una Proposal aggiorna il Requisito: fra i campi riscritti entra il Drift di ogni voce dell'elenco di una risoluzione (e, per completezza, la risoluzione che ha risolto un Drift). Il codice segue: la riscrittura sostituisce il numero con l'identità nuova, lasciando decisione, opzione e nota com'erano. Costo: una modifica piccola al Requisito e al comando, più un test con una risoluzione che elenca un Drift numerato.

### Rifiutare la riscrittura se una risoluzione cita Drift numerati

Una Proposal aggiunge un rifiuto: il comando non scrive nulla, e dice quale risoluzione lo blocca, quando una risoluzione in scrittura o aperta elenca un Drift ancora numerato. Il developer prima la approva, la rifiuta o la scarta, poi riscrive. Costo: meno codice di riscrittura, ma un passo in più per il developer e un caso di rifiuto nuovo nel Modello e nel Requisito.

### Accettare il comportamento attuale

Una Proposal precisa nel Modello che solo i riferimenti elencati dal Requisito seguono le identità nuove e che una risoluzione con Drift numerati va rifatta dopo la riscrittura. Nessun cambio al codice. Costo: il caso resta possibile in una copia con Drift ancora numerati, e il developer scopre il problema solo quando la risoluzione non si consegna o non si approva.

## Where in the code

src/core/rewrite-ids.ts (rewriteNumberedCards: il ciclo sulle Proposal riscrive solo requires); src/core/proposals.ts (campo drifts delle risoluzioni, driftListProblems); src/core/work.ts (resolveListedDrifts)
