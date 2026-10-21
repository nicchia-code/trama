---
technical: false
refs:
  - agent-hook
  - requirements/tech#agent-hook
---
# Hook start di omp

L'hook di omp dice a Trama, una sola volta per terminale, quale processo è l'agente: l'Event `agent-hook.STARTED`. Alla prima `session_start` della sessione principale (`ctx.agent.kind` uguale a `"main"`), o, se omp non la dà prima del primo turno, al primo `agent_start` della sessione principale, il modulo `extension/src/omp/trama-hook.ts` esegue con `pi.exec`, con timeout di 3 secondi e ignorando ogni errore, `trama hook start <pid>` con `process.pid` di omp. I sotto-agenti non mandano nulla, e senza `ctx.agent` non si manda nulla. Non è un segnale di vita: non si ripete.

Il nuovo comando `trama hook start <pid>` usa `TRAMA_TERMINAL` come identità, trova l'editor come `trama hook idle`, gli manda `agent-started` con il terminale e il processo e finisce subito; esce con 0 anche senza editor, senza progetto, senza `TRAMA_TERMINAL` o con un pid che non è un intero positivo (allora non manda nulla), con 2 solo per un uso sbagliato, e ha il suo `--help` come gli altri hook. Se il segnale si perde, il controllo di esecuzione guarda il processo della shell del terminale. Il rifiuto dello strumento di domande e `trama hook idle` restano come sono.
