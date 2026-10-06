---
column: done
technical: false
refs:
  - agent-launching
  - requirements/tech#proposal
  - requirements/quality#task
  - requirements/tech#General
drift: null
proposal: rhfwtu3m
agent: false
created: 2026-10-06T10:45:28.991Z
---
# Insegnare a trama-scan l'ambito di scansione di una Proposal e un sotto-agente per Machine

La skill `trama-scan`, quando l'istruzione la limita a ciò che una Proposal ha cambiato, legge `## Scan scope` con `trama proposal show <id>` e confronta con il codice solo quei riferimenti, leggendo le Machine solo quanto basta per capirli. Legge una volta `trama task list` e `trama drift list` e divide il lavoro per Machine: quando l'agente ha dei sotto-agenti ne dà una a ciascuno, al massimo quattro insieme, con i Task e i Drift aperti che la riguardano e i riferimenti dell'ambito; ogni sotto-agente confronta, annuncia e archivia le proprie schede e torna con il loro elenco. I Requisiti General e le sezioni che non nominano una Machine restano all'agente principale, che scrive l'unico resoconto. Senza sotto-agenti fa lo stesso lavoro un passo alla volta, senza nominare lo strumento di un agente preciso.
