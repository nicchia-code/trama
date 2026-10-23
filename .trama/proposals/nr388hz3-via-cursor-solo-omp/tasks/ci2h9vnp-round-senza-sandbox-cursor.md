---
technical: false
refs:
  - question-round
  - requirements/data#question-round
---
# Round di domande senza Cursor

Il round di domande (`question-round`) non conosce più Cursor: né la sua sandbox, né la sua chat.

Quando è fatto:
- `trama question new` calcola la cartella dei record di discovery sempre con `process.getuid()` (`trama-q-<uid>`): `CURSOR_SANDBOX` e `CURSOR_ORIG_UID` non si leggono più. Da togliere in `src/core/question-channel.ts` le costanti `CURSOR_SANDBOX_ENV`, `CURSOR_ORIG_UID_ENV` e `runtimeUid` (righe ~15-18, 84-89) e il passaggio di `!!CURSOR_SANDBOX` a `unavailableQuestions` (~486).
- `agent.ASK_QUESTIONS` → Unanswered ha un solo caso: l'editor non è raggiungibile per il progetto. Il risultato `status: "unavailable"` (uscita 0) ha un solo `reason`: «Editor not available for this project. Do not ask in any other way: stop, tell the developer to open the project in the editor with Trama, and run the same trama question new again when they say to continue.». In `src/core/questions.ts` (~76-84) `unavailableQuestions` perde il parametro `fromCursorSandbox` e il testo per la sandbox. Nello stato Unanswered l'agente non ripete più il round «fuori dalla sandbox»: si ferma e lo ripete solo quando il developer dice di continuare.
- Sparisce il caso a parte del round chiesto dalla chat di Cursor: niente più `fromCursorChat` (`src/core/question-channel.ts` ~335, 487, 831, 836; `src/core/questions.ts` ~15-16). Un chiamante senza `TRAMA_QUESTION_ENDPOINT` continua a usare la finestra più recentemente attiva con il progetto aperto (ordinamento in `question-channel.ts` ~346), come dice il secondo paragrafo della Machine. Il nome dell'agente nell'intestazione del round non ha più il ramo «Cursor» (`extension/src/host/agent.ts` ~69-74, solo la parte che serve il round; il resto di `agentName` è di Agent launching).
- `agent.TOOL_DOMANDE_CHIAMATO` resta realizzato solo dall'hook di omp (`extension/src/omp/trama-hook.ts`, che blocca `ask` con `QUESTION_TOOL_REFUSAL`); il messaggio di rifiuto non cambia. Il percorso del `preToolUse` di Cursor che rifiutava lo strumento di domande sparisce: `onCursorHook`/`editorsReply` in `src/core/question-channel.ts` (~59-60, 496-532) e `receiveCursorHook` in `extension/src/host/questions.ts` (~9, 157), oltre al ramo di rifiuto in `src/cli/commands/hook.ts` (~32-35) se il comando non è già tolto con `trama hook cursor`.
- `developer.ASK_MORE` apre sempre una chat nuova con omp: il terminale Ask question o, con omp Chat in uso, la conversazione di omp Chat chiamata Ask question. Il prompt (il testo delle domande del round, mai scelte né risposte scritte) va al terminale o alla conversazione e non si scrive in nessun file; niente più conversazione di Cursor né ripiego negli appunti. In `extension/src/host/agent.ts` `openAskMore` (~804-830) perde il ramo `configuredAgent() === "cursor"` (con `isCursor`, appunti, `openCursorChat`) e usa solo `openFocusedTerminal`.
- `docs/cli.md`: la sezione di `trama question new` riporta un solo testo di `reason` (~1176) e non dice più che una chiamata con `CURSOR_AGENT=1` arriva alla finestra più recentemente attiva (~1187); dice che un chiamante senza endpoint va alla finestra più recentemente attiva.
- Test: togliere quelli sulla rimappatura UID con `CURSOR_SANDBOX`/`CURSOR_ORIG_UID`, sul secondo testo `unavailable`, su `fromCursorChat`, sul rifiuto dal `preToolUse` di Cursor e su Ask more verso la chat di Cursor o gli appunti; aggiornare quelli di `unavailableQuestions` alla nuova firma e quelli di Ask more al solo percorso omp.
