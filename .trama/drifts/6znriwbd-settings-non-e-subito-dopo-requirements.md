---
status: resolved
resolution: fix-code
refs:
  - panel/Settings
  - requirements/ui#panel/Settings
proposal: null
task: z74up4wt
origin: null
critical: false
option: 1
note: null
resolvedBy: feyjukk9
created: 2026-10-16T12:27:45.430Z
---
# Settings non è subito dopo Requirements

## What happens

Nella barra del pannello la scheda Specs sta tra Requirements e Settings: Settings è la quinta scheda, in fondo, e non la quarta subito dopo Requirements.

## What should happen

La scheda Settings è la quarta della barra del pannello, subito dopo Requirements, con lo stesso aspetto delle altre e senza badge.

## Fix options

### Mettere Settings subito dopo Requirements

Settings prende il posto dopo Requirements e la scheda Specs scende dopo di lei. Il contenuto delle due schede non cambia. Costo: l'ordine delle schede cambia per tutti; nessun comportamento cambia.

### Mettere Specs in fondo, dopo Settings

La scheda Specs diventa l'ultima della barra e Settings resta dove sta, subito dopo Requirements. Il contenuto delle due schede non cambia. Costo: Specs si trova dopo Settings, mentre il Modello elenca Specs prima delle impostazioni.

## Where in the code

extension/src/webview/main.ts, l'elenco delle schede nel markup del pannello: la scheda Specs (data-view="specs") è prima di quella Settings (data-view="settings").
