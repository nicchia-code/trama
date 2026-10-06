---
column: done
technical: false
refs:
  - worktree-round/In progress/developer.ACCEPT_DRIFT_PROPOSAL
  - requirements/tech#worktree-round
  - requirements/ui#worktree-round
drift: null
proposal: null
agent: false
created: 2026-10-06T16:20:19.424Z
finished: 2026-10-06T16:24:27.031Z
---
# Mostrare sulla Board e sul Diagram le Proposal che vivono in un worktree del giro

La Board del progetto aperto deve leggere anche le Proposal che esistono solo nella copia di un worktree del giro, per esempio quella attaccata a un Drift nato nel worktree, come già legge i suoi Task e i suoi Drift.

Oggi il collegamento «Proposal … attached» di un Drift con il badge `worktree` porta al Diagram, ma il Diagram e la vista dei Requisiti non trovano quella Proposal e mostrano il Modello senza le sue modifiche: il developer può accettarla senza averla mai vista.

Fatto quando:
- dalla card di un Drift di worktree con Proposal si apre quella Proposal sul Diagram (e sui Requisiti, se li tocca), disegnata sopra il Modello di quel worktree;
- quella Proposal non compare tra le Proposal da decidere della cartella aperta e non ha Approva né Rifiuta propri: si decide solo dal Drift;
- la decisione resta scritta nel worktree, come oggi.
