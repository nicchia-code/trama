---
refs:
  - proposal
  - proposal/Open/developer.SCEGLI_MODELLO_PROPOSAL
  - developer.SCEGLI_MODELLO_PROPOSAL
  - requirements/data#proposal
  - requirements/quality#agent-launching
---

# Conservare il modello scelto per una Proposal

Quando il Task è finito, l'estensione ricorda il modello che il developer sceglie per una Proposal Open che porta Task e non è allegata a un Drift. Il modello non è informazione del progetto: non sta in `proposal.md`, nei Task né sotto `.trama/`. Sta in `ExtensionContext.workspaceState`, chiave `trama.proposalModels`: un oggetto che va dall'identità permanente della Proposal a `{ model, agent }`, dove `model` è il nome del modello, non vuoto e senza spazi attorno, e `agent` è il valore di `trama.agent` (`chat`, `omp` o `claude`) nel momento della scelta. La voce sopravvive ai riavvii dell'editor; una voce con forma diversa è ignorata e tolta alla prossima scrittura.

Con `developer.SCEGLI_MODELLO_PROPOSAL` Trama salva il modello scelto insieme all'agente scelto in quel momento, oppure toglie la voce se il developer svuota il campo, e allora valgono di nuovo i ruoli dei modelli dei Settings. Nessun file cambia, la Proposal non torna a Draft e resta Open, anche mentre i suoi controlli di approvazione aspettano la fine del turno dell'agente che l'ha consegnata. Il modello vale solo nell'editor del developer, per quella cartella, e nessun altro developer lo vede. Una Proposal che non porta Task, o che è allegata a un Drift, non ha un modello scelto.

Trama dimentica il modello di una Proposal quando la Proposal non esiste più, è `rejected` o `discarded`, oppure è `approved` e nessun Task con `proposal` uguale alla sua identità è in To do o In progress. Una Proposal tornata `draft` lo conserva.

Per sicurezza il modello di una Proposal si legge solo da questo stato dell'estensione, che sta fuori dal repository e che solo il developer scrive dalla scheda della Proposal: nessun file del progetto (front matter di una Proposal, Task, Drift, istruzione) può scegliere un modello.
