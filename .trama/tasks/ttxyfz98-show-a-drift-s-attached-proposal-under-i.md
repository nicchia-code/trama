---
column: done
technical: false
refs:
  - proposal
  - requirements/ui#proposal
  - requirements/tech#proposal
drift: null
proposal: 37d8rz9w
agent: false
created: 2026-10-07T17:03:23.046Z
finished: 2026-10-07T17:15:08.490Z
---
# Show a Drift's attached Proposal under its Drift on the command line

Sulla riga di comando una Proposal allegata a un Drift aperto non appare come decisione a sé: vive sotto il suo Drift.

A lavoro finito:
- `trama board` la elenca rientrata sotto la riga del suo Drift, con numero, titolo e `(draft)` se è ancora in scrittura; non compare fra le Proposal di To decide né nel gruppo In writing (anche nell'uscita `--json`);
- `trama proposal list` la segna `(attached to <id del Drift>)`;
- `trama proposal show` ha la riga `Attached to Drift <id> <titolo>`;
- una Proposal rimasta aperta di un Drift già risolto torna nell'elenco come le altre, senza segno di allegato.
