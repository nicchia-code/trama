---
column: done
technical: false
refs:
  - task
  - panel/Board
  - agent-terminal
  - requirements/rules#task
  - requirements/tech#task
  - requirements/ui#panel/Board
drift: null
proposal: "0028"
agent: false
---
# Describe the runs that skip blocked Tasks in the documentation and acceptance script

La documentazione descrive `trama task next [--proposal <id>]` e le corse che saltano i Task bloccati e proseguono dopo un Drift, e non parla più di fermarsi al primo Drift. Lo script di accettazione verifica le nuove istruzioni di Run all To do e di Run this design, il comando `trama task next` nei due esiti (un Task eseguibile, nessun Task eseguibile con l'elenco dei bloccati) e i bottoni disabilitati quando ogni Task in To do è bloccato.
