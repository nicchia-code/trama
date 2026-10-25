---
created: 2026-10-25T18:29:08.193Z
updated: 2026-10-25T18:29:08.193Z
summary: Manager mode è l'interruttore di Team per la copia di lavoro. Con origin su GitHub compare la vista Team con la scheda People, dove il Manager gestisce le persone; l'agente le legge con trama team show.
tasks:
  - vjlfwi2g
  - 82hg34d3
  - 8573cwl2
---
# Manager mode e vista Team con le persone

Manager mode si accende e si spegne da Settings, dal wizard di setup e da `trama project new`/`edit`. È registrata solo in locale (`.trama/manager/mode.json`, mai committato) e Team è disponibile solo con origin su GitHub. Con Team disponibile il menu laterale ha la voce Team e il comando Trama: Show Team. La scheda People permette di aggiungere, modificare, togliere dal team e cancellare persone, con livello, skill, capacità per sprint e assenze. Le persone vivono solo nell'editor (`globalState`) e non finiscono nel progetto. `trama team show` le stampa all'agente, in Markdown o con `--json`, chiedendole alla finestra dell'editor che l'ha lanciato.
