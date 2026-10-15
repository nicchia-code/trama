---
column: done
technical: false
refs:
  - agent-launching
  - requirements/ui#agent-launching
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:36:30.350Z
finished: 2026-10-14T09:19:52.759Z
---
# Rewrite the trama.scan setting description for the new scan rules

La descrizione dell'impostazione trama.scan dice ancora che il modello vale per le scansioni dopo l'approvazione di una Proposal, e non nomina il pre-flight all'inizio di ogni Run. Va riscritta in inglese: il modello vale per le scansioni del Sistema e delle Feature e per i sotto-agenti che confrontano le Machine, compresi quelli del pre-flight dei Run; nessuna descrizione nomina più una scansione dopo l'approvazione. Restano invariate le indicazioni sul nome del modello, sul modello vuoto e sul caso di Copilot.
