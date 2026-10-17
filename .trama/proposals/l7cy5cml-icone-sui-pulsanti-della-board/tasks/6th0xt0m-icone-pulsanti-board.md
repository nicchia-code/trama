---
refs:
  - panel/Board
  - panel/Diagram
  - requirements/ui#panel
  - requirements/tech#panel
---
# Icone sui pulsanti della Board e sugli stessi pulsanti del Diagramma

Quando il Task è finito:

- Ogni pulsante con testo della Board ha un'icona a sinistra del testo: nella barra `Run Ready Tasks`, `Resolve Drifts`, `Scan System`, `Quick request…` e `Add Work Item…`; in fondo alle colonne `+ Work Item` e `Run all` (che già l'hanno); sulle schede `Approve`, `Reject`, `View on diagram`, `View requirements` / `View requirement`, `Dismiss Drift`, `Run`, `Open`, `Show details` / `Hide details`, `Show tasks` / `Hide tasks` e `Run this design`; `Close` degli avvisi. Chip dei riferimenti, badge `blocked` e `waiting`, righe dei Drift di una scheda di risoluzione e menu del periodo di Done restano senza icona.
- Nel Diagramma hanno la stessa icona `Scan` nella barra (sia per il Sistema sia per una Feature) e `Approve`, `Reject` e `Dismiss Drift` nei dettagli; nient'altro del pannello cambia.
- Le icone seguono la mappa di `requirements/ui#panel`: `play` per ogni Run, `add`, `comment`, `wand`, `search`, `type-hierarchy`, `checklist`, `check`, `close`, `circle-slash`, `go-to-file`, `chevron-down` / `chevron-up` per i toggle, che cambiano icona insieme all'etichetta.
- Le icone sono 16 px, nel colore del testo del pulsante anche quando è primario o disabilitato, decorative e nascoste alle tecnologie assistive; testo, tooltip, nome accessibile e motivi di disabilitazione restano quelli di prima. Il testo non sparisce mai quando lo spazio è poco. Quando l'etichetta si aggiorna (`Scan System · N`, `Scan · N`, i toggle) l'icona resta.
- La chevron della colonna Done è il glifo `chevron-right` con la colonna aperta e `chevron-left` con la colonna collassata, al posto dei caratteri `›` e `‹`, con gli stessi tooltip, nome accessibile e stato aperto/chiuso per le tecnologie assistive.
- Tutte le icone sono SVG inline ricavati dai glifi codicon, senza font di icone e senza dipendenze nuove; `extension/THIRD-PARTY-NOTICES.md` nomina ogni glifo usato sotto la licenza Codicons.
