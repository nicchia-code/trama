# Developer

The person who owns the project. Decides what enters the Model, resolves differences between code and Model, steers the agent and looks at the Diagram, the Board and the Requirements in the editor panel.

## Events

### APPROVE_PROPOSAL
The developer approves an open Proposal, from the Board or from the Diagram's detail panel. Una Proposal allegata a un Drift aperto non si approva così: si decide con il Drift, dalla riga di comando o con una risoluzione.

### REJECT_PROPOSAL
The developer rejects an open Proposal and may give feedback for the agent. Cancelling the feedback prompt rejects nothing; confirming it empty rejects without feedback. Una Proposal allegata a un Drift aperto non si rifiuta così: si decide con il Drift, dalla riga di comando o con una risoluzione.

### DISCARD_PROPOSAL
The developer discards a Proposal the agent is still writing, with the command line. It is for drafts the agent never finished; a Proposal already handed over is rejected instead.

### FIX_DRIFT_CODE
The developer keeps the side of an open Drift that says what should happen: the Model or the Requirement is right and the code must change. La Proposal allegata, se c'è, è messa da parte con il Drift. Solo dalla riga di comando: il pannello non decide su un singolo Drift.

### ACCEPT_DRIFT_PROPOSAL
The developer keeps the side of an open Drift that says what happens, when a Proposal is attached: the code is right and the Proposal is accepted. Solo dalla riga di comando.

### DISMISS_DRIFT
The developer keeps the side of an open Drift that says what happens, when no Proposal is attached: the code is right and nothing changes. Solo dalla riga di comando.

### TURN_SCAN_HOLD_ON
Il developer accende l'interruttore Hold scan da una scheda del pannello.

### TURN_SCAN_HOLD_OFF
Il developer spegne l'interruttore Hold scan da una scheda del pannello.

### MOVE_TASK_TO_TODO
The developer moves a Task to the To do column, with the command line. The Board offers no way to do it.

### MOVE_TASK_TO_DOING
The developer moves a Task to the In progress column, with the command line.

### MOVE_TASK_TO_DONE
The developer moves a Task to the Done column, with the command line.

### TAKE_BACK_TASK
The developer takes back a Task that the agent has taken, with the command of the same name; the Board has no button for it. The Task stays In progress and is the developer's again.

### ASK_AGENT
The developer asks the coding agent to work, from a button or a command: design a change (with a request typed in), scan the whole System or one Feature, implement one Task, implement every Task in To do, implement the Tasks in To do that come from one design, resolve every open Drift with Resolve Drifts, or import the existing code as Proposals.

Una richiesta di design arriva in due modi: come richiesta rapida di una riga, scritta nella casella che si apre con Quick request, oppure come richiesta scritta, un documento Markdown che il developer compone in una scheda dell'editor e invia con il pulsante Send to agent della scheda o chiudendo la scheda (vedi la Design request).

### CLOSE_REQUEST
Il developer chiude la scheda di una richiesta di design scritta che non ha mai inviato, quando nessun'altra scheda mostra più quella richiesta. Chiudere la finestra dell'editor con la scheda aperta non è questo Event, né lo è chiudere la scheda di una richiesta già inviata.

### INITIALIZE_PROJECT
The developer asks to set up Trama in a workspace folder.

### UPDATE_SKILLS
The developer asks to refresh the agent skills of the project with the ones shipped with this version of Trama.

### REWRITE_IDENTITIES
Il developer riscrive, dalla riga di comando, l'identità di ogni Proposal, Task e Drift ancora numerati. Non è un'approvazione, non sposta nessuna scheda e il pannello non offre un modo per farlo.

### OPEN_PANEL
The developer opens the Trama panel, or brings it to the front.

### CLOSE_PANEL
The developer closes the Trama panel.

### SHOW_DIAGRAM
The developer switches to the Diagram tab, or follows a link from another tab to an element or to a Proposal drawn over the Model.

### SHOW_BOARD
The developer switches to the Board tab.

### SHOW_REQUIREMENTS
The developer switches to the Requirements tab, or follows a link to a Requirement.

### OPEN_SYSTEM_LEVEL
The developer zooms the Diagram out to the whole System, with the breadcrumb or by following a link to a Feature or an Actor.

### OPEN_FEATURE_LEVEL
The developer shows one Feature in the Diagram, by opening it, with the breadcrumb or by following a link to one of its Machines.

### OPEN_MACHINE_LEVEL
The developer shows one Machine in the Diagram, by opening it, with the breadcrumb or by following a link to one of its States or Transitions.

### OPEN_STATE_LEVEL
The developer zooms into a State that has sub-States, in the Diagram, aprendolo oppure risalendo con il breadcrumb a uno Stato che contiene quello mostrato.

### CHOOSE_DRAWN_PROPOSAL
Il developer cambia la Proposal che il Diagramma disegna sopra il Modello: ne sceglie un'altra, o None, nel selettore del Diagramma, seleziona un Drift che porta con sé una Proposal diversa da quella disegnata, oppure segue un link a una Proposal disegnata sopra il Modello. Il livello del Diagramma resta quello che il developer guardava, finché esiste ancora.

### CHOOSE_ANSWER
Il developer conferma la domanda corrente con le scelte selezionate, con la risposta scritta o con entrambe.

### GO_BACK
Il developer torna alla domanda precedente, oppure annulla la conferma di Skip all e torna dove era.

### SKIP_QUESTION
Il developer salta solo la domanda corrente, con il pulsante Skip della domanda e senza conferma.

### SKIP_ALL_QUESTIONS
Il developer conferma di saltare tutte le domande del round che non hanno ancora una risposta confermata.

### OPEN_QUESTION
Il developer apre una domanda del round dall'indice o dal riepilogo.

### OPEN_SUMMARY
Il developer apre il riepilogo del round dall'indice.

### SEND_ANSWERS
Il developer invia all'agente le risposte del round dal riepilogo.

### CLOSE_QUESTIONS
Il developer chiude l'overlay delle domande o preme Skip all, e gli viene chiesto di confermare.

### MINIMIZE_QUESTIONS
Il developer riduce l'overlay delle domande a una barra per guardare il pannello sotto.

### RESTORE_QUESTIONS
Il developer riapre le domande in attesa, dalla barra nel pannello o dal pulsante della notifica dell'editor.
