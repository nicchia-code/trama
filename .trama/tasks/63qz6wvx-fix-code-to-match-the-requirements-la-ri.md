---
column: done
technical: true
refs:
  - requirements/tech#General
drift: s11cgi47
proposal: rub6h6m6
agent: false
created: 2026-10-06T19:48:05.517Z
finished: 2026-10-06T20:14:49.294Z
---
# Fix code to match the Requirements: La rimozione ntfy scelta dal Task contraddice i Requisiti vigenti

## What happens

Il Task 49s8jlpq sceglie di mantenere il divieto di correggere ntfy e di rimuovere gli avvisi mediante un design da approvare. La prova runtime con Node conferma che un reindirizzamento HTTP 307 provoca una seconda richiesta POST alla destinazione e che la successiva risposta HTTP 200 fa risultare riuscito il tentativo. Non è stato modificato il codice: rimuovere ntfy o correggere il reindirizzamento anticiperebbe una decisione non rappresentata dai Requisiti inclusi nel Task.

## What should happen

I Requisiti vigenti richiedono gli avvisi ntfy, una sola richiesta POST per tentativo e successo soltanto per una risposta HTTP 2xx della destinazione configurata. La scelta del Task vieta invece la correzione e richiede la rimozione futura degli avvisi. Non è possibile soddisfare contemporaneamente questa scelta e i Requisiti, né dichiarare concluso il Task senza un design di rimozione approvato oppure una nuova decisione che autorizzi la correzione.

## Chosen option

**Approvare prima il design di rimozione ntfy**

Mantenere il divieto di correzione e definire un design completo che rimuova gli avvisi ntfy dal Modello e dai Requisiti. Dopo la sua approvazione, eseguire i relativi Task e riesaminare il Task 49s8jlpq. È la scelta già indicata dal Task, ma richiede una decisione del developer, un cambiamento più ampio e la perdita delle notifiche remote; nel frattempo il comportamento resta invariato.

## Where in the code

extension/src/host/notices.ts: NoticeService.attempt; extension/src/host/notice-host.ts: fetch globale; Task 49s8jlpq: scelta di rimozione ntfy

## Esito dell’attuazione

Il prerequisito richiesto è soddisfatto dalla Proposal rub6h6m6 approvata. La rimozione ntfy è stata attuata e i Task 49s8jlpq e i1xh2wu0 sono riesaminati alla luce di quel design, senza nuove richieste di approvazione o correzioni del servizio rimosso. I Requisiti attuali e il codice concordano sull’assenza di notifiche esterne; i testi sopra documentano soltanto il contrasto precedente.

Verifica: 635 test passati, controllo dei tipi e build CLI/estensione riusciti. Conservati i comportamenti locali dei terminali, della chat, dei worktree e dei round di domande; le impostazioni utente non sono state riscritte.
