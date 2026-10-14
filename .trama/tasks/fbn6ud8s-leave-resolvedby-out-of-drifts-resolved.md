---
column: done
technical: true
refs:
  - requirements/data#drift
drift: null
proposal: null
agent: false
created: 2026-10-13T05:14:16.361Z
finished: 2026-10-13T05:15:47.825Z
---
# Leave resolvedBy out of Drifts resolved in another way

Un Drift risolto in un modo diverso da una Proposal di risoluzione non deve avere il campo resolvedBy nel suo file: il campo è assente, non scritto con valore vuoto. Oggi viene scritto come vuoto anche per i Drift risolti dalla riga di comando, con correzione del codice, Proposal accettata o chiusura. Il campo resta solo quando c'è una Proposal di risoluzione che ha deciso il Drift, come già avviene per created, finished e previous quando sono vuoti.
