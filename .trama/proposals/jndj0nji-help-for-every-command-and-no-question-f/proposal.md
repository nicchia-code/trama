---
status: approved
base:
  requirements/tech/general.md: 455443cd2a03be1a4516429dd455278bee181acc5a72952d625ceb9e5b1e240b
  requirements/rules/questions-notices.md: c1932b7c42682f913ef6a8f5d8f4257bb830a2567fe6c34d5d845e2464f6ab69
delete: []
created: 2026-10-08T05:19:12.345Z
scanScope:
  - ref: requirements/rules#question-round
    reason: changed
  - ref: requirements/tech#General
    reason: changed
---
# Help for every command and no question fallback on usage errors

Regressione segnalata: l'agente omp in MagicBuilder ha chiesto con lo strumento `ask` di omp invece che con l'overlay di Trama. Causa: `trama ask --help` risponde `Unknown command "ask"` (exit 2); l'agente ha concluso che il comando non esiste, l'ha trattato come editor non disponibile ed è passato al ripiego.

Decisioni:
- Ogni comando, compresi `ask`, `classify` e `cursor-hook`, accetta `--help`/`-h`: stampa uso e descrizione, esce con 0 e non fa nient'altro (non legge stdin, non apre round, non è rifiutato dalla guardia dei comandi riservati al developer).
- `trama-design` e `trama-import` dicono esplicitamente che un errore d'uso di `trama ask` o un comando non riconosciuto non è editor non disponibile: l'agente corregge la chiamata e riprova, mai ripiego sulle domande proprie.
