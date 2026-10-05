---
column: done
technical: false
refs:
  - project/Not a Trama project/developer.INITIALIZE_PROJECT
  - requirements/rules#project
drift: null
proposal: euf9nx59
agent: false
created: 2026-10-05T13:21:54.293Z
---
# Creare all'inizializzazione le Aree di partenza come cartelle con solo area.md

Inizializzando un progetto, ognuna delle cinque Aree di partenza (`ui`, `tech`, `quality`, `data`, `rules`) nasce come cartella `requirements/<area>/` che contiene solo `area.md`, con la descrizione e il titolo dell'Area e nessun frammento: il primo frammento lo scrive l'agente. Anche l'aggiornamento delle skill, quando il progetto non ha nessuna cartella `requirements/`, crea le Aree di partenza in questa forma. Il resto dell'inizializzazione non cambia.
