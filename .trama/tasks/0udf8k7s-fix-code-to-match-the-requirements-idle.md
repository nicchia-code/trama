---
column: done
technical: true
refs:
  - requirements/tech#agent-terminal
drift: jpwtmth1
proposal: null
agent: false
created: 2026-10-14T09:08:35.575Z
finished: 2026-10-14T12:09:25.607Z
---
# Fix code to match the Requirements: Idle agent terminal is remembered until closed, against the terminal-list Requirement

## What happens

Con la chiusura automatica del terminale spenta, un terminale dell'agente lasciato a riposo non viene più seguito, ma Trama lo ricorda finché non viene chiuso. Alla sua chiusura rilascia i Task che l'agente vi aveva preso e ritira gli annunci in attesa di quel terminale.

## What should happen

Il Requisito dice che, con la chiusura automatica spenta, il terminale viene tolto dall'elenco dei terminali di Trama «e basta», e che la chiusura si attribuisce solo ai terminali di quell'elenco: così la chiusura di un terminale a riposo non rilascia nulla. Il Modello dice invece che chiudere un terminale dell'agente rilascia i Task che aveva preso.

## Chosen option

**Keep idle terminals until they close and rewrite the Requirement**

Il Requisito dei terminali viene riscritto: un terminale a riposo resta ricordato finché non viene chiuso, e la chiusura rilascia i Task presi e ritira gli annunci in attesa, come dice il Modello. Il comportamento del codice non cambia. Costo: una modifica del solo Requisito, da fare con la skill dei requisiti tecnici; nessuna modifica al codice o al Modello.
