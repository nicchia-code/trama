---
column: done
technical: true
refs:
  - requirements/ui#design-request
drift: 6utvs096
proposal: null
agent: false
created: 2026-10-10T14:15:26.869Z
finished: 2026-10-10T17:29:55.525Z
---
# Fix code to match the Requirements: Send to agent compare anche sulle schede che non possono inviare una richiesta

## What happens

Con più gruppi di editor aperti, la visibilità di **Send to agent** dipende soltanto dalla richiesta attualmente a fuoco. Se questa non è mai stata inviata, il pulsante compare anche nella barra di un altro gruppo che mostra un documento ordinario o una richiesta già inviata. Su quelle schede premere il pulsante non invia nulla: la consegna controlla correttamente il documento, ma il controllo viene comunque offerto dove non dovrebbe esserci. Viceversa, spostare il focus su un documento ordinario nasconde il pulsante anche nel gruppo che continua a mostrare la richiesta mai inviata.

## What should happen

Il pulsante **Send to agent** deve comparire solo sulle schede delle richieste di design mai inviate, non sui documenti ordinari né sulle richieste già inviate. Avere più gruppi aperti non deve far dipendere l’idoneità di una scheda dal documento mostrato in un altro gruppo. I controlli già presenti sulla consegna devono continuare a impedire invii da documenti non idonei e invii ripetuti.

## Chosen option

**Mostrare il pulsante soltanto nel gruppo a fuoco**

Send to agent compare soltanto nella barra del gruppo a fuoco e soltanto quando quel gruppo mostra una richiesta mai inviata. Gli altri gruppi non offrono il controllo, anche se contengono una richiesta idonea. La visibilità resta legata alla scheda corretta senza controlli fuorvianti; il costo per il developer è portare prima a fuoco la richiesta che vuole inviare.

## Where in the code

extension/package.json: contributes.menus.editor/title e contributes.commands per trama.sendDesignRequest; extension/src/host/design-requests.ts: updateContext imposta un unico contesto dall’editor attivo, mentre send controlla il documento della scheda invocante. Riferimento API: https://code.visualstudio.com/api/references/contribution-points#contributes.menus; contesti: https://code.visualstudio.com/api/references/when-clause-contexts.
