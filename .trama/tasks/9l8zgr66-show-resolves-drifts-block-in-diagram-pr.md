---
column: done
technical: false
refs:
  - panel/Diagram
  - requirements/ui#proposal
  - requirements/ui#General
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:16:07.620Z
finished: 2026-10-09T08:32:36.323Z
---
# Show Resolves Drifts block in Diagram Proposal details

I dettagli di una Proposal di risoluzione nel Diagramma mostrano, sotto l'elenco dei file cambiati, un blocco con l'intestazione `Resolves Drifts`, come la sua scheda nella Board.

Quando è finito:
- una riga per Drift, nell'ordine di creazione dei Drift, con il numero breve (o l'identità permanente se il Drift non ne ha più), il titolo e ciò che succede approvando: `Model updated to match the code`, `Closed, nothing changes`, oppure `Code fixed with option <titolo dell'opzione>`, con ` · note` in fondo quando c'è una nota;
- un Drift già risolto in altro modo ha `(already resolved)` al posto della decisione;
- il blocco è un elenco con il nome accessibile `Drifts resolved by <titolo della Proposal>`, e ogni riga porta a quel Drift nel Diagramma;
- le Proposal che non sono una risoluzione non hanno il blocco.

Usa le stesse informazioni sulle decisioni che il quadro del pannello porta alla scheda della Board (Task 36w5j8z4).
