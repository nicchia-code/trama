---
column: done
technical: true
refs:
  - requirements/ui#panel/Settings
drift: clg418dx
proposal: null
agent: false
created: 2026-10-17T08:00:25.301Z
finished: 2026-10-17T08:46:41.067Z
---
# Fix code to match the Requirements: Titolo «Delegation» del Drift autopilot

## What happens

La scheda Settings mostra il menu del Drift autopilot con il titolo «Delegation» e con un paragrafo di spiegazione proprio, scritto in inglese, diverso da quello dell'impostazione nell'editor. Il titolo non è ricavato dalla chiave.

## What should happen

Ogni impostazione mostra il titolo ricavato dalla chiave senza trama. (driftAutoPilot diventa «Drift Autopilot») e la spiegazione dell'impostazione, la stessa dell'editor.

## Chosen option

**Usare titolo e spiegazione dell'impostazione**

La scheda mostra «Drift Autopilot» e la spiegazione del manifest, come chiedono i Requisiti. Il menu resta un menu a tre livelli con le sue scelte.

## Where in the code

extension/src/webview/settings/logic.ts:4,9 (titolo e spiegazione del menu della delega)
