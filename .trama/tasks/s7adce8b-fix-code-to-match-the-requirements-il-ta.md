---
column: done
technical: true
refs:
  - requirements/tech#General
drift: j6zdkwmh
proposal: null
agent: false
created: 2026-10-07T05:40:16.614Z
finished: 2026-10-07T05:41:47.470Z
---
# Fix code to match the Requirements: Il Task chiede due righe per scansioni che i Requisiti hanno tolto

## What happens

Il codice manda ancora la **scansione dopo l'unione** di un giro e la **scansione mirata nel worktree**, con righe che non le distinguono da uno scan di Feature o da una scansione dopo l'approvazione. Il Task chiede di aggiungere a ciascuna una frase, come aveva deciso il Drift da cui nasce.

## What should happen

I Requisiti vigenti hanno **tolto il multi-branch e il giro di worktree** (`tech#General`): non c'è più una scansione dopo l'unione né una nel worktree. `rules#worktree-round` non esiste più, `rules#agent-terminal` non ha alcuna riga per queste due scansioni e `rules#announcement` non ha il titolo `Scan after merge`. Aggiungere le due frasi scriverebbe istruzioni che nessun Requisito prevede, per codice che altri Task (rimozione del giro di worktree) devono togliere.

## Chosen option

**Chiudere il Task senza cambiare il codice**

Il Task è superato: la rimozione del giro di worktree, già pianificata nei Task della Proposal g0kh74u5, toglie le due istruzioni e il problema sparisce con loro. Nessun costo nel codice; il developer sposta il Task in Done o lo scarta.

## Note

chiiudi il task tu in autonomia

## Where in the code

extension/src/host/prompts.ts (buildScanPrompt, buildApprovalScanPrompt); extension/src/host/acceptance.ts; extension/src/host/agent.ts
