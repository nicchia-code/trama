---
column: done
technical: false
refs:
  - project/Trama project/workspace.REQUIREMENTS_CHANGED
  - project/Trama project/proposal.APPROVED
  - project/Trama project/developer.UPDATE_SKILLS
  - requirements/rules#project
  - requirements/tech#project
drift: null
proposal: euf9nx59
agent: false
created: 2026-10-05T13:21:54.847Z
---
# Generare le skill di Requisiti per frammento o come indice secondo il budget

Le skill di Requisiti hanno due modalità, la stessa per tutte le Aree, scelte dal budget: la somma, sui frammenti con almeno una sezione non vuota, dei caratteri del nome `trama-req-<area>-<frammento>` e della descrizione. Fino a 4.000 compresi: una skill per frammento; oltre: una skill indice `trama-req-<area>` per Area.

Quando è fatto:
- **per frammento**: descrizione del frammento, corpo con l'introduzione dell'Area e le sezioni non vuote del frammento;
- **indice**: descrizione dell'Area, corpo con introduzione, General per intero e l'elenco dei frammenti (titolo, descrizione, riferimenti delle sezioni, percorso relativo); ogni frammento è un file `<frammento>.md` nella cartella della skill, senza ripetere General;
- in ogni cartella di skill che ha `trama-design` si scrivono solo i file cambiati e si tolgono tutte le `trama-req-*` che la modalità corrente non produce, anche quelle dell'altra modalità dopo un passaggio;
- il resoconto dice la modalità, il budget usato su 4.000 e l'eventuale passaggio;
- la rigenerazione avviene dopo una modifica dei Requisiti (il watcher segue anche i file dentro le cartelle delle Aree), dopo l'approvazione di una Proposal e con l'aggiornamento delle skill.
