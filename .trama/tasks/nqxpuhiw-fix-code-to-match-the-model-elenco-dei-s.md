---
column: done
technical: false
refs:
  - design-request/Sent
drift: 1vb6oj65
proposal: null
agent: false
created: 2026-10-17T11:36:54.204Z
finished: 2026-10-17T12:29:07.434Z
---
# Fix code to match the Model: Elenco dei setup non ripulito all'avvio

## What happens

Gli ID delle richieste di setup restano nell'elenco di workspaceState anche quando il loro file è già sparito mentre nessun editor era aperto. Al primo avvio l'elenco non viene ripulito, perché la pulizia dei setup avviene solo su un evento di cancellazione. Al successivo evento di cancellazione di una richiesta, la Proposal di setup approvata fa partire tutti i Task in To do, anche se la consegna era avvenuta senza editor.

## What should happen

Il Model dice che, se nessun editor ha il progetto aperto alla consegna, non parte nulla e i Task restano in To do, da avviare dalla Board. I Requisiti dicono che un ID esce dall'elenco dei setup quando l'estensione vede sparire il suo file.

## Chosen option

**Ripulire all'avvio senza avviare nulla**

All'avvio dell'estensione togliere dall'elenco dei setup gli ID il cui file non esiste più, senza avviare nessun Task: restano in To do, da avviare dalla Board, come dice il Model.

## Where in the code

extension/src/host/design-requests.ts, metodi settleSetup, deleted e forget (costruttore)
