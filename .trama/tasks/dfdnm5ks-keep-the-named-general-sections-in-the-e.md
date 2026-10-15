---
column: done
technical: false
refs:
  - task
  - requirements/rules#task
  - requirements/tech#task
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:41:04.561Z
finished: 2026-10-14T09:50:01.788Z
---
# Keep the named General sections in the end-of-run scan scope

Lo scan mirato di fine corsa include le sezioni General nominate dai Task portati in Done dalla corsa: il comando che calcola l'ambito le deve dare come riferimento della General dell'Area, con motivo changed. Oggi le salta e la scansione non le confronta. La General entra nell'ambito ma la sua regola si confronta solo con il codice che la corsa ha toccato; un'Area intera non aggiunge nulla. Quando è fatto, una corsa di soli Task su General scansiona quel codice, e l'uscita JSON del comando dà lo stesso elenco.
