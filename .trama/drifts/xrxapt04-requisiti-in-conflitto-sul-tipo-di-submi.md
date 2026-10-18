---
status: resolved
resolution: proposal
refs:
  - requirements/ui#panel/Settings
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: c2o055xh
created: 2026-10-17T20:35:54.950Z
---
# Requisiti in conflitto sul tipo di submitWhileRunning

## What happens

La scheda Settings mostra l'impostazione che permette a un Run di partire mentre un altro è in corso come **casella di spunta**, come il manifest e il resto dei Requisiti la trattano.

## What should happen

La sezione della scheda Settings dei Requisiti di interfaccia dice che questa impostazione è un **campo di testo**, ma i Requisiti di tecnologia dell'agente, le regole dei Task e il Requisito dell'agente la descrivono come **interruttore booleano**. Nessuna correzione del codice rispetta entrambi: serve scegliere quale Requisito cambiare.

## Where in the code

extension/src/host/settings-schema.ts (controllo ricavato dal tipo del manifest), extension/src/webview/settings/index.ts (booleanControl)
