---
column: done
technical: false
refs:
  - agent-launching
  - agent-terminal
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
  - requirements/ui#agent-launching
drift: null
proposal: znzyo6iv
agent: false
created: 2026-10-17T17:38:35.278Z
finished: 2026-10-17T18:36:21.524Z
---
# Lanciare i lavori di una Proposal con il suo modello

Quando il Task è finito, i lavori che nascono da una Proposal partono con il modello scelto per lei, al posto di `trama.analysis` o `trama.execution`, e le corse su più Task con modelli diversi diventano una sequenza di Run, uno per modello.

**Quando vale il modello della Proposal.** Il modello di una Proposal (letto dallo stato dell'area di lavoro) vale soltanto se l'agente registrato con lui è uguale al valore di `trama.agent` letto in quel momento; altrimenti, o senza modello, valgono i ruoli dei Settings, e un ruolo vuoto o di soli spazi lascia all'agente il suo predefinito. Quando vale, sostituisce il ruolo della corsa in:
- implement di un Task il cui campo `proposal` è quella Proposal: Task scritti con lei, Task di rimozione del codice e Task di correzione dei Drift che ne hanno ereditato il design; l'agente principale usa quel modello anche nel pre-flight e nella scansione mirata di fine corsa;
- `Resolve` su un solo Drift la cui `origin` è un Task di quella Proposal;
- ogni Run di una sequenza per modello con quel modello.

Non sostituisce mai `trama.scan`: scan del System e di Feature e i sotto-agenti `trama-analysis` (`--slow`, `--agents`, definizioni dei sotto-agenti delle chat) usano sempre `configuredModels().scan`, anche nel pre-flight e nella scansione mirata di una corsa con il modello di una Proposal. `Resolve all`, la preparazione della risoluzione automatica, design, setup e import restano sui ruoli. Un Task senza `proposal`, o di una Proposal senza un modello che vale, usa `trama.execution`.

**Risoluzione al lancio.** L'host risolve una volta, al lancio, il modello di ogni istruzione e lo passa esplicito a `launchAgent`, a `terminalRun` e alla chat (`openCursorChat`, `copilotModelSelector`), insieme al nome di ciò da cui viene (`trama.<ruolo>` oppure `Proposal <etichetta breve>`), invece di leggere `configuredModels()[roleOf(name)]`. Il ruolo calcolato dal nome del terminale serve ormai solo a decidere se l'istruzione può scansionare. Il nome del modello entra nella riga di comando citato per la shell come i ruoli (`extension/src/host/quote.ts`). Nella chat di Cursor il modello vale solo per la conversazione nuova, e il ripiego su conferma o appunti parte senza modello e senza altri avvisi.

**Avviso di Copilot.** Se nessun modello di Copilot ha il nome del modello scelto per la Proposal, l'istruzione parte lo stesso sul modello del selettore e compare l'avvertimento senza pulsanti `Trama: no Copilot model is named "<nome>" (Proposal <etichetta breve>). The instruction was sent with the model chosen in the chat.`, con `<nome>` il modello della Proposal; una Proposal senza etichetta usa il suo titolo. Per i ruoli l'avviso resta con il nome dell'impostazione, per esempio `(trama.scan)`.

**Sequenza per modello.** Al lancio di `Run all`, e del Run automatico sui suoi Task autorizzati, l'host dà a ogni Task eseguibile in To do dell'ambito il suo modello effettivo (quello della sua Proposal se vale, altrimenti `trama.execution`, tolti gli spazi attorno) e raggruppa i Task per modello effettivo a testo uguale, dai Task del quadro di `src/core` e dallo stato dell'area di lavoro. Il gruppo che contiene Task sul ruolo è il gruppo dei Settings. Con un solo gruppo parte un solo Run con quel modello. Con più gruppi i Run partono uno alla volta, nell'ordine del Task più vecchio di ciascun gruppo, e i gruppi non si ricalcolano. In `Run all` il Run di un gruppo prende i Task delle sole Proposal del gruppo (inclusione); il gruppo dei Settings prende tutti i Task tranne quelli delle Proposal che hanno un modello che vale diverso dal suo (esclusione), anche quando quelle Proposal non hanno Task eseguibili al lancio. Nel Run automatico ogni Run prende le sole identità autorizzate del suo gruppo, e ogni gruppo passa dal coordinatore della delega prima del lancio, come oggi prima di ogni Run.

**Avanzamento e arresto.** Il Run successivo parte alla fine normale del precedente, la stessa che il coordinatore della delega usa oggi per giudicare la fine di un Run (`jobAbnormalEnd` senza motivo): hook a riposo, fine del comando con codice di uscita 0 (anche senza hook a riposo), `AGENT_STOPPED` della chat; la chiusura del terminale fatta da `trama.autoExit` dopo l'hook a riposo non è un'interruzione. La sequenza si ferma, senza lanciare altri Run, quando il terminale del Run è chiuso mentre l'agente lavora, quando il comando finisce con un codice diverso da 0 o senza codice, con `AGENT_INTERRUPTED` o `CONVERSATION_CLOSED` della chat, quando l'istruzione di un Run non parte davvero (lasciata pronta nella chat o negli appunti), quando il Run automatico non è più autorizzato e quando l'editor si chiude. La chat di Copilot non segnala le interruzioni: lì un turno interrotto vale come fine normale. Lo stesso `Run all` lanciato di nuovo ricalcola i gruppi sui Task in To do di quel momento. Nessun timer: si usano gli stessi segnali di fine già usati per i lavori.

**Un solo Run.** L'host tiene la sequenza in memoria nel registro dei lavori come un solo lavoro di tipo Run, dal lancio fino alla fine dell'ultimo Run o all'arresto: conta così per `trama.submitWhileRunning`, per l'esclusione fra Run e Resolve Drifts e per la barriera della delega dei Drift. Un Run successivo al primo non è rifiutato perché un Run della stessa sequenza non è finito.
