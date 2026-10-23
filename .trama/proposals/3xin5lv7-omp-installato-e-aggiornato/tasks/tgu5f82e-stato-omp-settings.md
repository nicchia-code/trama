---
technical: false
refs:
  - panel
  - developer.SHOW_SETTINGS
  - requirements/tech#panel/Settings
  - requirements/ui#panel/Settings
---
# Stato di omp nei Settings

La scheda Settings ha il gruppo omp al posto del gruppo Agent, con lo stato di omp e Install omp quando manca; l'avviso di omp mancante apre la scheda Settings. Alla fine:

- I gruppi della scheda sono `Appearance`, `omp`, `Models`, `Project`, `Features`; il gruppo `omp` contiene `trama.ompPath`, `trama.terminalLocation`, `trama.ignoreInstructionFiles`, `trama.autoExit`, `trama.language` (`SETTING_GROUPS` in `extension/src/host/settings-schema.ts`).
- Sotto il titolo del gruppo `omp`, prima delle impostazioni, la riga dello stato di omp (`aria-live="polite"`): «Checking omp…» con `Loader`; «omp <versione>» con `CircleCheck`; con omp che non risponde `TriangleAlert`, lo stesso motivo dei campi dei modelli e « Trama cannot work without omp.»; quando omp manca anche il pulsante `Install omp`. La scheda non aggiorna omp: dice soltanto la versione che risponde.
- Messaggi: host → webview `ompStatus { state: "checking" | "done", missing?: boolean, version?: string, error?: string }`, mandato quando la vista Settings diventa visibile, a ogni cambio di `trama.ompPath` e alla fine del terminale di installazione; l'host cerca il programma e chiede `omp --version` senza shell, con una scadenza di 15 s, senza controllo degli aggiornamenti. Webview → host `installOmp`.
- `Open Settings` nell'avviso di omp mancante apre il pannello in primo piano direttamente sulla scheda Settings, anche se era chiuso (`panel/Closed/developer.SHOW_SETTINGS`), con lo stesso comando `trama.openSettings`.
- Test del webview per la riga dello stato nei suoi esiti e per il pulsante; test dell'host per `ompStatus`.
