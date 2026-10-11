---
column: done
technical: false
refs:
  - drift-resolution/Free
  - drift-resolution.SCAN_BARRIER_CLEARED
drift: m7j2ym2v
proposal: null
agent: false
created: 2026-10-11T09:50:26.311Z
finished: 2026-10-11T09:54:24.942Z
---
# Fix code to match the Model: A scan that ends after its check was declared does not lift the wait after a coordinator takeover

## What happens

Dopo l'apertura dell'editor, o quando una finestra prende il ruolo di coordinatore, l'automatismo aspetta la fine di uno scan. Il codice considera finito lo scan già alla dichiarazione di un controllo riuscito, non alla fine del lavoro. Se la finestra prende il ruolo, o la delega viene attivata, dopo quella dichiarazione ma prima della fine dello scan, la fine di quello scan non basta: l'attesa non si toglie e la raccolta non parte, finché non arriva un altro scan o un Resolve Drifts.

## What should happen

L'attesa iniziale si toglie alla fine del lavoro di uno scan, con qualunque esito. Una dichiarazione di controllo da sola non emette `SCAN_BARRIER_CLEARED`. Uno scan che finisce dopo la presa del ruolo, o con la delega attivata mentre era in corso, riattiva quindi la raccolta come qualsiasi altra fine di scan.

## Chosen option

**Lift the wait when the scan's work ends**

Si toglie l'attesa quando un lavoro di scan termina, riuscito o no, e non alla dichiarazione del controllo. È ciò che dicono Modello e Requisiti. Costo: spostare il punto che segna la ripresa nel tracciamento dei lavori; nessun cambio visibile negli altri casi.

## Where in the code

extension/src/host/drift-resolution.ts (receiveCheck, endWhere, awaitAutopilotResume, receiveCoordinatorMessage), extension/src/host/questions.ts (isCoordinator)
