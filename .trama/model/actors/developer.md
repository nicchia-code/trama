# Developer

The person who owns the project. Decides what enters the Model, resolves differences between code and Model, steers the agent and looks at the Diagram, the Board and the Requirements in the editor panel.

Può anche registrare direttamente un Drift dalla riga di comando, per annotare una differenza fra codice e Model o Requisiti; resta una differenza da decidere, come un Drift registrato dall'agente.

## Events

### APPROVE_PROPOSAL
The developer approves an open Proposal, from the Board or from the Diagram's detail panel. Una Proposal allegata a un Drift aperto non si approva così: si decide con il Drift, dalla riga di comando o con una risoluzione.

### REJECT_PROPOSAL
The developer rejects an open Proposal and may give feedback for the agent. Cancelling the feedback prompt rejects nothing; confirming it empty rejects without feedback. Una Proposal allegata a un Drift aperto non si rifiuta così: si decide con il Drift, dalla riga di comando o con una risoluzione.

### SCEGLI_MODELLO_PROPOSAL
Il developer sceglie, dall'ingranaggio della scheda di una Proposal in Backlog, il modello con cui lavorano gli agenti dei lavori di quella Proposal, oppure lo toglie e torna al default dei Settings. Sceglie un modello suggerito o ne scrive il nome, come nella scheda Settings.

### DISCARD_PROPOSAL
The developer discards a Proposal the agent is still writing, with the command line. It is for drafts the agent never finished; a Proposal already handed over is rejected instead.

### FILE_DRIFT
Il developer registra direttamente un nuovo Drift dalla riga di comando. Il Drift nasce Open e attende una decisione, con le stesse regole di un Drift registrato dall'agente.

### FIX_DRIFT_CODE
The developer keeps the side of an open Drift that says what should happen: the Model or the Requirement is right and the code must change. La Proposal allegata, se c'è, è messa da parte con il Drift. Solo dalla riga di comando: dal pannello un singolo Drift si può solo chiudere senza cambiare nulla.

### ACCEPT_DRIFT_PROPOSAL
The developer keeps the side of an open Drift that says what happens, when a Proposal is attached: the code is right and the Proposal is accepted. Solo dalla riga di comando.

### DISMISS_DRIFT
Il developer tiene il lato di un Drift aperto che dice ciò che succede: il codice è giusto e nulla cambia. Dalla riga di comando, solo quando nessuna Proposal è allegata; dal pannello, con Dismiss Drift nella scheda della Board o nei dettagli del Diagramma e dopo una conferma, anche quando una Proposal è allegata, che è scartata con il Drift.

### MOVE_TASK_TO_TODO
The developer moves a Task to the To do column, with the command line. The Board offers no way to do it.

### MOVE_TASK_TO_DOING
The developer moves a Task to the In progress column, with the command line.

### MOVE_TASK_TO_DONE
The developer moves a Task to the Done column, with the command line.

### CLOSE_TASK_UNCHANGED
Il developer chiude, dalla riga di comando, un Task di correzione senza cambiare il codice, perché il codice fa già ciò che dicono il Model o il Requisito, con una nota che dice perché.

### TAKE_BACK_TASK
The developer takes back a Task that the agent has taken, with the command of the same name; the Board has no button for it. The Task stays In progress and is the developer's again.

### ASK_AGENT
The developer asks the coding agent to work, from a button or a command: design a change (with a written request), scan the whole System or one Feature, implement one Task, implement every Task in To do, resolve every open Drift with Resolve all or a single one with Resolve, or import the existing code as Proposals.

Una richiesta di design arriva in un solo modo: come richiesta scritta, un documento Markdown che il developer apre con + Add Work Item in fondo alla colonna Backlog, compone in una scheda dell'editor e invia con il pulsante Send to agent della scheda o chiudendo la scheda (vedi la Design request). Non c'è più una richiesta rapida di una riga.

### SET_DRIFT_AUTOPILOT
Il developer cambia la propria delega per i Drift: nessuna, soltanto i non critici oppure tutti. Il cambiamento vale prima della prossima scelta, approvazione e avvio automatico; ritirare la delega non annulla decisioni già applicate né interrompe forzatamente un Task già iniziato. La cambia nelle impostazioni dell'editor o dalla scheda Settings del pannello, dove aumentarla chiede prima conferma.

### CLOSE_REQUEST
Il developer chiude la scheda di una richiesta di design scritta che non ha mai inviato, quando nessun'altra scheda mostra più quella richiesta. Chiudere la finestra dell'editor con la scheda aperta non è questo Event, né lo è chiudere la scheda di una richiesta già inviata.

### INITIALIZE_PROJECT
The developer asks to set up Trama in a workspace folder. Dall'editor lo chiede scegliendo Import from Code o Start from Scratch in Get Started, la scheda che il pannello mostra in una cartella senza progetto; dalla riga di comando con l'inizializzazione.

### UPDATE_SKILLS
The developer asks to refresh the agent skills of the project with the ones shipped with this version of Trama.

### REWRITE_IDENTITIES
Il developer riscrive, dalla riga di comando, l'identità di ogni Proposal, Task e Drift ancora numerati. Non è un'approvazione, non sposta nessuna scheda e il pannello non offre un modo per farlo.

### OPEN_PANEL
The developer opens the Trama panel, or brings it to the front.

Anche il pulsante Reopen della notifica di domande in attesa chiede questa apertura ordinaria: se il round esiste ancora e la finestra è sul suo progetto, l'overlay si ripristina; altrimenti si apre soltanto il pannello. Senza un progetto il pannello si apre su Get Started, senza il round, che resta in attesa finché il suo progetto torna nella finestra.

Il developer lo chiede con il comando, con l'icona di Trama in alto, nella barra dell'editor, oppure con il pulsante «Trama» nella barra di stato in basso. L'icona si trova in ogni finestra con almeno una cartella aperta, anche dove non c'è ancora un progetto: lì porta a Get Started. Con il pannello già aperto l'icona e il pulsante, come il comando, lo portano in primo piano tenendo la sua scheda.

### CLOSE_PANEL
The developer closes the Trama panel.

### SHOW_DIAGRAM
The developer switches to the Diagram tab, or follows a link from another tab to an element. I pulsanti View on diagram e i chip dei riferimenti aprono invece un focus (FOCUS_PROPOSAL, FOCUS_TASK, FOCUS_REF).

### SHOW_BOARD
The developer switches to the Board tab.

### SHOW_REQUIREMENTS
The developer switches to the Requirements tab, or follows a link to a Requirement. I pulsanti View requirements e i chip dei riferimenti aprono invece un focus (FOCUS_PROPOSAL, FOCUS_TASK, FOCUS_REF).

### SHOW_SPECS
Il developer passa alla scheda Specs del pannello.

### SHOW_SETTINGS
Il developer passa alla scheda Settings del pannello.

### CHANGE_SETTING
Il developer cambia un'impostazione di Trama dalla scheda Settings: sceglie un valore in un menu, spunta o toglie una casella, oppure conferma un campo di testo o numerico.

### OPEN_SYSTEM_LEVEL
The developer zooms the Diagram out to the whole System, with the breadcrumb or by following a link to a Feature or an Actor.

### OPEN_FEATURE_LEVEL
The developer shows one Feature in the Diagram, by opening it, with the breadcrumb or by following a link to one of its Machines.

### OPEN_MACHINE_LEVEL
The developer shows one Machine in the Diagram, by opening it, with the breadcrumb or by following a link to one of its States or Transitions.

### OPEN_STATE_LEVEL
The developer zooms into a State that has sub-States, in the Diagram, aprendolo oppure risalendo con il breadcrumb a uno Stato che contiene quello mostrato.

### CHOOSE_DRAWN_PROPOSAL
Il developer cambia la Proposal che una scheda disegna sopra il Modello: ne sceglie un'altra, o None, nel selettore del Diagramma, dei Requisiti o delle Specs. Ogni scheda ha il suo selettore e la sua Proposal disegnata; un pulsante View di una Proposal la disegna invece con FOCUS_PROPOSAL. Selezionare un Drift, nel Diagramma o arrivandoci dalla Board, non cambia la Proposal disegnata. Il livello del Diagramma resta quello che il developer guardava, finché esiste ancora.

### FOCUS_PROPOSAL
Il developer preme View on diagram o View requirements sulla scheda di una Proposal in Backlog, per vedere nel Diagramma o nei Requisiti ciò che la Proposal cambia.

### FOCUS_TASK
Il developer preme View on diagram o View requirements sulla scheda di un Task in Active, per vedere nel Diagramma o nei Requisiti ciò che il Task nomina.

### FOCUS_REF
Il developer segue un chip di riferimento: sulla scheda di un Task, sulla scheda di un Drift o fra i Task dei dettagli di una voce di History. Un chip di un elemento del Modello porta al Diagramma, uno di un Requisito ai Requisiti, uno delle Specs alle Specs.

### STEP_FOCUS
Il developer passa al passo precedente o al successivo del focus della scheda, con le frecce della barra del focus.

### TOGGLE_ONLY_FOCUSED
Il developer accende o spegne Only these nella barra del focus dei Requisiti.

### CLEAR_FOCUS
Il developer toglie il focus della scheda, con Clear nella barra del focus o con Esc.

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
Il developer riapre l'overlay delle domande in attesa dalla barra nel pannello già aperto. Il pulsante Reopen della notifica dell'editor chiede invece OPEN_PANEL.
