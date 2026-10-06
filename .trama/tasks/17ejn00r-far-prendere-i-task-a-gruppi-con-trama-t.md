---
column: done
technical: false
refs:
  - agent-terminal/Agent idle/developer.ASK_AGENT
  - requirements/rules#agent-terminal
drift: null
proposal: rhfwtu3m
agent: false
created: 2026-10-06T10:45:28.383Z
---
# Far prendere i Task a gruppi con trama task next --batch alle istruzioni Run all To do e Run this design

Le istruzioni di Run all To do e di Run this design dicono all'agente di prendere i Task a gruppi: implement all → "Use the trama-implement skill on every Task in the \"todo\" column. Take them from `trama task next --batch`, one group at a time, until it says there is none."; implement a design → "Use the trama-implement skill on every Task of Proposal <id> that is in the \"todo\" column. Take them from `trama task next --batch --proposal <id>`, one group at a time, until it says there is none.". Le altre istruzioni non cambiano.
