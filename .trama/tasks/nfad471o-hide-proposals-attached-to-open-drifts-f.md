---
column: done
technical: false
refs:
  - panel/Diagram
  - panel/Open/developer.SHOW_DIAGRAM
  - requirements/ui#proposal
  - requirements/ui#drift
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:16:01.132Z
finished: 2026-10-09T08:31:47.726Z
---
# Hide Proposals attached to open Drifts from the Diagram

Una Proposal allegata a un Drift aperto non deve comparire in nessuna parte del pannello.

Quando è finito:
- il selettore della Proposal disegnata, nel Diagramma e nella scheda Requirements, non elenca le Proposal allegate a un Drift aperto (e quindi niente più suffisso col numero del Drift); una Proposal ancora aperta di un Drift già risolto resta nel selettore come le altre;
- selezionare un Drift nel Diagramma, o arrivarci dalla Board (developer.SHOW_DIAGRAM con un Drift da mostrare), non disegna più la sua Proposal allegata sopra il Modello: il Diagramma resta sulla Proposal scelta dal developer;
- una richiesta di mostrare nel Diagramma una Proposal allegata a un Drift aperto è ignorata, come una Proposal che non esiste;
- i dettagli di una Proposal non hanno più il collegamento «Decide on Drift»: i dettagli che restano sono quelli delle Proposal da decidere, con Approve e Reject;
- se la Proposal disegnata diventa allegata a un Drift aperto, il Diagramma torna a «None» e ripiega sul livello più vicino che esiste ancora, come per developer.CHOOSE_DRAWN_PROPOSAL.

La rimozione dei controlli di decisione dal confronto del Drift è coperta da un altro Task.
