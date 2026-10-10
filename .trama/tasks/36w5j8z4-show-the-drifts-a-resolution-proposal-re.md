---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#proposal
  - requirements/ui#General
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:15:16.001Z
finished: 2026-10-09T08:30:52.439Z
---
# Show the Drifts a resolution Proposal resolves on its Board card

La scheda di una Proposal di risoluzione nella colonna To decide ha, sotto l'elenco dei file, un blocco con l'intestazione `Resolves Drifts`. Oggi la Board non distingue una risoluzione dalle altre Proposal e il quadro che riceve non porta le sue decisioni.

- Una riga per Drift della risoluzione, nell'ordine di creazione dei Drift, con il numero breve (o l'identità se il Drift non ne ha più), il titolo e ciò che succede approvandola: `Model updated to match the code`, `Closed, nothing changes`, oppure `Code fixed with option <titolo dell'opzione>`, con ` · note` in fondo quando la decisione ha una nota.
- Un Drift già risolto in altro modo ha la riga con `(already resolved)` al posto della decisione.
- Il blocco è un elenco con il nome accessibile `Drifts resolved by <titolo della Proposal>`; ogni riga porta a quel Drift nel Diagramma.
- La scheda del Drift non dice in quale risoluzione sta.

Il quadro del pannello porta, per ogni risoluzione, le sue decisioni con quanto serve a scrivere le righe; anche i dettagli della Proposal nel Diagramma mostrano lo stesso blocco, ma quella parte non fa parte di questo Task. Il tipo `resolution` e la lista delle decisioni nella Proposal sono di un altro Task.

Fatto quando una risoluzione aperta mostra sulla Board l'elenco dei suoi Drift con la decisione di ciascuno, e il blocco segue i cambi delle decisioni e lo stato dei Drift a ogni aggiornamento.
