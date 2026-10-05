---
column: done
technical: false
refs:
  - worktree-round/In progress/developer.FIX_DRIFT_CODE
  - worktree-round/In progress/developer.ACCEPT_DRIFT_PROPOSAL
  - worktree-round/In progress/developer.DISMISS_DRIFT
  - drift
  - requirements/tech#worktree-round
  - requirements/ui#worktree-round
drift: null
proposal: b4ce3d0d
agent: false
created: 1970-01-01T00:00:00.173Z
---
# Decidere i Drift dei worktree dalla Board del progetto aperto

I Task e i Drift nati in un worktree si vedono sulla Board del progetto aperto e si decidono lì. La decisione è scritta nel worktree e non apre un altro giro.

Fatto quando:
- Task e Drift dei worktree compaiono sulla Board del progetto aperto con il badge `worktree`.
- Run all To do e Run this design della cartella aperta non li lanciano.
- `trama task next` nella cartella aperta non li vede.
- Tenere il lato del modello, accettare la Proposal attaccata o tenere il codice scrive la decisione nel worktree. L'accettazione della Proposal vale dentro quel worktree.
- Dopo la decisione Trama rilancia in quel worktree l'esecuzione dei Task rimasti.
