---
technical: false
refs:
  - agent-hook
  - requirements/tech#agent-hook
  - requirements/tech#editor-chat
  - requirements/quality#editor-chat
  - requirements/tech#question-round
  - requirements/rules#question-round
---
# Hook e domande

Si fa dopo il Task del registro dei comandi.

- Hook: `hook cursor`, `hook copilot`, `hook idle` e `hook claude-question-tool` sostituiscono `cursor-hook`, `copilot-hook`, `agent-event idle` e `agent-event question-tool`, con gli stessi tempi, le stesse uscite e gli stessi codici di uscita. Lo dicono `tech#agent-hook` e `tech#editor-chat`.
- Ogni configurazione che Trama scrive usa i comandi nuovi:
  - `~/.cursor/hooks.json`, dove anche una voce con il vecchio `cursor-hook` è di Trama e si riscrive;
  - il file `copilot-hooks.json`;
  - l'oggetto `--settings` di Claude Code;
  - il modulo dell'hook di omp, che lancia `trama hook idle`.

  Quando l'estensione si attiva riscrive le voci già installate.
- Il riconoscimento del lavoro dell'agente in `afterShellExecution` conta `announcement new`, `announcement move`, `comparison new`, `proposal new`, `task move <id> doing` e `question new`.
- Domande: `question new` sostituisce `ask` con lo stesso comportamento. Legge il round solo con `--input -` (o con il testo JSON), resta in attesa del developer e stampa JSON. Il rifiuto del tool di domande dell'agente e i messaggi `unavailable` dicono `trama question new`.
- Le skill e `docs/cli.md` chiedono al developer solo con `trama question new --input -`.
- Test: le voci vecchie di `hooks.json` si riscrivono e le voci di altri non si toccano; `hook cursor` e `hook copilot` escono con 0 anche senza editor.
