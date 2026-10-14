---
column: done
technical: false
refs:
  - drift-resolution/Resolving
  - requirements/rules#question-round
  - requirements/tech#drift
drift: null
proposal: h9rkity1
agent: false
created: 2026-10-12T18:54:09.594Z
finished: 2026-10-12T19:24:45.550Z
---
# Update the resolve-Drifts question round to the new Drift rules

Aggiornare la skill trama-resolve-drifts al round di domande previsto dalla Proposal. Un Drift senza Fix options ma con una Proposal allegata chiede due scelte: adottare la modifica della Proposal allegata (raccomandata, decisione proposal) oppure chiudere senza cambiare nulla (decisione dismissed). Correggere il codice non è una scelta: se la risposta libera lo chiede, la risoluzione registra fix-code senza opzione, con la risposta come nota. Un Drift ricorrente, cioè con un precedente, nel contesto della domanda elenca la catena dei precedenti dal più vicino al più lontano, con identità, titolo e decisione presa; la raccomandazione resta la scelta dell’agente. Va tolto il passo che dice che un Drift con Proposal allegata è sempre proposal e mai dismissed, perché la regola dei Drift consente dismissed anche con una Proposal allegata. Fatto quando la skill descrive queste tre regole e nessun passo le contraddice.
