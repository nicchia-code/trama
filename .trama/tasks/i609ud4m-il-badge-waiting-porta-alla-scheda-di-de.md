---
column: done
technical: true
refs:
  - requirements/ui#panel/Board
drift: null
proposal: null
agent: false
created: 2026-10-06T13:52:52.624Z
---
# Il badge waiting porta alla scheda di design che contiene il Task di correzione

Un Task bloccato in attesa del Task di correzione mostra il badge `waiting`, che secondo il Requisito porta alla scheda di quel Task. Il Task di correzione appartiene al design del Task da cui è nato il Drift, quindi di solito non ha una scheda propria: sta come riga dentro una scheda di design. Oggi in quel caso il clic sul badge non fa nulla.

Fatto quando:
- il badge `waiting` porta sempre a una scheda visibile: la scheda del Task se ne ha una, altrimenti la scheda di design che lo contiene (aperta, se serve, per mostrare la riga del Task);
- lo stesso vale per i Task di un worktree e per il badge `blocked` di un Task di un worktree, che porta alla scheda del Drift;
- il badge continua a non disabilitare nessun controllo.
