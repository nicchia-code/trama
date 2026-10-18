---
status: approved
base:
  editor-panel/panel.md: 790ea0a0d1e87f5ed5d8c6e4410098225932731efedd98f011571c22d4c3d356
  requirements/ui/tasks.md: 126c8693e99776e84e04a380b8bfea29644d958fde5bca87e0952d08d177cd31
  requirements/ui/board.md: 3905a8c1fa3db8b2434407dd3bc9a124e603eef3d710318e80511146724943f4
  requirements/ui/panel.md: d15722ead0fe6d1658bbe4780a1e85628d7a837181899e57dc75411ccb65e427
  requirements/tech/proposal.md: ee8ee4646eddbc5f93a010fee547e0a6940c40c1137ec0639d64c56d9b30f3c8
delete: []
request: 2026-10-17T21-13-52
created: 2026-10-17T19:19:24.346Z
label: Modale Proposal
---
# Corpo della Proposal in una modale dalla Board

Oggi la scheda di una Proposal in Backlog non reagisce al clic e il suo corpo si legge solo nei dettagli del Diagramma. Il developer vuole leggerlo direttamente dalla Board, in una finestra modale.

Decisioni prese nell'intervista:
- Il clic in qualunque punto della scheda, fuori da pulsanti, ingranaggio, chip e righe dei Drift, apre la modale; il titolo della scheda è il controllo che la apre da tastiera.
- La modale mostra il corpo della Proposal reso come Markdown dal renderer del pannello, senza front matter e senza H1: niente Task, niente sorgente grezza.
- La modale è in sola lettura: ha solo Close; le decisioni restano sulla scheda.
- Vale per ogni scheda Proposal in Backlog: ordinarie, import, setup e schede gialle delle risoluzioni.
- Il contenuto segue i file a ogni nuovo quadro; la modale si chiude da sola quando la Proposal lascia Backlog o il pannello si chiude.
- Intestazione: numero breve e titolo, come le altre modali.
- Una Proposal senza corpo mostra la riga attenuata This Proposal has no description.
- Chiusura e focus come la modale della History: Close, Esc e clic fuori; il focus va su Close all'apertura e torna al titolo della scheda alla chiusura.

Scelta di modellazione (dell'agente): come per i dettagli delle voci di History, la modale è descritta in prosa nello State Board del pannello, senza Event nuovi; il Diagramma non cambia.

## Already present
- `panel/Open/developer.SHOW_BOARD` — `extension/src/webview/main.ts` (tab `board` della shell) e `context.navigate("board")` in `extension/src/webview/diagram/index.ts`
