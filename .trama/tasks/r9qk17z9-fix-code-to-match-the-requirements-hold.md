---
column: done
technical: true
refs:
  - requirements/ui#scan-hold
drift: xn2rdodn
proposal: null
agent: false
created: 2026-10-09T21:50:06.456Z
finished: 2026-10-09T21:52:41.854Z
---
# Fix code to match the Requirements: Hold scan switch waits for the host before it changes on a click

## What happens

Un click sullo switch Hold scan non cambia subito lo stato mostrato: lo switch cambia solo quando il pannello riceve la nuova situazione dal controllore. Spegnendo, lo switch aspetta anche che l'agente parta o che l'istruzione sospesa venga consegnata, quindi il click può restare senza effetto visibile per un tempo non trascurabile. Accendendo, lo stato cambia dopo il giro di aggiornamento del pannello.

## What should happen

Un click cambia subito lo stato dello switch, senza conferma, in tutte e tre le schede; se poi il controllore rifiuta o non riesce, lo switch torna com'era con l'avviso. Spegnere non deve sembrare ignorato mentre l'agente si avvia.

## Chosen option

**Cambiare lo stato subito nel pannello**

Lo switch cambia nel momento del click, senza attendere il controllore. Se il controllore rifiuta o fallisce (file non scrivibile, istruzione non consegnata), lo switch torna allo stato precedente e compare l'avviso già previsto. Costo: una piccola logica di ripristino nel pannello e la possibilità di un breve lampo di stato sbagliato, da gestire nei tre schede.

## Where in the code

extension/src/webview/scan-hold-switch.ts (the state changes only in set, called from each tab's snapshot); extension/src/host/controller.ts turnScanHold (refresh after the write or the agent start)
