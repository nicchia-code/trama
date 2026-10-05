---
column: done
technical: false
refs:
  - task
  - requirements/tech#task
  - requirements/rules#task
drift: null
proposal: c3b518a6
agent: false
created: 1970-01-01T00:00:00.128Z
---
# Make trama-implement take Tasks from trama task next and go on past a Drift

La skill trama-implement, quando le vengono chiesti più Task, prende ciascuno da `trama task next` (con `--proposal <id>` per una design), lo implementa e richiede il successivo finché il comando dice che non ce n'è più. Quando deve segnalare un Drift lo registra con il Task di origine, lascia quel Task In progress e richiede `trama task next`: un Drift non chiude la corsa. Se le viene chiesto un solo Task e lo spostamento in In progress è rifiutato perché il Task è bloccato, si ferma subito, nomina il Task e il Drift (o il Task di riparazione) indicati dal rifiuto e non prende altri Task. Il rapporto finale dice cosa è stato implementato, quali Drift sono stati registrati e quali Task in To do sono rimasti fermi, ciascuno con il Drift o il Task di riparazione che lo blocca.
