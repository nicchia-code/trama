---
column: done
technical: false
refs:
  - drift
  - drift/Open/agent.REPLACE_DRIFT_PROPOSAL
  - requirements/rules#drift
  - requirements/tech#drift
drift: null
proposal: 37d8rz9w
agent: false
created: 2026-10-07T17:03:48.624Z
finished: 2026-10-07T17:11:16.604Z
---
# Attach to a Drift only a Draft or open Proposal not held by another open Drift

Oggi un nuovo Drift accetta come Proposal allegata qualsiasi Proposal esistente, anche approvata, rifiutata, scartata o già allegata a un altro Drift aperto; il rimpiazzo della Proposal obsoleta rifiuta solo una nuova Proposal rifiutata o scartata, e accetta quindi una Proposal approvata o già allegata a un altro Drift aperto.

Quando è fatto:
- Creare un Drift con una Proposal allegata riesce solo se la Proposal è una Draft o è aperta e nessun altro Drift aperto la nomina; altrimenti la creazione è rifiutata, senza creare nulla, e il messaggio dice perché: approvata, rifiutata, scartata, oppure allegata al Drift indicato.
- Una Draft è accettata, perché l'agente la allega appena la crea, prima di consegnarla.
- Rimpiazzare la Proposal obsoleta di un Drift segue la stessa regola per la nuova Proposal: non approvata e non allegata a un altro Drift aperto; può essere una Draft. Restano le condizioni già esistenti (Drift aperto, Proposal allegata aperta e obsoleta, nuova Proposal esistente e diversa, non rifiutata né scartata).
- Una Proposal è allegata a un Drift aperto quando un Drift aperto la nomina: un Drift risolto non la trattiene più, e la stessa Proposal può allora essere allegata a un altro Drift.
