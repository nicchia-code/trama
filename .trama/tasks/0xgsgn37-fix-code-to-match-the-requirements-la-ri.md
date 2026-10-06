---
column: done
technical: true
refs:
  - requirements/tech#notice
drift: xgyjrn0h
proposal: null
agent: false
created: 2026-10-06T19:50:57.128Z
finished: 2026-10-06T19:52:47.535Z
---
# Fix code to match the Requirements: La rimozione ntfy richiede un design approvato assente

## What happens

Il Task 63qz6wvx richiede di approvare prima un design di rimozione degli avvisi ntfy e mantiene il divieto di correggere il comportamento HTTP. Non esiste alcuna Proposal nel progetto: la verifica delle schede disponibili restituisce un elenco vuoto. Gli avvisi restano quindi presenti e il tentativo continua a usare la gestione predefinita dei reindirizzamenti. Nessun codice è stato modificato, perché rimuovere gli avvisi oppure correggere il tentativo anticiperebbe la decisione richiesta dal Task.

## What should happen

I Requisiti vigenti impongono ancora gli avvisi ntfy e una sola richiesta POST per tentativo, con successo soltanto per una risposta HTTP 2xx della destinazione configurata. La scelta del Task subordina qualsiasi rimozione a un design completo approvato e vieta la correzione alternativa. Questo prerequisito manca e soltanto il developer può approvare un design o cambiare la decisione: non è possibile implementare e concludere il Task senza contraddire almeno una delle istruzioni.

## Chosen option

**Autorizzare la correzione conservando ntfy**

Il developer cambia esplicitamente la scelta che vieta la correzione. Gli avvisi remoti restano disponibili e ogni tentativo termina sulla risposta della destinazione configurata, senza seguire reindirizzamenti; una risposta non 2xx provoca il fallimento previsto. Questa alternativa evita la rimozione e mantiene i Requisiti vigenti, ma richiede di superare la decisione precedente prima di modificare il codice.

## Where in the code

extension/src/host/notices.ts: NoticeService.attempt; extension/src/host/notice-host.ts: fetch globale; Task 63qz6wvx: scelta di approvazione preventiva
