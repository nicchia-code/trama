---
refs:
  - agent-hook
  - terminal
  - requirements/tech#agent-hook
---
# Hook solo di omp

Quando il Task è fatto, l'agente del terminale è solo omp e il suo hook è il solo hook dei terminali di Trama.

- omp carica il modulo di Trama (`dist/omp-hook.js`) con `--hook` nel comando che Trama scrive nel terminale; il modulo avvisa l'editor con `trama hook idle` quando la sessione principale si ferma o esce, e rifiuta il tool `ask` con il messaggio di rifiuto di Trama, in ogni sessione, senza contattare l'editor. Questo comportamento non cambia.
- Sparisce tutto ciò che serviva agli hook di Claude Code: l'oggetto JSON passato con `--settings` (`Stop`, `SessionEnd`, `PreToolUse` su `AskUserQuestion`), il comando `trama hook claude-question-tool` (in `src/cli/commands/hook.ts`, togliendolo da `HOOK_COMMANDS`) e `hookProgram` in `extension/src/host/quote.ts`, che citava `<trama>` per la Git Bash degli hook di Claude Code su Windows, con i suoi test in `test/host-quote.test.ts`.
- Il terminale dell'agente è quello in cui Trama avvia omp, nell'area dei terminali o in una scheda secondo `trama.terminalLocation`; fine del comando e chiusura funzionano come oggi.
- Ogni corsa nel terminale ha l'hook di omp: `agent-hook.IDLE` e la chiusura del terminale finiscono il job, rilasciano i Task presi e ritirano gli annunci di quel terminale; la fine del comando fa lo stesso quando omp esce senza che l'hook abbia parlato.
- I test della riga di comando che nominano `hook claude-question-tool` (per esempio `test/cli-registry.test.ts`) si aggiornano.
