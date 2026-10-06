---
column: done
technical: false
refs:
  - worktree-round/In progress/developer.FIX_DRIFT_CODE
  - requirements/tech#worktree-round
drift: null
proposal: null
agent: false
created: 2026-10-06T13:46:35.843Z
---
# Legare alla Proposal del worktree il Task di correzione di un Drift della scansione

Quando il developer, dalla Board del progetto aperto, decide di correggere il codice per un Drift che vive nel worktree di una Proposal del giro, il Task di correzione che nasce lì appartiene a quella Proposal, anche quando il Drift non viene da un Task (per esempio è stato registrato dalla scansione del worktree). Così:
- l'esecuzione dei Task rimasti che Trama rilancia nel worktree prende anche il Task di correzione;
- l'unione del giro non parte finché il Task di correzione non è in Done, come per ogni altro Task di quella Proposal.
Oggi il Task di correzione eredita la Proposal solo dal Task da cui è nato il Drift: un Drift della scansione produce un Task senza Proposal, che il rilancio non esegue e che non trattiene l'unione.
