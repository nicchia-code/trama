---
technical: true
refs:
  - requirements/tech#task
  - requirements/rules#task
  - requirements/ui#task
  - requirements/quality#agent-terminal
  - requirements/tech#agent-launching
  - requirements/rules#agent-terminal
---
# Comandi dei Task

Si fa dopo il Task del registro dei comandi.

- Comandi: `task new`, `task show <id>`, `task list` e `task move <id> todo|doing|done`.
- `task list` sostituisce `task next` e `task scope`:
  - con `runnable` dà il prossimo Task eseguibile, o fino a `max`, filtrati da `tasks`, `proposals` o `notProposals`. Registra la timing della coda come faceva `--batch`;
  - con `scope` aggiunge l'ambito della scansione: quello del pre-flight, con i riferimenti già confrontati a parte, oppure quello dei Task nominati in `tasks`.
- `task move` prende `unchanged` solo verso `done`.
- Il developer, senza `TRAMA_AGENT` né `CURSOR_AGENT`, che porta in `doing` un Task preso dall'agente se lo riprende: il segno di Task preso sparisce e il Task resta In progress. Ogni altro suo spostamento di quel Task è rifiutato, e il rifiuto rimanda a `trama task move <id> doing`. `task take-back` sparisce.
- Le istruzioni che l'estensione manda all'agente usano i comandi nuovi, come scrive `rules#agent-terminal`:
  - per prendere i Task: `task list` con `runnable`, `max` e i filtri;
  - la frase che dice di chiedere solo con `trama question new`;
  - il campo `request` nell'istruzione della richiesta di design;
  - `trama autopilot show --json`, e `automatic` per la risoluzione automatica.
- La definizione del sotto-agente `trama-analysis` e la skill `trama-implement` usano solo i comandi nuovi. `project new` e `project edit` scrivono `.omp/WATCHDOG.yml` come prima.
- Test: la ripresa del Task da parte del developer, il rifiuto degli altri spostamenti, `runnable` con e senza `max`, e i due casi di `scope`.
