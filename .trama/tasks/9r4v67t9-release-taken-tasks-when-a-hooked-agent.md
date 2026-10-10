---
column: done
technical: false
refs:
  - agent-terminal/Agent running/terminal.CLOSED
  - agent-terminal/Agent idle/terminal.CLOSED
  - requirements/tech#agent-hook
  - requirements/rules#agent-terminal
drift: null
proposal: null
agent: false
created: 2026-10-09T11:56:30.636Z
finished: 2026-10-09T12:17:29.854Z
---
# Release taken Tasks when a hooked agent terminal is closed

Con un agente che ha un hook (omp), la chiusura del terminale integrato (o della sua scheda) in cui lavora deve chiudere la corsa del tutto: oltre a finire il job e ritirare gli annunci in attesa, come già accade, deve rilasciare i Task che quel terminale aveva preso, che tornano in To do.

Oggi per un terminale con hook la fine del comando e la quiete non rilasciano nulla, e la chiusura del terminale nemmeno: un Task preso da omp resta In progress dopo che il developer ha chiuso il terminale, finché non lo riprende a mano.

Fatto quando: chiudere il terminale di una corsa di omp riporta in To do i Task che aveva preso, come `agent-hook.IDLE`; la chiusura di un altro terminale non rilascia nulla.
