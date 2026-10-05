---
column: done
technical: false
refs:
  - panel/Diagram
  - panel/Board
  - agent-terminal/No agent terminal
  - requirements/rules#agent-terminal
drift: null
proposal: "35646969"
agent: false
created: 1970-01-01T00:00:00.101Z
---
# Remove the Fix button and the Fix with Agent command from the editor

Il developer non può più chiedere all'agente di correggere un problema. Quando è finito: nel Diagram, nella Board e nella scheda Requirements non c'è più il bottone Fix…; nella palette dei comandi non c'è più «Trama: Fix with Agent…»; nessuna richiesta di Fix può essere inviata al terminale dell'agente o alla chat; l'istruzione «Use the trama-fix skill. …» non esiste più e la frase sulla lingua riguarda solo design, scan, import, implement, implement all, rework di una Proposal obsoleta e scan automatico. Restano uguali Design…, Scan, Run all To do e la decisione sui Drift («Keep this»). Vanno aggiornati i test che coprivano l'azione Fix.
