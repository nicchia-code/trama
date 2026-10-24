# Requirements: Dati, omp Chat

Usa quando salvi o leggi le conversazioni di omp Chat, General compresa, da riprendere dopo una ricarica.

## omp-chat-conversation

- Le conversazioni da riprendere stanno in `ExtensionContext.workspaceState`, mai nel repository, sotto la chiave `trama.ompChat.conversations`: un elenco, nell'ordine delle schede, di voci con `id` (identità della conversazione, uguale a `TRAMA_TERMINAL`), `name` (il nome della scheda), `sessionId` (l'identità della sessione di omp), `state` (`running` o `idle`), `args` (gli argomenti con cui il processo è partito, senza il percorso di `omp`), `env` (solo le variabili di Trama: `TRAMA_AGENT`, `TRAMA_TERMINAL`, `TRAMA_JOB`, `TRAMA_ADVISOR_SCANNER` quando c'è, e `PI_INTENT_TRACING` con il valore dato all'apertura), `job` (il lavoro del registro dei lavori, con tipo, nome e annuncio, oppure assente per Ask more e per una conversazione `Quick` salvata prima che Add Quick Task sparisse) e `openedAt` (istante ISO 8601). General non sta in questo elenco (`data#omp-chat-general`).
- Una voce si scrive quando la conversazione riceve la sua `sessionId`, si aggiorna a ogni cambio fra `running` e `idle` e si cancella quando la conversazione arriva in Closed o la ripresa fallisce. Una voce illeggibile o senza `sessionId` si cancella all'attivazione senza tentare la ripresa, e il suo lavoro, se c'era, finisce come per una ripresa fallita.
- Nessun messaggio della conversazione si salva in Trama: la storia la conserva omp nella sua sessione, e torna con `session/load`.

## omp-chat-general

- La General da riprendere sta in `ExtensionContext.workspaceState`, mai nel repository, sotto la chiave `trama.ompChat.general`: una sola voce per area di lavoro con `id` (uguale a `TRAMA_TERMINAL` del suo processo), `sessionId`, `args` (senza il percorso di `omp`), `env` (le stesse variabili salvate delle altre conversazioni, senza `TRAMA_JOB`) e `startedAt` (istante ISO 8601 dell'avvio della sessione). Non ha `name`, `state` né `job`: si riprende sempre ferma.
- La voce si scrive quando la sessione di General è aperta (sessione nuova o riaperta) e si cancella alla pulizia, quando omp Chat non è in uso all'attivazione o mentre General sparisce, quando General resta dopo lo spegnimento di omp Chat e quando la ripresa fallisce (prima della sessione nuova, che scrive la sua). Un omp che si chiude da solo non la cancella: serve a riaprire la sessione al messaggio seguente. Una voce illeggibile o senza `sessionId` si cancella all'attivazione e General parte con una sessione nuova.
- Nessun messaggio di General si salva in Trama: la storia la conserva omp nella sua sessione, e torna con `session/load`.
