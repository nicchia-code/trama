---
column: done
technical: false
refs:
  - design-request/Writing
  - requirements/data#design-request
  - requirements/tech#design-request
drift: null
proposal: "0034"
agent: false
---
# Dare alle richieste scritte un ID di data e ora e crearne il file vuoto

Una richiesta scritta ha come ID la data e l'ora locali della sua creazione con i secondi, nella forma `AAAA-MM-GGTHH-MM-SS` (per esempio `2026-10-04T19-05-12`); se quel file esiste già, l'ID prende il suffisso `-2`, `-3`, … fino al primo libero. Non ci sono più ID casuali di sei caratteri.

Fatto quando:
- si può creare una richiesta nuova **vuota** in `.trama/requests/<id>.md`, scrivendo la cartella e il suo `.gitignore` se mancano;
- `trama proposal new --request <id>` riconosce e lega gli ID nella forma nuova (con o senza suffisso), e `trama proposal submit` consuma quel file come oggi;
- riconoscere se un file appartiene alle richieste del progetto funziona con gli ID nuovi.
