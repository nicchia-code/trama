---
column: done
technical: true
refs:
  - requirements/tech#task
drift: null
proposal: null
agent: false
created: 2026-10-17T18:40:09.587Z
finished: 2026-10-17T19:05:32.014Z
---
# Passare --not-proposal in ogni passo di trama-implement

La skill trama-implement passa i filtri della corsa tali e quali a ogni chiamata di trama task next --batch e al pre-flight, anche quando la corsa esclude delle Proposal con --not-proposal. Oggi il passo di avanzamento e quello di verifica della corsa dicono ancora di ripetere solo --proposal, quindi una corsa con --not-proposal può perdere il filtro dal secondo gruppo in poi. Ogni passo che ripete un filtro deve dire che vale per --proposal e per --not-proposal.
