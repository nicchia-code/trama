---
column: done
technical: true
refs:
  - requirements/tech#General
drift: 51s0hu96
proposal: rub6h6m6
agent: false
created: 2026-10-06T19:43:07.543Z
finished: 2026-10-06T20:14:49.493Z
---
# Fix code to match the Requirements: Il Task sui redirect ntfy vieta la correzione richiesta

## What happens

Il Task richiede che un reindirizzamento ntfy sia un fallimento, ma contiene anche la nota esplicita **Ntfy verrà rimosso, non fixiamo niente**. Il codice attuale lascia seguire automaticamente il reindirizzamento: una risposta positiva della destinazione successiva può far risultare consegnato l'avviso. Non è stata applicata alcuna modifica, rispettando il divieto della nota.

## What should happen

I Requisiti attuali prescrivono **una sola richiesta POST per tentativo** e accettano soltanto risposte HTTP 2xx della destinazione configurata. Un reindirizzamento deve quindi fallire ed entrare nell'attesa dell'unico secondo tentativo. La correzione richiesta contraddice però il divieto esplicito del Task; la futura rimozione di ntfy non è descritta dal Modello corrente e non può essere anticipata in questo incarico.

## Chosen option

**Definire e approvare la rimozione di ntfy**

Mantenere il divieto di correggere questo comportamento e descrivere in un design la rimozione degli avvisi ntfy dal Modello e dai Requisiti. Dopo la decisione del developer, eseguire i Task del design e riesaminare questo Task. Il costo è un cambiamento più ampio e la perdita delle notifiche remote.

## Where in the code

extension/src/host/notices.ts: NoticeService.attempt; extension/src/host/notice-host.ts: fetch globale; nota del Task i1xh2wu0

## Esito dell’attuazione

La Proposal rub6h6m6 è approvata e la rimozione ntfy è stata attuata integralmente. Il precedente contrasto tra il divieto di correggere ntfy e i Requisiti che lo richiedevano è superato: i Requisiti attuali vietano le notifiche esterne, e il codice non contiene più impostazione, invii, timer, tentativi o collegamenti dedicati. I testi sopra restano la descrizione storica del problema, non istruzioni vigenti per reintrodurre ntfy.

Verifica: 635 test passati, controllo dei tipi e build CLI/estensione riusciti; trasporto locale delle domande esercitato con due round in ordine e nessuna richiesta HTTP. Il Task è concluso applicando il design di rimozione già richiesto dalla sua opzione.
