---
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
---
# Un solo pulsante in fondo a Work Items e a Ready

In fondo alla colonna Work Items della Board, dopo le schede e i ghost, c'è soltanto il pulsante `+ Work Item`, mai `Run all`. In fondo alla colonna Ready, dopo le schede e i ghost, c'è soltanto il pulsante `Run all`, mai `+ Work Item`. In progress e Done non hanno pulsanti in fondo.

Entrambi i pulsanti restano anche quando la loro colonna è vuota, sotto il suo testo, e mantengono aspetto, testi, tooltip, nome accessibile e comportamento di oggi: `+ Work Item` apre una nuova richiesta di design scritta come `Add Work Item…` della barra; `Run all` chiede all'agente di realizzare tutti i Task in To do come `Run Ready Tasks` della barra, ed è disabilitato negli stessi casi e con gli stessi motivi. I pulsanti della barra restano.
