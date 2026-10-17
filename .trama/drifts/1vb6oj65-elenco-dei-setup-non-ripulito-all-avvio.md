---
status: resolved
resolution: fix-code
refs:
  - design-request/Sent
proposal: null
task: nqxpuhiw
origin: null
critical: false
option: 1
note: null
resolvedBy: 25k91dh9
created: 2026-10-17T10:30:36.526Z
---
# Elenco dei setup non ripulito all'avvio

## What happens

Gli ID delle richieste di setup restano nell'elenco di workspaceState anche quando il loro file è già sparito mentre nessun editor era aperto. Al primo avvio l'elenco non viene ripulito, perché la pulizia dei setup avviene solo su un evento di cancellazione. Al successivo evento di cancellazione di una richiesta, la Proposal di setup approvata fa partire tutti i Task in To do, anche se la consegna era avvenuta senza editor.

## What should happen

Il Model dice che, se nessun editor ha il progetto aperto alla consegna, non parte nulla e i Task restano in To do, da avviare dalla Board. I Requisiti dicono che un ID esce dall'elenco dei setup quando l'estensione vede sparire il suo file.

## Fix options

### Ripulire all'avvio senza avviare nulla

All'avvio dell'estensione togliere dall'elenco dei setup gli ID il cui file non esiste più, senza avviare nessun Task: restano in To do, da avviare dalla Board, come dice il Model.

### Avvisare al primo avvio

All'avvio, per gli ID spariti con una Proposal di setup approvata, togliere l'ID dall'elenco e avvisare il developer che il setup è stato consegnato e i Task sono in To do, da avviare dalla Board.

## Where in the code

extension/src/host/design-requests.ts, metodi settleSetup, deleted e forget (costruttore)
