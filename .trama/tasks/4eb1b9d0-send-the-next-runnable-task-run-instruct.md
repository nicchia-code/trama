---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
drift: null
proposal: c3b518a6
agent: false
created: 1970-01-01T00:00:00.126Z
---
# Send the next-runnable-Task run instructions for Run all To do and Run this design

Le istruzioni inviate all'agente da Run all To do e da Run this design non dicono più di procedere in ordine e di fermarsi al primo Drift. Run all To do invia: "Use the trama-implement skill on every Task in the \"todo\" column. Take each one from `trama task next`, one after the other, until it says there is none." Run this design invia: "Use the trama-implement skill on every Task of Proposal <id> that is in the \"todo\" column. Take each one from `trama task next --proposal <id>`, one after the other, until it says there is none." Con la lingua impostata, la frase sulla lingua resta in fondo alla stessa riga, come per le altre istruzioni.
