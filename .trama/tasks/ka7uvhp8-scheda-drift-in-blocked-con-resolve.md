---
column: done
technical: false
refs:
  - drift
  - requirements/ui#drift
drift: null
proposal: dk0grfyg
agent: false
created: 2026-10-17T10:26:29.439Z
finished: 2026-10-17T11:44:29.127Z
---
# Scheda del Drift in Blocked con Resolve e Dismiss Drift

Quando il Task è finito, nella Board un Drift aperto che non è raccolto in una Proposal di risoluzione aperta ha la sua scheda rossa nella colonna Blocked (non più in Work Items), con dentro i Task che blocca; titolo, riga di chip dei riferimenti, badge `critical` e `recurring`, i due lati `What happens` / `What should happen` e il link al Diagramma o al Requisito restano come oggi.

La scheda rossa ha due pulsanti uno accanto all'altro:
- «Resolve», con icona `wand` e tooltip `Ask an agent to resolve this Drift` seguito dalla spiegazione della modalità attiva come per `Resolve all`. Lancia Resolve Drifts soltanto su quel Drift, applicando la modalità di delega attiva. È disabilitato, con i motivi nel tooltip e nella descrizione accessibile (e segnato come disabilitato per le tecnologie assistive), negli stessi casi e nello stesso ordine di `Resolve all` (`Drifts are being resolved`, `A run is in progress`, `Proposal <id> resolving Drifts awaits a decision`, più i motivi di barriera/coordinatore/ripresa), escluso `No open Drifts`; mentre l'agente di risoluzione lavora proprio su quel Drift, il primo motivo è `An agent is resolving this Drift`.
- «Dismiss Drift», invariato nel comportamento (tooltip, motivi di disabilitazione, dialogo modale di conferma).

I dettagli del Drift nel Diagramma hanno soltanto «Dismiss Drift», nessun Resolve. Né la scheda né i dettagli hanno altri pulsanti per decidere (niente `Keep this`, Fix code, Accept Proposal, Fix options, nota, riquadro della Proposal allegata, Where in the code).

Quando una Proposal di risoluzione che elenca il Drift è consegnata, la scheda rossa sparisce da Blocked e il Drift compare come riga nella scheda gialla della risoluzione in Backlog, con sotto i Task che quel Drift blocca; il Drift resta aperto, visibile nel Diagramma e continua a bloccare gli stessi Task. Finché la risoluzione è in scrittura il Drift resta in Blocked; se torna in scrittura, è rifiutata o scartata, i Drift ancora aperti tornano in Blocked. Un Drift risolto (o dismesso) sparisce dalla Board.

Il messaggio fra webview e host per lanciare Resolve Drifts deve poter portare l'identità del singolo Drift; l'host calcola i motivi di disabilitazione per Drift. Aggiornare i test della webview e dell'host che coprono la scheda del Drift e la sua posizione nella Board.
