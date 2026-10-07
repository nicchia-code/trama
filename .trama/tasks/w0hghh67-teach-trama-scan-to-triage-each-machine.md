---
column: done
technical: false
refs:
  - work
  - requirements/rules#work
  - requirements/tech#agent-launching
drift: null
proposal: w2cspsnx
agent: false
created: 2026-10-07T15:00:25.521Z
finished: 2026-10-07T15:12:03.952Z
---
# Teach trama-scan to triage each Machine before analysing it and to report the triage

Quando è fatto, ogni scansione (anche quella finale di una corsa di implementazione) smista una alla volta le Machine del suo ambito; General e sezioni senza Machine restano all'agente che guida, senza smistamento.
- Il sotto-agente di smistamento trova il codice della Machine, prepara lo stato (`trama machine <id>`, Requisiti che la riguardano, estratti di codice), chiama `trama classify` e con `unavailable` decide da sé, scegliendo il conflitto nel dubbio.
- Una Machine senza conflitto non produce Task, Drift né Proposal; una in conflitto passa al sotto-agente di analisi, che confronta e archivia come oggi.
- Al più quattro sotto-agenti insieme, anche per smistamento e analisi.
- Il resoconto ha la riga sullo smistamento dei Requisiti `rules`, che dice anche quando i ruoli dei sotto-agenti non sono stati applicati.
