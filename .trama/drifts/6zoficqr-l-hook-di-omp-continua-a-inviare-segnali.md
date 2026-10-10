---
status: resolved
resolution: fix-code
refs:
  - agent-hook.IDLE
  - requirements/tech#agent-hook
proposal: null
task: ze5jzb3m
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T12:50:14.400Z
---
# L'hook di omp continua a inviare segnali di vita

## What happens

L'hook di omp invia un segnale di vita all'inizio del lavoro e poi ogni cinque minuti, anche per i sotto-agenti. La riga di comando accetta ancora trama agent-event alive e l'editor tratta agent-alive come attività dell'agente. Non si limita quindi a notificare la conclusione della sessione principale.

## What should happen

L'hook di omp deve riferire soltanto la fine del lavoro principale tramite session_stop e session_shutdown, con le condizioni previste per distinguere i sotto-agenti. Non usa agent_start, agent_end, timer o segnali di vita. trama agent-event alive è rimosso e un agent-alive proveniente da un hook vecchio è ignorato dall'editor.

## Fix options

### Limitare l'hook ai segnali di fine

Eliminare l'emissione dei segnali di vita e i relativi timer, rimuovere il comando alive e ignorare i vecchi messaggi agent-alive. Conservare le notifiche di fine della sessione principale con timeout e gestione degli errori previsti. L'agente viene seguito tramite i segnali di conclusione, la fine del comando e la chiusura, senza un protocollo di vitalità aggiuntivo.

### Conservare un protocollo di vitalità dichiarato

Rivedere i Requisiti per mantenere i segnali di vita, precisando che cosa rappresentano quelli dei sotto-agenti e quali effetti possono avere senza concludere una corsa. Mantiene il protocollo attuale ma richiede una nuova decisione su eventi, timer e messaggi accettati; non realizza la rimozione esplicitamente approvata.

## Where in the code

extension/src/omp/trama-hook.ts: startHeartbeat, stopHeartbeat; src/cli/main.ts: runAgentEvent; src/core/question-channel.ts: sendAgentAlive, ricezione agent-alive; extension/src/host/questions.ts: onAgentAlive
