---
technical: true
refs:
  - requirements/data#announcement
  - requirements/rules#announcement
  - requirements/tech#announcement
---
# Annunci solo da terminale

Un annuncio appartiene soltanto a un terminale di Trama: i campi `chat` e `conversation` spariscono dal file `announcements/<id>.md` e dal tipo `Announcement`. Un file che ha ancora `chat` o `conversation` (scritto quando c'era la chat di Cursor) è un errore di lettura come ogni annuncio non valido; non viene convertito né cancellato da Trama.

`trama announcement new` (anche con `kind: check`) è accettato solo con `TRAMA_TERMINAL` nell'ambiente, che copia in `terminal`; una conversazione di omp Chat ha il `TRAMA_TERMINAL` del terminale che sostituisce. Senza la variabile il comando è rifiutato con un errore che dice che solo un agente avviato da Trama può annunciare, non scrive nulla e fallisce come ogni comando rifiutato. `trama proposal new` senza `TRAMA_TERMINAL` crea la Proposal senza un annuncio proprio e senza errore. Il concetto di «chat del progetto» sparisce. Gli annunci che l'estensione scrive al lancio (design, Resolve Drifts, scan, import) appartengono sempre al terminale in cui ne scrive l'istruzione, o a quello che la conversazione di omp Chat sostituisce: nessun ramo `chat: cursor` né legame successivo alla conversazione.

Codice da togliere o cambiare (indicazioni): in `src/core/announcements.ts` `Chat`, `CHATS`, `CURSOR_AGENT_ENV`, `CHAT_ENV`, `originFromEnv` (l'origine diventa solo il terminale), `conversationField` e la lettura di `chat`/`conversation`, la scrittura di questi campi, i rami per conversazione in `createAnnouncement`/`announce` (presa del controllo di scan solo per terminale), `ownedBy` solo per terminale, `bindConversation`; `declareNote` va solo per terminale. In `src/cli/main.ts` e `src/cli/context.ts` l'origine e i suoi commenti non nominano più `CURSOR_AGENT`; il rifiuto senza terminale sta nel comando `announcement new` (`src/cli/commands/announcement.ts`) e nella creazione dell'annuncio di `proposal new` (`src/cli/commands/proposal.ts` / core), che lo salta in silenzio. Gli annunci di lancio scritti con `chat: cursor` in `extension/src/host/agent.ts` e `extension/src/host/drift-resolution.ts` diventano solo con `terminal`.

Test: aggiornare `test/announcements.test.ts` e `test/workflow.test.ts` (rifiuto senza `TRAMA_TERMINAL`, `proposal new` senza annuncio, file con `chat`/`conversation` come errore di lettura) e togliere i casi con `chat: cursor` o `conversation` dai test che li usano.
