---
technical: true
refs:
  - requirements/rules#agent-terminal
---
# Riga trama ask ovunque

Ogni istruzione che Trama manda all'agente, per ogni lavoro (design, setup, scan, import, implement, implement all, Resolve Drifts manuale e automatico, il Run automatico) e per ogni agente (chat di Cursor, chat di Copilot, omp, Claude Code), porta la frase `Ask the developer only with \`trama ask\`, as the skill says, never with your own question tool.`.

- Nel terminale e nella chat di Copilot la frase sta sulla stessa riga dell'istruzione, dopo la frase del Drift blocker e prima di quella della lingua.
- Nella chat di Cursor è una riga a sé, dopo quella sul `PATH` oppure, senza quella, subito dopo l'istruzione, come la riga di oggi.
- `asksDeveloper()` (`extension/src/host/prompts.ts`) e la limitazione ai soli lavori che fanno round spariscono; `CURSOR_ASK_LINE` e `withAskLine` (`extension/src/host/cursor.ts`) prendono il nuovo testo o lasciano il posto a un'unica frase condivisa.

Fatto quando: i test delle istruzioni mostrano la frase in ogni lavoro e per ogni agente, nella posizione detta sopra, con e senza lingua, Drift blocker e riga del `PATH`.
