---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#scan-hold
proposal: null
task: r9qk17z9
origin: null
option: 1
note: null
resolvedBy: b4duwb4w
created: 2026-10-09T21:18:53.178Z
---
# Hold scan switch waits for the host before it changes on a click

## What happens

Un click sullo switch Hold scan non cambia subito lo stato mostrato: lo switch cambia solo quando il pannello riceve la nuova situazione dal controllore. Spegnendo, lo switch aspetta anche che l'agente parta o che l'istruzione sospesa venga consegnata, quindi il click può restare senza effetto visibile per un tempo non trascurabile. Accendendo, lo stato cambia dopo il giro di aggiornamento del pannello.

## What should happen

Un click cambia subito lo stato dello switch, senza conferma, in tutte e tre le schede; se poi il controllore rifiuta o non riesce, lo switch torna com'era con l'avviso. Spegnere non deve sembrare ignorato mentre l'agente si avvia.

## Fix options

### Cambiare lo stato subito nel pannello

Lo switch cambia nel momento del click, senza attendere il controllore. Se il controllore rifiuta o fallisce (file non scrivibile, istruzione non consegnata), lo switch torna allo stato precedente e compare l'avviso già previsto. Costo: una piccola logica di ripristino nel pannello e la possibilità di un breve lampo di stato sbagliato, da gestire nei tre schede.

### Mostrare uno stato in attesa

Lo switch resta com'è fino alla risposta, ma mostra subito uno stato in attesa (per esempio disabilitato con un indicatore) appena si clicca. Quando il controllore risponde, lo stato definitivo prende il posto dell'attesa. Costo: il click non cambia l'aspetto dello switch come la Requirement chiede, quindi la Requirement andrebbe riletta; in cambio nessuna logica di ripristino.

### Cambiare la Requirement

Si lascia il comportamento attuale e si riscrive 'Un click cambia subito' come una situazione in attesa esplicita. Costo: nessun cambio al codice, ma l'interfaccia resta più lenta a rispondere al developer, e la Requirement perde una promessa semplice e verificabile.

## Where in the code

extension/src/webview/scan-hold-switch.ts (the state changes only in set, called from each tab's snapshot); extension/src/host/controller.ts turnScanHold (refresh after the write or the agent start)
