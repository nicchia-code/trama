---
column: done
technical: false
refs:
  - omp-chat-general
  - omp-acp
  - developer.CLEAR_GENERAL
  - developer.SEND_CHAT_MESSAGE
  - developer.INSTALL_OMP
  - requirements/rules#omp-chat-general
  - requirements/tech#omp-chat-general
  - requirements/data#omp-chat-general
  - requirements/quality#omp-chat-conversation
drift: null
proposal: rqs3fipe
agent: false
created: 2026-10-23T20:44:43.090Z
finished: 2026-10-24T06:10:27.099Z
---
# Conversazione General nell'host

A Task finito, ogni finestra con una cartella aperta, mentre omp Chat è in uso, ha la sua conversazione General: un omp libero, senza istruzione di Trama, che vive nell'host dell'estensione secondo tutti gli stati e le transizioni della Machine `omp-chat-general`, con la logica pura in `src/core` (accanto a `src/core/omp-chat-conversation.ts` e `src/core/omp-chat-view.ts`) e i suoi test `bun:test`.

## Quando c'è e quando parte
- General c'è quando omp Chat è in uso e la finestra ha una cartella, anche se non è un progetto Trama; lavora nella cartella scelta dal pannello (con più cartelle, la stessa). Una sola General per finestra, al più un processo alla volta. Una finestra senza cartella non ha General né processo, e la vista resta in `omp-chat/Empty`.
- Il suo omp parte all'attivazione dell'estensione (Absent → Starting con `editor.SETTINGS_CHANGED`, anche all'apertura della finestra, senza una General salvata da riprendere), quando omp Chat torna in uso (listener di `trama.ompChat` in `extension/src/host/main.ts`) e subito dopo una pulizia. Dopo un avvio fallito o un omp chiuso da solo riparte solo al messaggio seguente del developer: Trama non riprova mai da sé.
- General non apre mai la barra laterale secondaria e non prende mai il focus. Lasciando Absent, e quando torna ripresa o ripartita alla riapertura della finestra, la Machine emette SHOWN; arrivando in Absent emette REMOVED.

## Processo, argomenti, ambiente, sessione
- Riusa il client ACP e le conversazioni di `extension/src/host/omp-chat/` (stesso `spawn` senza shell, SDK, messaggi di sessione, moduli, permessi, Stop, steering, cambio di modello; una domanda dello strumento di omp compare come modulo).
- Processo: `<omp> [--model <m>] acp [--yolo]`, senza `--hook`, `--advisor`, `--config`, `--slow`, senza l'overlay dei lavori, senza esclusione dei file di istruzioni, anche con quelle impostazioni accese. `--model` solo con `trama.analysis` non vuoto (tolti gli spazi, letto a ogni avvio; il modello di una Proposal non vale mai); `--yolo` con `trama.ompChatApproval` su `yolo`; Intent Tracing come per le altre conversazioni, letti a ogni avvio. Nessuna skill, nessun testo nelle regole dell'agente, nessuna frase delle istruzioni. Il modello scelto nel selettore vale fino alla pulizia; una General ripresa dopo una ricarica riparte col modello del suo avvio.
- Ambiente: `terminalEnv` senza `TRAMA_JOB` e `TRAMA_ADVISOR_SCANNER`, con `TRAMA_AGENT=1`, `QUESTION_ENDPOINT`, `PI_INTENT_TRACING` e `TRAMA_TERMINAL` con un'identità nuova a ogni sessione nuova (la stessa per una ripresa).
- Programma cercato come per ogni lancio (`tech#agent-launching`), ma senza `omp update --check`, aggiornamento o notifiche.
- Avvio: `initialize`, poi `session/new` con `cwd` la cartella e i server MCP nativi di omp, senza `session/prompt`. Riuscito → `omp-acp.SESSION_STARTED` (Starting → Ready); errore di `spawn`, uscita prima della sessione, errore di `initialize`/`session/new` o 30 secondi senza risposta → `omp-acp.START_FAILED` (Starting → Stopped). Nessun `launchAgent`, nessun terminale di ripiego, nessun avviso dell'editor (al contrario di `startFailureNotice` in `extension/src/host/agent.ts` per i lavori).

## Messaggi e coda
- General è una voce di `conversations` con `general: true`, `name: "General"`, sempre per prima. L'host manda in più `generalStatus { phase: "starting" | "ready" | "stopped" | "resuming" | "kept", error?: { kind: "missing" | "start" | "exited", reason?: string }, newSession?: true }` e accetta in più, validati, `clearGeneral` e `installOmp`; `closeConversation` con l'identità di General vale solo nella fase `kept`.
- `developer.SEND_CHAT_MESSAGE`: in Ready e Kept after switch-off va all'agente, anche durante un turno senza fermarlo. In Starting e Resuming si mette in coda nell'host e parte appena la sessione è aperta; se l'avvio fallisce torna nel campo e non si manda. In Stopped fa partire la ripresa (Resuming) se il processo di prima si era chiuso da solo con una sessione, altrimenti un avvio nuovo (Starting); il messaggio aspetta.
- `developer.STOP_CHAT_AGENT` interrompe il turno; General resta com'è.

## Pulizia
- `developer.CLEAR_GENERAL` (dalla vista `clearGeneral`): con l'agente in un turno chiede conferma con il dialogo modale di `ui#omp-chat-general` (`vscode.window.showWarningMessage`, solo `Clear` prosegue); ferma o senza processo, senza conferma. Annulla richieste di permesso e moduli in attesa come Stop, ferma il processo (`SIGTERM`, poi `SIGKILL` dopo 3 secondi), scarta la conversazione e la sessione salvata, ritira gli annunci in attesa dell'agente, manda alla vista una conversazione vuota e fa partire subito un omp nuovo con sessione nuova. Vale da Starting, Ready, Stopped e Resuming, sempre verso Starting; il selettore torna al ruolo.

## Errori e omp mancante
- Avvio fallito: il motivo compare in fondo a General (`error.kind: "start"`). omp mancante: `error.kind: "missing"`, nessun avviso dell'editor; `installOmp` (`developer.INSTALL_OMP`) fa ciò che fa `Install omp` della scheda Settings (`installOmp` in `extension/src/host/agent.ts`).
- `omp-acp.EXITED` in Ready → Stopped: motivo in fondo (`error.kind: "exited"`), storia visibile, annunci in attesa ritirati, voce salvata conservata. Al messaggio seguente: processo nuovo con gli stessi argomenti e ambiente, `initialize` e `session/load` (o `session/resume`, quello dichiarato) sulla stessa sessione. `omp-acp.SESSION_RESUMED` → Ready e parte il messaggio in coda; fallimento o 30 secondi → `omp-acp.SESSION_NOT_RESUMED` → Starting con `session/new`, `generalStatus` con `newSession: true` (la storia resta sopra, l'agente non la ricorda), poi il messaggio.

## Salvataggio e ripresa dopo una ricarica
- Voce in `ExtensionContext.workspaceState` sotto `trama.ompChat.general` (accanto a `CONVERSATIONS_KEY` e `SAVED_ENV_KEYS` di `src/core/omp-chat-conversation.ts`): `id` (= `TRAMA_TERMINAL`), `sessionId`, `args` senza il percorso di omp, `env` (le variabili salvate senza `TRAMA_JOB`), `startedAt` ISO 8601; niente `name`, `state`, `job`. Si scrive quando la sessione è aperta (nuova o riaperta); si cancella alla pulizia, quando omp Chat non è in uso all'attivazione o mentre General sparisce, quando General resta dopo lo spegnimento, e quando la ripresa fallisce (prima della sessione nuova, che scrive la sua). Un omp chiuso da solo non la cancella. Voce illeggibile o senza `sessionId`: si cancella all'attivazione e General parte con sessione nuova. Nessun messaggio si salva in Trama.
- `editor.WINDOW_CLOSED`: da Ready, Stopped con sessione e Resuming → Waiting for the window (la sessione si conserva); da Starting, Stopped senza sessione e Kept after switch-off → Absent (non si riprende). All'attivazione, con omp Chat in uso, l'host riprende la voce in un processo nuovo con gli stessi argomenti, senza alcun prompt: SESSION_RESUMED → Ready, General torna prima con la sua storia e aspetta il developer anche se era in un turno; SESSION_NOT_RESUMED → Starting, vuota, senza avvisi sulla Board. Con omp Chat non in uso la voce si scarta (→ Absent). Le conversazioni dei lavori si riprendono come oggi, indipendenti.

## omp Chat spenta
- Con l'agente fermo o senza processo: Trama ferma il processo, scarta la conversazione, General sparisce (Starting/Ready/Stopped/Resuming → Absent). Con l'agente in un turno: Ready → Kept after switch-off (fase `kept`), l'agente continua; la scheda ora chiude invece di pulire: `developer.CLOSE_CHAT_CONVERSATION` → Absent, con conferma se in un turno; `omp-acp.EXITED` → Absent; omp Chat di nuovo in uso → Ready, con la pulizia. In Kept after switch-off messaggi e Stop valgono come in Ready.

## Non è un lavoro di Trama
- Nessun ghost, nessun annuncio al lancio, nessuna voce nel registro dei lavori (`JobPlace`), nessun `JobKind`; non conta per l'esclusione fra Run, fra Run e Resolve Drifts, per `Run all`, per il `Run` dei Task né per `Resolve`, e non è mai rifiutata o fermata per un altro lavoro, un round di domande o una scheda che aspetta la fine del turno. Il suo pid non entra in `src/core/agent-processes.ts`: `hasFollowedTerminals` (`extension/src/host/agent.ts`) e `following` (conversations) non la contano.
- L'host tiene la sua identità `TRAMA_TERMINAL` accanto alle altre, così ciò che l'agente annuncia o archiva da lì è suo; le schede che consegna non aspettano la fine del turno. Alla fine del processo, alla pulizia, alla chiusura e alla chiusura della finestra i suoi annunci in attesa si ritirano con l'avviso di mancata consegna, con le stesse funzioni di fine di un terminale (`finishAgentTerminal`).

## Affidabilità e accettazione
- General non lascia processi orfani: pulizia, spegnimento di omp Chat, chiusura della finestra e disattivazione dell'estensione fermano il suo processo come ogni conversazione; un avvio fallito non si ritenta mai da solo.
- Test: `bun:test` per gli stati di `omp-chat-general` e la coda dei messaggi; un test dell'host con un client ACP finto prova argomenti senza hook, ambiente senza `TRAMA_JOB`, avvio all'attivazione, pulizia con e senza dialogo, ripresa senza prompt, ripresa dopo un'uscita con e senza sessione riaperta, omp mancante senza avviso dell'editor e nessun lavoro nel registro.
- L'accettazione di `quality#omp-chat-conversation` elenca anche verifiche delle conversazioni dei lavori che esistono già; nuove sono solo quelle di General (presente come prima scheda all'apertura di una finestra con cartella, assente senza cartella; pulizia da ferma e in un turno con conferma; ripresa ferma dopo una ricarica a metà turno; omp ucciso e ripresa della stessa sessione al messaggio seguente; `trama.ompPath` sbagliato con riga d'errore in General e nessun avviso dell'editor; omp Chat spenta con General ferma e in un turno; nessun ghost e nessun pulsante della Board disabilitato mentre General lavora; una domanda dello strumento di omp in General mostrata come modulo) e il focus preso da Ask more.

## Confini
- Appartengono al Task della vista (Machine `omp-chat`, `requirements/ui#omp-chat-general`): la riga delle schede con General prima e fissa, il pulsante gomma «Clear General» al posto della X, `Delete` sulla scheda, il testo della vista vuota, il disegno delle righe d'errore e di sessione nuova, il pulsante Install omp nella riga e lo stato `omp-chat/Empty`. Questo Task fornisce i messaggi `generalStatus`, `clearGeneral` e `installOmp` che la vista consuma.
- La rimozione di Add Quick Task e il menu di + Add Work Item non appartengono a questo Task.
