---
status: approved
base:
  agent-launching/feature.md: 133b68aaedae646828ee96d5d87daa06c7d5692504cd075d7c0bdf1a024d7266
  agent-launching/agent-terminal.md: 5c06317ebb2fc3b0543b7fecc2af924dfa0ad9f818f5e614b41502c486892a7d
  project-setup/project.md: af6897f834fba24ca9026d4d3a39c370510af771f876002c8aeaf46f264417cf
  requirements/rules/models.md: 4ab1413816dc47e6bfb7898e627ba3414f6848976f86c1b2a3f20f240d1802f9
  requirements/tech/models.md: 2323cea6af66c15737c851550b03cc686503f8855ae79127c135c030bb6d9c4e
  requirements/ui/agents.md: 6c8f74e498860c13cf994f4c48090e19880426dfd3ebf058b3f0f265874bed16
  requirements/tech/agent-terminal.md: 4e3c0779fe5ea6fa26ff9899775755608094e4d7e20e323eb8d7b65f81d35961
  requirements/rules/project.md: 2e5b0275afa9a3d4061148ab6090f308f3c5d3e498132da25f60e428c18ab190
  requirements/quality/main.md: dda2c50445e8eaa1c203f870795df5fb72d2f0e8c7f883376bb8901cc6abb684
delete: []
created: 2026-10-11T08:31:44.412Z
scanScope:
  - ref: agent-launching
    reason: changed
  - ref: agent-terminal
    reason: changed
  - ref: project/Not a Trama project/developer.INITIALIZE_PROJECT
    reason: changed
  - ref: project/Trama project/developer.UPDATE_SKILLS
    reason: changed
  - ref: requirements/quality#editor-chat
    reason: changed
  - ref: requirements/quality#agent-launching
    reason: changed
  - ref: requirements/rules#agent-launching
    reason: changed
  - ref: requirements/rules#project
    reason: changed
  - ref: requirements/tech#agent-terminal
    reason: changed
  - ref: requirements/tech#agent-launching
    reason: changed
  - ref: requirements/ui#agent-launching
    reason: changed
---
# Model roles in the editor chat

La selezione dei modelli non funziona con la chat di Cursor: oggi i ruoli `trama.analysis`, `trama.scan` e `trama.execution` valgono solo per omp e Claude Code, e in chat il developer riceve solo un avviso. Il codice di Cursor 3.22.12 accetta un modello per la conversazione nuova creata con `composer.createNew`, e VS Code 1.135 accetta un `modelSelector` in `workbench.action.chat.open`: i ruoli possono valere anche nelle chat.

Decisioni:
- I ruoli valgono nella chat di Cursor e in quella di Copilot; l'avviso «i ruoli non valgono in chat» sparisce.
- In Cursor il modello vale solo per la conversazione creata da Trama: il selettore del developer non cambia.
- In Copilot il modello scelto resta nel selettore della chat (VS Code lo salva come scelta del developer): accettato.
- I sotto-agenti di confronto ricevono `trama.scan` da una definizione utente `trama-analysis`: `~/.cursor/agents/trama-analysis.md` in Cursor, `~/.copilot/agents/trama-analysis.agent.md` in VS Code; l'istruzione di scansione in chat nomina il sotto-agente come nel terminale.
- La definizione utente la scrivono l'inizializzazione e Update skills fatte dall'editor, ciascun editor quella della sua chat, anche quando `trama.agent` non è `chat`; la riga di comando non la tocca. Un cambio di `trama.scan` arriva al file solo col prossimo Update skills.
- Una definizione utente già presente e diversa non blocca l'inizializzazione: si riscrive senza chiedere.
- Gli stessi tre ruoli valgono per ogni agente: il developer scrive il nome come lo accetta l'agente scelto in `trama.agent`.
- In Copilot il nome è quello mostrato nel selettore della chat; Trama cerca il modello con quel nome. Se nessun modello corrisponde, l'istruzione parte senza modello e un avviso nomina il ruolo non trovato.
- In Cursor la modalità Max resta spenta nelle conversazioni con un modello del ruolo.
- Se `composer.createNew` fallisce, il ripiego (deeplink, appunti) parte senza modello, senza avvisi in più.

Assunzioni da verificare:
- Un nome sbagliato in Cursor lo segnala Cursor nella conversazione; Trama non controlla i nomi.
- In Copilot l'uso dei sotto-agenti personalizzati dipende dall'impostazione sperimentale di VS Code `chat.customAgentInSubagent.enabled`, che Trama non tocca.
- Nelle definizioni utente il nome del modello è una stringa YAML citata, così un nome non aggiunge altri campi.
- L'inizializzazione fatta dall'editor scrive la definizione utente solo dopo aver creato il progetto; se è rifiutata o annullata non la scrive.
- Testo dell'avviso di Copilot: `Trama: no Copilot model is named "<nome>" (<impostazione>). The instruction was sent with the model chosen in the chat.`, mostrato a ogni istruzione in cui il nome non si trova.
- Il nome in Copilot si confronta come VS Code fa negli agenti personalizzati: `<name> (<vendor>)`, oppure solo `<name>` per il fornitore `copilot`. Va verificato che `vscode.lm.selectChatModels()` elenchi tutti i modelli del selettore della chat.
