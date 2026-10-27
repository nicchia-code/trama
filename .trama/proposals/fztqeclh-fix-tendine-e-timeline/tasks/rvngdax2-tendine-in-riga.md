---
refs:
  - panel
  - requirements/ui#General
---
# Tendine in riga

Una tendina chiusa del pannello mostra il valore scelto come lo mostra la sua lista: su una sola riga, con l'avatar o l'icona dell'opzione a sinistra e il testo accanto, centrati in verticale nel campo, e il testo tagliato con i puntini quando non ci sta.

Oggi, nella colonna dei campi della preview di una issue di un handoff (vista Team, scheda Decisions), `Assignee` e `Reviewer` mostrano le iniziali sopra `@handle` e `Sprint` mostra l'icona del calendario sopra `<sprint> · <date>`, tagliati dal bordo del campo alto `h-8`. La causa è nel componente condiviso `extension/src/webview/ui/select.tsx`: `SelectValue` copia nel campo chiuso il contenuto della voce scelta (in `extension/src/webview/team/issue-preview.tsx:66-69` avatar o icona e poi uno `span` con il testo), ma il contenitore del valore non dispone i suoi figli in riga.

Quando il Task è finito:
- La correzione è nel componente condiviso, così vale per ogni `Select` del pannello, non solo per la preview delle issue; le tendine che hanno solo testo non cambiano aspetto.
- Le voci della lista aperta restano come sono.
- Lo screenshot della guida `team-handoff-preview` è rigenerato con `bun run site:screenshots team-handoff-preview` (solo quella scena) e mostra i campi in riga.
