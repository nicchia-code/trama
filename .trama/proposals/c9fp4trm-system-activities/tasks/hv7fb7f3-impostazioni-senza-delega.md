---
refs:
  - panel/Settings
  - panel/Closed/developer.SHOW_SETTINGS
  - panel/Open/developer.SHOW_SETTINGS
  - requirements/ui#panel/Settings
  - requirements/tech#panel/Settings
  - requirements/quality#panel/Settings
---
# Impostazioni senza delega Drift

Quando lo sviluppatore apre le Impostazioni (sia a pannello chiuso sia a pannello aperto), la scheda non mostra più la voce di delega dei Drift: l'impostazione `trama.driftAutoPilot` non esiste più e nessun gruppo la elenca. Il gruppo Experimental contiene solo `submitWhileRunning`, `experimentalDriftBlocker`, `experimentalAdvisorScanner` e `experimentalParallelExecution`.

Sparisce la finestra di conferma che chiedeva di attivare la delega, insieme al messaggio `setDelegation`. Il salvataggio di un'impostazione (`setSetting`) non ha più casi speciali che rifiutano la modifica della delega, e l'ascolto dei cambi di configurazione non tratta più `trama.driftAutoPilot` in modo particolare.

Suggerimenti: `extension/src/webview/settings/index.tsx`, `extension/src/host/settings-schema.ts`, `extension/src/host/controller.ts`, `extension/src/host/messages.ts`, `extension/src/protocol.ts`, `extension/package.json`, `test/settings-schema.test.ts`.
