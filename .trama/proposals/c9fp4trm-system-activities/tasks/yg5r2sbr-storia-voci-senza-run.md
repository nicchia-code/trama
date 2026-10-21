---
technical: false
refs:
  - voce-history
  - requirements/rules#voce-history
---

# History senza Run automatici

Quando il Task è fatto, nessun Run automatico scrive voci di History: le voci nascono solo dai lavori avviati dal developer, come dice il Model. Il ghost della verifica che dice 'Updating History' compare nella colonna System Activities del Board, non più in Active.

Indizi: `extension/src/host/controller.ts`, `extension/src/webview/board/logic.ts`.
