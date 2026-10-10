---
column: done
technical: true
refs:
  - requirements/ui#drift
  - requirements/data#drift
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:12:34.795Z
finished: 2026-10-09T08:17:34.298Z
---
# Show a Drift's resolution Proposal in drift show

Oggi `trama drift show` non dice nulla delle Proposal di risoluzione.

Quando è fatto:
- Un Drift aperto che sta nella lista di una Proposal di risoluzione ancora in scrittura o aperta mostra la riga `In resolution Proposal <id> <titolo>` (il legame si calcola dalle Proposal, non è scritto nel Drift).
- Un Drift risolto da una risoluzione (con `resolvedBy`) mostra la riga `Resolved by Proposal <id>`.
- L'uscita `--json` porta le stesse informazioni.
- La documentazione del comando lo dice.
