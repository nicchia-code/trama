---
column: done
technical: false
refs:
  - panel/Diagram
drift: null
proposal: p5ty6g5g
agent: false
created: 2026-10-20T21:11:40.631Z
finished: 2026-10-20T21:23:53.174Z
---
# Diagramma in React

Si fa dopo «Base React e shadcn».

- **Disegno.** Il Diagramma resta disegnato da cytoscape con il layout di elkjs, dentro un componente React che crea l'istanza una volta e la aggiorna a ogni quadro, senza ricrearla.
- **Componenti.** Barra, livelli, selettore della Proposal da disegnare e pannello dei dettagli diventano componenti React di shadcn/ui, con le icone lucide di `ui#panel` (`Search`, `Check`, `X`, `Ban`).
  - I dettagli mostrano Requisiti, Drift e Proposal come prima.
  - `Approve`, `Reject`, `Resolve` e `Dismiss Drift` mandano gli stessi messaggi all'host.
- **Colori del canvas.** Stati, transizioni, Drift e Proposal disegnate prendono i colori del tema del pannello (chiaro o scuro) e cambiano quando il tema cambia.
- **Codice vecchio.** Il codice di disegno DOM del Diagramma sparisce; `layout.ts` e `graph.ts` restano.
- **Test.** I test del layout restano. Un test con Testing Library prova la selezione di un elemento e i pulsanti dei dettagli.
