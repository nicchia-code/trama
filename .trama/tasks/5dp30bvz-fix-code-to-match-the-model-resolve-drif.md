---
column: done
technical: false
refs:
  - drift-resolution/Free/developer.ASK_AGENT
  - requirements/rules#drift-resolution
drift: 7p60kj91
proposal: null
agent: false
created: 2026-10-10T17:24:50.926Z
finished: 2026-10-10T18:07:39.271Z
---
# Fix code to match the Model: Resolve Drifts freezes its chat scope before the instruction is sent

## What happens

Nella chat di Copilot, Resolve Drifts decide quali Drift coprire **prima di preparare la nuova conversazione**. Se durante quella preparazione una scansione archivia un nuovo Drift, oppure un Drift viene risolto, il controllo prima dell’invio può ancora consentire la partenza ma l’istruzione conserva la lista precedente. La risoluzione può quindi lasciare fuori un Drift già aperto quando l’agente riceve l’istruzione, o nominare un Drift che a quel momento non è più aperto. La lista resta anticipata anche quando tutte le altre condizioni del lancio sono ancora valide.

## What should happen

Resolve Drifts deve coprire **tutti e soli i Drift aperti al momento dell’invio effettivo**, non quelli aperti prima dell’attesa necessaria a preparare la chat. Durante la preparazione scansioni, design e import possono continuare, quindi la lista può cambiare legittimamente. Le condizioni per partire vanno controllate insieme alla lista aggiornata; se non valgono più, non parte nulla e il developer è avvisato. Dopo l’invio la lista resta quella di quel momento: nuovi Drift successivi restano per una risoluzione seguente.

## Chosen option

**Build the scope at the final send**

La preparazione della chat non fissa ancora il gruppo dei Drift. Subito prima della consegna dell’istruzione, Trama legge i Drift aperti e verifica le condizioni di partenza; l’agente riceve quel gruppo aggiornato. Mantiene invariati pulsante, esclusione e comportamento dopo l’invio. Il costo è portare la determinazione dell’ambito al punto finale della consegna, dopo ogni attesa della preparazione.

## Where in the code

extension/src/host/controller.ts: launchAction, ramo resolve-drifts e istruzione differita; extension/src/host/agent.ts: launchAgent valuta textOf prima di openChat; openChat attende workbench.action.chat.newChat prima di inviare il prompt già costruito con workbench.action.chat.open
