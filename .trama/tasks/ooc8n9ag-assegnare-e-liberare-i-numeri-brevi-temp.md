---
column: done
technical: false
refs:
  - proposal
  - task
  - drift
  - requirements/data#General
  - requirements/rules#General
  - requirements/tech#General
drift: null
proposal: 2pqy2i0g
agent: false
created: 2026-10-05T10:04:46.068Z
---
# Assegnare e liberare i numeri brevi temporanei di Proposal, Task e Drift

Ogni Proposal (anche Draft), Task (in To do o In progress) e Drift (aperto) vivo ha un numero breve intero positivo, unico per tipo, scritto solo nel file non versionato `.trama/short-numbers/assigned` di questa copia di lavoro (una riga `<tipo> <identità permanente> <numero>`), con la cartella dotata del suo `.gitignore` che ignora tutto, scritto insieme al primo file. Quando la copia legge una scheda viva senza numero, la scheda prende il più basso libero del suo tipo; più schede nella stessa lettura prendono i numeri in ordine di creazione; vale anche per le schede arrivate da un altro branch o da un worktree e per quelle ancora numerate `NNNN-<slug>`. Alla prima lettura che trova la scheda chiusa (Proposal approvata, rifiutata o scartata, Drift risolto, Task in Done) il numero torna libero; un Task che da Done torna indietro ne prende uno nuovo. Se il file manca, non si legge o ha righe incomprensibili o duplicate, i numeri si ricostruiscono da zero in ordine di creazione senza far fallire nessun comando; le righe di schede che non esistono più si tolgono. La scrittura è atomica (file temporaneo poi rinomina), l'assegnazione sta in `src/core` ed è condivisa da riga di comando ed estensione, e ogni worktree ha i suoi numeri.
