---
column: done
technical: false
refs:
  - agent-terminal/Agent running
  - agent-terminal/Closed
  - agent-hook.IDLE
  - terminal.COMMAND_ENDED
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
  - requirements/quality#agent-terminal
drift: null
proposal: u064bqz0
agent: false
created: 2026-10-10T12:49:29.739Z
finished: 2026-10-10T14:42:11.373Z
---
# Chiudere automaticamente il terminale quando l'agente ha finito

L'impostazione utente trama.autoExit è accesa per default. Quando un agente del terminale conclude il lavoro tramite agent-hook.IDLE, oppure termina il comando inviato da Trama senza un hook precedente, il suo terminale passa da Agent running a Closed e sparisce senza avvisi, nell'area dei terminali come nella scheda dell'editor e per qualsiasi istruzione. La chiusura riguarda soltanto quel terminale, non blocca l'editor e non fallisce se è già chiuso. Run, Task presi e annunci non sono conclusi una seconda volta dalla chiusura che segue il segnale di fine. Con autoExit spento il terminale rimane aperto in Agent idle; le chat non sono mai chiuse automaticamente.
