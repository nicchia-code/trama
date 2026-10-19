---
status: resolved
resolution: proposal
refs:
  - drift-resolution/Free
  - requirements/rules#drift-resolution
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: qp9tlpmq
created: 2026-10-19T20:36:14.509Z
---
# Automatic step paused after failed send

## What happens

Un avvio automatico della raccolta non raggiunge l'agente, senza essere rifiutato né andare a buon fine: la delega viene tenuta ferma e l'avviso chiede al developer di risolvere i Drift o avviare uno scan.

## What should happen

Il Model descrive ogni situazione in cui la delega si ferma. Un invio non riuscito rilascia la prenotazione e non lascia un lavoro fantasma: la pausa non compare né nel Model né nei requisiti.

## Fix options

### Model adds a paused state

Il Model aggiunge uno stato di delega sospesa per l'avvio automatico che non raggiunge l'agente. La delega resta ferma finché il developer risolve i Drift, avvia uno scan o cambia la modalità, e un avviso lo dice. Il codice resta com'è, e i requisiti vanno aggiornati nella stessa modifica.

### Release the reservation, no pause

Il codice rinuncia alla sospensione: un avvio automatico che non raggiunge l'agente rilascia la prenotazione e torna in Free, come un invio non riuscito. La delega riparte alla prossima barriera libera, senza avvisi di pausa. Il Model resta com'è, e nessun lavoro resta fantasma.

## Where in the code

extension/src/host/controller.ts: deliverAutomatic (holdAutopilot e l'avviso «the automatic Drift step did not reach the agent, so it is paused»); extension/src/host/drift-resolution.ts: holdAutopilot, releaseAutopilotHold, observeAutopilotMode e lo stato «suspended» in driftAutopilotStatus.
