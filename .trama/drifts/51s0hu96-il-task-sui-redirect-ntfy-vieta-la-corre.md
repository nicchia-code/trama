---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#notice
proposal: null
task: 49s8jlpq
origin: i1xh2wu0
option: 2
note: null
created: 2026-10-06T19:12:17.109Z
---
# Il Task sui redirect ntfy vieta la correzione richiesta

## What happens

Il Task richiede che un reindirizzamento ntfy sia un fallimento, ma contiene anche la nota esplicita **Ntfy verrà rimosso, non fixiamo niente**. Il codice attuale lascia seguire automaticamente il reindirizzamento: una risposta positiva della destinazione successiva può far risultare consegnato l'avviso. Non è stata applicata alcuna modifica, rispettando il divieto della nota.

## What should happen

I Requisiti attuali prescrivono **una sola richiesta POST per tentativo** e accettano soltanto risposte HTTP 2xx della destinazione configurata. Un reindirizzamento deve quindi fallire ed entrare nell'attesa dell'unico secondo tentativo. La correzione richiesta contraddice però il divieto esplicito del Task; la futura rimozione di ntfy non è descritta dal Modello corrente e non può essere anticipata in questo incarico.

## Fix options

### Autorizzare la correzione dei reindirizzamenti

Rimuovere il divieto dal Task e mantenere gli avvisi ntfy descritti dal Modello corrente. Ogni tentativo resta un solo POST e tratta la risposta di reindirizzamento come fallimento, con un unico secondo tentativo. Il costo è una modifica mirata al comportamento di invio e una verifica HTTP locale.

### Definire e approvare la rimozione di ntfy

Mantenere il divieto di correggere questo comportamento e descrivere in un design la rimozione degli avvisi ntfy dal Modello e dai Requisiti. Dopo la decisione del developer, eseguire i Task del design e riesaminare questo Task. Il costo è un cambiamento più ampio e la perdita delle notifiche remote.

## Where in the code

extension/src/host/notices.ts: NoticeService.attempt; extension/src/host/notice-host.ts: fetch globale; nota del Task i1xh2wu0
