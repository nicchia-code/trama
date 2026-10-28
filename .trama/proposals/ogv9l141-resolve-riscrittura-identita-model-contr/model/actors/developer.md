# Developer

The person who owns the project. Decides what enters the Model, resolves differences between code and Model, steers the agent and looks at the Diagram, the Board and the Requirements in the editor panel.

Può anche registrare direttamente un Drift dalla riga di comando, per annotare una differenza fra codice e Model o Requisiti; resta una differenza da decidere, come un Drift registrato dall'agente.

## Events

### APPROVE_PROPOSAL
The developer approves an open Proposal, from the Board or from the Diagram's detail panel. Una Proposal allegata a un Drift aperto non si approva così: si decide con il Drift, dalla riga di comando o con una risoluzione. Con Auto-update Stale Proposals, Approve su una Proposal da raffinare, o su una Draft rimasta a metà di un raffinamento, chiede invece a Trama di raffinarla e poi di approvarla (vedi il Raffinamento).

### REJECT_PROPOSAL
The developer rejects an open Proposal, from the Board or from the Diagram's detail panel. Reject non chiede più nessun feedback: chi vuole dire all'agente che cosa cambiare usa Rework with feedback (REWORK_PROPOSAL). Dalla riga di comando il rifiuto accetta ancora un feedback facoltativo; confermato vuoto, non ne aggiunge nessuno. Una Proposal allegata a un Drift aperto non si rifiuta così: si decide con il Drift, dalla riga di comando o con una risoluzione.

### REWORK_PROPOSAL
Il developer sceglie Rework with feedback… dal menu della freccetta di Reject di una Proposal aperta, sulla Board o nei dettagli del Diagramma, e scrive nella casella di input dell'editor che cosa l'agente deve cambiare. Annullare la casella non fa nulla. Confermarla vuota chiede prima una conferma, contro i clic sbagliati: confermata, la Proposal è rifatta senza feedback sul Modello di adesso; annullata, non succede nulla. Con un testo parte subito.

### ANNULLA_RAFFINAMENTO
Il developer preme Cancel sulla scheda di una Proposal che aspetta in coda il suo raffinamento (vedi il Raffinamento), per toglierla dalla coda senza rifiutarla.

### RAFFINA_TUTTE
Il developer sceglie Refine All dal menu della freccetta di + Add Work Item, quando è disponibile, per far raffinare e poi approvare in un clic tutte le Proposal da raffinare (vedi il Raffinamento).

### ANNULLA_RAFFINA_TUTTE
Il developer sceglie Cancel Refine All dal menu della freccetta di + Add Work Item, che prende il posto di Refine All dopo il suo lancio, per svuotare la coda dei raffinamenti senza rifiutare nessuna Proposal (vedi il Raffinamento).

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

### CLEAR_DONE
Il developer preme Clear in fondo alla colonna Done della Board, per cancellare per sempre i Task finiti che la colonna mostra. Non chiede conferma e non ha un comando della riga di comando.

### DELETE_TASK
Il developer cancella per sempre un Task in To do che non vuole più, senza aspettare che arrivi in Done: dal pannello con Delete nella finestra dei dettagli del Task, dopo una conferma in un dialogo modale dell'editor, oppure dalla riga di comando, senza conferma.

### ASK_AGENT
The developer asks the coding agent to work, from a button or a command: design a change (with a written request), scan the whole System or one Feature, implement one Task, implement every Task in To do, resolve one open Drift with Resolve, or import the existing code as Proposals.

Una richiesta di design arriva in un solo modo: come richiesta scritta, un documento Markdown che il developer apre con + Add Work Item in fondo alla colonna Backlog, compone in una scheda dell'editor e invia con il pulsante Send to agent della scheda o chiudendo la scheda (vedi la Design request). Non c'è più una richiesta rapida di una riga.

L'import dal comando Import from Code è questo Event solo con un Modello che non è vuoto; con il Modello vuoto il comando apre invece il wizard di setup (OPEN_GUIDED_SETUP). L'import che segue la conferma del wizard fa parte di quella conferma (INITIALIZE_PROJECT o CONFIRM_SETUP).

### UNIFY_DRIFTS
Il developer sceglie Unify Drifts dal menu che si apre dalla freccetta di + Add Work Item, in fondo alla colonna Backlog, per far unire dall'agente tutti i Drift aperti fuori da ogni risoluzione in un unico Drift, che poi risolve con Resolve come ogni Drift. Serve quando più Drift toccano le stesse cose o si contraddicono, e risolverli uno alla volta li farebbe tornare. Non scrive nulla prima: l'agente gli chiede soltanto i conflitti fra i Drift (vedi Drift resolution).

### ASK_MORE
Il developer preme Ask more per chiedere a un agente spiegazioni su una sola cosa, senza scriverne da sé il contesto: una Proposal, un Task o un Drift, dalla finestra dei loro dettagli sulla Board, oppure la domanda in vista di un round di domande aperto. Trama apre una chat nuova con omp, che riceve ciò che serve per leggere quella cosa insieme alla prima domanda del developer: in omp Chat non le manda nulla prima che il developer scriva.

### CLOSE_REQUEST
Il developer chiude la scheda di una richiesta di design scritta che non ha mai inviato, quando nessun'altra scheda mostra più quella richiesta. Chiudere la finestra dell'editor con la scheda aperta non è questo Event, né lo è chiudere la scheda di una richiesta già inviata.

### INITIALIZE_PROJECT
The developer asks to set up Trama in a workspace folder. Dall'editor lo chiede confermando il riepilogo del wizard di setup in Get Started, la scheda che il pannello mostra in una cartella senza progetto (vedi il Setup wizard); dalla riga di comando con l'inizializzazione.

### UPDATE_SKILLS
The developer asks to refresh the agent skills of the project with the ones shipped with this version of Trama.

### OPEN_PANEL
The developer opens the Trama panel, or brings it to the front.

Anche il pulsante Reopen della notifica di domande in attesa chiede questa apertura ordinaria: se il round esiste ancora e la finestra è sul suo progetto, l'overlay si ripristina; altrimenti si apre soltanto il pannello. Senza un progetto il pannello si apre su Get Started, senza il round, che resta in attesa finché il suo progetto torna nella finestra.

Il developer lo chiede con il comando Open Trama o con la voce Get Started del menu laterale in una cartella che non è un progetto Trama (vedi il Menu laterale); nella barra di stato non c'è più un logo di Trama. Le voci delle viste del menu laterale e i comandi Show … aprono invece il pannello su una vista precisa (SHOW_BOARD, SHOW_DIAGRAM, SHOW_REQUIREMENTS, SHOW_SPECS, SHOW_HISTORY, SHOW_SETTINGS). Con il pannello già aperto il comando lo porta in primo piano tenendo la sua vista.

### CLOSE_PANEL
The developer closes the Trama panel.

### OPEN_SIDE_MENU
Il developer mostra il menu laterale di Trama, cliccando l'icona di Trama nella barra delle attività a sinistra o in un altro modo che l'editor offre per mostrare una vista della barra laterale. L'icona c'è in ogni finestra, anche senza cartelle e senza progetto Trama.

### CLOSE_SIDE_MENU
Il developer smette di mostrare il menu laterale: chiude la barra laterale o vi mostra un'altra vista.

### SHOW_DIAGRAM
Il developer passa alla vista Diagram del pannello, dal menu laterale o con il comando Show Diagram, che aprono il pannello se è chiuso, or follows a link from another view to an element. I pulsanti View on diagram e i chip dei riferimenti aprono invece un focus (FOCUS_PROPOSAL, FOCUS_TASK, FOCUS_REF).

### SHOW_BOARD
Il developer passa alla Board, dal menu laterale o con il comando Show Board, che aprono il pannello se è chiuso, o seguendo un collegamento alla Board.

### OPEN_GHOST_DETAILS
Il developer sceglie un ghost senza colonna dall'elenco che apre cliccando l'elemento dei ghost nella barra di stato dell'editor, o clicca quell'elemento quando riassume un solo ghost, per vederne i dettagli.

### SHOW_REQUIREMENTS
Il developer passa alla vista Requirements del pannello, dal menu laterale o con il comando Show Requirements, che aprono il pannello se è chiuso, or follows a link to a Requirement. I pulsanti View requirements e i chip dei riferimenti aprono invece un focus (FOCUS_PROPOSAL, FOCUS_TASK, FOCUS_REF).

### SHOW_SPECS
Il developer passa alla vista Specs del pannello, dal menu laterale o con il comando Show Specs, che aprono il pannello se è chiuso.

### SHOW_HISTORY
Il developer passa alla vista History del pannello, dal menu laterale o con il comando Show History, che aprono il pannello se è chiuso.

### SHOW_TEAM
The developer goes to the Team view of the panel, from the side menu or with the command Show Team, which open the panel if it is closed. Only with Manager mode on.

### SHOW_SETTINGS
Il developer passa alla scheda Settings del pannello, dal menu laterale, con il comando Show Settings o con Open Settings nell'avviso che omp non è installato, che aprono il pannello se è chiuso, anche in una finestra senza cartelle.

### INSTALL_OMP
Il developer preme Install omp: nel passo omp del wizard di setup, nel gruppo omp della scheda Settings, nell'avviso che omp non è installato o dentro la conversazione General di omp Chat, quando omp manca. Trama apre un terminale visibile con l'installer ufficiale di omp (vedi Agent launching).

### LOG_IN_PROVIDER
Il developer preme Log in, o Log in again, sulla riga di un fornitore di modelli nella sezione Providers del gruppo omp della scheda Settings o del passo omp del wizard di setup. Trama apre un terminale visibile in cui omp fa il login a quel fornitore: omp apre il browser o mostra un codice, e il developer completa l'accesso lì (vedi il Setup wizard e il Panel).

### LOG_OUT_PROVIDER
The developer presses Log out on the row of a Connected model provider, in the Providers section of the omp group of the Settings tab or of the omp step of the setup wizard, and confirms in the editor's dialog that follows; closing the dialog changes nothing. Trama has omp forget every account of that provider that omp stored, in the background and with no terminal; credentials that omp reads from elsewhere (environment variables, `.env` files, omp's model settings) and Trama's Cursor API key stay (see the Setup wizard and the Panel).

### SET_CURSOR_API_KEY
Il developer preme Set API key, o Change API key quando una chiave è già salvata, sulla riga Cursor della sezione Providers, nel gruppo omp della scheda Settings o nel passo omp del wizard di setup, e conferma una chiave API di Cursor nella casella mascherata che l'editor apre. La casella non accetta una chiave vuota o fatta di soli spazi e resta aperta dicendo di inserirne una; Esc la chiude senza che nulla cambi. Trama conserva la chiave nel portachiavi dell'editor, mai in un file né nelle impostazioni, e la passa a ogni omp che avvia da allora (vedi Agent launching).

### REMOVE_CURSOR_API_KEY
Il developer preme Remove API key sulla riga Cursor della sezione Providers, nel gruppo omp della scheda Settings o nel passo omp del wizard di setup; il pulsante c'è solo quando Trama conserva una chiave API di Cursor. Trama la toglie dal portachiavi dell'editor senza chiedere conferma, e da allora omp parte senza la chiave di Trama.

### SET_NTFY_TOKEN
The developer presses Set access token, or Change access token when one is already saved, in the Notifications sub-group of the Settings tab, and confirms an access token of his ntfy server in the masked box the editor opens. The box does not accept an empty token or one made only of spaces and stays open asking for one; Esc closes it and nothing changes. Trama keeps the token in the editor's keychain, never in a file nor in the settings, and sends it with every notification from then on (see Away notifications).

### REMOVE_NTFY_TOKEN
The developer presses Remove access token in the Notifications sub-group of the Settings tab; the button is there only while Trama keeps an ntfy access token. Trama removes it from the editor's keychain without asking for confirmation, and from then on notifications go without a token.

### SEND_TEST_NOTIFICATION
The developer presses Send test notification in the Notifications sub-group of the Settings tab, to check that Trama's notifications reach his devices with the server, topic and access token of now.

### REFRESH_SYSTEM_CERTIFICATES
The developer asks Trama to export the system's certificates again, with Refresh next to the System Certificates status, in the omp group of the Settings tab or in the omp step of the setup wizard, or with the Refresh System Certificates command of the editor. It is available only while System Certificates is on (see Agent launching).

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
Il developer sceglie, nel wizard di setup, un passo precedente a quello corrente nell'indicazione dei passi, oppure, nel riepilogo, il pulsante Edit di un passo, per tornare a quel passo con le scelte fatte.

### CONFIRM_SETUP
Il developer conferma il riepilogo del wizard di setup aperto in un progetto, dalla scheda Settings. In una cartella senza progetto la conferma è INITIALIZE_PROJECT.

### CANCEL_SETUP
Il developer annulla il wizard di setup aperto in un progetto, con Cancel. In Get Started il wizard non ha Cancel.

### TURN_ON_SOLO_MODE
The developer turns on Solo Mode in the Settings tab of a project, to use Trama alone in a repository where the others do not.

### TURN_OFF_SOLO_MODE
The developer turns off Solo Mode in the Settings tab of a project.

### CHANGE_SOLO_EXCLUSIONS
The developer chooses, in the Settings tab with Solo Mode on, whether Trama keeps out of git the whole folders where it writes or only the files it writes there.

### TURN_ON_MANAGER_MODE
The developer turns on Manager Mode in the Settings tab of a project, to plan work for the people of his team.

### TURN_OFF_MANAGER_MODE
The developer turns off Manager Mode in the Settings tab of a project.

### EDIT_PERSON
The developer saves the data of a person of the team from the person's dialog in the People tab of the Team view.

### ADD_TO_TEAM
The developer adds to the team of this project a person he already has in another project's team, from Add from other projects in the People tab.

### REMOVE_FROM_TEAM
The developer takes a person out of the team of this project, from the People tab.

### DELETE_PERSON
The developer deletes a person from all his teams, from Delete person in the person's dialog, after confirming.

### CHANGE_ISSUE_FIELD
The Manager changes, in the issue preview of the Team view, a field the agent proposed for an issue of a handoff (assignee, reviewer, estimate, sprint or another field of the GitHub Project), or undoes the change.

### SPLIT_ISSUE
The Manager asks, from the issue preview, that the agent split an issue estimated more than three days.

### REPLAN_HANDOFFS
The Manager asks, from the Decisions tab of the Team view and after confirming, that the agent plan again together, in time and among the people of the team, the issues of all the open handoffs.

### PUBLISH_AGAIN
The Manager asks, from the Issues tab, that the agent publish again an issue that is not published.

### LINK_GITHUB_PROJECT
The Manager chooses, in the Team view, the GitHub Project where Team publishes and reads its sprints.

### UNLINK_GITHUB_PROJECT
The Manager unlinks the GitHub Project from the Team view.

### LOG_IN_GITHUB
The Manager asks, from the Team view, to log in the GitHub command line or to give it access to Projects.

### REFRESH_TEAM
The Manager presses Refresh in the Team view, to read GitHub again.

### ASK_ISSUE_UPDATE
The Manager presses Comment update on a published issue the Model changed under, in the Issues tab.

### SCAN_ISSUE
The Manager presses Scan on a closed issue in the Issues tab, to have its references compared with the code.

### START_MERGE
The developer presses Merge in the side menu, with Solo mode on.

### CHOOSE_MERGE_BRANCH
The developer chooses, in the list Merge shows, the branch to merge into the current one, and confirms it when Trama asks.

### CANCEL_MERGE
The developer closes the list of branches of Merge without choosing one.

### OPEN_MERGE_EDITOR
The developer chooses to resolve by hand, in the editor's merge editor, the conflicts of a merge started by Trama.

### RECONCILE_MERGE_WITH_AGENT
The developer chooses to have the agent resolve the conflicts of a merge started by Trama.

### ABORT_MERGE
The developer chooses to abort a merge started by Trama that is still open.

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
Il developer segue un chip di riferimento: nei dettagli di un Task, anche Done, nei dettagli di un Drift o fra i Task dei dettagli di una voce di History. Le schede della Board non hanno chip dei riferimenti: né quella di un Task, in Active o in Done, né quella di un Drift. Un chip di un elemento del Modello porta al Diagramma, uno di un Requisito ai Requisiti, uno delle Specs alle Specs.

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

### STOP_CHAT_AGENT
Il developer preme Stop nel campo del messaggio di una conversazione di omp Chat in cui l'agente lavora e lo conferma nel dialogo modale. Annullare il dialogo non produce nulla.

### CLOSE_CHAT_CONVERSATION
Il developer chiude la scheda di una conversazione di omp Chat, anche quella di General rimasta dopo che omp Chat è stata spenta (vedi omp Chat General). Se l'agente della conversazione è in un turno, gli viene chiesto prima di confermare nello stesso dialogo modale di Stop; annullarlo non produce nulla. Chiudere la scheda di General mentre omp Chat è in uso è invece CLEAR_GENERAL.

### CLEAR_GENERAL
Il developer pulisce la conversazione General di omp Chat: chiude la sua scheda con l'icona di pulizia, o con Delete sulla scheda, mentre omp Chat è in uso. Se l'agente di General è in un turno, gli viene chiesto prima di confermare in un dialogo modale; annullarlo non produce nulla.

### SEND_CHAT_MESSAGE
Il developer manda un messaggio nella conversazione General di omp Chat, scritto nel suo campo del messaggio, oppure il primo messaggio di una conversazione di Ask more ancora vuota, che porta con sé l'istruzione di Ask more. Gli altri messaggi delle conversazioni li descrive la conversazione stessa, senza questo Event.

### ANSWER_PERMISSION
The developer chooses one of the options of a permission request of omp in a conversation of omp Chat, for example allowing once, allowing always or refusing (see omp Chat conversation).
