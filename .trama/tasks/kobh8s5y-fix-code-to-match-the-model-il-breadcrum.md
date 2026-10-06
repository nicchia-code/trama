---
column: done
technical: false
refs:
  - diagram/State level/developer.OPEN_STATE_LEVEL
drift: cbcec07z
proposal: null
agent: false
created: 2026-10-06T16:27:55.545Z
finished: 2026-10-06T16:36:11.379Z
---
# Fix code to match the Model: Il breadcrumb apre il livello di uno Stato che contiene quello mostrato, che il Modello non prevede

## What happens

Al livello di uno **Stato annidato** (per esempio B dentro A), il breadcrumb mostra anche gli Stati che lo contengono: `System › feature › machine › A › B`. Un clic su **A** apre il livello di A, cioè si **risale** dal livello di uno Stato a quello di uno Stato che lo contiene.

## What should happen

Da State level a State level il Modello prevede solo l'apertura di **un sotto-Stato che ha a sua volta sotto-Stati**. Il breadcrumb è previsto solo per tornare al System, alla Feature o alla Machine; la risalita a uno Stato contenitore non c'è.

## Chosen option

**Togliere dal breadcrumb gli Stati contenitori**

Il breadcrumb al livello di uno Stato mostra solo System, Feature, Machine e lo Stato mostrato. Per tornare a uno Stato contenitore il developer passa dal livello della Machine e riapre gli Stati uno per uno. Il codice rispetta il Modello, ma la navigazione peggiora molto negli Stati annidati.

## Where in the code

extension/src/webview/diagram/levels.ts (`breadcrumb`, che aggiunge ogni Stato del percorso come livello); extension/src/webview/diagram/index.ts (clic sul breadcrumb)
