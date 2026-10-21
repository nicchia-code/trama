---
column: done
technical: false
refs:
  - voce-history
  - requirements/rules#voce-history
drift: null
proposal: c9fp4trm
agent: false
created: 2026-10-21T05:42:19.328Z
finished: 2026-10-21T06:08:13.666Z
---
# History senza Run automatici

Quando il Task è fatto, nessun Run automatico scrive voci di History: le voci nascono solo dai lavori avviati dal developer, come dice il Model. Il ghost della verifica che dice 'Updating History' compare nella colonna System Activities del Board, non più in Active.

Indizi: `extension/src/host/controller.ts`, `extension/src/webview/board/logic.ts`.
