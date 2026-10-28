---
technical: false
refs:
  - omp-chat-conversation
  - requirements/rules#omp-chat-conversation
  - requirements/quality#omp-chat-conversation
---
# Un solo launcher per istruzione

Ogni istruzione apre esattamente un posto in cui lavora il suo agente, per ogni lavoro lanciato da Trama e per Ask more. Oggi lo sviluppatore vede, già all'apertura della scheda di una richiesta con + Add Work Item e senza alcun avviso di ripiego, sia una conversazione omp Chat sia un terminale omp per la stessa istruzione: è un doppio lancio vero, non il ripiego. La lettura statica del codice non ha trovato un percorso che lanci due volte, quindi la causa va riprodotta (per esempio nell'Extension Development Host) prima di correggerla. La causa specifica della richiesta scritta è trattata dal Task di `design-request`; questo Task deve garantire la regola nel codice di lancio condiviso, così che nessun chiamante possa aprire entrambi.

A lavoro finito vale:

- Un solo launcher per istruzione, per ogni lavoro (design, setup, handoff, scan, Run e ogni Run di una sequenza per modello, Resolve Drifts, Unify Drifts, import, PR Check, refinement, merge) e per Ask more. Con omp Chat in uso l'istruzione apre esattamente una conversazione e nessun terminale; con omp Chat spento esattamente un terminale e nessuna conversazione.
- Un terminale per la stessa istruzione si apre solo dopo che la sua conversazione non è riuscita a partire, con l'avviso di `ui#omp-chat` («omp Chat could not start omp …; the job runs in a terminal», come oggi), e allora nella vista non resta nessuna conversazione di quell'istruzione, né salvata né in esecuzione.
- Una conversazione che si è aperta non è mai seguita da un terminale per la stessa istruzione, e un gesto dello sviluppatore lancia la sua istruzione una volta sola, mai una volta per launcher.
- Il limite di tempo per l'avvio resta 30 s per l'intera apertura, dall'avvio del processo alla sessione aperta (`tech#omp-chat-conversation`); un fallimento certo prima di allora (omp mancante, errore di spawn, processo uscito, sessione rifiutata) ripiega subito sul terminale, senza attese aggiuntive.

Vanno verificati tutti i percorsi di lancio, cioè ogni chiamante di `launchAgent` e `openFocusedTerminal` di Ask more, per ogni tipo di lavoro, e corretto ogni percorso che può aprire entrambi.

Affidabilità: un'istruzione non esegue mai due agenti. Serve un test dell'host con `bun:test` che lancia ogni tipo di lavoro tramite `launchAgent` e verifica: con omp Chat in uso una conversazione e nessun terminale; con avvio fallito un terminale e nessuna conversazione rimasta; con omp Chat spento un terminale. In `docs/uat.md` va aggiunta l'accettazione: inviare una richiesta di design scritta con omp Chat attivo e vedere solo la conversazione `Design`, senza terminale `Design`.

Punti di codice noti:

- `extension/src/host/agent.ts:146-149` — `configuredOmpChat`/`ompChatInUse`, scelta del launcher.
- `extension/src/host/agent.ts:783-801` — ramo conversazione di `launchAgent`.
- `extension/src/host/agent.ts:802-834` — ramo terminale e ripiego di `launchAgent`.
- `extension/src/host/agent.ts:169-178` — `openConversation`.
- `extension/src/host/agent.ts:844-889` — `openFocusedTerminal` (Ask more).
- `extension/src/host/omp-chat/conversations.ts:178-209` — `open` della conversazione.
- `extension/src/host/omp-chat/client.ts:641-674` — avvio con limite di 30 s.
- `extension/src/host/controller.ts:1439` e `:2475` — altri chiamanti di `launchAgent`.
- `extension/src/host/design-requests.ts:134-147` e `:189-202` — `send` e `deliver` della richiesta scritta.
- `test/host-agent-terminals.test.ts:3173` e `:3186` — test esistenti su omp Chat spento e avvio fallito.
- `test/host-design-requests.test.ts:383-392` — lancio sostituito da stub nei test delle richieste.
