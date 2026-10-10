---
status: approved
kind: resolution
drifts:
  - drift: k6vnv7y9
    decision: fix-code
    option: 2
  - drift: 9i69umqv
    decision: dismissed
  - drift: t0kosaln
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-10T16:41:22.034Z
---
# Resolve Task ownership, external idle and request controls

• k6vnv7y9 — Unrecognized Task origins are assigned to editor chat: correggere il dominio dei Task affinché le origini generiche siano trattate come prese senza proprietario, anche nei Task già salvati; gli eventi previsti di terminali e conversazioni Trama le rilasciano, senza cambiare la provenienza degli annunci né le prese di terminali validi o Cursor.
• 9i69umqv — External agent idle does not finish its Run or resolution: chiudere il Drift superato senza modifiche; mantenere soltanto chat e terminali integrati, come previsto dal Modello e dai Requisiti correnti, senza ripristinare il terminale esterno.
• t0kosaln — Editor title visibility cannot identify its editor group: correggere il controllo di invio delle richieste di design usando una diversa integrazione che lo associ esplicitamente al gruppo attivo; mostrarlo solo per una richiesta mai inviata nel gruppo a fuoco, senza offrirlo nelle barre degli altri gruppi e senza contesti non documentati.
