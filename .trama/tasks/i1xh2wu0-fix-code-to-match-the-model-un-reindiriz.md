---
column: done
technical: true
refs:
  - requirements/tech#General
drift: uzlt129x
proposal: rub6h6m6
agent: false
created: 2026-10-06T18:58:10.533Z
finished: 2026-10-06T20:14:49.700Z
---
# Fix code to match the Model: Un reindirizzamento ntfy viene seguito e può risultare consegnato

## What happens

Se l'URL dell'argomento risponde con un reindirizzamento HTTP, l'avviso segue automaticamente la nuova destinazione. Una risposta 302 seguita da una risposta 200 fa risultare l'avviso consegnato, senza secondo tentativo né avviso di errore, benché la destinazione configurata non abbia accettato l'invio. Lo scenario isolato produce prima un POST all'argomento e poi un GET alla destinazione del reindirizzamento.

## What should happen

Ogni tentativo deve essere una sola richiesta POST all'URL dell'argomento. È consegnato soltanto se quella richiesta riceve una risposta HTTP 2xx; ogni altro stato, compreso un reindirizzamento 3xx, è un fallimento. Il primo fallimento deve entrare nell'attesa del secondo tentativo, non diventare un successo attraverso ulteriori richieste.

## Chosen option

**Trattare ogni reindirizzamento come fallimento**

Non seguire i reindirizzamenti dell'argomento: valutarne direttamente lo stato HTTP e applicare l'unico secondo tentativo previsto. Il developer riceve il motivo del fallimento dopo il secondo esito negativo e può correggere l'URL. Mantiene un solo POST per tentativo e impedisce di dichiarare consegnata una notifica che il servizio configurato non ha accettato.

## Note

Ntfy verrà rimosso, non fixiamo niente

## Where in the code

extension/src/host/notices.ts: NoticeService.attempt; extension/src/host/notice-host.ts: fetch globale

## Esito dell’attuazione

La Proposal rub6h6m6 approvata e la richiesta del developer di rimuovere ntfy superano la correzione dei reindirizzamenti descritta sopra. L’integrazione è stata eliminata integralmente: impostazione, servizio HTTP, timer, tentativi e collegamenti a terminali, chat e domande. Non resta un invio di cui correggere i reindirizzamenti. Conservati trasporto locale, avvisi locali, rilascio dei Task, ritiro degli annunci e flussi dei worktree; impostazioni utente non riscritte.

Verifica: 635 test passati, controllo dei tipi e build CLI/estensione riusciti; due round consegnati dalla CLI tramite socket locale, in ordine, senza richieste HTTP. Il Task è concluso mediante la rimozione approvata, non mediante un’altra correzione di ntfy.
