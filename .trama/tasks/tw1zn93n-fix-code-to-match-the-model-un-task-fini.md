---
column: done
technical: false
refs:
  - task/Done
  - requirements/rules#General
drift: k1f7c8h5
proposal: null
agent: false
created: 2026-10-16T11:10:07.018Z
finished: 2026-10-16T11:18:05.304Z
---
# Fix code to match the Model: Un Task finito perde il numero breve anche mentre il suo design è aperto

## What happens

Appena un Task arriva in Done perde il numero breve, come `T3`, anche quando fa parte di un design che ha ancora altri Task in To do o In progress. Il Task finito si mostra subito con la sua identità permanente, e il design aperto perde così il numero di una parte dei suoi Task finché non è tutto finito.

## What should happen

Il Modello e la regola generale dei numeri brevi dicono che un Task in Done che fa parte di un design tiene il numero finché almeno un Task del design è in To do o In progress, e lo perde tutti insieme alla prima lettura in cui tutto il design è in Done. Un Task in Done senza numero non ne prende mai uno.

## Chosen option

**Tenere il numero dei Task finiti finché il design è aperto**

Il registro dei numeri lascia il numero ai Task in Done di un design finché almeno un Task del design è in To do o In progress; quando tutto il design è in Done, perdono il numero insieme. Costo: il registro conserva qualche numero in più e i comandi citano un Task finito con il suo numero finché il design è aperto.

## Where in the code

src/core/short-numbers.ts: KIND_SPEC (per i Task i vivi sono solo todo e doing) e cardsIn, che esclude ogni Task in Done senza guardare il suo design.
