---
column: done
technical: true
refs:
  - requirements/tech#notice
drift: m2jm6ebd
proposal: null
agent: false
created: 2026-10-06T20:02:09.035Z
finished: 2026-10-06T20:03:17.316Z
---
# Fix code to match the Requirements: La rimozione ntfy resta priva del design approvato richiesto

## What happens

Gli avvisi ntfy sono ancora presenti. La correzione già completata conserva gli avvisi e impedisce di seguire i reindirizzamenti HTTP: ogni tentativo resta una sola richiesta alla destinazione configurata. Il Task corrente sceglie invece di mantenere il divieto di correzione e attendere un design approvato che elimini gli avvisi. Non esiste alcuna Proposal nel progetto, quindi quel prerequisito non è disponibile.

## What should happen

I Requisiti vigenti impongono gli avvisi ntfy facoltativi e una sola richiesta POST per tentativo, con successo soltanto per risposte HTTP 2xx. La scelta del Task richiede una **rimozione approvata** prima di procedere, ma questa approvazione manca e non può essere sostituita da una decisione dell’agente. Eliminare gli avvisi violerebbe i Requisiti; dichiarare conclusa la rimozione mantenendoli violerebbe la scelta del Task.

## Chosen option

**Conservare ntfy e riconoscere la correzione dei reindirizzamenti**

Autorizzare per questo Task la conservazione degli avvisi e riconoscere la correzione già realizzata, che impedisce richieste a destinazioni alternative. Le notifiche remote restano disponibili e i Requisiti attuali non cambiano. Serve una decisione del developer che sostituisca la scelta di rimozione; non occorre introdurre altri comportamenti.

## Where in the code

extension/src/host/notices.ts: NoticeService.attempt; Task 63qz6wvx: scelta di rimozione ntfy
