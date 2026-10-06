---
column: done
technical: false
refs:
  - work
  - task
  - requirements/rules#General
  - requirements/ui#General
drift: null
proposal: 94bb2yjg
agent: false
created: 2026-10-06T12:17:25.525Z
---
# Tenere il numero breve dei Task di un design finché il design non è tutto in Done

Un Task legato a una Proposal (anche se è l'unico del design) che è in Done e ha ancora il numero breve lo tiene finché almeno un Task del suo design è in To do o In progress; alla prima lettura che trova tutti i Task del design in Done lo perdono tutti insieme. Un Task in Done senza numero non ne prende mai uno, nemmeno quando il design si riapre (Task nuovo legato o Task riportato indietro): il numero nuovo lo prende solo il Task in To do o In progress. Finché lo tiene, il numero vale nei comandi come per una scheda viva e si mostra nel pannello e nella riga di comando al posto dell'identità; un Task Done senza numero si mostra con l'identità permanente. Un Task senza `proposal` segue la regola di prima e libera il numero in Done.
