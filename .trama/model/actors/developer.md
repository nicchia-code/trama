# Developer

The person who owns the project. Decides what enters the Model, resolves differences between code and Model, steers the agent and looks at the Diagram, the Board and the Requirements in the editor panel.

Può anche registrare direttamente un Drift dalla riga di comando, per annotare una differenza fra codice e Model o Requisiti; resta una differenza da decidere, come un Drift registrato dall'agente.

## Events

### APPROVE_PROPOSAL
The developer approves an open Proposal, from the Board or from the Diagram's detail panel. Una Proposal allegata a un Drift aperto non si approva così: si decide con il Drift, dalla riga di comando o con una risoluzione.

### REJECT_PROPOSAL
The developer rejects an open Proposal, from the Board or from the Diagram's detail panel. Reject non chiede più nessun feedback: chi vuole dire all'agente che cosa cambiare usa Rework with feedback (REWORK_PROPOSAL). Dalla riga di comando il rifiuto accetta ancora un feedback facoltativo; confermato vuoto, non ne aggiunge nessuno. Una Proposal allegata a un Drift aperto non si rifiuta così: si decide con il Drift, dalla riga di comando o con una risoluzione.

### REWORK_PROPOSAL
Il developer sceglie Rework with feedback… dal menu della freccetta di Reject di una Proposal aperta, sulla Board o nei dettagli del Diagramma, e scrive nella casella di input dell'editor che cosa l'agente deve cambiare. Annullare la casella non fa nulla. Confermarla vuota chiede prima una conferma, contro i clic sbagliati: confermata, la Proposal è rifatta senza feedback sul Modello di adesso; annullata, non succede nulla. Con un testo parte subito.

### SCEGLI_MODELLO_PROPOSAL
Il developer sceglie, dall'ingranaggio della scheda di una Proposal in Backlog, il modello con cui lavorano gli agenti dei lavori di quella Proposal, oppure lo toglie e torna al default dei Settings. Sceglie un modello suggerito o ne scrive il nome, come nella scheda Settings.

### DISCARD_PROPOSAL
The developer discards a Proposal the agent is still writing, with the command line. It is for drafts the agent never finished; a Proposal already handed over is rejected instead.

### FILE_DRIFT
Il developer registra direttamente un nuovo Drift dalla riga di comando. Il Drift nasce Open e attende una decisione, con le stesse regole di un Drift registrato dall'agente.

### FIX_DRIFT_CODE
The developer keeps the side of an open Drift that says what should happen: the Model or the Requirement is right and the code must change. La Proposal allegata, se c'è, è messa da parte con il Drift. Solo dalla riga di comando: dal pannello un singolo Drift si può solo chiudere senza cambiare nulla oppure far risolvere dall'agente, con Resolve o con Rework with feedback.

### ACCEPT_DRIFT_PROPOSAL
The developer keeps the side of an open Drift that says what happens, when a Proposal is attached: the code is right and the Proposal is accepted. Solo dalla riga di comando.

### DISMISS_DRIFT
Il developer tiene il lato di un Drift aperto che dice ciò che succede: il codice è giusto e nulla cambia. Dalla riga di comando, solo quando nessuna Proposal è allegata; dal pannello, con Dismiss Drift nella scheda della Board o nei dettagli del Diagramma e dopo una conferma, anche quando una Proposal è allegata, che è scartata con il Drift.

### REWORK_DRIFT
Il developer sceglie Rework with feedback… dal menu della freccetta di Dismiss Drift di un Drift aperto, sulla Board o nei dettagli del Diagramma, e scrive nella casella di input dell'editor come vuole che l'agente risolva il Drift. Non chiude il Drift: chiede una risoluzione guidata da quel testo. Annullare la casella non fa nulla. Confermarla vuota chiede prima una conferma: confermata, la risoluzione parte senza feedback; annullata, non succede nulla. Con un testo parte subito.

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
The developer asks the coding agent to work, from a button or a command: design a change (with a written request), scan the whole System or one Feature, implement one Task, implement every Task in To do, resolve one open Drift with Resolve, or import the existing code as Proposals.

Una richiesta di design arriva in un solo modo: come richiesta scritta, un documento Markdown che il developer apre con + Add Work Item in fondo alla colonna Backlog, compone in una scheda dell'editor e invia con il pulsante Send to agent della scheda o chiudendo la scheda (vedi la Design request). Non c'è più una richiesta rapida di una riga.

L'import dal comando Import from Code è questo Event solo con un Modello che non è vuoto; con il Modello vuoto il comando apre invece il wizard di setup (OPEN_GUIDED_SETUP). L'import che segue la conferma del wizard fa parte di quella conferma (INITIALIZE_PROJECT o CONFIRM_SETUP).

### OPEN_QUICK_TASK
Il developer sceglie Add Quick Task dal menu che si apre dalla freccetta di + Add Work Item, in fondo alla colonna Backlog, per affidare all'agente un lavoro rapido e di fiducia, per esempio «committa il codice», senza richiesta scritta, senza scan e senza schede. Non scrive nulla prima: scrive direttamente nella chat che Trama apre.

### CLOSE_REQUEST
Il developer chiude la scheda di una richiesta di design scritta che non ha mai inviato, quando nessun'altra scheda mostra più quella richiesta. Chiudere la finestra dell'editor con la scheda aperta non è questo Event, né lo è chiudere la scheda di una richiesta già inviata.

### INITIALIZE_PROJECT
The developer asks to set up Trama in a workspace folder. Dall'editor lo chiede confermando il riepilogo del wizard di setup in Get Started, la scheda che il pannello mostra in una cartella senza progetto (vedi il Setup wizard); dalla riga di comando con l'inizializzazione.

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
Il developer passa alla scheda Settings del pannello, dalla sua barra delle schede o con Open Settings nell'avviso che la chat di Cursor esiste solo in Cursor, che apre il pannello se è chiuso.

### CHANGE_SETTING
Il developer cambia un'impostazione di Trama dalla scheda Settings: sceglie un valore in un menu, spunta o toglie una casella, oppure conferma un campo di testo o numerico.

### OPEN_GUIDED_SETUP
Il developer apre il wizard di setup in un progetto: con il pulsante Guided setup in cima alla scheda Settings, per rivedere le impostazioni; oppure, con il Modello vuoto, con Import from Code o Start from Scratch nel Diagramma o con il comando Import from Code, per proseguire con quel percorso (vedi il Setup wizard). In una cartella senza progetto il wizard è già Get Started e questo Event non c'è.

### NEXT_SETUP_STEP
Il developer passa al passo successivo del wizard di setup con Next.

### PREVIOUS_SETUP_STEP
Il developer torna al passo precedente del wizard di setup con Back.

### SKIP_SETUP_STEP
Il developer salta il passo Advanced del wizard di setup con Skip.

### OPEN_SETUP_STEP
Il developer sceglie una riga del riepilogo del wizard di setup per tornare al passo da cui viene.

### CONFIRM_SETUP
Il developer conferma il riepilogo del wizard di setup aperto in un progetto, dalla scheda Settings. In una cartella senza progetto la conferma è INITIALIZE_PROJECT.

### CANCEL_SETUP
Il developer annulla il wizard di setup aperto in un progetto, con Cancel. In Get Started il wizard non ha Cancel.

### OPEN_SYSTEM_LEVEL
Il developer riporta il Diagramma alla sua radice, il livello del Sistema da cui si sceglie cosa guardare: con il breadcrumb, o seguendo un link a un Actor i cui Eventi non arrivano a nessuna Machine, che la radice mostra selezionato.

### OPEN_WHOLE_SYSTEM_LEVEL
Il developer mostra nel Diagramma tutto il Sistema, con tutti gli Actor, tutte le Feature e gli Eventi fra loro: aprendo la voce Whole System dalla radice, o con il breadcrumb da una Feature aperta da lì.

### OPEN_ACTOR_LEVEL
Il developer mostra nel Diagramma un Actor con le Feature che ricevono i suoi Eventi: aprendolo dalla radice, con il breadcrumb da una Feature aperta dal suo livello, o seguendo un link a lui o a uno dei suoi Eventi.

### OPEN_FEATURE_LEVEL
The developer shows one Feature in the Diagram, by opening it, with the breadcrumb or by following a link to it or to one of its Machines.

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
