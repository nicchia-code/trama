---
status: approved
base:
  editor-panel/panel.md: 479f606432b017fed1131f1dca4158fd6726772de4bbfa866e73b7d84050914e
  editor-panel/feature.md: 5f13fba445f5b7de8b4f2916e3de84e325362c55d5cf0b5858a4544569f0e01f
  actors/developer.md: ca5632117857383cb70ca1e40affe77ce07bba0812e3fb660472b52287c8a052
  actors/editor.md: b628228f7c4374fb04822e76b74fd9d3b9120282f1252c9d88483f3af27b6c65
  requirements/ui/panel.md: 76f2b0551793a99022fc39b06b13e067623642028b8676426978899c05bf347c
  requirements/ui/agents.md: 0244cdebbdab9aad8958162b6fd3702e9dc314e79deb00f4c9cd1e818fd126ec
  requirements/tech/project-panel.md: dda9e7e62d54ed1d1b14c25a9961874c6dab954fe0bd9186d32e8543f7e5c81e
  requirements/quality/main.md: bd11559f7b8d609269e9499684cbcaef283319f53a507f4f53930889cd0357db
delete: []
request: 2026-10-14T21-34-59
created: 2026-10-14T19:59:38.911Z
---
# Settings tab in the panel

Il developer vuole cambiare le impostazioni di Trama da un pannello grafico, con la spiegazione di ogni parametro e un dropdown dove il manifest ha un enum, invece di passare dalle impostazioni di VS Code o da settings.json.

Decisioni prese nel colloquio:
- Una quarta scheda Settings nel pannello Trama, come tab di testo dopo Requirements; nessun comando nuovo nella palette.
- Mostra tutte le impostazioni `trama.*` del manifest, in gruppi con titolo: Agent, Models, Drift autopilot, Runs, Project.
- Ogni impostazione ha un titolo leggibile e la sua chiave; la spiegazione è la descrizione del manifest, unica fonte.
- Dropdown per gli enum, con sotto la spiegazione del valore scelto; casella di spunta per `trama.autoExit`; campi di testo per modelli, lingua e cartella delle skill; campo numerico per `trama.maxParallelAgents`.
- `trama.driftAutoPilot` e `trama.submitWhileRunning` ricevono una spiegazione per ogni valore nel manifest.
- Ogni cambiamento si salva subito (i campi di testo quando perdono il fuoco o con Invio), sempre nelle impostazioni utente.
- Scegliere il valore predefinito, o lasciare vuoto un campo libero, toglie il valore dalle impostazioni utente.
- Un valore non valido non si salva e il campo mostra l'errore.
- Se la scrittura fallisce, l'errore è mostrato e il controllo torna al valore reale.
- Aumentare la delega dei Drift chiede conferma in un dialogo modale dell'editor; annullare riporta il dropdown al valore di prima; ridurla è immediato.
- Per le impostazioni che valgono anche nel workspace, la scheda mostra il valore utente e un avviso quando un valore del workspace prevale.
- La scheda segue subito i cambiamenti fatti fuori (settings.json, impostazioni di VS Code), anche nascosta.

Scelte mie, da controllare:
- Il titolo leggibile si ricava dalla chiave separando le parole (`maxParallelAgents` → «Max Parallel Agents»), come fa VS Code.
- `trama.maxParallelAgents` diventa `integer` nel manifest, così lo schema dice già che 2.5 non è valido.
- I testi della scheda e del dialogo sono in inglese, come il resto dell'interfaccia.
- Un campo che il developer sta scrivendo e non ha ancora confermato non viene sovrascritto quando le impostazioni cambiano altrove.
- Un campo di testo vuoto mostra come segnaposto il valore predefinito, quando non è vuoto.
- Una scrittura fallita è annunciata con un messaggio di errore dell'editor.
- Il dialogo di conferma ha il pulsante `Enable` e un messaggio diverso per `enabled` e `yolo`.

## Already present
- `drift-resolution/Free/developer.SET_DRIFT_AUTOPILOT` — `extension/src/host/main.ts` (`onDidChangeConfiguration` → `Controller.settingsChanged`) e `extension/src/host/controller.ts` (`autopilotTick`, modalità letta da `inspect("driftAutoPilot").globalValue`)
- `drift-resolution/In attesa delle scansioni/developer.SET_DRIFT_AUTOPILOT` — `extension/src/host/main.ts` e `extension/src/host/controller.ts`, come sopra
- `drift-resolution/Running tasks/developer.SET_DRIFT_AUTOPILOT` — `extension/src/host/main.ts` e `extension/src/host/controller.ts`, come sopra
- `drift-resolution/Resolving/developer.SET_DRIFT_AUTOPILOT` — `extension/src/host/main.ts` e `extension/src/host/controller.ts`, come sopra
