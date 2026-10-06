---
status: approved
base:
  requirements/tech/agent-terminal.md: 6acc56b9b37772ea71a639a5f617c207056fe7c5b07929cc431bef8894e6fc9a
  requirements/rules/agent-terminal.md: 4d5718758e345e5b7efbe576820d33d52609ad07455c3331eb7110d7768a9133
delete: []
created: 2026-10-06T17:55:09.422Z
scanScope:
  - ref: requirements/rules#agent-terminal
    reason: changed
  - ref: requirements/tech#agent-terminal
    reason: changed
---
# Precisare che il marcatore di una finestra esterna sostituita rilascia i suoi Task e i suoi annunci

Il Drift nsd79ikm è stato risolto correggendo il codice con l'opzione «Rilasciare i Task della finestra sostituita al suo marcatore», che chiedeva anche di precisare i Requisiti. Oggi il codice, al marcatore di una finestra esterna sostituita mentre lavorava, rilascia i Task presi da quella finestra e ritira i suoi annunci, senza avvisi e senza cambiare lo stato dell'agente; i Requisiti dicono ancora che quel marcatore non conta.

Scelte fatte senza intervista (da verificare):
- In `tech#agent-terminal` il marcatore di una corsa sostituita da una finestra nuova si cancella e conta solo per ciò che appartiene a quel terminale; un marcatore di una corsa vecchia già finita o di un terminale che Trama non segue più per altri motivi resta senza effetto.
- In `rules#agent-terminal` la finestra sostituita non è più seguita per la fine del comando dell'agente, ma il suo marcatore rilascia i Task che quel terminale ha preso e ritira i suoi annunci, senza avvisi ntfy.
- Il Model non cambia: la Transition Taken by the agent → To do su terminal.COMMAND_ENDED già lo prevede.
