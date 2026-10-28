---
created: 2026-10-27T09:54:55.288Z
updated: 2026-10-27T09:54:55.288Z
summary: "Un Drift unificato è fatto di una differenza per ogni Drift unito: Unify Drifts non decide più nulla, Resolve pone una domanda per differenza aperta e pannello, Task di correzione e round pronto lavorano per differenza."
tasks:
  - k35lg4os
  - jut3n5r6
  - 0mawu0ng
  - 2zufqppx
  - tyz4o45e
  - zxi7qryk
---
# Drift unificato con differenze decise una per una

Unify Drifts unisce i Drift in un solo Drift unificato senza fondere le loro decisioni e senza chiedere nulla al developer: registra una differenza per Drift, nell'ordine di creazione, con le relazioni `linked` fra differenze che si influenzano. Le domande arrivano dopo, con Resolve, una per differenza aperta.

Dati: il file del Drift porta `differences` (refs, Proposal, decisione, opzione, nota, Task, chi l'ha chiusa); `drift new` con `unifies` richiede `differences` e rifiuta i casi incoerenti; Snapshot, `drift show --json`, `drift list` e `project show` espongono le differenze (k35lg4os).

Risoluzioni: una risoluzione elenca solo le differenze a cui il developer ha risposto, ciascuna con la sua decisione (`difference` in `DriftDecision`, `proposal edit`, `proposal show`); i controlli di consegna e approvazione valgono per differenza e `drift.UNIFIED` scarta la Proposal allegata solo se la differenza ne ha una nuova (jut3n5r6).

Task di correzione: differenze collegate corrette insieme condividono un solo Task, la cui verifica copre ogni differenza; chiuderlo senza modifiche mette le sue differenze a dismissed ricordando la scelta fatta, e non si cancella finché è Task di correzione o origine di una differenza (tyz4o45e).

Unify e Resolve: le istruzioni di `unify-drifts.md` sono riscritte; il round pronto del Drift unificato ha una voce per differenza e Resolve lo apre senza agente quando ogni differenza aperta ha una domanda valida, altrimenti lancia l'agente (0mawu0ng). Il round ha una domanda per differenza aperta con overlay, riepilogo e raccomandazioni preselezionate; saltarne alcune lascia aperte solo le loro differenze, e Ask more porta il riferimento al Drift unificato (zxi7qryk).

Pannello: la scheda rossa mostra `<K> of <N> open`, i dettagli (Board e Diagramma) hanno un blocco richiudibile per differenza con stato e collegamenti, la scheda gialla ha una riga per differenza decisa e il ghost di Unify non mostra mai Waiting for your answers (2zufqppx).
