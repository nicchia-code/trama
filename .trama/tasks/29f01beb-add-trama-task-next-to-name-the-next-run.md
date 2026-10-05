---
column: done
technical: false
refs:
  - task/To do
  - requirements/rules#task
  - requirements/tech#task
drift: null
proposal: c3b518a6
agent: false
created: 1970-01-01T00:00:00.125Z
---
# Add trama task next to name the next runnable Task

Il comando `trama task next` stampa il prossimo Task eseguibile, con ID e titolo, e non sposta nulla. Un Task è eseguibile quando è in To do e non è bloccato; il prossimo è quello con il numero più basso, ricalcolato a ogni richiesta, così un Task che attende il Task che ripara il suo Drift torna eseguibile appena quel Task è Done e il Task di riparazione passa per primo.

Con `--proposal <id>` considera solo i Task collegati a quella Proposal; se la Proposal non esiste il comando è rifiutato. Quando nessun Task è eseguibile lo dice nella prima riga ed elenca ogni Task ancora in To do in quell'ambito, con il Drift o il Task di riparazione che lo blocca, marcato come in `trama task list`. Entrambi gli esiti terminano con successo.
