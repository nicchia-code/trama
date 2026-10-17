---
technical: true
refs:
  - requirements/ui#drift-resolution
---
# Resolve all in fondo a Blocked, badge Resolving e risoluzioni in Backlog

Il pulsante `Resolve Drifts` sparisce dalla barra della Board (nessuno shim né etichetta rimasta); al suo posto `Resolve all` sta in fondo alla colonna Blocked e lancia Resolve Drifts su tutti i Drift aperti, mentre `Resolve` sulla scheda di un Drift lo lancia su quel solo Drift.

Quando non si può usare, `Resolve all` resta visibile, disabilitato e segnato come tale per le tecnologie assistive, con il motivo nel tooltip e nella descrizione accessibile, nell'ordine: `Drifts are being resolved`, `A run is in progress`, `Proposal <id> resolving Drifts awaits a decision` (la più vecchia), `No open Drifts`. I motivi aggiuntivi di barriera, coordinatore indisponibile o ripresa richiesta restano testuali e accessibili dopo quelli prioritari. Il tooltip di `Resolve all` e di `Resolve` spiega la modalità attiva.

Mentre l'agente di risoluzione lavora, `Run all` e il `Run` di ogni Task sono disabilitati con il motivo `Drifts are being resolved`, primo fra gli altri motivi nell'ordine di `panel/Board`. Il quadro della Board riceve dall'host le identità dei Drift raccolti dal lavoro in corso, e le schede di quei Drift restano in Blocked con il badge `Resolving`.

Il ghost della Proposal annunciata lanciando Resolve Drifts (con `Resolve all` o con `Resolve`) sta in Active come quello di un design: titolo `Resolve Drifts` finché non c'è la Draft, poi il titolo della Draft; riga di fase `Waiting for your answers` mentre il round è aperto.

Le risoluzioni automatiche aperte mostrano la scheda aggregata ordinaria in Backlog con l'indicatore testuale della delega; approvate, spariscono da Backlog e i Task compaiono nelle colonne ordinarie. La barra non ha una riga di stato dell'autopilota. Aggiornare i test del webview sulla barra, sul pulsante `Resolve all` e i suoi motivi, e sul badge `Resolving`.
