---
status: approved
base:
  editor-panel/panel.md: 8a693e6549eab4990bee3345273b2d477ea371a5a4ef31109035b3ee754152ad
  editor-panel/focus.md: 07186486e0fee9238b55b69af54c5c8413083f994a5dc803e521199d7cf00980
  actors/developer.md: 39cdfaf7d171c5b29438131c74be001cbf98c4b535c8febbfdcb386272d5df11
  editor-panel/menu-laterale.md: 1997eb2055d43cd10a08e1ffe7dc7f1aba07fc099f695a24baaa43e805e73312
  agent-launching/feature.md: 140a2ff252880ae9662a1fd345725ab2b1c23e63bb30f28894bf261c663e4620
  requirements/ui/history.md: dca510d1a0c75d3dd02171993e150a8b89adefdddf829a72f095513fa3b0bf08
  requirements/ui/menu-laterale.md: b16218f8a9f1d37d486bc1e0ec45e54706a32fb1e50a3ea1f7ddf7cc5ab179e8
  requirements/tech/menu-laterale.md: 65be7fb3e37c49f6e30b692affee4e2049a15f0bfeeb00dca5d26809d77d81d3
  requirements/ui/panel.md: 49592cbebeb8aeef00fb9d19b6b5b4c5f50225e264283f51119d229898cf9e07
delete: []
request: 2026-10-23T21-42-50
created: 2026-10-23T20:10:02.276Z
label: Board e menu
---
# Board e menu laterale

Rende più sobri la colonna Done e il menu laterale, e chiede una conferma prima del lavoro lungo dello scan di tutto il Sistema.

## Decisioni
- Le schede dei Task in Done non mostrano più i chip dei riferimenti; il tag della Proposal resta.
- La finestra dei dettagli di un Task, aperta da Active o da Done, mostra ancora tag e chip dei riferimenti; i dettagli delle voci di History non cambiano.
- Sotto circa 200 px di larghezza il menu laterale passa alla modalità solo icone: il nome di ogni voce va nel tooltip.
- In modalità solo icone nessun numero compare sulle icone (né Board né Scan System): il numero resta solo nel tooltip e nel nome accessibile.
- Senza cartella, in modalità solo icone, la frase «Open a folder to use Trama.» sparisce e passa nel tooltip di Open Folder.
- Scan System va in fondo al menu, nel blocco separato dalla linea, sopra Settings, con l'aspetto delle altre voci invece del pulsante primario blu.
- Ogni scan di tutto il Sistema (menu laterale, pulsante Scan del Diagramma quando scansiona tutto, comando `Trama: Scan System` con la scelta Whole System) chiede prima una conferma modale dell'editor: «Scan the whole System?», dettaglio «The agent compares every Machine with the code: this can take a long time.», pulsante `Scan`; Cancel non fa nulla.
- Lo scan di una Feature non chiede conferma.

## Already present
- `focus` — chip dei riferimenti con il focus di un solo riferimento: `extension/src/webview/board/parts.tsx` (`RefChips`), sulle schede Active (`extension/src/webview/board/cards.tsx`, `TaskCardView`) e nella finestra dei dettagli (`extension/src/webview/board/dialogs.tsx`, `TaskDetailsDialog`)
