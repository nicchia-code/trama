---
status: rejected
base:
  model-changes/proposal.md: 3eef40825e6c721233f988f40e85359fba3daceb705f5c0f607fd3c1217edf1a
  requirements/rules/decisions.md: 143f584c5133d8ae5a89c5d52242e81fd3f3a197863b75809b9cb48f60ab5df5
delete: []
created: 2026-10-09T21:00:20.614Z
---
# Refuse resolutions that fix the code of a Drift whose Model elements are gone

La scansione ha trovato che il codice rifiuta, in tre momenti, una risoluzione che chiede di correggere il codice di un Drift i cui elementi del Modello non esistono più (nemmeno un contenitore): quando l'agente registra la decisione, quando consegna la risoluzione e quando il developer la approva (la risoluzione aperta è bloccata). Il Modello della Proposal e `rules#proposal` non elencano nessuno di questi rifiuti, mentre il Drift già rifiuta la stessa correzione fatta dal developer. Senza di loro l'approvazione risolverebbe i Drift a metà.

Scelte fatte senza intervista, da controllare:
- Il caso entra come condizione delle tre Transizioni esistenti (EDIT_PROPOSAL e SUBMIT_PROPOSAL della Draft, blocco dello Stato Open); nessuno Stato o Evento nuovo.
- Come fa il codice: la registrazione guarda il Modello attuale, la consegna e l'approvazione il Modello con la risoluzione applicata.
- La risoluzione bloccata va riscritta con Resolve Drifts: il developer non può forzarla.

## Feedback

Drift ux20voo4 resolved by Proposal b4duwb4w
