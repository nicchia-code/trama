---
column: done
technical: false
refs:
  - drift-resolution
  - requirements/data#drift-resolution
  - requirements/rules#drift-resolution
  - requirements/tech#drift-resolution
drift: null
proposal: nr388hz3
agent: false
created: 2026-10-23T14:00:42.300Z
finished: 2026-10-23T14:23:04.470Z
---
# Lavori solo per terminale

I lavori (Run, scan, risoluzioni, unificazioni) seguiti dalla Drift resolution si riconoscono solo dall'identità del terminale: una conversazione di omp Chat ha quella del terminale che sostituisce. Un lavoro è in corso dal momento in cui l'istruzione è scritta nel terminale o mandata alla conversazione di omp Chat. La fine segue hook a riposo, fine del comando scritto da Trama (o del processo della conversazione), chiusura del terminale (o della conversazione) e il controllo di esecuzione; non esistono più segnali di fine della chat (fine turno, interruzione, chiusura conversazione) in Running tasks, Resolving e Unifying.

`Running tasks/time.CHECK_DUE` chiude l'ultimo Run solo quando il suo agente di omp non c'è più: sparisce il caso del Run della chat non legato a nessuna conversazione entro un minuto, e con esso l'istante di partenza conservato per quel controllo. In `Answering a prepared question`, `question-round.ROUND_CLOSED` con istruzione che non parte davvero lascia il Drift aperto con la domanda pronta, senza più parlare di testo lasciato nella chat o negli appunti; lo stesso vale per le frasi degli avvisi e dei commenti. L'Async Drift Resolver non nomina più agenti diversi.

`TRAMA_JOB` viene solo dall'ambiente dei terminali di Trama e dei processi di omp Chat: `trama drift new` e `trama comparison move <id> delivered` lo leggono dall'ambiente, senza alcun completamento di comandi da un hook. Lo stato in memoria di un lavoro contiene identità, terminale e Drift raccolto; i Drift nuovi hanno `job` da `TRAMA_JOB` quando c'è.

Codice da togliere in `extension/src/host/drift-resolution.ts`: l'import da `src/core/cursor-chat`, il posto `{ chat: "cursor" }` di `JobPlace` e i campi `conversation`/`announcement`/`advisor`/`started` legati alla chat di `Job`, `chatTurns`, `chatTurnStarted`/`chatTurnEnded`, il ramo della chat di `followsAgent`, `chatJobSendStarted`, `pendingChats`, `takePendingChat`, `bindChatJobFor`/`bindChatJob`, `endChatJobs(For)`, `chatStateOf`, `publishChatStateNow`, `CHAT_BIND_WAIT_MS` ed `endUnboundChatJobs`, e tutto il blocco dell'Advisor della chat (circa righe 341-794: `chatAdvisorEvent`, `watchedAgent`, `FinalReviewMissing`, `jobFinalReviewMissing`, `setChatStatePublisher`, `receiveAdvisorReview`…). Vanno tolti anche i chiamanti di queste funzioni, in `extension/src/host/agent.ts` (import e uso nel gestore degli eventi della chat, chiamata di `endUnboundChatJobs` nel controllo di esecuzione) e `extension/src/host/announcements.ts`. In `test/host-drift-resolution.test.ts` si eliminano i casi dei lavori della chat, del legame alla conversazione, del controllo dopo un minuto e dell'Advisor della chat; restano quelli dei lavori del terminale.
