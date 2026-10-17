---
column: done
technical: false
refs:
  - panel/Board
drift: 5jibqmcm
proposal: null
agent: false
created: 2026-10-17T13:11:41.957Z
finished: 2026-10-17T13:55:11.171Z
---
# Fix code to match the Model: Motivi di Approve e Dismiss Drift nascosti dal motivo di attesa

## What happens

Una Proposal consegnata il cui agente sta ancora finendo il turno mostra come unico motivo di Approve «The agent is still finishing», anche quando la Proposal è obsoleta, ha file non registrati o rende il Modello non valido: il developer non vede perché non può approvarla. Lo stesso vale per Dismiss Drift: su un Drift che sta in una risoluzione, o mentre un agente risolve i Drift, il motivo di attesa del turno nasconde gli altri.

## What should happen

Il Requisito dice che il motivo di attesa del turno viene **prima** di ogni altro motivo dello stesso pulsante: va messo in testa, senza sostituire gli altri. Per Run la Board già mostra tutti i motivi quando ne valgono più d'uno.

## Chosen option

**Mostrare tutti i motivi, quello del turno per primo**

Il pulsante resta disabilitato come oggi, ma il tooltip e la descrizione accessibile danno prima «The agent is still finishing» e poi tutti gli altri motivi che valgono per quel pulsante, nello stesso testo già usato per Run. Nessun dato cambia. Costo: piccolo, si toccano il calcolo dei motivi di Approve e di Dismiss Drift e i loro test.

## Where in the code

extension/src/webview/board/logic.ts (proposalCard: blocker, rejectBlocker; approveBlocker); extension/src/webview/dismiss.ts (dismissBlocker: il ritorno anticipato sul motivo di attesa del turno)
