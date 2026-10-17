---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#panel/Settings
proposal: null
task: bwvlnc8f
origin: null
critical: false
option: 1
note: null
resolvedBy: 9nbmxx4p
created: 2026-10-17T07:55:02.616Z
---
# Titolo «Delegation» del Drift autopilot

## What happens

La scheda Settings mostra il menu del Drift autopilot con il titolo «Delegation» e con un paragrafo di spiegazione proprio, scritto in inglese, diverso da quello dell'impostazione nell'editor. Il titolo non è ricavato dalla chiave.

## What should happen

Ogni impostazione mostra il titolo ricavato dalla chiave senza trama. (driftAutoPilot diventa «Drift Autopilot») e la spiegazione dell'impostazione, la stessa dell'editor.

## Fix options

### Usare titolo e spiegazione dell'impostazione

La scheda mostra «Drift Autopilot» e la spiegazione del manifest, come chiedono i Requisiti. Il menu resta un menu a tre livelli con le sue scelte.

### Tenere «Delegation» e aggiornare i Requisiti

Il titolo «Delegation» e il paragrafo propri restano; si riscrivono Requisiti e Model per dirlo, così codice e Requisiti coincidono. Il codice non cambia qui.

## Where in the code

extension/src/webview/settings/logic.ts:4,9 (titolo e spiegazione del menu della delega)
