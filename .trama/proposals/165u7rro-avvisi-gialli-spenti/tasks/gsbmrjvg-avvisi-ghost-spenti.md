---
refs:
  - announcement
  - announcement/Announced/terminal.COMMAND_ENDED
  - announcement/Announced/agent-hook.IDLE
  - announcement/Announced/editor-chat.AGENT_STOPPED
  - requirements/tech#announcement
  - requirements/ui#announcement
---
# Avvisi dei ghost spenti

Quando un ghost annunciato viene ritirato (terminale finito, agente fermo per l'hook di inattività, agente della chat fermato) senza che l'agente abbia consegnato, Trama continua a preparare l'avviso come oggi (`The agent finished without delivering <tipo> <titolo>.` oppure, per check e scan, `The agent stopped before finishing <titolo>.`), ma per ora la Board non lo disegna. Il ghost viene comunque ritirato come prima.

L'interruttore è nel codice, nessuna impostazione nuova: una sola costante booleana con valore `false` nel webview, nel punto dove la Board raccoglie gli avvisi da mostrare in cima (`extension/src/webview/board/index.tsx`, intorno alle righe 285-315; i testi stanno in `extension/src/webview/board/logic.ts`, `withdrawnNotice`). Accanto alla costante un commento spiega che spegne gli avvisi dei ghost ritirati e quello del Run senza revisione finale dell'Advisor, che l'host continua a prepararli (`extension/src/host/controller.ts`, intorno alle righe 466-468, resta invariato) e che basta rimetterla a `true` per riaccenderli. Le funzioni che compongono i testi restano.

Gli avvisi `Trama stopped following …` non dipendono dalla costante e restano accesi. I popup dell'editor (`showWarningMessage`) e gli avvisi del wizard non cambiano.

Nel `CHANGELOG.md` una voce dice che la Board non mostra più gli avvisi gialli dei ghost ritirati e del Run finito senza la revisione finale dell'Advisor.
