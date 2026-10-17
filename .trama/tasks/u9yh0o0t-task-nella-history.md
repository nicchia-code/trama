---
column: done
technical: false
refs:
  - task
  - requirements/ui#task
drift: null
proposal: uvn8ulmq
agent: false
created: 2026-10-17T10:26:31.354Z
finished: 2026-10-17T11:04:02.741Z
---
# I Task realizzati finiscono nella History e i Task Done lasciano la Board

Alla fine di ogni corsa che ha realizzato almeno un Task (Task singolo, tutti i Task in To do o Run automatico delle correzioni) lo stesso agente racconta in voci di History i Task che la corsa ha realizzato. Succede anche quando la verifica finale (test, lint, build) fallisce o la corsa lascia bloccato qualche Task, dopo la verifica e l'eventuale scansione mirata e prima di dire che il controllo è finito. Le istruzioni della skill `trama-implement` vanno aggiornate di conseguenza.

Un Task chiuso senza modifiche non entra in nessuna voce di History. Se torna fuori da Done perde la nota come oggi.

Sulla Board un Task Done non ha più una scheda: si vede solo nei dettagli della voce di History che lo racconta. Va tolto dal webview il badge `no changes` (con il suo tooltip `Closed without changes: <nota>`) e ogni resa delle schede dei Task Done, senza shim.

Il tag del Task (chip con l'etichetta breve della Proposal, intera; per Proposal senza etichetta il titolo accorciato con i puntini oltre i 30 caratteri; tooltip `From Proposal <id>: <titolo>`; non cliccabile; assente per Task che non nascono da una Proposal) compare sulla scheda in `Active`, sulle righe dentro le altre schede e ora anche nei dettagli delle voci di History.

Aggiornare i test del webview che verificano il badge `no changes` o le schede dei Task Done.
