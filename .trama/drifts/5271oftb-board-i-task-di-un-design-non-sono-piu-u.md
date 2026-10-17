---
status: resolved
resolution: fix-code
refs:
  - panel/Board
proposal: null
task: 8ga7dqpb
origin: null
critical: false
option: 1
note: null
resolvedBy: ahuxjrwp
created: 2026-10-16T10:12:04.657Z
---
# Board: i Task di un design non sono più una scheda unica espandibile

## What happens

Il Board mostra ogni Task come scheda propria, anche quando più Task vengono dallo stesso design. Non c'è più la scheda del design, con il titolo della Proposal e il contatore dei Task finiti: quindi niente elenco espandibile dei Task del design, nessun pulsante **Run this design** e nessun raggruppamento per design nella colonna Done. Ogni Task finisce nella sua colonna da solo, con soltanto il tag della Proposal da cui viene.

## What should happen

Il Modello dice che i Task di uno stesso design, se sono almeno due, stanno in **una sola scheda di design**, con il titolo della Proposal, nella colonna che risulta dalla somma dei suoi Task: Ready se nessuno è iniziato, Done se sono tutti finiti, In progress altrimenti. La scheda è chiusa all'inizio, si espande per vedere ogni Task con il suo punto di stato, e ha il pulsante che chiede all'agente di realizzare i Task del design ancora in To do. Un design con un solo Task e i Task senza design restano schede proprie.

## Fix options

### Ripristinare la scheda di design nel Board

Il raggruppamento torna nella vista del Board: i Task di un design con almeno due Task diventano una scheda unica, nella colonna che risulta dai suoi Task, chiusa e espandibile, con il contatore dei Task finiti e il pulsante **Run this design**. Il tag della Proposal sui singoli Task resta. Costo: il raggruppamento va riscritto nella vista, con i suoi test, perché la forma precedente è stata tolta; l'ordine dei Task dentro la scheda resta quello di creazione.

### Calcolare i design nel nucleo e mandarli nello snapshot

Il raggruppamento dei Task in design si calcola una volta sola nel nucleo di Trama e arriva nello snapshot. Il Board e la lista testuale dei Task leggono la stessa forma, e il pulsante del design usa gli stessi motivi di blocco degli altri Run. Costo: la forma dello snapshot cambia e il codice del Board resta solo presentazione: più lavoro di prima, ma nessuna logica duplicata fra pannello e riga di comando.

## Where in the code

extension/src/webview/board/logic.ts, funzione buildBoard: ogni Task è messo nella sua colonna come scheda propria; extension/src/webview/board/render.ts, funzione renderCard: sa disegnare solo Proposal, Drift e Task. Nel nucleo src/core/design.ts non resta nessun raggruppamento per design.
