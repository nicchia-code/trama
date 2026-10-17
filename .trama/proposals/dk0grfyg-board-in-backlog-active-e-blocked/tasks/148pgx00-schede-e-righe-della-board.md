---
technical: true
refs:
  - requirements/ui#panel/Board
---
# Schede, righe, pulsanti e testi della Board

Le schede e i pulsanti della Board seguono `ui#panel/Board`:

- Colonne vuote: `Backlog` dice `No proposals`, `Active` `Nothing active`, `Blocked` `Nothing blocked`. Pulsanti in fondo larghi quanto la colonna, icona a sinistra: `+ Add Work Item` (bordo tratteggiato, sfondo trasparente, tooltip `Write a work item in Markdown and send it to an agent`, nome accessibile `Add Work Item`), `Run all` (primario, tooltip e nome `Run all the Tasks in To do`), `Resolve all` (primario); `Done` senza pulsanti.
- `Run all` disabilitato con i motivi nel tooltip e nella descrizione accessibile: Task preso dall'agente, `No Task is in To do`, `All the Tasks in To do are blocked: …`; anche mentre lavora l'agente di risoluzione e, con `trama.submitWhileRunning` spento, mentre un Run lanciato da Trama non è finito (`A run is in progress`), con l'ordine dei motivi `Drifts are being resolved`, `A run is in progress`, poi gli altri. Lo stesso per il Run di ogni Task. Il pannello torna a usare i testi `No Task is in To do` / `All the Tasks in To do are blocked: …` come la riga di comando.
- Scheda di Task (in `Active` e `Done`): pallino di stato fermo con etichetta della colonna, tag della Proposal (chip col colore dell'etichetta), toggle `Show details`/`Hide details` come prima. La scheda di un Task preso dall'agente ha il bordo blu-ciano animato che le gira attorno, il pallino resta fermo con etichetta `Agent working`; con riduzione del movimento il bordo è fermo, ciano. Nessun pallino pulsa; nessun'altra scheda ha il bordo. Un Task preso e bloccato mostra il badge `blocked`/`waiting` come prima, solo sulla sua scheda in `Active`.
- Scheda rossa di un Drift: titolo, riferimenti, i due lati, pulsanti `Resolve` e `Dismiss Drift`, poi le righe dei Task che blocca non presi dall'agente, in ordine di creazione: pallino, ID, titolo, tag, senza toggle, corpo, pulsanti né badge. Una riga di un Task bloccato anche da altri Drift aperti ha dopo il titolo l'icona `link` a 16 px (non un pulsante) con tooltip e nome `Also blocked by <numeri brevi degli altri Drift>`, separati da virgole, in ordine di creazione; vale anche nelle schede gialle.
- Mentre l'agente di risoluzione lavora, ogni Drift che ha raccolto porta il badge testuale `Resolving` (tooltip e nome `An agent is resolving this Drift`), che sparisce quando l'agente finisce o la risoluzione consegnata porta il Drift nella scheda gialla.
- Scheda di attesa: titolo `Waiting for <numero breve> <titolo>` del Task di correzione preceduto dal suo pallino, che porta alla scheda di quel Task in `Active` o `Done`; sotto, le righe dei Task che lo aspettano e non presi; nessun pulsante, segno neutro del tema.
- Scheda gialla in `Backlog`: come prima, e sotto la riga di ogni Drift, rientrate, le righe dei Task che quel Drift blocca e non presi.
- Ghost di Proposal, Drift, Task e controlli tutti in fondo ad `Active`, dopo le schede vere, nell'ordine degli annunci, con scheletro, limiti, shimmer, avvisi e nome accessibile di prima.

Cutover: togliere schede di design (`N/M done`, `Run this design`, `Show tasks`/`Hide tasks`), l'animazione del pallino, i testi `No work items`, `Nothing ready`, `No Task is Ready`, `All the Ready Tasks are blocked: …`. Aggiornare i test del webview.
