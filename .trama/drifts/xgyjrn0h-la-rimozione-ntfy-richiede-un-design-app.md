---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#notice
proposal: null
task: 0xgsgn37
origin: 63qz6wvx
option: 2
note: null
created: 2026-10-06T19:49:30.947Z
---
# La rimozione ntfy richiede un design approvato assente

## What happens

Il Task 63qz6wvx richiede di approvare prima un design di rimozione degli avvisi ntfy e mantiene il divieto di correggere il comportamento HTTP. Non esiste alcuna Proposal nel progetto: la verifica delle schede disponibili restituisce un elenco vuoto. Gli avvisi restano quindi presenti e il tentativo continua a usare la gestione predefinita dei reindirizzamenti. Nessun codice è stato modificato, perché rimuovere gli avvisi oppure correggere il tentativo anticiperebbe la decisione richiesta dal Task.

## What should happen

I Requisiti vigenti impongono ancora gli avvisi ntfy e una sola richiesta POST per tentativo, con successo soltanto per una risposta HTTP 2xx della destinazione configurata. La scelta del Task subordina qualsiasi rimozione a un design completo approvato e vieta la correzione alternativa. Questo prerequisito manca e soltanto il developer può approvare un design o cambiare la decisione: non è possibile implementare e concludere il Task senza contraddire almeno una delle istruzioni.

## Fix options

### Definire e approvare il design di rimozione ntfy

Mantenere la scelta del Task e preparare un design completo che elimini gli avvisi remoti dal Modello e dai Requisiti. Il developer lo esamina e decide se approvarlo; soltanto dopo l’approvazione si eseguono i Task di rimozione. Il comportamento resta invariato fino alla decisione e si perdono le notifiche remote, ma la rimozione segue il processo richiesto senza anticipare cambiamenti non autorizzati.

### Autorizzare la correzione conservando ntfy

Il developer cambia esplicitamente la scelta che vieta la correzione. Gli avvisi remoti restano disponibili e ogni tentativo termina sulla risposta della destinazione configurata, senza seguire reindirizzamenti; una risposta non 2xx provoca il fallimento previsto. Questa alternativa evita la rimozione e mantiene i Requisiti vigenti, ma richiede di superare la decisione precedente prima di modificare il codice.

## Where in the code

extension/src/host/notices.ts: NoticeService.attempt; extension/src/host/notice-host.ts: fetch globale; Task 63qz6wvx: scelta di approvazione preventiva
