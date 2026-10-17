---
technical: false
refs:
  - panel/Settings
  - panel/Open/developer.SHOW_SETTINGS
  - requirements/ui#panel/Settings
---
# Casella Experimental Drift Blocker nella scheda Settings

Quando il developer apre la scheda Settings (`developer.SHOW_SETTINGS`), la scheda mostra sei gruppi invece di cinque: in fondo, dopo `Project`, c'è il nuovo gruppo `Experimental` con la sola impostazione `trama.experimentalDriftBlocker`, larga tutta la pagina come gli altri gruppi con una sola impostazione.

- Il manifest `extension/package.json` dichiara `trama.experimentalDriftBlocker`: tipo boolean, predefinito `false`, `scope: "application"`, e `markdownDescription` con esattamente il testo inglese: «Experimental. On: the agent that files a Drift checks which of the Tasks it would block are really affected, blocks only those and says why it leaves each other one free; a Drift that blocks no Task is filed inside a resolution Proposal for you to approve. Off (the default): a Drift blocks every Task that concerns the same thing. Only agents started by Trama follow it.»
- In `extension/src/host/settings-schema.ts` `SETTING_GROUPS` ha un sesto gruppo `Experimental`, ultimo, con `trama.experimentalDriftBlocker`; l'ordine e il contenuto degli altri cinque gruppi restano quelli di oggi.
- L'impostazione ha il titolo `Experimental Drift Blocker`, la «i» con il fumetto che mostra la descrizione del manifest resa come Markdown, e come controllo una casella di spunta (come `trama.autoExit`), con il titolo come nome accessibile e la descrizione collegata con `aria-describedby`. Spuntarla o toglierla scrive subito il valore utente; una scrittura fallita mostra `Trama: could not save Experimental Drift Blocker: <motivo>.` e la casella torna al valore reale.
- Con l'impostazione assente la casella è vuota (spento, il comportamento di oggi).
- `test/settings-schema.test.ts` verifica i sei gruppi nell'ordine `Agent`, `Models`, `Drift autopilot`, `Runs`, `Project`, `Experimental`, che `trama.experimentalDriftBlocker` sta nell'ultimo ed è una casella di spunta.
- `extension/README.md`, dove elenca i gruppi della scheda Settings, aggiunge il gruppo `Experimental` con l'impostazione e una breve spiegazione.
