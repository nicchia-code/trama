# Scan hold

L'interruttore Hold scan di questa copia di lavoro. Acceso, le approvazioni che farebbero partire la scansione automatica non la avviano: le Proposal restano in sospeso, e il pannello conta quante sono. Quando il developer lo spegne, parte una sola scansione di ciò che tutte quelle Proposal hanno cambiato. Serve quando il developer sa che approverà più modifiche che toccano le stesse parti e vuole scansionare una volta sola, alla fine, anche se nel frattempo qualcosa resta diverso dal codice.

Hold scan non tocca i worktree: con Multi-branch acceso, una Proposal accettata in un worktree vi scansiona come sempre, e non entra nel sospeso. Le scansioni che il developer lancia a mano non svuotano mai il sospeso.

L'interruttore e il sospeso appartengono solo a questa copia di lavoro e restano dopo la chiusura dell'editor.

## States

### Off (initial)
Le approvazioni scansionano come sempre e il sospeso è vuoto. È così anche quando il ricordo dell'interruttore manca. Quando il ricordo c'è ma non si legge, l'interruttore è spento, il sospeso è vuoto e il developer è avvisato.
- `developer.TURN_SCAN_HOLD_ON` → On: il sospeso parte vuoto.

### On
Le approvazioni che farebbero partire la scansione automatica la rimandano.
- `proposal.APPROVED` → On: solo per una modifica ordinaria (mai un import), solo se l'approvazione non è l'arrivo di un giro di worktree, solo se la scansione automatica è accesa e solo se l'approvazione tocca almeno una Feature che esiste ancora; non serve che il comando dell'agente sia configurato. Non parte nessuna scansione: la Proposal entra nel sospeso e il contatore cresce di uno. Con la scansione automatica spenta non entra nulla.
- `developer.TURN_SCAN_HOLD_OFF` → Off: il sospeso è vuoto, quindi non parte nulla e nessuno è avvisato.
- `developer.TURN_SCAN_HOLD_OFF` → Off: almeno una Proposal in sospeso tocca ancora una Feature esistente e l'istruzione arriva all'agente. Senza conferma. Chiede una volta il comando dell'agente se serve e non è configurato. Una sola corsa dell'agente confronta l'unione di ciò che le Proposal in sospeso hanno cambiato e lega ogni Task che archivia alla Proposal più recente fra quelle il cui cambiamento lo riguarda. Se l'implementazione automatica è accesa e la scansione non archivia nessun Drift, lo stesso agente prosegue realizzando i Task di quelle Proposal. Il sospeso si azzera appena l'istruzione è consegnata, anche se poi l'agente viene interrotto.
- `developer.TURN_SCAN_HOLD_OFF` → On: c'è qualcosa da scansionare ma l'istruzione non arriva all'agente, per esempio il developer annulla la richiesta del comando o la finestra del terminale esterno non si apre. Non parte nulla, l'interruttore resta acceso, il sospeso resta intatto e il developer è avvisato del perché; può riprovare spegnendolo di nuovo.
- `developer.TURN_SCAN_HOLD_OFF` → Off: nessuna Proposal in sospeso tocca più una Feature che esiste. Non parte nulla, il sospeso si azzera e il developer è avvisato che non c'era nulla da scansionare.

## Events

### RELEASED
Emesso quando, spegnendo l'interruttore, l'istruzione della scansione in sospeso è consegnata all'agente.
