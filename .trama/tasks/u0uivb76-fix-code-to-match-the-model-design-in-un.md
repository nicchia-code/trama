---
column: done
technical: false
refs:
  - project/Not a Trama project
drift: fqrv5evn
proposal: null
agent: false
created: 2026-10-06T16:01:25.464Z
finished: 2026-10-06T16:10:42.671Z
---
# Fix code to match the Model: Design… in una cartella senza Trama non fa nulla invece di indicare l'inizializzazione

## What happens

In una cartella aperta senza Trama, il comando **Trama: Design…** della palette non fa **nulla**: nessun file, nessuna scheda, nessun messaggio. Il developer non capisce perché non succede niente.

Le altre azioni dello stesso caso (Quick Design Request, Scan, Import, Update Agent Skills) mostrano invece l'avviso che manca `.trama/` e rimandano a **Trama: Initialize Project**.

## What should happen

Nello State **Not a Trama project** del Project, ogni altra azione indica al developer di inizializzare prima la cartella. Anche Design… deve quindi dire che non c'è un progetto Trama e rimandare all'inizializzazione, come fanno le altre azioni.

## Chosen option

**Mostrare lo stesso avviso delle altre azioni**

Design… senza progetto mostra l'avviso già usato da Quick request, Scan e Import (manca `.trama/`, esegui Trama: Initialize Project) e non crea nulla. Costo minimo: un solo punto da cambiare, e il comportamento diventa uguale per tutte le azioni.

## Where in the code

extension/src/host/design-requests.ts, DesignRequests.write (ritorna senza messaggio quando non trova il progetto); confronto con Controller.requireProject in extension/src/host/controller.ts
