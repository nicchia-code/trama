---
created: 2026-10-18T20:40:58.842Z
updated: 2026-10-18T20:40:58.842Z
summary: Una corsa su più Task tiene al lavoro fino a N Task insieme e affida subito il posto libero appena un sotto-agente finisce. La consegna di una Proposal è un solo comando, trama proposal submit, che valida e mostra le modifiche.
tasks:
  - 7a34jb40
  - b9nr6zxy
---
# Coda continua e consegna in un passo

La coda di trama task next --batch --max N dà da uno a N Task eseguibili nell'ordine di sempre, senza due che si toccano. Appena un sotto-agente finisce, con il Task in Done, chiuso senza modifiche o fermato da un Drift, la corsa chiede i Task per i posti liberi e li affida subito, senza aspettare la fine del gruppo.

trama proposal submit fa tutti i controlli di trama validate --proposal, compreso il blocco delle risoluzioni con un Drift fix-code non più correggibile, e rifiuta nominando ogni problema. Una consegna riuscita stampa gli avvisi dopo l'esito.

Task: 7a34jb40 Coda continua, b9nr6zxy Consegna in un passo.
