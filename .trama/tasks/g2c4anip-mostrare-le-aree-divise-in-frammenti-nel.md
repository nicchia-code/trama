---
column: done
technical: false
refs:
  - panel/Requirements
  - requirements/ui#panel/Requirements
  - requirements/ui#panel
  - requirements/tech#project
drift: null
proposal: euf9nx59
agent: false
created: 2026-10-05T13:21:56.173Z
---
# Mostrare le Aree divise in frammenti nella scheda Requirements

La scheda Requirements mostra Area › frammento › sezioni:
- ogni Area mostra titolo, descrizione e introduzione, poi i frammenti in ordine di nome file; ogni frammento è un gruppo con titolo, nome del file (`<frammento>.md`) in testo secondario, descrizione resa come Markdown e sotto le sue sezioni, con General per prima;
- un'Area senza frammenti mostra la riga `No fragments.` sotto la descrizione;
- con una Proposal aperta selezionata, i frammenti hanno le etichette `new fragment` e `fragment removed` (nessuna se cambiato), le sezioni tengono `added`, `removed`, `changed`; una sezione spostata compare solo nel frammento di arrivo con `moved from <frammento>`, seguita da `changed` e dal testo di prima se anche il testo cambia;
- il pannello si aggiorna quando cambia un file dentro la cartella di un'Area.
