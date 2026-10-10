---
column: done
technical: false
refs:
  - drift/Open/developer.FIX_DRIFT_CODE
  - requirements/rules#drift
drift: ruul7pg8
proposal: null
agent: false
created: 2026-10-09T11:44:52.679Z
finished: 2026-10-09T11:45:56.671Z
---
# Fix code to match the Model: The fix Task of a Drift whose Model elements all vanished becomes technical

## What happens

Quando il developer tiene ciò che dovrebbe succedere su un Drift che punta al **Modello**, ma tutti i suoi elementi del Modello sono spariti senza un contenitore ancora presente (per esempio la Machine stessa è stata tolta), il Task di correzione nasce comunque **tecnico**:

- se il Drift puntava anche a Requisiti, il Task punta solo a quelli;
- se puntava solo al Modello, il Task nasce **senza alcun riferimento**.

Il titolo dice ancora "Fix code to match the Model", ma il Task è segnato come lavoro che non cambia comportamento, non blocca né è bloccato da nulla e non si trova nel Diagramma.

## What should happen

Il Modello e `rules#drift` dicono che il Task di correzione punta agli stessi elementi del Drift ed è tecnico **esattamente quando il Drift punta solo a Requisiti**. Un Drift che punta al Modello deve dare un Task non tecnico, con il titolo "…the Model".

Il caso in cui nessun elemento del Modello resta, nemmeno un contenitore, non è previsto: il Modello dice che la correzione crea sempre il Task, e i Requisiti dei Task chiedono che un Task non tecnico punti ad almeno un elemento del Modello che esiste.

## Chosen option

**Refuse the fix when no Model element is left**

La correzione è **rifiutata**, dicendo che gli elementi del Modello del Drift non esistono più e che il Drift si può solo chiudere; anche la consegna di una risoluzione rifiuta `fix-code` per quel Drift, così l'approvazione non si ferma a metà. Costa un rifiuto in più che il Modello non elenca e toglie al developer la correzione in questo caso.

## Where in the code

src/core/work.ts (`fixCode` calcola il tecnico dai riferimenti ancora vivi, `liveRefs` scarta quelli senza contenitore)
