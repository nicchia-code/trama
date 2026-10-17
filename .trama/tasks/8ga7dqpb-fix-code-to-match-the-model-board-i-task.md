---
column: done
technical: false
refs:
  - panel/Board
drift: 5271oftb
proposal: null
agent: false
created: 2026-10-16T10:20:57.402Z
finished: 2026-10-16T10:37:30.982Z
---
# Fix code to match the Model: Board: i Task di un design non sono più una scheda unica espandibile

## What happens

Il Board mostra ogni Task come scheda propria, anche quando più Task vengono dallo stesso design. Non c'è più la scheda del design, con il titolo della Proposal e il contatore dei Task finiti: quindi niente elenco espandibile dei Task del design, nessun pulsante **Run this design** e nessun raggruppamento per design nella colonna Done. Ogni Task finisce nella sua colonna da solo, con soltanto il tag della Proposal da cui viene.

## What should happen

Il Modello dice che i Task di uno stesso design, se sono almeno due, stanno in **una sola scheda di design**, con il titolo della Proposal, nella colonna che risulta dalla somma dei suoi Task: Ready se nessuno è iniziato, Done se sono tutti finiti, In progress altrimenti. La scheda è chiusa all'inizio, si espande per vedere ogni Task con il suo punto di stato, e ha il pulsante che chiede all'agente di realizzare i Task del design ancora in To do. Un design con un solo Task e i Task senza design restano schede proprie.

## Chosen option

**Ripristinare la scheda di design nel Board**

Il raggruppamento torna nella vista del Board: i Task di un design con almeno due Task diventano una scheda unica, nella colonna che risulta dai suoi Task, chiusa e espandibile, con il contatore dei Task finiti e il pulsante **Run this design**. Il tag della Proposal sui singoli Task resta. Costo: il raggruppamento va riscritto nella vista, con i suoi test, perché la forma precedente è stata tolta; l'ordine dei Task dentro la scheda resta quello di creazione.

## Where in the code

extension/src/webview/board/logic.ts, funzione buildBoard: ogni Task è messo nella sua colonna come scheda propria; extension/src/webview/board/render.ts, funzione renderCard: sa disegnare solo Proposal, Drift e Task. Nel nucleo src/core/design.ts non resta nessun raggruppamento per design.
