---
status: resolved
resolution: fix-code
refs:
  - drift-resolution.SCAN_BARRIER_CLEARED
  - drift-resolution/Free
proposal: null
task: sf39cnid
origin: null
critical: false
option: 1
note: null
resolvedBy: s30o7haf
created: 2026-10-11T10:01:09.039Z
---
# A declared check lifts the initial wait without a scan ending

## What happens

Dopo l'apertura dell'editor o la presa del ruolo di coordinatore, l'automatismo aspetta la fine di uno scan. Il codice toglie quell'attesa anche alla sola dichiarazione di un controllo: se arriva per uno scan già finito (prima della presa del ruolo) oppure per il controllo di fine corsa di un Run, che non è un lavoro di scan, la delega diventa operativa senza che nessuno scan sia finito dopo la ripresa.

## What should happen

Il Modello dice che una dichiarazione di controllo, riuscito o fallito, da sola non emette `SCAN_BARRIER_CLEARED`: serve la fine del lavoro di uno scan. Dopo l'apertura dell'editor o una presa del ruolo, l'attesa si toglie soltanto alla fine di uno scan, con qualunque esito, o con Resolve Drifts.

## Fix options

### Lift the wait only when a scan job ends

Si tolgono i due punti in cui la dichiarazione di un controllo rende operativa la delega: restano la fine del lavoro di uno scan e Resolve Drifts. Il controllo di fine corsa di un Run non toglie più l'attesa. È ciò che dicono Modello e Requisiti. Costo: dopo una riapertura, un Run manuale da solo non rende operativa la delega.

### Keep the Run's end check lifting the wait

Si toglie il rilancio solo per i controlli di scan già finiti, ma il controllo mirato di fine corsa di un Run continua a rendere operativa la delega, perché è uno scan seguito dal Run. Costo: la regola resta diversa dal testo del Modello per il Run e va chiarita nel Modello.

## Where in the code

extension/src/host/drift-resolution.ts, receiveCheck (rami phase scanning con failed e con !scanActive)
