---
column: done
technical: false
refs:
  - project/Trama project
  - requirements/rules#project
drift: null
proposal: euf9nx59
agent: false
created: 2026-10-05T13:21:55.087Z
---
# Nominare la skill di Requisiti che esiste nella modalità corrente

Ovunque Trama dice all'agente quale skill di Requisiti caricare (per esempio in `trama requirements`, nell'elenco delle Aree e nei Requisiti di un elemento, o in un rimando a un'Area intera), nomina quella che esiste davvero nella modalità corrente:
- modalità per frammento: la skill del frammento che contiene la sezione, o le skill di tutti i frammenti per un'Area intera;
- modalità indice: la skill indice `trama-req-<area>` dell'Area.

Un agente che segue il nome indicato trova sempre una skill installata.
