---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Free/developer.ASK_AGENT
  - requirements/rules#drift-resolution
proposal: null
task: 5dp30bvz
origin: null
option: 1
note: null
resolvedBy: eb51z7tp
created: 2026-10-10T16:55:29.134Z
---
# Resolve Drifts freezes its chat scope before the instruction is sent

## What happens

Nella chat di Copilot, Resolve Drifts decide quali Drift coprire **prima di preparare la nuova conversazione**. Se durante quella preparazione una scansione archivia un nuovo Drift, oppure un Drift viene risolto, il controllo prima dell’invio può ancora consentire la partenza ma l’istruzione conserva la lista precedente. La risoluzione può quindi lasciare fuori un Drift già aperto quando l’agente riceve l’istruzione, o nominare un Drift che a quel momento non è più aperto. La lista resta anticipata anche quando tutte le altre condizioni del lancio sono ancora valide.

## What should happen

Resolve Drifts deve coprire **tutti e soli i Drift aperti al momento dell’invio effettivo**, non quelli aperti prima dell’attesa necessaria a preparare la chat. Durante la preparazione scansioni, design e import possono continuare, quindi la lista può cambiare legittimamente. Le condizioni per partire vanno controllate insieme alla lista aggiornata; se non valgono più, non parte nulla e il developer è avvisato. Dopo l’invio la lista resta quella di quel momento: nuovi Drift successivi restano per una risoluzione seguente.

## Fix options

### Build the scope at the final send

La preparazione della chat non fissa ancora il gruppo dei Drift. Subito prima della consegna dell’istruzione, Trama legge i Drift aperti e verifica le condizioni di partenza; l’agente riceve quel gruppo aggiornato. Mantiene invariati pulsante, esclusione e comportamento dopo l’invio. Il costo è portare la determinazione dell’ambito al punto finale della consegna, dopo ogni attesa della preparazione.

### Restart preparation when the scope changes

Trama prepara la conversazione con un gruppo provvisorio e, prima della consegna, verifica che coincida ancora con i Drift aperti. Se è cambiato, scarta la preparazione e la ripete con il gruppo attuale, senza inviare la versione superata. Offre lo stesso ambito corretto al momento della consegna; costa una preparazione potenzialmente ripetuta mentre scansioni o decisioni cambiano i Drift.

## Where in the code

extension/src/host/controller.ts: launchAction, ramo resolve-drifts e istruzione differita; extension/src/host/agent.ts: launchAgent valuta textOf prima di openChat; openChat attende workbench.action.chat.newChat prima di inviare il prompt già costruito con workbench.action.chat.open
