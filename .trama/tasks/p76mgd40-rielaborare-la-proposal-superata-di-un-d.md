---
column: done
technical: false
refs:
  - drift/Open/agent.REPLACE_DRIFT_PROPOSAL
  - requirements/ui#drift
drift: null
proposal: null
agent: false
created: 2026-10-06T15:38:53.173Z
finished: 2026-10-06T15:41:52.516Z
---
# Rielaborare la Proposal superata di un Drift nato in un worktree

Un Drift nato nel worktree di un giro, con una Proposal allegata che è diventata superata (stale), si mostra sulla Board del progetto aperto con il Keep this di sinistra disabilitato e l'avviso che offre «Rework Proposal». Oggi quel pulsante non arriva all'agente: il Drift viene cercato nella cartella aperta, dove non esiste, e la richiesta fallisce.

Quando è fatto:
- «Rework Proposal» su un Drift di un worktree chiede la rielaborazione all'agente di quel worktree, che vede il Drift e la sua Proposal;
- l'agente scrive la nuova Proposal e la allega al Drift al posto di quella superata, che viene rifiutata con il feedback «Replaced by Proposal <id>»;
- per i Drift della cartella aperta non cambia nulla.
