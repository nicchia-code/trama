---
technical: false
refs:
  - omp-chat-conversation
  - requirements/rules#omp-chat-conversation
  - requirements/quality#omp-chat-conversation
  - requirements/ui#omp-chat-conversation
  - requirements/tech#omp-chat-conversation/Waiting for the window
---
# Chat: scheda subito

Sul computer di lavoro del developer (macOS, con antivirus/EDR che ispeziona ogni avvio di processo e ogni accesso ai file) ogni operazione di omp Chat ha un ritardo, dalla comparsa di una chat al cambio di scheda. Questo Task rende la Machine `omp-chat-conversation` reattiva in tre punti: la scheda di un lavoro compare subito, la vista disegna solo ciò che cambia, e alla riapertura della finestra le conversazioni salvate non avviano tutte insieme un processo di omp ciascuna.

## Scheda subito, in avvio

Quando è finito, una conversazione di un lavoro (design, scan, Run, Resolve Drifts, Unify Drifts, import) mostra la sua scheda appena il lancio ha trovato omp e fatto ciò per cui `rules#agent-terminal` lo fa aspettare, prima che il processo di omp parta, come già fa Ask more. La scheda ha il nome della conversazione e diventa quella in vista senza prendere il focus, come all'apertura (`omp-chat-conversation`: la vista si mostra sulla scheda senza focus, cursore e tastiera restano dove erano). Fino a quando la sessione è aperta, la conversazione è nello stato di avvio di `ui#omp-chat-conversation`: mostra soltanto, al centro, il testo secondario `Starting omp…`; il campo del messaggio c'è, con `Send` disabilitato e senza `Stop`; la scheda non mostra nessun altro segno (quindi nemmeno il puntino del lavoro). Il messaggio dell'istruzione con l'etichetta `Trama` e la sua riga di allegato compaiono solo quando l'istruzione parte.

L'apertura (dall'avvio del processo alla sessione pronta a ricevere l'istruzione) ha ancora un solo limite di tempo per tutta l'apertura. Esiti:
- La sessione si apre: l'istruzione parte e la conversazione prosegue come oggi (Agent running, Run, annunci, Task presi, puntino del lavoro).
- omp non parte, non risponde in tempo o rifiuta la sessione: la scheda sparisce nello stesso passo in cui l'istruzione parte nel terminale di omp, come oggi e come con omp Chat spenta, con lo stesso annuncio e lo stesso lavoro già scritti al lancio, e l'avviso `ui#omp-chat` dà il motivo con le ultime righe dell'errore di omp. L'istruzione non si perde mai (`quality#omp-chat-conversation`).
- Il developer chiude la scheda mentre omp parte: la conversazione è in Agent running ma non in un turno (nessun prompt è ancora inviato), quindi si chiude senza conferma come per `developer.CLOSE_CHAT_CONVERSATION`, e Run, Task presi e annunci finiscono come per la chiusura del terminale; il processo che arriva dopo si ferma, come già fa `openHeld` per Ask more, e nessun processo resta orfano.

Prestazioni (`quality#omp-chat-conversation`): la scheda compare entro un attimo dal lancio; prima di lei nulla aspetta un processo, salvo, la prima volta nella finestra, la ricerca di omp e della sua versione (`tech#agent-launching`) e un aggiornamento di omp che un controllo in background ha trovato (`rules#agent-terminal`). Quella ricerca, l'aggiornamento in background e il programma e la versione tenuti per finestra appartengono ad altri Task della stessa Proposal: qui conta solo che l'apertura della scheda non aspetti `client.start`.

## La vista disegna solo ciò che cambia

Quando è finito, un pezzo nuovo della risposta dell'agente ridisegna soltanto il suo messaggio, e soltanto nella scheda in vista: non l'intera conversazione, né le conversazioni delle altre schede. I messaggi già completi non si analizzano di nuovo come Markdown; le schede nascoste non si disegnano finché non si mostrano (restano però intatti lo stato di apertura delle chiamate, lo scorrimento e il campo del messaggio di ogni scheda, come chiede `ui#omp-chat-conversation`). Il cambio di scheda non produce un doppio disegno: l'host non rimanda la lista `conversations` per una scelta che il webview ha già fatto da sé.

La storia che l'host manda a un webview nuovo, o che `session/load` riproduce alla ripresa, arriva in un solo messaggio per conversazione, alla fine del caricamento, non in un messaggio per ogni aggiornamento conservato (`tech#omp-chat-conversation/Waiting for the window`). Creare la vista non avvia nessun processo: il repository GitHub che la vista usa per i link è il valore che la finestra tiene (`quality#General`), non una lettura sincrona di git a ogni `webviewReady`; tenere quel valore è compito di un altro Task, questo prende solo quel valore.

## Ordine della ripresa

Alla riapertura della finestra (stato Waiting for the window), le conversazioni salvate riprendono in quest'ordine (`rules#omp-chat-conversation`, `tech#omp-chat-conversation/Waiting for the window`):
- Prima, tutte insieme, quelle salvate con `state: "running"` e un lavoro (l'agente lavorava per Trama), così il lavoro interrotto riprende il prima possibile.
- Poi le altre (`idle`, e Ask more salvata come `running`), nell'ordine delle loro schede, che è l'ordine salvato, una alla volta: ognuna parte solo quando la precedente ha dato `omp-acp.SESSION_RESUMED` o `omp-acp.SESSION_NOT_RESUMED`.
- La chiusura della finestra o lo spegnimento di omp Chat svuotano la coda senza avviare ciò che resta; le voci rimaste restano salvate.
- Un Task preso da una conversazione che aspetta il suo turno non si rilascia prima dell'esito della sua ripresa; ogni ripresa resta tutto o niente (nessuna mezza conversazione), e gli esiti, il messaggio fisso della ripresa e l'avviso per una sessione persa restano quelli di oggi.

Così la finestra non avvia mai un omp per ogni conversazione salvata nello stesso momento.

## Punti del codice
- `extension/src/host/omp-chat/conversations.ts:178-209` — `open` aspetta `client.start` (avvio, `initialize`, `session/new`) prima di `view.open`: la scheda va aperta prima, senza sessione, poi `setSession`; in caso di fallimento `view.close` prima di restituire `notOpened`
- `extension/src/host/omp-chat/conversations.ts:215-255` — `openHeld` (Ask more): il modello da seguire, scheda subito e processo fermato se la scheda è chiusa durante l'avvio
- `extension/src/host/omp-chat/conversations.ts:207` — `setWorking(…, true)` all'apertura: va dato solo a sessione aperta
- `extension/src/host/omp-chat/conversations.ts:322-355` — `resume` avvia con `Promise.all` un `omp acp` per ogni conversazione salvata: da dividere in lavori in corso insieme e coda per le altre
- `extension/src/host/omp-chat/conversations.ts:305-315` — `windowClosed`: deve svuotare anche la coda della ripresa
- `extension/src/host/main.ts:140-144` — cambio di `trama.ompChat`: lo spegnimento svuota la coda della ripresa
- `extension/src/host/agent.ts:765-801` — `launchAgent`: `ompBeforeLaunch`, overlay e canale delle domande prima di `openConversation`; al ritorno `false` il terminale si crea subito dopo
- `extension/src/host/omp-chat/view-model.ts:111-125` — `webviewReady`: chiama `githubRepo` (git sincrono) e riproduce la storia con un `postMessage` per aggiornamento
- `extension/src/host/omp-chat/view-model.ts:133-170` — `open` e `setSession`: `start.first` (il messaggio `Trama`) va mostrato solo a sessione aperta
- `extension/src/host/omp-chat/view-model.ts:274-278` — `selectConversation`: l'host rimanda `conversations` a ogni cambio di scheda (doppio disegno)
- `extension/src/host/omp-chat/view-model.ts:390-408` — `postConversations`: `starting` per una scheda senza sessione
- `extension/src/host/omp-chat/view-model.ts:428-458` — `subscribe`: ogni aggiornamento, anche quelli riprodotti, è un `conversationUpdate` a sé
- `extension/src/host/omp-chat/client.ts:263-267` — `sessionUpdate`: conserva e inoltra ogni aggiornamento uno per uno, anche durante `session/load`
- `extension/src/host/omp-chat/client.ts:532-535` — `onUpdate`: riproduce la storia conservata un aggiornamento alla volta
- `extension/src/webview/omp-chat/app.tsx:66-77` — `ChatApp` disegna ogni `Conversation`, anche delle schede nascoste, a ogni messaggio
- `extension/src/webview/omp-chat/app.tsx:20-23` — `receive`: ogni messaggio sostituisce lo stato e ridisegna tutto
- `extension/src/webview/omp-chat/conversation.tsx:211-214,235-254` — scorrimento e lista dei blocchi ridisegnati per intero, senza memoizzazione
- `extension/src/webview/omp-chat/conversation.tsx:74,116,149,172` — riga `Starting omp…` e `Send` disabilitato di oggi (Ask more), da estendere allo stato di avvio di un lavoro, al centro e senza `Stop`
- `extension/src/webview/omp-chat/blocks.tsx:64-70` — `AgentMessage` senza memoizzazione
- `extension/src/webview/markdown.tsx:668-671` — `Markdown` rianalizza il testo a ogni disegno
