---
column: done
technical: false
refs:
  - proposal
  - task
  - drift
  - requirements/rules#General
  - requirements/rules#task
  - requirements/ui#panel/Board
drift: null
proposal: "0037"
agent: false
---
# Ordinare Proposal, Task e Drift per istante di creazione

Le schede dello stesso tipo si leggono dalla più vecchia, e il prossimo Task eseguibile è il più vecchio fra quelli eseguibili.

Fatto quando:
- L'ordine di creazione è l'istante `created`, il più vecchio prima. A parità di istante decide l'identità, in ordine crescente.
- Una scheda ancora numerata, senza `created`, sta prima di ogni scheda di quel tipo che ha un istante. Fra le numerate l'ordine è il numero, crescente.
- Gli elenchi, la Board e i Task dentro una scheda di design seguono questo ordine. Una scheda di design sta dove sta il suo primo Task. Lo stesso ordine vale per le Proposal, i Task e i Drift nati in un worktree.
- Il prossimo Task eseguibile è il più vecchio in To do che non è bloccato, ricalcolato ogni volta. Con un design si considerano solo i Task di quel design. Il comando che lo nomina lo descrive così, non come il numero più basso.
