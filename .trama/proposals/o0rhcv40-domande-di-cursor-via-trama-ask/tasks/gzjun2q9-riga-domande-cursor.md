---
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
---
# Riga sulle domande per Cursor

A Task finito, nella chat di Cursor le istruzioni dei lavori che fanno round di domande portano la riga `Ask the developer only with \`trama ask\`, as the skill says.` (`rules#agent-terminal`).

- La riga va dopo quella sul `PATH` (`withTramaPath` in `extension/src/host/cursor.ts`) oppure, quando quella manca perché non c'è un programma incluso per la piattaforma, subito dopo l'istruzione.
- La portano: il design da richiesta scritta, la richiesta di setup, l'import e Resolve Drifts con la richiesta manuale (`buildPrompt` senza `automaticCollection`).
- Non la portano: scan del System e di Feature, implement, implement all, il Run automatico e la richiesta automatica di Resolve Drifts.
- Con `omp`, `claude` e con la chat di Copilot l'istruzione non cambia.
