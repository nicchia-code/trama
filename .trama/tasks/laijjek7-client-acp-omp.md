---
column: done
technical: true
refs:
  - specs#frameworks
  - requirements/tech#omp-chat-conversation
drift: null
proposal: snm0wfcf
agent: false
created: 2026-10-23T10:40:47.041Z
finished: 2026-10-23T11:07:57.129Z
---
# Client ACP di omp

Il codice dell'estensione che avvia un processo `omp acp` e gli parla in ACP, su cui poggiano le conversazioni di omp Chat. Non cambia nessun comportamento visibile da solo: lo usano i Task della vista e delle conversazioni di omp Chat.

Quando è finito:
- `@agentclientprotocol/sdk` è una dipendenza dell'estensione, impacchettata in `dist/` dal build dell'host (`scripts/build-extension.ts`), perché `vsce package` gira con `--no-dependencies`; le Specs lo elencano fra i framework.
- La riga di omp del terminale (`extension/src/host/terminal-agent.ts`, `agentTemplate`) è divisa in una funzione che dà l'elenco delle opzioni di un lavoro (hook, `--advisor`, `--config <overlay>`, `--model`, `--slow`, allegato) e in una che lo cita per la shell; il terminale usa la seconda e produce esattamente la riga di oggi.
- Un modulo in `extension/src/host/omp-chat/` avvia `omp acp` con `child_process.spawn`, senza shell: programma `trama.ompPath` se non è vuoto, altrimenti `omp`; argomenti `<opzioni del lavoro> acp --yolo`; cartella la radice del progetto; ambiente quello di `terminalEnv` (PATH con `trama` dell'estensione davanti, `TRAMA_AGENT=1`, `QUESTION_ENDPOINT`, `TRAMA_TERMINAL` con un'identità nuova come per un terminale, `TRAMA_JOB`, `TRAMA_ADVISOR_SCANNER=1` solo nei Run con l'Advisor Scanner). Il pid entra nel registro dei processi (`src/core/agent-processes.ts`) all'avvio.
- Apre la connessione con `ClientSideConnection` dello SDK sullo stdio del processo: `initialize` dichiara `elicitation.form` e niente `fs` né `terminal`; `session/new` con `cwd` la radice e `mcpServers` letti dai file MCP nativi di omp (`.omp/mcp.json` del progetto prima di `~/.omp/agent/mcp.json` o della cartella del profilo attivo, `enabled: false` del progetto che nasconde il server dell'utente con lo stesso nome, `${VAR}` e `${VAR:-default}` espansi; file mancanti o non validi danno nessun server); poi `session/prompt` con l'istruzione e, quando c'è, l'allegato come blocco `resource_link`.
- Espone: invio di un prompt; invio durante il turno con lo steering che omp dichiara in `_meta.steering`, altrimenti in coda fino alla fine del turno; `session/cancel`; cambio di modello con il metodo che omp dichiara; elenco dei modelli della sessione o, senza, `ompModels`; le notifiche `session/update` così come arrivano; le richieste di elicitation con la loro risposta o il rifiuto; la risposta automatica a `session/request_permission` (prima `allow_always`, poi `allow_once`, mai un rifiuto); `session/load` (o `session/resume`, quello che omp dichiara) su un'identità di sessione salvata; l'uscita del processo distinta dall'arresto chiesto da Trama, che manda `SIGTERM` e, dopo 3 secondi, `SIGKILL`.
- Avvio fallito: errore di `spawn`, uscita, errore di `initialize` o di `session/new` prima della consegna dell'istruzione, oppure 30 secondi senza risposta a `initialize`, si riconoscono come avvio fallito con il motivo (`omp not found at <percorso>`, `omp exited with code <N>`, `omp did not answer within 30 s` o il messaggio di omp).
- La logica pura (elenco delle opzioni, lettura e unione dei file MCP, scelta della risposta ai permessi, motivo dell'avvio fallito) sta in `src/core` con test `bun:test`.
- Verificato con omp 18.12.6, e scritto nel commento del modulo, che le opzioni prima di `acp` valgono per le sessioni ACP: `--hook` carica il modulo di Trama (si vede `trama hook start` con il pid), `--config` applica l'overlay, `--advisor` accende gli advisor, `--model` e `--slow` scelgono i modelli. Un'opzione che non arriva si passa nel modo che la documentazione di omp indica per ACP, e il Requisito `tech#omp-chat-conversation` va aggiornato con una Proposal.
