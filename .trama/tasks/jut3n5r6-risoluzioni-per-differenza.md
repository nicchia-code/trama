---
column: done
technical: false
refs:
  - proposal
drift: null
proposal: 1on5nedt
agent: false
created: 2026-10-27T08:00:30.579Z
finished: 2026-10-27T09:44:26.911Z
---
# Risoluzioni per differenza

Per un Drift unificato con differenze una risoluzione decide differenza per differenza: elenca solo le differenze a cui il developer ha risposto, ciascuna con la sua decisione; quelle saltate o senza risposta restano fuori e aperte. Fatto il lavoro, vale quanto segue.

- In una risoluzione, una voce di `drifts` che decide una differenza porta anche `difference`, il `drift` di quella differenza (`DriftDecision` in `src/core/proposals.ts` ha `difference?`). Un Drift unificato con differenze compare solo in voci con `difference`, al massimo una per differenza e solo per differenze aperte; ogni altro Drift compare in al massimo una voce senza `difference`, come oggi. `recordDecision` (`src/core/resolution.ts`) indicizza le voci per Drift e differenza.
- `proposal edit` con `drifts` accetta `difference` su ogni voce (identità permanente o numero breve); una voce su un Drift unificato con differenze senza `difference`, o con `difference` su qualunque altro Drift, è rifiutata nominando la voce. `proposal show` e il suo `--json` elencano le decisioni per differenza.
- I controlli di consegna e di approvazione (`fixCodeRefusal` e gli altri) valgono per differenza: un `fix-code` deve nominare un modo di correggere esistente di quella differenza, e una decisione `proposal` porta le modifiche della Proposal allegata a quella differenza.
- `drift.UNIFIED` scarta la Proposal allegata (Draft oppure Open, anche se già consegnata), senza feedback, solo quando il Drift a cui è allegata è stato unito con Unify Drifts e l'agente ha allegato alla sua differenza una Proposal nuova al posto di questa. Altrimenti la Proposal resta, ora tenuta dalla differenza del Drift unificato. Le Proposal che richiedono una Proposal scartata così restano bloccate, dicendo che è stata scartata.
