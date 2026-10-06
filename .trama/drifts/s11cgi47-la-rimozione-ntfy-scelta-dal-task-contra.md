---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#notice
proposal: null
task: 63qz6wvx
origin: 49s8jlpq
option: 1
note: null
created: 2026-10-06T19:45:19.566Z
---
# La rimozione ntfy scelta dal Task contraddice i Requisiti vigenti

## What happens

Il Task 49s8jlpq sceglie di mantenere il divieto di correggere ntfy e di rimuovere gli avvisi mediante un design da approvare. La prova runtime con Node conferma che un reindirizzamento HTTP 307 provoca una seconda richiesta POST alla destinazione e che la successiva risposta HTTP 200 fa risultare riuscito il tentativo. Non è stato modificato il codice: rimuovere ntfy o correggere il reindirizzamento anticiperebbe una decisione non rappresentata dai Requisiti inclusi nel Task.

## What should happen

I Requisiti vigenti richiedono gli avvisi ntfy, una sola richiesta POST per tentativo e successo soltanto per una risposta HTTP 2xx della destinazione configurata. La scelta del Task vieta invece la correzione e richiede la rimozione futura degli avvisi. Non è possibile soddisfare contemporaneamente questa scelta e i Requisiti, né dichiarare concluso il Task senza un design di rimozione approvato oppure una nuova decisione che autorizzi la correzione.

## Fix options

### Approvare prima il design di rimozione ntfy

Mantenere il divieto di correzione e definire un design completo che rimuova gli avvisi ntfy dal Modello e dai Requisiti. Dopo la sua approvazione, eseguire i relativi Task e riesaminare il Task 49s8jlpq. È la scelta già indicata dal Task, ma richiede una decisione del developer, un cambiamento più ampio e la perdita delle notifiche remote; nel frattempo il comportamento resta invariato.

### Autorizzare la correzione dei redirect mantenendo ntfy

Cambiare esplicitamente la decisione che vieta la correzione, mantenendo gli avvisi ntfy descritti dai Requisiti attuali. Un reindirizzamento deve essere un fallimento del tentativo senza contattare la destinazione successiva; resta il solo secondo tentativo previsto. Questa alternativa conserva le notifiche remote e richiede una modifica circoscritta, ma rinuncia alla rimozione scelta dal Task e necessita della decisione del developer.

## Where in the code

extension/src/host/notices.ts: NoticeService.attempt; extension/src/host/notice-host.ts: fetch globale; Task 49s8jlpq: scelta di rimozione ntfy
