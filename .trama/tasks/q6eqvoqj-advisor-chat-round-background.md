---
column: done
technical: false
refs:
  - chat-advisor
  - requirements/rules#chat-advisor
  - requirements/tech#chat-advisor
drift: null
proposal: hpdjp1mn
agent: false
created: 2026-10-23T09:06:26.811Z
finished: 2026-10-23T09:17:28.523Z
---
# Round dell'advisor in background

La revisione continua dell'Advisor della chat di Cursor diventa un round in background: l'agente guardato avvia `trama-advisor` con `run_in_background: true` e continua a lavorare senza aspettarlo né controllarlo; Cursor gli consegna da solo il risultato del round. Le sole attese restano la revisione del Task e la revisione finale.

## Cosa deve valere alla fine

### Richiesta del round
- Alla prima modifica che conta (`editor-chat.FILES_CHANGED` in `In ascolto`) di un agente guardato, Trama aggiunge al risultato dello strumento che l'ha fatta, in inglese, esattamente: "Trama's Advisor: start the trama-advisor sub-agent with run_in_background for review <identità della richiesta> of these changes and keep working; do not wait for it or check on it, Cursor delivers its result to you. Changed files: <file>, <file>. Your conversation since the last review: <percorso della trascrizione> from byte <posizione>." I file sono i percorsi relativi al progetto di tutti i file cambiati dall'ultimo round di quell'agente.
- La posizione è la dimensione in byte della trascrizione di quell'agente quando Trama ha chiesto il round precedente, `0` al primo round. L'host la prende con `fs.stat` quando prepara la richiesta, mai leggendo il contenuto, e la ricorda come posizione del round successivo. Trama non legge mai il contenuto della trascrizione.
- Il percorso della trascrizione: per l'agente principale è il `transcript_path` che Cursor dà agli hook; per un sotto-agente, per cui Cursor dà `transcript_path: null`, l'host lo ricava dalla cartella della trascrizione della conversazione principale: `<cartella>/subagents/<identità di conversazione del sotto-agente>.jsonl`. Se manca il percorso, o il file non esiste o non si legge, la richiesta non ha la frase "Your conversation since the last review: …" e il round rivede solo i file.
- Al più un round alla volta per agente guardato (`In revisione`): le modifiche che arrivano durante un round non ne avviano un secondo e si aggiungono al prossimo. Una corsa non ha mai più round in corso che agenti guardati.
- Quando `trama advisor review` arriva in `In revisione` e nessun file è cambiato nel frattempo, l'agente torna `In ascolto`; se dei file sono cambiati, Trama chiede il round successivo con il risultato del prossimo strumento dell'agente, con lo stesso testo della richiesta, sui file cambiati e sulla conversazione dall'ultimo round.
- Ogni richiesta, di qualunque tipo, ha un'identità nuova che `trama-advisor` riporta con il suo esito; un esito di una richiesta che non è più attesa si ignora.

### Note
- Non esiste più la fase `Note in attesa`: Trama non aggiunge mai le note al risultato di uno strumento e `postToolUse` con `additional_context` porta solo le richieste dei round. Le note arrivano all'agente come risultato del round, consegnato da Cursor.
- Trama conserva in memoria (solo nell'editor, mai su disco) le note dei round di ciascun agente per la sua revisione del Task o finale; le note di un agente non vanno mai a un altro agente; in `Finita` sono dimenticate.
- Revisione del Task (sotto-agente che conclude normalmente), in inglese, esattamente: "Trama's Advisor: before you return, have the trama-advisor sub-agent, in the foreground, do review <identità della richiesta> of your whole Task <identità del Task> and wait for its result; fix what it reports. Ignore the result of any earlier background review." seguito dalle note conservate dei suoi round e dai file non ancora rivisti. Al più tre richieste per sotto-agente, come oggi.
- Revisione finale (fine turno dell'agente principale), in inglese, esattamente: "Trama's Advisor: before you finish, have the trama-advisor sub-agent, in the foreground, do review <identità della richiesta> of the whole run and wait for its result; fix what it reports. Ignore the result of any earlier background review." seguito dalle note conservate dei round dell'agente principale e dai file non ancora rivisti. Al più tre richieste per corsa, come oggi.
- Un round ancora in corso quando Trama chiede la revisione del Task o finale non conta più: Trama ignora il suo `trama advisor review` e non ne conserva le note; l'agente ne ignora il risultato.

### Hook
- Per un agente guardato `afterFileEdit`, `afterShellExecution` senza `matcher` e `postToolUse` mandano all'editor anche `transcript_path` quando Cursor lo dà non vuoto.
- Il resto delle voci di `~/.cursor/hooks.json` e del file di stato resta come in `requirements/tech#chat-advisor`: il file di stato non contiene mai percorsi di file, trascrizioni o note.

### Sotto-agente `trama-advisor`
- Una sola definizione `~/.cursor/agents/trama-advisor.md`, senza `is_background` e senza `readonly`; non esiste `trama-advisor-background`. L'agente la avvia con `run_in_background: true` per i round e in primo piano per le revisioni del Task e finale.
- Il corpo, in inglese, gli dice di leggere il Task, le sue Proposal e i riferimenti con i comandi di sola lettura di `trama`, i file nominati e, quando la richiesta la nomina, la trascrizione dell'agente dalla posizione in byte indicata in poi; di seguire `rules#work` per note e Drift; di mandare sempre l'esito con `trama advisor review` (`{ review, clean, notes? }`); di finire con il risultato per l'agente: con note, cominciando con "Trama's Advisor found that your Task's code drifts from the Model or the Requirements; fix it before you move the Task to Done: <note>", altrimenti dicendo soltanto che la review <identità della richiesta> è pulita.

### Skill e documentazione
- La sezione di `trama-implement` per l'Advisor Scanner nella chat di Cursor dice di eseguire subito ogni testo che comincia con `Trama's Advisor`, avviando `trama-advisor` in background con `run_in_background: true` per i round e in primo piano per le revisioni del Task e finale; di non aspettare né controllare mai un round (niente `sleep`, nessun polling, nessuna lettura della sua trascrizione o dei suoi file di output in `~/.cursor/subagents/`); di correggere secondo le note quando Cursor consegna l'esito di un round; di ignorare l'esito di un round arrivato dopo la richiesta della revisione del Task o finale; e di dirlo ai sotto-agenti che realizzano i Task.
- `docs/cli.md`, `README.md`, `extension/README.md` e `CHANGELOG.md` descrivono i round in background, le note consegnate da Cursor e riportate nella revisione del Task o finale, e la versione minima di Cursor 3.27.6 per i round in background (le versioni precedenti non si riconoscono né si segnalano).

## Dove guardare
- Machine dell'host: `extension/src/host/drift-resolution.ts` (circa 342-770; `chatAdvisorEvent` ~628, `receiveAdvisorReview` ~740, testi di richiesta e note ~485-511, `continuousText` ~485).
- Inoltro degli hook all'advisor: `extension/src/host/cursor.ts:85-105`.
- Tipi di hook, risposte `additional_context`/`followup_message`, `hooks.json`, lettura dell'input: `src/core/cursor-chat.ts` (12-165, 249-265, 541-550); CLI `hook cursor`: `src/cli/commands/hook.ts:15-40`.
- `trama advisor review`: `src/cli/commands/advisor.ts`; docs `docs/cli.md:839-860`.
- Prompt di `trama-advisor`: `src/core/sub-agents.ts:7-10`; scrittura della definizione: `extension/src/host/chat-sub-agent.ts:8-19`, chiamata da `extension/src/host/project.ts:79-95`.
- Skill: `skills/trama-implement/SKILL.md:53-63`; CHANGELOG: `CHANGELOG.md:47-48`.
