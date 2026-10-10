---
column: done
technical: false
refs:
  - task/Taken by the agent/time.QUIET_PERIOD_ELAPSED
  - requirements/rules#agent-terminal
  - requirements/tech#agent-hook
drift: null
proposal: null
agent: false
created: 2026-10-09T20:57:27.693Z
finished: 2026-10-09T21:53:10.071Z
---
# Release a hooked agent's taken Tasks after the quiet period in an external window too

Con omp avviato in una finestra del terminale esterno (launcher «external-terminal»), un Task che l'agente ha preso torna in To do quando per quindici minuti quella finestra non mostra attività: né un comando di Trama dell'agente né il segnale di vita del suo hook, come già accade nel terminale integrato e nella sua scheda. Vale anche per una finestra esterna non più seguita perché sostituita da una nuova. Il periodo non scorre mentre un round di domande è aperto. I Task presi da finestre di agenti senza hook restano dove sono. Oggi la quiete rilascia i Task solo dei terminali integrati: in una finestra esterna chiusa a mano, o con omp interrotto, i Task di omp restano presi.
