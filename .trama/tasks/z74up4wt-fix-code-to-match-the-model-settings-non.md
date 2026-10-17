---
column: done
technical: false
refs:
  - panel/Settings
  - requirements/ui#panel/Settings
drift: 6znriwbd
proposal: null
agent: false
created: 2026-10-16T12:32:57.833Z
finished: 2026-10-16T13:32:16.228Z
---
# Fix code to match the Model: Settings non è subito dopo Requirements

## What happens

Nella barra del pannello la scheda Specs sta tra Requirements e Settings: Settings è la quinta scheda, in fondo, e non la quarta subito dopo Requirements.

## What should happen

La scheda Settings è la quarta della barra del pannello, subito dopo Requirements, con lo stesso aspetto delle altre e senza badge.

## Chosen option

**Mettere Settings subito dopo Requirements**

Settings prende il posto dopo Requirements e la scheda Specs scende dopo di lei. Il contenuto delle due schede non cambia. Costo: l'ordine delle schede cambia per tutti; nessun comportamento cambia.

## Where in the code

extension/src/webview/main.ts, l'elenco delle schede nel markup del pannello: la scheda Specs (data-view="specs") è prima di quella Settings (data-view="settings").
