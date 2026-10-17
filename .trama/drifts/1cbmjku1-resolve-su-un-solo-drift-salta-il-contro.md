---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Free/developer.ASK_AGENT
  - requirements/tech#drift-resolution
proposal: null
task: 34u9i4ec
origin: null
critical: false
option: 1
note: null
resolvedBy: tkblj8m7
created: 2026-10-17T18:47:45.953Z
---
# Resolve su un solo Drift salta il controllo delle altre finestre

## What happens

Quando il developer chiede Resolve su un solo Drift nella finestra che coordina la delega, la raccolta automatica parte subito, anche se il coordinamento non ha potuto verificare le altre finestre: una finestra non risponde alla richiesta dei lavori, oppure la delega è sospesa per un coordinamento perso. Così una correzione automatica può partire mentre un Run o uno scan di un'altra finestra è in corso, e Trama non lo vede. Lo stesso Resolve su tutti i Drift, o la stessa richiesta fatta da una finestra che non coordina, passa invece dal controllo.

## What should happen

Se il coordinamento non può verificare il coordinatore o il quadro delle altre finestre, la delega non concede nuovi passi automatici e mostra il motivo: una finestra non autorizza lavoro finché non conosce gli scan e i Run delle altre finestre vive. Un Resolve su un solo Drift è una richiesta della stessa raccolta automatica, quindi aspetta la stessa verifica, e il developer deve vedere il motivo.

## Fix options

### Usare lo stesso controllo anche per il Resolve singolo

Il Resolve su un solo Drift, quando la finestra coordina, passa per gli stessi controlli della raccolta automatica prima di inviare l'istruzione. Se il quadro non è verificato o la delega è sospesa, non parte nulla: la Board mostra il motivo e il Drift resta aperto. Quando le altre finestre rispondono, la delega riprende da sola. Costo: un Resolve singolo può aspettare una finestra occupata o che non risponde, come già accade alla raccolta automatica.

### Verificare i lavori prima di avviare il Resolve singolo

Prima di avviare la raccolta del Drift scelto, il coordinamento chiede alle finestre vive i loro lavori, come fa la raccolta automatica, e avvia solo se tutte hanno risposto e nessuno scan o Run è in corso. Se una finestra non risponde, la richiesta non parte e il motivo compare sulla Board. Costo: una richiesta in più verso le altre finestre a ogni Resolve singolo e un'attesa più lunga quando una finestra è occupata; le regole della delega restano invariate.

## Where in the code

extension/src/host/controller.ts: Controller.launchAction, nel ramo Resolve con un Drift eleggibile nella finestra che coordina, che chiama startAutomaticResolution senza passare dal controllo di Controller.coordinate sulla fase sospesa e sull'importazione dei lavori delle altre finestre.
