---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
  - requirements/rules#task
drift: null
proposal: "0029"
agent: false
---
# Togliere dalla Board frecce, trascinamento, Take back e scheda occupata dei Task

La Board non offre alcun modo di spostare, trascinare, riprendere o rimuovere una scheda: né frecce né trascinamento né bottone Take back, né su un Task da solo, né su una riga di Task dentro una scheda design, né su una scheda design. Non disegna nessuno stato per uno spostamento in corso (niente scheda attenuata o occupata) e nessun errore di spostamento. Un Task preso dall'agente mostra il suo pallino animato, anche dentro un design, e Run all To do e Run this design restano disabilitati con la ragione. Le mosse fatte dalla riga di comando compaiono quando la Board riceve i Task successivi. Restano link al Diagramma, apertura e chiusura delle schede design, Show details e chiusura degli avvisi; il badge di un Task bloccato non disabilita alcun controllo.
