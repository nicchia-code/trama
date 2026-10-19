---
technical: true
refs:
  - requirements/ui#panel/Settings
---
# Descrizione del blocco sperimentale

La descrizione dell'impostazione `trama.experimentalDriftBlocker`, in `extension/package.json` e quindi nella scheda Settings e nelle impostazioni dell'editor, diventa esattamente:

«Experimental. On: the agent that files a Drift checks which of the Tasks it would block are really affected, blocks only those and says why it leaves each other one free; a Drift that blocks no Task is filed inside a resolution Proposal for you to approve. Off (the default): a Drift blocks every Task that concerns the same thing, except the Tasks the pre-flight of a Run leaves free. Only agents started by Trama follow it.»

Titolo, gruppo `Experimental`, casella di spunta e default restano come sono.
