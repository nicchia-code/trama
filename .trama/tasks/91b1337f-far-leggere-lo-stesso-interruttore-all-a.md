---
column: done
technical: false
refs:
  - proposal/Open/developer.APPROVE_PROPOSAL
  - proposal/Open/drift.PROPOSAL_ACCEPTED
  - worktree-round/No round/developer.APPROVE_PROPOSAL
  - worktree-round/In progress/developer.APPROVE_PROPOSAL
  - multi-branch/On
  - multi-branch/On/developer.TURN_MULTI_BRANCH_OFF
  - requirements/rules#multi-branch
  - requirements/tech#multi-branch
  - requirements/rules#worktree-round
drift: null
proposal: e6051b33
agent: false
created: 1970-01-01T00:00:00.180Z
---
# Far leggere lo stesso interruttore all'accettazione, nel pannello e nel comando

Accettare una Proposal ordinaria usa lo stesso interruttore del pannello, sia dal pannello sia con `trama proposal approve`.

Fatto quando:
- Acceso, una Proposal ordinaria segue la strada del worktree e gli stessi rifiuti del pannello, e non copia i file nella cartella aperta. L'agente dei worktree parte come quando si accetta dal pannello.
- Spento, l'accettazione resta nella cartella aperta. Un'accettazione fatta a interruttore spento non entra nel giro.
- Spegnere non toglie le Proposal dal giro e non elimina i worktree. Riaccendere mentre il giro è ancora aperto fa entrare le accettazioni successive, dallo stesso commit di partenza.
- Illeggibile: l'interruttore conta come spento e la Proposal è applicata nella cartella aperta. `trama proposal approve` stampa `Trama could not read the multi-branch switch, so it is off.`
- Accettare la Proposal attaccata a un Drift copia i file nella cartella aperta anche con l'interruttore acceso, e non apre un worktree.
