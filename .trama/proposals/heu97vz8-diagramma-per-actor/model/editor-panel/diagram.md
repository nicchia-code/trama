# Diagram

The zoom level at which the Diagram currently shows the Model. Il livello del Sistema è la radice da cui il developer sceglie cosa guardare: la voce Whole System, gli Actor e le Feature che nessun Actor raggiunge, senza gli Eventi fra loro. Il livello Whole System draws the Features and Actors and the Events travelling between them, come faceva prima il livello del Sistema. Il livello di un Actor disegna quell'Actor, le Feature che ricevono i suoi Eventi e gli Eventi che quelle Feature si scambiano fra loro. A Feature level draws that Feature's Machines with the Actors and other Features' Machines that send Events into it. A Machine level draws its States and Transitions. A State level zooms into a State that has sub-States. Following a link to an element opens the level where that element is drawn and selects it. Un pulsante View on diagram, un chip o un passo del focus aprono allo stesso modo il livello del passo, e la vista si adatta ai suoi elementi invece che a tutto il livello (vedi il Focus).

Una Feature aperta dal livello di un Actor o da Whole System ricorda da dove è stata aperta: il breadcrumb mette quell'Actor, o Whole System, fra il Sistema e la Feature, anche ai livelli più profondi, e permette di tornarci. Una Feature aperta da un link non ricorda nulla. Se l'Actor da cui è stata aperta non esiste più, o i suoi Eventi non arrivano più a nessuna Machine, il livello resta e l'Actor esce dal breadcrumb.

The Diagram starts at the System level and keeps its zoom level when the Model changes, falling back to the nearest level that still exists. Lo stesso ripiego vale quando il developer cambia la Proposal disegnata sopra il Modello e ciò che si guarda esisteva solo grazie alla Proposal di prima.

## States

### System level (initial)
Un Actor i cui Eventi non arrivano a nessuna Machine compare, ma non si apre.
- `developer.OPEN_WHOLE_SYSTEM_LEVEL` → Whole System level
- `developer.OPEN_ACTOR_LEVEL` → Actor level: solo un Actor i cui Eventi arrivano ad almeno una Machine, aperto dalla radice o raggiunto da un link a lui o a un suo Evento.
- `developer.OPEN_FEATURE_LEVEL` → Feature level: a Feature che nessun Actor raggiunge is opened, or a link points to a Feature or to a Machine of one.
- `developer.OPEN_MACHINE_LEVEL` → Machine level: a link points to a State or Transition of a Machine.

### Whole System level
- `developer.OPEN_SYSTEM_LEVEL` → System level
- `developer.OPEN_ACTOR_LEVEL` → Actor level: un link punta a un Actor, i cui Eventi arrivano ad almeno una Machine, o a un suo Evento.
- `developer.OPEN_FEATURE_LEVEL` → Feature level: una Feature viene aperta, e il breadcrumb ricorda Whole System; oppure un link punta a una Feature o a una sua Machine.
- `developer.OPEN_MACHINE_LEVEL` → Machine level: a link points to a State or Transition of a Machine.

### Actor level
- `developer.OPEN_SYSTEM_LEVEL` → System level
- `developer.OPEN_ACTOR_LEVEL` → Actor level: un link punta a un altro Actor, i cui Eventi arrivano ad almeno una Machine, o a un suo Evento.
- `developer.OPEN_FEATURE_LEVEL` → Feature level: una Feature disegnata viene aperta, e il breadcrumb ricorda l'Actor; oppure un link punta a una Feature o a una sua Machine.
- `developer.OPEN_MACHINE_LEVEL` → Machine level: a link points to a State or Transition of a Machine.
- `workspace.MODEL_CHANGED` → System level: solo se l'Actor mostrato non esiste più o se i suoi Eventi non arrivano più a nessuna Machine.
- `developer.CHOOSE_DRAWN_PROPOSAL` → System level: solo con il selettore del Diagramma e solo se, nel Modello disegnato con la Proposal ora scelta, l'Actor mostrato non esiste o i suoi Eventi non arrivano a nessuna Machine.

### Feature level
- `developer.OPEN_SYSTEM_LEVEL` → System level
- `developer.OPEN_WHOLE_SYSTEM_LEVEL` → Whole System level: con il breadcrumb, quando la Feature è stata aperta da Whole System.
- `developer.OPEN_ACTOR_LEVEL` → Actor level: con il breadcrumb, verso l'Actor da cui la Feature è stata aperta, oppure con un link a un Actor o a un suo Evento.
- `developer.OPEN_FEATURE_LEVEL` → Feature level: another Feature is shown, or a link points to a Machine of one.
- `developer.OPEN_MACHINE_LEVEL` → Machine level
- `workspace.MODEL_CHANGED` → System level: only if the Feature shown no longer exists.
- `developer.CHOOSE_DRAWN_PROPOSAL` → System level: solo con il selettore del Diagramma e solo se la Feature mostrata non esiste nel Modello disegnato con la Proposal ora scelta.

### Machine level
States with sub-States can be expanded in place to draw their sub-States inside them.
- `developer.OPEN_SYSTEM_LEVEL` → System level
- `developer.OPEN_WHOLE_SYSTEM_LEVEL` → Whole System level: con il breadcrumb, quando la Feature è stata aperta da Whole System.
- `developer.OPEN_ACTOR_LEVEL` → Actor level: con il breadcrumb, verso l'Actor da cui la Feature è stata aperta, oppure con un link a un Actor o a un suo Evento.
- `developer.OPEN_FEATURE_LEVEL` → Feature level
- `developer.OPEN_MACHINE_LEVEL` → Machine level: another Machine is shown.
- `developer.OPEN_STATE_LEVEL` → State level: only a State that has sub-States can be opened.
- `workspace.MODEL_CHANGED` → System level: only if the Machine shown no longer exists.
- `developer.CHOOSE_DRAWN_PROPOSAL` → System level: solo con il selettore del Diagramma e solo se la Machine mostrata non esiste nel Modello disegnato con la Proposal ora scelta.

### State level
- `developer.OPEN_SYSTEM_LEVEL` → System level
- `developer.OPEN_WHOLE_SYSTEM_LEVEL` → Whole System level: con il breadcrumb, quando la Feature è stata aperta da Whole System.
- `developer.OPEN_ACTOR_LEVEL` → Actor level: con il breadcrumb, verso l'Actor da cui la Feature è stata aperta, oppure con un link a un Actor o a un suo Evento.
- `developer.OPEN_FEATURE_LEVEL` → Feature level
- `developer.OPEN_MACHINE_LEVEL` → Machine level
- `developer.OPEN_STATE_LEVEL` → State level: a sub-State that has sub-States of its own, oppure, con il breadcrumb, uno Stato che contiene quello mostrato.
- `workspace.MODEL_CHANGED` → Machine level: only if the State shown no longer has sub-States.
- `workspace.MODEL_CHANGED` → System level: only if the Machine shown no longer exists.
- `developer.CHOOSE_DRAWN_PROPOSAL` → Machine level: solo con il selettore del Diagramma e solo se, nel Modello disegnato con la Proposal ora scelta, lo Stato mostrato non ha sotto-Stati.
- `developer.CHOOSE_DRAWN_PROPOSAL` → System level: solo con il selettore del Diagramma e solo se la Machine mostrata non esiste nel Modello disegnato con la Proposal ora scelta.
