# Announcement

A card the agent is about to create, announced so that the Board can show a ghost of it meanwhile: a Proposal or a Drift waiting in To decide, or a Task waiting in To do. An announcement is not a card: it cannot be decided on or moved, it does not count among what awaits a decision and it has no effect on the Model.

An announcement is created Preparing, as soon as the agent knows it will create the card, by the agent announcing it with the kind and the title of the card. Trama itself creates one when the developer asks the agent for a design from a terminal launcher, integrated or external; the title is then the developer's request. Lo stesso fa quando il developer lancia Resolve Drifts da un launcher del terminale: annuncia la Proposal di risoluzione, con il titolo del pulsante. A Proposal the agent starts that no announcement is waiting for, as happens with the chat launcher, creates its own announcement already Writing. An announcement lasts only as long as the agent's work: once the real card has arrived, or the work is over without it, it is gone.

Una Proposal destinata a un Drift non ha mai un ghost a sé in To decide, perché il developer non la vede. Un Drift che porterà una Proposal ha un solo annuncio, quello del Drift: la Draft che l'agente comincia per esso si lega a quell'annuncio, che resta un Drift e mostra che la sua Proposal è in scrittura; il Drift arriva poi con la Draft allegata, che l'agente consegna subito dopo.

An announcement belongs to the agent terminal in which its agent runs, when there is one: the terminal Trama typed a design request into, or the terminal of the agent that announced it. What happens in another agent terminal, or to a command other than the one Trama typed, never touches it. An announcement made from the chat of an editor other than Cursor, or by an agent Trama did not start, belongs to no terminal and is withdrawn only by the clock or by the editor starting up. L'annuncio di Resolve Drifts appartiene al terminale in cui Trama ne scrive l'istruzione, come quello di un design.

Un annuncio fatto dall'agente della chat di Cursor non appartiene a nessun terminale ma al progetto: lo ritira anche l'interruzione o la chiusura di una conversazione di Trama dello stesso progetto (vedi l'Actor cursor-chat). Un turno concluso normalmente non lo ritira, perché in una chat l'agente può essersi fermato solo per aspettare una risposta a testo del developer e poi riprendere: in quel caso il timer dei quindici minuti resta la rete di sicurezza.

Un annuncio può anche essere un controllo: non una scheda che arriverà, ma il lavoro che l'agente sta ancora facendo quando nessuna scheda lo mostra più. Lo annuncia l'agente quando comincia la fase finale di una corsa che ha realizzato dei Task (la verifica di test, lint e build e, se tocca, lo scan del System intero), e quando comincia una scansione: quella dopo l'approvazione di una Proposal, quella in sospeso che parte spegnendo Hold scan e quella chiesta a mano dal developer. Il suo ghost sta in In progress, con un titolo che dice di quale lavoro si tratta e una fase, Verifying o Scanning. Un controllo non arriva mai come scheda: finisce quando l'agente dice che ha finito, e allora sparisce senza avvisi. Se invece è ritirato prima (fine del comando, chiusura del terminale, interruzione della chat di Cursor, quindici minuti di quiete) il developer è avvisato che l'agente si è fermato prima di finirlo.

## States

### Announced (initial)
The card has not arrived yet, or the check is not finished. The Board shows its ghost. Whatever the agent or the clock does with it applies in every sub-State.
- `agent.SUBMIT_PROPOSAL` → Delivered: the agent hands over the Proposal the announcement is bound to, so its card arrives in To decide. Vale solo per un annuncio di Proposal. La consegna della Draft legata all'annuncio di un Drift non lo consegna: lo consegna il Drift.
- `agent.FILE_TASK` → Delivered: the agent files the Task it announced.
- `agent.FILE_DRIFT` → Delivered: the agent files the Drift it announced.
- `developer.DISCARD_PROPOSAL` → Withdrawn: only if the Proposal bound to the announcement is the one discarded; the developer gave up the draft on purpose, so no notice is shown.
- `terminal.COMMAND_ENDED` → Withdrawn: only the end of the command Trama typed into the agent terminal the announcement belongs to counts, so no agent can still be working there; every announcement of that terminal still waiting is withdrawn at once and the developer is told the agent finished without delivering what it announced. When Trama cannot tell that the command that ended is the one it typed, nothing is withdrawn for this reason.
- `terminal.CLOSED` → Withdrawn: the agent terminal the announcement belongs to was closed; withdrawn as when the command ends, with the same notice. Closing another terminal changes nothing.
- `agent-hook.IDLE` → Withdrawn: l'agente del terminale a cui appartiene l'annuncio ha detto con il suo hook di essere a riposo, quindi nessun agente sta più lavorando a quella consegna; ogni annuncio di quel terminale ancora in attesa è ritirato subito e il developer è avvisato che l'agente ha finito senza consegnare quanto aveva annunciato, come alla fine del comando.
- `cursor-chat.AGENT_INTERRUPTED` → Withdrawn: solo per un annuncio fatto dall'agente della chat di Cursor dello stesso progetto; il turno dell'agente è stato interrotto o è andato in errore, quindi nessun agente lavora più a quella consegna. Il ghost sparisce subito e il developer è avvisato che l'agente si è fermato senza consegnare quanto aveva annunciato, come alla fine del comando.
- `cursor-chat.CONVERSATION_CLOSED` → Withdrawn: come sopra, per la chiusura di una conversazione di Trama dello stesso progetto; il developer ha chiuso la chat di sua scelta, quindi nessun avviso.
- `time.QUIET_PERIOD_ELAPSED` → Withdrawn: nothing happened for fifteen minutes, so the agent is taken to have stopped; the developer is told, as when the command ends. Vale anche per l'annuncio di un terminale il cui agente ha un hook (omp): finché quell'agente lavora, il segnale di vita del suo hook fa ripartire i quindici minuti dei soli annunci di quel terminale, quindi un agente che pensa a lungo o esegue un comando lungo non è dato per fermo, mentre uno interrotto, bloccato o ucciso sì.

#### Preparing (initial)
The agent is working on it and nothing is written yet; it may be waiting for the developer's answers. Un controllo non passa mai da qui: nasce già in Verifying o in Scanning, secondo la fase che l'agente dichiara annunciandolo.
- `agent.START_PROPOSAL` → Writing: only for an announced Proposal; the new Draft is bound to the announcement and the ghost takes its title. The Draft is taken by the oldest announcement of the developer's request still Preparing, or by the one the agent names. Vale anche per un Drift annunciato, quando l'agente lo nomina: la Draft si lega all'annuncio del Drift, che tiene il titolo del Drift.

#### Writing
The Draft of the Proposal exists and the agent is writing it. Per un Drift, la Draft è la Proposal che il Drift porterà allegata.

#### Checking
Solo per un controllo: l'agente sta ancora lavorando dopo che le schede della sua corsa hanno lasciato In progress, o sta scansionando. Il ghost sta in In progress e mostra la fase.
- `agent.FINISH_CHECK` → Delivered: l'agente dice che il controllo è finito; il ghost sparisce senza avvisi. Le schede che il controllo ha archiviato sono già arrivate da sole.

##### Verifying (initial)
L'agente esegue la verifica finale della corsa: test, lint e build.
- `agent.CHANGE_CHECK_PHASE` → Scanning: la verifica è passata e le condizioni dello scan finale sono vere, quindi l'agente comincia a scansionare il System intero.

##### Scanning
L'agente confronta il codice con il Modello e i Requisiti.

### Delivered (final)
The real card has arrived, or the agent finished the check, and the ghost is gone.

### Withdrawn (final)
The card never came and the ghost is gone.
