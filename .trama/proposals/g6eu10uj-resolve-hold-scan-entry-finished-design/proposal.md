---
status: approved
kind: resolution
drifts:
  - drift: 86o9gooo
    decision: fix-code
    option: 1
  - drift: t0wco475
    decision: fix-code
    option: 1
  - drift: shuwd177
    decision: fix-code
    option: 1
  - drift: yibn9r5w
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-10T11:13:23.468Z
---
# Resolve Hold scan entry, finished design requests and hooked terminal quiet

Questa risoluzione decide quattro Drift, tutti da correggere nel codice:

- D1 – Hold scan decides entry without reading the Proposal's saved scan scope: si corregge il codice. Una Proposal approvata entra nel sospeso solo se il suo ambito di scansione salvato ha ancora un riferimento dentro una Feature esistente, oltre alle condizioni della scansione automatica.
- D2 – Finished design requests are remembered in workspace state while their tab is open: si corregge il codice. Le richieste consumate o abbandonate si ricordano solo in memoria per la sessione, senza elenco salvato, e l'ID inviato di un file sparito esce subito dall'elenco degli inviati.
- D3 – Restored tab of a vanished design request is closed even with unsaved changes: si corregge il codice. All'avvio e all'apertura di una scheda, Trama chiude le schede di richieste sparite solo se non hanno modifiche non salvate; le altre restano all'editor.
- D4 – A new hooked integrated terminal counts as quiet before its first activity and releases Tasks taken without a terminal: si corregge il codice. La quiete di un terminale integrato con hook conta dall'inizio della sua corsa, come per la finestra esterna.
