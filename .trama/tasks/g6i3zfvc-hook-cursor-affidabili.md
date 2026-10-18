---
column: done
technical: false
refs:
  - editor-chat
  - requirements/tech#editor-chat
  - requirements/quality#editor-chat
drift: null
proposal: xnoqi7ll
agent: false
created: 2026-10-18T10:21:56.550Z
finished: 2026-10-18T10:53:01.305Z
---
# Hook di Cursor affidabili

Quando il Task è finito, la fine del turno di una conversazione di Trama nella chat di Cursor ritira davvero i ghost della chat, invece di lasciarli in Active fino al riavvio dell'editor.

- **Riconoscimento dal prompt.** Una conversazione è di Trama quando un suo prompt nomina, in qualunque punto e anche dopo `/`, il nome intero di una skill con cui Trama avvia un lavoro (`trama-design`, `trama-scan`, `trama-implement`, `trama-import`, `trama-resolve-drifts`, `trama-setup`), non seguito da una lettera, una cifra o un trattino; le skill `trama-req-*` e le altre parole `trama-` non contano. La regola è la stessa per `beforeSubmitPrompt` di Cursor e per `UserPromptSubmit` di Copilot (oggi due `SKILL_PROMPT` ancorati all'inizio, in `src/core/cursor-chat.ts` e `src/core/copilot-chat.ts`).
- **Riconoscimento dai comandi dell'agente (solo Cursor).** `~/.cursor/hooks.json` ha anche la voce di Trama per `afterShellExecution`, con `"matcher": "trama"`. `trama cursor-hook` legge `command` e riconosce un'invocazione del programma `trama` (la parola, o un percorso che finisce con `/trama` o `\trama.exe`, anche citato) seguita da `announce` (ogni forma), `proposal new`, `task move <id> doing` o `ask`; ogni altro comando, letture e `task next` compresi, non conta. All'editor manda solo l'esito del riconoscimento, mai la riga di comando né l'output. L'host segna la conversazione come di Trama e non produce nessun Event; da lì il suo `stop`, la sua interruzione e la sua chiusura producono `AGENT_STOPPED`, `AGENT_INTERRUPTED` e `CONVERSATION_CLOSED`, e i suoi prompt successivi `PROMPT_SUBMITTED`. Una conversazione dimenticata al riavvio dell'editor torna seguita al prossimo prompt che nomina una skill o al prossimo comando che registra lavoro.
- **Consegna a ogni finestra.** `trama cursor-hook` manda l'evento a ogni finestra viva del progetto, ciascuna contattata per conto suo, così una finestra lenta o bloccata non ferma le altre (oggi `liveEditor` in `src/core/question-channel.ts` aspetta tutte e sceglie solo l'ultima messa a fuoco). Rinuncia dopo 1 secondo per `beforeSubmitPrompt` e dopo 5 secondi per `stop`, `sessionEnd` e `afterShellExecution`; risponde `{"continue": true}` a `beforeSubmitPrompt` e `{}` agli altri, esce sempre con 0. Ogni finestra traduce con la propria memoria; la finestra che ritira un annuncio mostra l'avviso, una che lo trova già ritirato non mostra nulla. `trama copilot-hook` non cambia.
- **Voci aggiornate.** In Cursor le voci di Trama si scrivono a init, a Update skills e a ogni attivazione dell'estensione; all'attivazione il file si riscrive solo se le voci non sono già esattamente quelle di questa versione (voce mancante, programma diverso, `matcher` assente). Un file che non è JSON valido non si riscrive mai e dà lo stesso messaggio di errore anche a ogni attivazione. Il riconoscimento delle voci di Trama accetta anche la forma Windows.
- **Nessun timer.** Nessun timer ritira i ghost della chat; la costante `QUIET_PERIOD_MS` in `src/core/announcements.ts`, rimasta senza usi dopo la rimozione della quiete, è tolta.
- I test provano almeno: il riconoscimento del prompt (nome in mezzo al testo, dopo `/`, `trama-req-ui-board` e `trama-designer` che non contano), il riconoscimento delle righe di comando (con `export PATH=…` davanti, percorso assoluto citato, `task next` e `trama search` che non contano), la consegna a due finestre di cui una non risponde, e la riscrittura all'attivazione solo quando le voci cambiano.
- `docs/cli.md` (sezione di `trama cursor-hook`), `extension/README.md` (Hooks e fine di un turno), `docs/uat.md` (passo R1 con la voce di `afterShellExecution`) e `CHANGELOG.md` descrivono il nuovo comportamento.
