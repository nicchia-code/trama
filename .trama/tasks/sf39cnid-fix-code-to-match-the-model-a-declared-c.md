---
column: done
technical: false
refs:
  - drift-resolution.SCAN_BARRIER_CLEARED
  - drift-resolution/Free
drift: i1wmfcy5
proposal: null
agent: false
created: 2026-10-11T10:02:17.139Z
finished: 2026-10-11T10:04:10.749Z
---
# Fix code to match the Model: A declared check lifts the initial wait without a scan ending

## What happens

Dopo l'apertura dell'editor o la presa del ruolo di coordinatore, l'automatismo aspetta la fine di uno scan. Il codice toglie quell'attesa anche alla sola dichiarazione di un controllo: se arriva per uno scan già finito (prima della presa del ruolo) oppure per il controllo di fine corsa di un Run, che non è un lavoro di scan, la delega diventa operativa senza che nessuno scan sia finito dopo la ripresa.

## What should happen

Il Modello dice che una dichiarazione di controllo, riuscito o fallito, da sola non emette `SCAN_BARRIER_CLEARED`: serve la fine del lavoro di uno scan. Dopo l'apertura dell'editor o una presa del ruolo, l'attesa si toglie soltanto alla fine di uno scan, con qualunque esito, o con Resolve Drifts.

## Chosen option

**Lift the wait only when a scan job ends**

Si tolgono i due punti in cui la dichiarazione di un controllo rende operativa la delega: restano la fine del lavoro di uno scan e Resolve Drifts. Il controllo di fine corsa di un Run non toglie più l'attesa. È ciò che dicono Modello e Requisiti. Costo: dopo una riapertura, un Run manuale da solo non rende operativa la delega.

## Where in the code

extension/src/host/drift-resolution.ts, receiveCheck (rami phase scanning con failed e con !scanActive)
