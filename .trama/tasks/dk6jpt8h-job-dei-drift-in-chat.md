---
column: done
technical: false
refs:
  - drift
  - requirements/tech#drift-resolution
  - requirements/data#drift-resolution
drift: null
proposal: n97kq4ls
agent: false
created: 2026-10-21T11:33:12.145Z
finished: 2026-10-21T11:35:33.490Z
---
# Job dei Drift in chat

Nella chat di Cursor `TRAMA_JOB` arriva con i comandi `trama` completati dall'hook, quindi `trama drift new` e `trama comparison move <id> delivered` scrivono `job` anche in chat (via `jobFromEnv` in `src/cli/context.ts`): i Drift della chat e quelli registrati da `trama-advisor` hanno il loro `job`, scritto alla creazione e mai cambiato. L'advisor che guarda un Run al posto degli scan è l'advisor di omp o, nella chat di Cursor, `trama-advisor`; il suo Drift non ha origine, deve dire dove nel codice è stata vista la differenza e blocca come ogni Drift. Con l'Async Drift Resolver la domanda pronta si prepara anche per i Drift che l'advisor ha registrato durante il Run, nel terminale come nella chat.

`trama drift list` accetta `currentJob: true`: elenca solo i Drift con `job` uguale a `TRAMA_JOB` del comando; senza `TRAMA_JOB` non elenca nulla, lo dice ed esce con 0; insieme a `job` è un errore d'uso. Si combina con `unprepared` e con gli altri filtri.

Le sezioni "Async Drift Resolver" delle skill `skills/trama-scan`, `skills/trama-implement` e `skills/trama-import` usano `trama drift list` con `{"currentJob": true, "unprepared": true}` nel terminale come nella chat, senza leggere `TRAMA_JOB` a mano, e non dicono più che in chat `TRAMA_JOB` manca. `docs/cli.md`, `extension/README.md` e `CHANGELOG.md` descrivono `currentJob` e il `job` dei Drift in chat.
