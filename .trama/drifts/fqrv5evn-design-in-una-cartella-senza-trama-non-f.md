---
status: resolved
resolution: fix-code
refs:
  - project/Not a Trama project
proposal: null
task: u0uivb76
origin: null
option: 1
note: null
created: 2026-10-06T15:36:17.675Z
---
# Design… in una cartella senza Trama non fa nulla invece di indicare l'inizializzazione

## What happens

In una cartella aperta senza Trama, il comando **Trama: Design…** della palette non fa **nulla**: nessun file, nessuna scheda, nessun messaggio. Il developer non capisce perché non succede niente.

Le altre azioni dello stesso caso (Quick Design Request, Scan, Import, Update Agent Skills) mostrano invece l'avviso che manca `.trama/` e rimandano a **Trama: Initialize Project**.

## What should happen

Nello State **Not a Trama project** del Project, ogni altra azione indica al developer di inizializzare prima la cartella. Anche Design… deve quindi dire che non c'è un progetto Trama e rimandare all'inizializzazione, come fanno le altre azioni.

## Fix options

### Mostrare lo stesso avviso delle altre azioni

Design… senza progetto mostra l'avviso già usato da Quick request, Scan e Import (manca `.trama/`, esegui Trama: Initialize Project) e non crea nulla. Costo minimo: un solo punto da cambiare, e il comportamento diventa uguale per tutte le azioni.

### Offrire subito l'inizializzazione

Design… senza progetto propone, come l'apertura del pannello, il pulsante Initialize Project; dopo l'inizializzazione crea la richiesta. Più comodo per il developer, ma è un comportamento diverso dalle altre azioni e richiede di gestire l'annullamento della proposta.

## Where in the code

extension/src/host/design-requests.ts, DesignRequests.write (ritorna senza messaggio quando non trova il progetto); confronto con Controller.requireProject in extension/src/host/controller.ts
