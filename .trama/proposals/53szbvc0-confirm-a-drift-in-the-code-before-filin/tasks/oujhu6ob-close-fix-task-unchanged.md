---
technical: false
refs:
  - task
  - agent.CLOSE_TASK_UNCHANGED
  - developer.CLOSE_TASK_UNCHANGED
  - requirements/data#task
  - requirements/rules#task
  - requirements/tech#task
---
# Close a fix Task without changes and start every fix Task by checking the Drift's premise

Un Task di correzione si può chiudere senza modifiche, dall'agente o dal developer, con `trama task move <id> done --unchanged <nota>`.

- Da To do o In progress il Task va in Done e ricorda la nota nel campo `unchanged`. Solo se ha un Drift che è `fix-code`, oppure `dismissed` con questo Task come suo `task`, e se la nota non è vuota; altrimenti non cambia nulla e il rifiuto dice perché (Task già Done, Task senza Drift, Drift in un altro stato, nota mancante). `--unchanged` con una colonna diversa da `done` è rifiutato.
- Per il resto vale come lo spostamento in Done: un Task preso dall'agente resta rifiutato al developer, il segno di Task preso si toglie, `finished` si scrive e l'origine del Drift si sblocca.
- Nello stesso passo, nella stessa funzione di `src/core`, il Drift passa a `dismissed` conservando `task`, `option`, `note` e `resolvedBy`. L'uscita del comando dice che il Drift è stato dismesso.
- Qualunque spostamento fuori da Done toglie `unchanged`; il Drift resta `dismissed`.
- `tasksSinceScan` non conta i Task con `unchanged`.
- La skill distribuita `trama-implement`, per ogni Task con un Drift, dopo averlo preso e letto e prima di scrivere codice, rilegge il codice di Where in the code e dei riferimenti e lo confronta con What happens. Se il codice fa già ciò che dicono il Model o il Requisito, non cambia nulla e lo chiude con `--unchanged` e una nota su ciò che ha verificato, anche in un sotto-agente. Il resoconto elenca a parte i Task chiusi senza modifiche, con la nota. La scansione di fine corsa parte e prende l'ambito solo dai Task portati in Done senza `--unchanged`.
- `docs/cli.md` descrive `--unchanged`; il changelog registra il cambiamento.
