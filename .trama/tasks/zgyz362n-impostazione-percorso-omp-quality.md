---
column: done
technical: true
refs:
  - requirements/quality#panel/Settings
drift: null
proposal: b006amix
agent: false
created: 2026-10-17T03:28:12.255Z
finished: 2026-10-17T03:39:41.645Z
---
# Privacy e prestazioni del percorso di omp nei suggerimenti

Quando il Task è finito:

- `omp models --json` parte solo quando `trama.agent` è `omp`, senza shell, con argomenti fissi, dal percorso in `trama.ompPath` se non è vuoto, altrimenti dal PATH dell'editor. Nessuna ricerca in altre cartelle.
- Il testo di `error` è una delle tre stringhe fisse, con il solo percorso usato. L'output di omp, anche su errore, non entra in `error`, nel webview né in un log.
- La scheda Settings resta usabile mentre l'elenco si prepara, e omp ha al massimo 15 s, poi l'elenco è vuoto e `error` dice la scadenza.
- Test `bun:test`: un programma inesistente, una scadenza e un'uscita con errore producono `error` senza alcun pezzo dell'output di omp.
