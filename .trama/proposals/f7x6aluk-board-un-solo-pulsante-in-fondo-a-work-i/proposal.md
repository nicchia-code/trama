---
status: approved
base:
  editor-panel/panel.md: 0c69d9285ccd595fa46505841f5cafc451a48e7a6073ee28819d1c95916489dc
  requirements/ui/board.md: 07b0436bdf425eac5f0007a52984c1a0c04d371445713dc34c329a54fc123887
delete: []
created: 2026-10-16T18:41:58.976Z
---
# Board: un solo pulsante in fondo a Work Items e a Ready

In fondo alla colonna Work Items il codice mostra sia + Work Item sia Run all, e lo stesso in Ready: il Modello e il Requisito ui#panel/Board non dicono chiaramente che ogni colonna ha solo il proprio pulsante.

Decisioni:
- In fondo a Work Items c'è solo + Work Item, mai Run all.
- In fondo a Ready c'è solo Run all, mai + Work Item.
- In progress e Done non hanno pulsanti in fondo.
- Aspetto, testi, tooltip e comportamento dei due pulsanti non cambiano; i pulsanti della barra restano.

## Already present
- `panel/Open/developer.SHOW_BOARD` — extension/src/webview/board/index.ts (la scheda Board si apre già; cambia solo cosa mostra in fondo alle colonne)
