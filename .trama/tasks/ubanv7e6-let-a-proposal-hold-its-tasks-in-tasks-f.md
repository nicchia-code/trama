---
column: done
technical: false
refs:
  - proposal/Draft/agent.EDIT_PROPOSAL
  - proposal/Open/agent.EDIT_PROPOSAL
  - requirements/data#proposal
  - requirements/tech#proposal
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:39:00.709Z
finished: 2026-10-14T09:23:48.729Z
---
# Let a Proposal hold its Tasks in tasks files

Il design scrive i Task di una Proposal ordinaria come file dentro la Proposal, uno per Task.

- `trama proposal edit <id> tasks/<slug>.md` crea in modo esclusivo il file di un Task nuovo, con un'identità permanente unica fra i Task del progetto e quelli di tutte le Proposal, e stampa il percorso da riempire.
- Per riscrivere un Task si passa il nome completo stampato; `trama proposal delete <id> tasks/<nome>.md` lo toglie.
- Ogni modifica riporta la Proposal in Draft, come ogni altra modifica di un suo file.
- Il file di un Task ha nel front matter solo `technical` e `refs`, poi il titolo e il corpo; ogni altro campo è un errore di validazione.
- I Task non hanno una base e non rendono la Proposal obsoleta.
- La Proposal legge e mostra i propri Task a ogni comando che la guarda.
