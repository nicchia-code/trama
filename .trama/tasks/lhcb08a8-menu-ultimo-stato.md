---
column: done
technical: false
refs:
  - menu-laterale
  - requirements/tech#menu-laterale
  - requirements/quality#menu-laterale
drift: null
proposal: adyvleqj
agent: false
created: 2026-10-26T12:16:40.800Z
finished: 2026-10-26T12:18:59.713Z
---
# Menu laterale senza riletture

Il menu laterale non deve più ricalcolare il suo stato quando il pannello cambia vista o quando il menu torna visibile. Oggi in entrambi i casi ricostruisce in modo sincrono tutto il quadro di `.trama/` e, con Solo mode, lancia fino a ~8 comandi `git`, solo per spostare l'evidenza della voce. Su un computer con antivirus questo rende lento ogni cambio di scheda.

Quando il Task è finito:

- Quando il pannello cambia vista (`onDidChangeShownView`, `extension/src/host/menu/view.ts`) l'host rimanda `menuState` dall'ultimo stato calcolato. Quell'ultimo stato comprende situazione, numero delle decisioni, `tasksSinceScan`, `handoffs`, `merge` e `manager`; cambia solo `panelView`, letto di nuovo. L'evidenza segue la vista subito, anche per un collegamento, un focus o un comando, e a pannello chiuso nessuna voce è evidenziata.
- Quando la vista del menu torna visibile (`onDidChangeVisibility`) l'host rimanda allo stesso modo l'ultimo stato, con `panelView` di adesso.
- In nessuno dei due casi si costruisce un quadro, si legge un file del progetto o si avvia un processo (`git` compreso). `MenuModel` (`extension/src/host/menu/model.ts`) tiene l'ultimo stato completo. Lo ricalcolano soltanto `resolveWebviewView`, gli eventi dei file di `.trama/**`, le cartelle dell'area di lavoro, le impostazioni, i cambiamenti dello stato del Merge di Solo mode e i cambi della risoluzione dei Drift, come oggi.
- Il badge dell'icona e il titolo della vista restano quelli dell'ultimo stato.
- I test in `test/host-menu.test.ts` verificano che un cambio di vista e una nuova visibilità mandino la nuova evidenza senza chiamare `facts`, `mergeState` o `manager` della superficie. Verificano anche che un evento dei file li chiami ancora.
- `CHANGELOG.md` registra il cambiamento.
