---
column: done
technical: true
refs:
  - requirements/tech#agent-hook
  - requirements/tech#announcement
  - requirements/rules#agent-terminal
drift: null
proposal: m8luoq0k
agent: false
created: 2026-10-09T20:04:09.705Z
finished: 2026-10-09T20:28:32.150Z
---
# Send omp hook heartbeat and main-session idle, report agent read-only commands as activity

Quando è finito deve valere quanto segue.

- **Fine del lavoro solo dalla sessione principale.** L'hook di omp manda `trama agent-event idle` solo per la sessione principale (`ctx.agent.kind` uguale a `"main"`), a `session_stop` e a `session_shutdown`. La chiusura della sessione di un sotto-agente, anche quando omp lo parcheggia dopo i suoi minuti di inattività, non manda mai nulla; senza `ctx.agent` il `session_shutdown` non manda nulla e resta solo `session_stop`. Oggi ogni sessione che si chiude, sotto-agenti compresi, dice che l'agente è a riposo e chiude la corsa mentre l'agente principale lavora ancora.
- **Segnale di vita.** In ogni sessione, principale o sotto-agente, a `agent_start` l'hook manda subito `trama agent-event alive` e poi ogni 5 minuti, fermandosi a `agent_end` (e comunque alla chiusura della sessione). Ogni battito ha un timeout di 3 secondi, ignora gli errori, non aspetta il precedente e non blocca mai omp. L'agente non lo manda mai da sé.
- **Comando `trama agent-event alive`.** Come `idle`, prende l'identità da `TRAMA_TERMINAL`, trova l'editor del progetto come `trama ask` e gli manda il messaggio `agent-alive` con il terminale, poi finisce subito; esce con 0 anche senza editor, senza progetto o senza `TRAMA_TERMINAL`, con 2 solo per un uso sbagliato, e non scrive nulla su disco. L'editor riceve `agent-alive` come attività di quel solo terminale; l'aiuto del comando nomina entrambe le forme.
- **Comandi di sola lettura come attività.** Un comando `trama` di sola lettura riuscito, lanciato con `TRAMA_TERMINAL` o dall'agente della chat di Cursor (`CURSOR_AGENT=1`), è riferito all'editor come attività, per la stessa via dei comandi che cambiano qualcosa e con il terminale o la chat da cui viene; lanciato dal developer fuori da questi casi non è riferito. Non scrive mai i file degli annunci né il loro `touched`, e senza editor non succede nulla né il comando fallisce. Oggi sono riferiti solo i comandi che cambiano qualcosa.

Come l'editor conta queste attività nella quiete di annunci, job e Task presi non fa parte di questo Task.
