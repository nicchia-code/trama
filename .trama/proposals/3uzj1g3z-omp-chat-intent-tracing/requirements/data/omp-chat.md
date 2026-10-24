---
description: "Usa quando salvi o leggi le conversazioni di omp Chat da riprendere dopo una ricarica."
---
# omp Chat

## omp-chat-conversation
- Le conversazioni da riprendere stanno in `ExtensionContext.workspaceState`, mai nel repository, sotto la chiave `trama.ompChat.conversations`: un elenco, nell'ordine delle schede, di voci con `id` (identità della conversazione, uguale a `TRAMA_TERMINAL`), `name` (il nome della scheda), `sessionId` (l'identità della sessione di omp), `state` (`running` o `idle`), `args` (gli argomenti con cui il processo è partito, senza il percorso di `omp`), `env` (solo le variabili di Trama: `TRAMA_AGENT`, `TRAMA_TERMINAL`, `TRAMA_JOB`, `TRAMA_ADVISOR_SCANNER` quando c'è, e `PI_INTENT_TRACING` con il valore dato all'apertura), `job` (il lavoro del registro dei lavori, con tipo, nome e annuncio, oppure assente per Quick Task e Ask more) e `openedAt` (istante ISO 8601).
- Una voce si scrive quando la conversazione riceve la sua `sessionId`, si aggiorna a ogni cambio fra `running` e `idle` e si cancella quando la conversazione arriva in Closed o la ripresa fallisce. Una voce illeggibile o senza `sessionId` si cancella all'attivazione senza tentare la ripresa, e il suo lavoro, se c'era, finisce come per una ripresa fallita.
- Nessun messaggio della conversazione si salva in Trama: la storia la conserva omp nella sua sessione, e torna con `session/load`.
