---
column: done
technical: false
refs:
  - panel
  - editor-panel
  - developer.SHOW_SETTINGS
  - developer.CHANGE_SETTING
  - developer.SET_DRIFT_AUTOPILOT
  - editor
  - editor.SETTINGS_CHANGED
  - requirements/ui#panel/Settings
  - requirements/tech#panel/Settings
  - requirements/quality#panel/Settings
drift: null
proposal: fex406ev
agent: false
created: 2026-10-14T20:06:22.014Z
finished: 2026-10-14T20:40:36.915Z
---
# Settings tab in the panel

Il pannello ha una quarta tab `Settings`, dopo `Requirements`, che mostra tutte le impostazioni `trama.*` dichiarate nel manifest nei gruppi Agent, Models, Drift autopilot, Runs e Project, ciascuna con titolo leggibile, chiave, spiegazione tratta dal manifest e il controllo adatto: menu a tendina per gli enum con sotto la spiegazione del valore scelto, casella di spunta per `trama.autoExit`, campo numerico per `trama.maxParallelAgents`, campo di testo per le altre.

Quando il Task è finito:
- `developer.SHOW_SETTINGS` porta alla scheda Settings.
- `developer.CHANGE_SETTING` salva subito il valore nelle impostazioni utente, mai in quelle del workspace; un campo di testo conferma quando perde il fuoco o con Invio. Scegliere il valore predefinito, o lasciare vuoto un testo libero, toglie il valore dalle impostazioni utente. Un valore non valido non si salva: il campo mostra perché e il valore salvato resta quello di prima. Se la scrittura fallisce, l'errore è mostrato e il controllo torna al valore che vale davvero.
- Se il cambiamento aumenta la delega dei Drift, l'host chiede prima conferma con un dialogo modale dell'editor: annullare non salva nulla e il menu torna al valore di prima; ridurre la delega non chiede conferma. Un cambiamento salvato è il cambio di delega del developer (`developer.SET_DRIFT_AUTOPILOT`).
- La scheda mostra sempre il valore utente; per `trama.skillsDir`, `trama.language` e `trama.submitWhileRunning`, quando un valore del workspace prevale, un avviso dice quale valore vale davvero.
- `editor.SETTINGS_CHANGED`: a ogni cambiamento delle impostazioni di Trama, da qualunque parte, la scheda Settings mostra subito i nuovi valori anche quando è nascosta, senza sovrascrivere un campo che il developer sta scrivendo e non ha confermato, e i pulsanti della Board che dipendono dalle impostazioni si aggiornano.
- L'host accetta il messaggio di scrittura solo per chiavi del manifest e valori conformi al loro schema; `trama.maxParallelAgents` è `integer` nel manifest; lo schema e i testi si leggono a runtime dal manifest; un test verifica che ogni chiave del manifest abbia un gruppo.
- Aspetto, testi inglesi, accessibilità, documentazione e changelog come nei Requisiti `ui`, `tech` e `quality` di `panel/Settings`.
