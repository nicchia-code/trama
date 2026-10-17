---
status: resolved
resolution: fix-code
refs:
  - panel/Board
proposal: null
task: 8uviisdb
origin: null
critical: false
option: 1
note: null
resolvedBy: quuym71o
created: 2026-10-17T12:58:11.959Z
---
# Motivi di Approve e Dismiss Drift nascosti dal motivo di attesa

## What happens

Una Proposal consegnata il cui agente sta ancora finendo il turno mostra come unico motivo di Approve «The agent is still finishing», anche quando la Proposal è obsoleta, ha file non registrati o rende il Modello non valido: il developer non vede perché non può approvarla. Lo stesso vale per Dismiss Drift: su un Drift che sta in una risoluzione, o mentre un agente risolve i Drift, il motivo di attesa del turno nasconde gli altri.

## What should happen

Il Requisito dice che il motivo di attesa del turno viene **prima** di ogni altro motivo dello stesso pulsante: va messo in testa, senza sostituire gli altri. Per Run la Board già mostra tutti i motivi quando ne valgono più d'uno.

## Fix options

### Mostrare tutti i motivi, quello del turno per primo

Il pulsante resta disabilitato come oggi, ma il tooltip e la descrizione accessibile danno prima «The agent is still finishing» e poi tutti gli altri motivi che valgono per quel pulsante, nello stesso testo già usato per Run. Nessun dato cambia. Costo: piccolo, si toccano il calcolo dei motivi di Approve e di Dismiss Drift e i loro test.

### Calcolare i motivi di ogni pulsante in un solo punto

Un'unica funzione raccoglie, per Approve, Reject e Dismiss Drift, tutti i motivi nell'ordine del Requisito, e la Board la usa per tutti e tre i pulsanti. Costo: più lavoro, perché si ritocca il modo in cui la Board compone i motivi di ogni pulsante di scheda, ma non ci sono più due percorsi che possono divergere.

## Where in the code

extension/src/webview/board/logic.ts (proposalCard: blocker, rejectBlocker; approveBlocker); extension/src/webview/dismiss.ts (dismissBlocker: il ritorno anticipato sul motivo di attesa del turno)
