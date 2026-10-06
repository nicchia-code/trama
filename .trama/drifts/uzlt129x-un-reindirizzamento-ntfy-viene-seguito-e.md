---
status: resolved
resolution: fix-code
refs:
  - notice/Sending
  - requirements/tech#notice
proposal: null
task: i1xh2wu0
origin: null
option: 1
note: Ntfy verrà rimosso, non fixiamo niente
created: 2026-10-06T18:55:23.697Z
---
# Un reindirizzamento ntfy viene seguito e può risultare consegnato

## What happens

Se l'URL dell'argomento risponde con un reindirizzamento HTTP, l'avviso segue automaticamente la nuova destinazione. Una risposta 302 seguita da una risposta 200 fa risultare l'avviso consegnato, senza secondo tentativo né avviso di errore, benché la destinazione configurata non abbia accettato l'invio. Lo scenario isolato produce prima un POST all'argomento e poi un GET alla destinazione del reindirizzamento.

## What should happen

Ogni tentativo deve essere una sola richiesta POST all'URL dell'argomento. È consegnato soltanto se quella richiesta riceve una risposta HTTP 2xx; ogni altro stato, compreso un reindirizzamento 3xx, è un fallimento. Il primo fallimento deve entrare nell'attesa del secondo tentativo, non diventare un successo attraverso ulteriori richieste.

## Fix options

### Trattare ogni reindirizzamento come fallimento

Non seguire i reindirizzamenti dell'argomento: valutarne direttamente lo stato HTTP e applicare l'unico secondo tentativo previsto. Il developer riceve il motivo del fallimento dopo il secondo esito negativo e può correggere l'URL. Mantiene un solo POST per tentativo e impedisce di dichiarare consegnata una notifica che il servizio configurato non ha accettato.

### Rifiutare esplicitamente la consegna reindirizzata

Interrompere il tentativo appena il servizio propone una nuova destinazione, trattando il reindirizzamento come errore di consegna anziché seguirlo. Il comportamento resta quello di un solo POST e di un solo secondo tentativo, ma il motivo mostrato può essere un errore di rete invece dello stato HTTP. Non richiede modificare il Model, soltanto scegliere una diagnosi meno specifica.

## Where in the code

extension/src/host/notices.ts: NoticeService.attempt; extension/src/host/notice-host.ts: fetch globale
