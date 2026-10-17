---
column: done
technical: false
refs:
  - drift-resolution/Free/developer.ASK_AGENT
  - requirements/tech#drift-resolution
drift: 1cbmjku1
proposal: null
agent: false
created: 2026-10-17T18:56:07.339Z
finished: 2026-10-17T19:09:37.944Z
---
# Fix code to match the Model: Resolve su un solo Drift salta il controllo delle altre finestre

## What happens

Quando il developer chiede Resolve su un solo Drift nella finestra che coordina la delega, la raccolta automatica parte subito, anche se il coordinamento non ha potuto verificare le altre finestre: una finestra non risponde alla richiesta dei lavori, oppure la delega è sospesa per un coordinamento perso. Così una correzione automatica può partire mentre un Run o uno scan di un'altra finestra è in corso, e Trama non lo vede. Lo stesso Resolve su tutti i Drift, o la stessa richiesta fatta da una finestra che non coordina, passa invece dal controllo.

## What should happen

Se il coordinamento non può verificare il coordinatore o il quadro delle altre finestre, la delega non concede nuovi passi automatici e mostra il motivo: una finestra non autorizza lavoro finché non conosce gli scan e i Run delle altre finestre vive. Un Resolve su un solo Drift è una richiesta della stessa raccolta automatica, quindi aspetta la stessa verifica, e il developer deve vedere il motivo.

## Chosen option

**Usare lo stesso controllo anche per il Resolve singolo**

Il Resolve su un solo Drift, quando la finestra coordina, passa per gli stessi controlli della raccolta automatica prima di inviare l'istruzione. Se il quadro non è verificato o la delega è sospesa, non parte nulla: la Board mostra il motivo e il Drift resta aperto. Quando le altre finestre rispondono, la delega riprende da sola. Costo: un Resolve singolo può aspettare una finestra occupata o che non risponde, come già accade alla raccolta automatica.

## Where in the code

extension/src/host/controller.ts: Controller.launchAction, nel ramo Resolve con un Drift eleggibile nella finestra che coordina, che chiama startAutomaticResolution senza passare dal controllo di Controller.coordinate sulla fase sospesa e sull'importazione dei lavori delle altre finestre.
