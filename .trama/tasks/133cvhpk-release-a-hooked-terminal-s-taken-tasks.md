---
column: done
technical: false
refs:
  - task/Taken by the agent/time.QUIET_PERIOD_ELAPSED
  - requirements/tech#agent-hook
  - requirements/rules#task
drift: null
proposal: m8luoq0k
agent: false
created: 2026-10-09T20:04:26.403Z
finished: 2026-10-09T20:31:37.772Z
---
# Release a hooked terminal's taken Tasks when its quiet period elapses

Oggi un Task preso dal terminale di un agente con hook (omp) torna in To do solo quando l'hook dice che l'agente è a riposo, alla fine del comando o alla chiusura del terminale: se l'agente è interrotto, bloccato o ucciso senza che nessuno di questi arrivi, il Task resta preso per sempre e solo il developer può riprenderselo.

Quando è fatto:
- un Task preso dal terminale di un agente con hook torna in To do quando per quindici minuti quel terminale non ha mostrato attività, nello stesso momento in cui la quiete chiude il Run di quel terminale;
- conta come attività di quel terminale ogni comando di Trama dell'agente lanciato da lì, anche di sola lettura, e il segnale di vita del suo hook; l'attività di un altro terminale non conta;
- i quindici minuti non scorrono mentre un giro di domande è aperto, come per gli annunci e il Run;
- sono rilasciati solo i Task presi da quel terminale (e quelli presi senza un terminale noto, come per gli altri rilasci); i Task presi da altri terminali, dalla chat di Cursor o da un agente senza hook restano dove sono;
- lo stato del terminale non cambia: omp può essere ancora aperto e il terminale si riusa solo dopo la fine del comando.
