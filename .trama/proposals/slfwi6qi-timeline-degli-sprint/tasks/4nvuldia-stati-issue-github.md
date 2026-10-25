---
refs:
  - issue/Published
  - issue/Publishing/agent.RECORD_ISSUE_PUBLISHED
  - github
  - requirements/rules#issue/Published
  - requirements/tech#issue/Published
  - requirements/data#github-project
  - requirements/data#issue
---
# Stati delle issue da GitHub

Dopo la pubblicazione Trama segue ogni issue leggendo GitHub, solo in lettura, all'apertura della vista Team e con Refresh. Quando il Task è finito:

- `src/core/github.ts` ha una query GraphQL costante e paginata (100 per pagina) sugli item del Project collegato che sono issue del repository: numero, titolo, stato e motivo, assegnatari, valori di tutti i campi, pull request che chiudono l'issue con stato e bozza, branch collegati. Nessun comando che scrive.
- `src/core/timeline.ts` (test `bun:test`, oggi come parametro) calcola lo stato di ogni issue pubblicata: chiusa come completata → `Closed`; chiusa come non pianificata → `Not planned`; aperta con una pull request aperta non bozza che la chiude → `In review`; aperta con una pull request bozza, un branch collegato o uno stato del Project `In progress` o `Doing` senza maiuscole → `In progress`; altrimenti `Open`; non trovata → `Not found on GitHub`. Lo stato si calcola, non si scrive nella card. Gli Event del Actor `github` sono le differenze fra due letture.
- Sprint, stima e assegnatario sono sempre quelli letti da GitHub; senza valore su GitHub non si usano quelli pubblicati. Il campo della stima è il primo campo numerico del Project con `estimate` o `days` nel nome; senza, valgono le stime delle card di Trama e 0 per gli altri item.
- La cache `trama.team.github` in `workspaceState` aggiunge `items` (`data#github-project`); il webview riceve in `teamGitHub` gli stati calcolati. La card dell'issue aggiunge `updated` e `texts` vale anche dopo un Comment update.
- Briefing dei confronti: `trama comparison new` aggiunge per la Machine aperta la sezione `## Published issues` con le issue pubblicate non `Not planned` i cui riferimenti cadono lì (numero, titolo, stato dell'ultima lettura o, senza letture, quello di pubblicazione) e l'istruzione: un Drift su uno di quei riferimenti nomina l'issue (`#<n>`) e propone come prima Fix option di correggere il codice. `trama-compare` e `trama-scan` la seguono; vale per ogni confronto (scan, Run, scan dopo un Merge).
- Test della mappatura degli stati, delle differenze fra letture e della sezione del briefing.
