---
column: done
technical: false
refs:
  - project/Trama project/developer.REWRITE_IDENTITIES
  - requirements/rules#project
drift: f5clkr4u
proposal: null
agent: false
created: 2026-10-10T10:36:32.837Z
finished: 2026-10-10T10:40:43.995Z
---
# Fix code to match the Model: Identity rewrite leaves numbered Drifts in a resolution's Drift list

## What happens

Quando il developer riscrive le identità, i riferimenti fra schede seguono le identità nuove solo nei campi elencati dal Requisito: Proposal richieste, Proposal e Drift di un Task, Proposal, Task e origine di un Drift.

L'**elenco dei Drift di una Proposal di risoluzione** non viene toccato: se una risoluzione elenca un Drift ancora numerato, dopo la riscrittura cita un numero che non esiste più. La risoluzione non si può più consegnare né approvare, perché il suo Drift non si trova, e il developer deve rifarla a mano. Il Requisito, scritto prima che esistessero le risoluzioni, non nomina questo elenco.

## What should happen

Il Modello dice che **i riferimenti fra Proposal, Task e Drift seguono le identità nuove** e che lo stato di ogni scheda non cambia: una risoluzione aperta o in scrittura che elenca un Drift numerato deve continuare a citare lo stesso Drift, con la stessa decisione, sotto la sua identità nuova.

Il Requisito di `rules#project` elenca però i campi riscritti in modo esaustivo, quindi seguire il Modello richiede anche di aggiungere l'elenco dei Drift delle risoluzioni a quei campi.

## Chosen option

**Riscrivere anche l'elenco delle risoluzioni**

Una Proposal aggiorna il Requisito: fra i campi riscritti entra il Drift di ogni voce dell'elenco di una risoluzione (e, per completezza, la risoluzione che ha risolto un Drift). Il codice segue: la riscrittura sostituisce il numero con l'identità nuova, lasciando decisione, opzione e nota com'erano. Costo: una modifica piccola al Requisito e al comando, più un test con una risoluzione che elenca un Drift numerato.

## Where in the code

src/core/rewrite-ids.ts (rewriteNumberedCards: il ciclo sulle Proposal riscrive solo requires); src/core/proposals.ts (campo drifts delle risoluzioni, driftListProblems); src/core/work.ts (resolveListedDrifts)
