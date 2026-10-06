---
status: resolved
resolution: fix-code
refs:
  - design-request/Writing/workspace.REQUEST_DELETED
  - requirements/data#design-request
proposal: null
task: edaojpl7
origin: null
option: 1
note: null
created: 2026-10-06T18:50:52.421Z
---
# Fermare l’invio di una richiesta cancellata durante l’avvio

## What happens

Se il developer cancella da fuori una richiesta **mentre il launcher sta ancora preparando l’invio**, Trama chiude la scheda pulita ma continua l’operazione già iniziata. Quando il launcher prosegue, l’agente riceve un’istruzione che nomina un file ormai inesistente. Trama aggiunge inoltre quell’ID all’elenco persistente delle richieste inviate, anche se il file è già sparito. Lo scenario isolato sospende l’apertura della chat, cancella il file e poi lascia completare l’apertura: l’istruzione parte dopo la cancellazione.

## What should happen

La cancellazione prima dell’invio porta la richiesta da Writing ad **Abandoned**: non deve partire nessuna istruzione e Trama non deve conservare alcuna traccia della richiesta. La scheda viene chiusa soltanto se non ha modifiche non salvate. Un invio che sta ancora aspettando la preparazione del launcher non ha già portato la richiesta in Sent: la cancellazione deve impedirne la consegna successiva.

## Fix options

### Ricontrollare la richiesta prima della consegna

Prima di mandare davvero l’istruzione, verificare che la richiesta esista ancora, anche dopo ogni attesa necessaria ad avviare il launcher. Se è stata cancellata, terminare senza inviare e senza registrare l’ID tra le richieste inviate. Mantiene il comportamento già previsto per la cancellazione; richiede che il launcher possa rifiutare una consegna ormai priva della sua richiesta.

### Annullare la preparazione alla cancellazione

Quando Trama osserva la cancellazione, interrompere esplicitamente ogni preparazione di invio riferita a quella richiesta. Nessun passaggio successivo può consegnare l’istruzione o conservarne l’ID. Dà effetto immediato alla cancellazione anche mentre il launcher aspetta il developer, ma richiede di gestire l’annullamento lungo la preparazione del terminale e della chat.

## Where in the code

extension/src/host/design-requests.ts: DesignRequests.deleted, once e deliver; extension/src/host/agent.ts: launchAgent e openChat
