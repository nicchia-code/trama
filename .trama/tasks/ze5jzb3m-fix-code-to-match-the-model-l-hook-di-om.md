---
column: done
technical: false
refs:
  - agent-hook.IDLE
  - requirements/tech#agent-hook
drift: 6zoficqr
proposal: null
agent: false
created: 2026-10-10T14:15:26.857Z
finished: 2026-10-10T15:21:09.804Z
---
# Fix code to match the Model: L'hook di omp continua a inviare segnali di vita

## What happens

L'hook di omp invia un segnale di vita all'inizio del lavoro e poi ogni cinque minuti, anche per i sotto-agenti. La riga di comando accetta ancora trama agent-event alive e l'editor tratta agent-alive come attività dell'agente. Non si limita quindi a notificare la conclusione della sessione principale.

## What should happen

L'hook di omp deve riferire soltanto la fine del lavoro principale tramite session_stop e session_shutdown, con le condizioni previste per distinguere i sotto-agenti. Non usa agent_start, agent_end, timer o segnali di vita. trama agent-event alive è rimosso e un agent-alive proveniente da un hook vecchio è ignorato dall'editor.

## Chosen option

**Limitare l'hook ai segnali di fine**

Eliminare l'emissione dei segnali di vita e i relativi timer, rimuovere il comando alive e ignorare i vecchi messaggi agent-alive. Conservare le notifiche di fine della sessione principale con timeout e gestione degli errori previsti. L'agente viene seguito tramite i segnali di conclusione, la fine del comando e la chiusura, senza un protocollo di vitalità aggiuntivo.

## Where in the code

extension/src/omp/trama-hook.ts: startHeartbeat, stopHeartbeat; src/cli/main.ts: runAgentEvent; src/core/question-channel.ts: sendAgentAlive, ricezione agent-alive; extension/src/host/questions.ts: onAgentAlive
