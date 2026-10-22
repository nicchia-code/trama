---
refs:
  - panel/Board
  - panel/Open/developer.SHOW_BOARD
  - requirements/ui#time
---
# Avvisi di esecuzione sulla Board

Aprendo la Board, in cima compaiono soltanto gli avvisi `Trama stopped following <lavoro>: <motivo>.` del controllo di esecuzione (anche quelli dei Task liberati e dei turni della chat chiusi da Cursor), con il pulsante `Close` e lo stile di oggi: uno per lavoro o Task, solo nella finestra che ha fatto il controllo, fino alla chiusura manuale o del pannello. Questi avvisi non dipendono dalla costante che spegne gli avvisi dei ghost ritirati e dell'Advisor (introdotta dal Task degli avvisi dei ghost spenti) e restano accesi.

Quando non c'è nessun avviso da mostrare, perché gli unici presenti sono quelli spenti, la Board non lascia spazio vuoto né contenitore in cima: il blocco degli avvisi in `extension/src/webview/board/index.tsx` si disegna solo se resta almeno un avviso dopo il filtro.
