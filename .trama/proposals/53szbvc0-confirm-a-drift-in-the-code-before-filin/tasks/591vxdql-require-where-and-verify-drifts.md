---
technical: false
refs:
  - drift
  - requirements/data#drift
  - requirements/rules#drift
  - requirements/tech#drift
  - requirements/ui#drift
---
# Require Where in the code, confirm a Drift in the code before filing it, and show a Drift dismissed by its fix Task

- `trama drift new` senza `--where`, o con un testo vuoto, è rifiutato dicendo che un Drift deve dire dove nel codice è stata vista la differenza, chiunque lo lanci, anche per un Drift senza Fix options. I Drift già scritti senza Where in the code restano leggibili e non sono toccati.
- Le skill distribuite che archiviano Drift (`trama-scan`, anche per il pre-flight e la scansione di fine corsa di `trama-implement`, `trama-implement`, `trama-import`) e il `prompt` di `trama-analysis` in `src/core/sub-agents.ts` dicono di rileggere il punto del codice che andrà in `--where` prima di `trama drift new` e di non archiviare se il codice non fa ciò che dice What happens. Dicono anche che un Drift dismesso dal suo Task di correzione non frena la riarchiviazione della stessa differenza.
- Un Drift in Code to be fixed passa a Dismissed quando il suo Task di correzione è chiuso senza modifiche (lo fa il comando del Task); `trama drift resolve` su un Drift risolto resta rifiutato.
- `trama drift show` di un Drift dismesso dal suo Task ha subito dopo il titolo la riga `Dismissed by Task <id> without changes` e, dopo i blocchi esistenti, un blocco con l'intestazione "Check note" e la nota del Task, oppure `The Task left Done; its note is gone.` se il Task non è più Done. `trama drift list --all` lo segna `(dismissed, no changes)`. `--json` di `show`, `list` e la Snapshot portano `closedUnchanged` (`{ task, note }`), calcolato in `src/core` dai file, senza un campo nuovo nel Drift.
- `docs/cli.md` e `docs/model-format.md` descrivono `--where` obbligatoria e il Drift dismesso dal suo Task.
