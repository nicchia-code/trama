---
status: resolved
resolution: proposal
refs:
  - requirements/rules#agent-terminal
proposal: null
task: null
origin: g6i3zfvc
critical: false
option: null
note: null
resolvedBy: tnq6w03l
created: 2026-10-18T10:37:25.215Z
---
# Regola di riconoscimento in conflitto

## What happens

Oggi una conversazione diventa di Trama solo se il prompt **comincia** con la skill, sia nella chat di Cursor sia in quella di Copilot. Il Requisito delle regole dell'agente dice la stessa cosa.

## What should happen

Il Model della chat e il suo Requisito dicono invece che basta che il prompt nomini la skill **in qualunque punto**. Seguire il Model contraddice il Requisito delle regole; seguire il Requisito contraddice il Model. Nessuna realizzazione del Task rispetta entrambi.

## Where in the code

`src/core/cursor-chat.ts` e `src/core/copilot-chat.ts`: la costante `SKILL_PROMPT`, ancorata all'inizio del prompt.
