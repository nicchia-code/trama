# Announcement

A card the agent is about to create, or a piece of work the agent is doing, announced so that a ghost of it shows meanwhile: a Proposal, a Drift, a Task, un controllo, un confronto o un lavoro. Il ghost di una scheda sta sulla Board, nella colonna in cui arriverà la scheda vera: in Backlog per una Proposal o un Drift, in Active per un Task. Un controllo, un confronto o un lavoro non ha una colonna: il suo ghost non sta sulla Board ma nella barra di stato dell'editor, dove un solo elemento riassume tutti i ghost senza colonna del progetto, mostrando il più recente e quanti altri ce ne sono, in ogni finestra dell'editor aperta sul progetto, anche a pannello chiuso. Così tutto ciò che è in corso si vede, sulla Board o nella barra di stato. An announcement is not a card: it cannot be decided on or moved, it does not count among what awaits a decision and it has no effect on the Model.

An announcement is created Preparing, as soon as the agent knows it will create the card, by the agent announcing it with the kind and the title of the card. Trama stessa annuncia ogni lavoro che lancia, nel momento in cui l'istruzione parte davvero, nel terminale o in omp Chat, così il suo ghost si vede fin dal lancio: per un design annuncia la Proposal, con il titolo della richiesta; per Resolve Drifts, con Resolve, annuncia la Proposal di risoluzione, il cui ghost dice che quel Drift è in risoluzione, «Resolving Drift D3», e lo dice finché la risoluzione non è consegnata; per Unify Drifts annuncia il Drift unificato, il cui ghost dice quanti Drift unisce, «Unifying 4 Drifts», e lo dice finché il Drift unificato non è registrato; per uno scan chiesto a mano annuncia il controllo, già in Scanning, con il titolo di ciò che scansiona; per un import e per Ask more annuncia un lavoro (vedi sotto). Un Run non ha un annuncio al lancio: lo mostrano i suoi Task presi dall'agente e i suoi controlli. La conversazione General di omp Chat non è un lavoro lanciato e non ha nessun annuncio al lancio. A Proposal the agent starts that no announcement is waiting for creates its own announcement already Writing. An announcement lasts only as long as the agent's work: once the real card has arrived, or the work is over without it, it is gone.

Una Proposal destinata a un Drift non ha mai un ghost a sé, perché il developer non la vede. Un Drift che porterà una Proposal ha un solo annuncio, quello del Drift: la Draft che l'agente comincia per esso si lega a quell'annuncio, che resta un Drift e mostra che la sua Proposal è in scrittura; il Drift arriva poi con la Draft allegata, che l'agente consegna subito dopo.

An announcement belongs to the agent terminal in which its agent runs, when there is one: the terminal Trama typed the instruction into, or the terminal of the agent that announced it. What happens in another agent terminal, or to a command other than the one Trama typed, never touches it. Solo un agente che Trama ha avviato, nel suo terminale o in una sua conversazione di omp Chat, General compresa, può annunciare: un annuncio chiesto da chiunque altro, per esempio da un omp avviato a mano o dal developer, è rifiutato e non nasce nessun ghost; la scheda arriva comunque quando l'agente la archivia, e una Proposal che quell'agente comincia nasce senza annuncio. Un annuncio che Trama fa al lancio appartiene al terminale in cui ne scrive l'istruzione. Una conversazione di omp Chat conta come il terminale che sostituisce. Anche la conversazione General conta come un terminale: la fine del suo processo vale come la fine del comando, e la sua pulizia o la sua chiusura come la chiusura del terminale (vedi omp Chat General). Non c'è nessun timer di inattività: un annuncio di cui nessun segnale dice la fine resta finché il terminale non si chiude, l'editor non riparte o il controllo di esecuzione non chiude il lavoro a cui appartiene (vedi l'Actor time).

Un annuncio può anche essere un controllo: non una scheda che arriverà, ma il lavoro che l'agente sta ancora facendo quando nessuna scheda lo mostra più. Lo annuncia l'agente quando comincia il pre-flight di un Run, prima del primo gruppo di Task, e quando comincia la fase finale di una corsa che ha realizzato dei Task (la verifica di test, lint e build, se tocca la scansione mirata di ciò che i Task hanno toccato, e infine l'aggiornamento della History). Con l'Advisor Scanner attivo (vedi Agent launching), non c'è né pre-flight né scansione mirata: il Run non annuncia un controllo prima dei Task, e il controllo finale passa dalla verifica all'aggiornamento della History senza la fase di scan; l'advisor non annuncia nulla. Quello di una scansione chiesta a mano lo annuncia Trama al lancio; l'agente, quando comincia la scansione, lo prende come suo invece di annunciarne un altro, e lo annuncia da sé solo se Trama non l'ha fatto. Lo scan leggero con cui il design controlla il codice prima di consegnare non è un controllo e non si annuncia. Il suo ghost sta nella barra di stato, con gli altri ghost senza colonna, con un titolo che dice di quale lavoro si tratta e una fase: Verifying, Scanning o, alla fine di una corsa, l'aggiornamento della History. Un controllo non arriva mai come scheda: finisce quando l'agente dice che ha finito, anche con esito fallito, e allora sparisce senza avvisi. Se invece è ritirato prima (hook a riposo, fine del comando, chiusura del terminale, fine o interruzione del turno della chat, controllo di esecuzione che chiude il suo lavoro) Trama prepara l'avviso che l'agente si è fermato prima di finirlo. Nessun controllo, nemmeno quello dello scan di tutto il Sistema, cambia il numero sul pulsante Scan: il ricordo dell'ultimo scan globale si aggiorna quando lo scan è lanciato (vedi il Task).

Un annuncio può anche essere un confronto: il lavoro di chi confronta una sola Machine con il codice, dentro una scansione, un pre-flight o una scansione di fine corsa, che sia un sotto-agente o l'agente stesso. Nasce quando chi confronta chiede il briefing della Machine, con il titolo «Comparing <Machine>», e sostituisce gli annunci delle singole schede che il confronto troverà: i Task e i Drift di un confronto non si annunciano uno per uno. Arriva quando chi confronta archivia in un solo passo tutte le schede trovate, anche nessuna; allora le schede compaiono insieme e il ghost sparisce senza avvisi. Un confronto non è un controllo: non ha fasi e non dice l'esito della scansione.

Un annuncio può essere infine un lavoro: ciò che fa un agente lanciato da Trama che non porta né una scheda annunciata al lancio né un controllo, cioè un import o Ask more. Lo annuncia Trama al lancio, con il titolo del lavoro; quello di Ask more si intitola come il suo terminale, per esempio «Ask T3», e nasce quando Trama apre il terminale o la conversazione di Ask more. Il suo ghost sta nella barra di stato, mentre le schede che l'agente annuncia nel frattempo hanno i loro ghost nelle loro colonne. Un lavoro non arriva mai come scheda e non si consegna: finisce quando finisce l'agente che lo fa, ed è la sua fine normale, quindi sparisce senza avvisi. Il terminale di Ask more non ha l'hook di Trama, quindi il suo lavoro non finisce mai per un hook a riposo: dura finché omp non esce, il terminale non è chiuso o il controllo di esecuzione non lo chiude, anche mentre l'agente aspetta il prossimo messaggio del developer.

Per ora gli avvisi di un annuncio ritirato, quello di mancata consegna e quello del controllo fermato prima di finire, non si mostrano: Trama li prepara come sempre, ma la Board non li disegna (vedi il Panel). Il ghost sparisce lo stesso.

Mentre un annuncio aspetta, l'agente che lo fa vivere può dichiarare una nota: una riga breve su cosa sta facendo e perché, a ogni tappa del suo lavoro. L'annuncio ricorda l'ultima nota e le cinque precedenti, ciascuna con il momento in cui è arrivata; le più vecchie si perdono. Una nota non cambia fase, titolo né consegna dell'annuncio e non conta come lavoro dell'agente. Un ghost sulla Board mostra l'ultima nota sotto la fase; un ghost della barra di stato la mostra nel suggerimento dell'elemento, quando è quello in vista, e nell'elenco che si apre cliccando l'elemento. Il developer, cliccando un ghost della Board o scegliendo un ghost da quell'elenco, apre una finestra sopra la Board che spiega cosa sta facendo quel ghost, da quanto è in corso, e mostra le note (vedi il Panel). Le note spariscono con l'annuncio.

## States

### Announced (initial)
The card has not arrived yet, or the check is not finished. Its ghost shows, on the Board or in the editor's status bar. Whatever the agent does with it applies in every sub-State.
- `agent.SUBMIT_PROPOSAL` → Delivered: the agent hands over the Proposal the announcement is bound to, so its card arrives in Backlog. Vale solo per un annuncio di Proposal. La consegna della Draft legata all'annuncio di un Drift non lo consegna: lo consegna il Drift.
- `agent.FILE_TASK` → Delivered: the agent files the Task it announced.
- `agent.FILE_DRIFT` → Delivered: the agent files the Drift it announced.
- `agent.UNIFY_DRIFTS` → Delivered: the agent files the unified Drift that Trama announced when it launched Unify Drifts; its card arrives in Backlog.
- `developer.DISCARD_PROPOSAL` → Withdrawn: only if the Proposal bound to the announcement is the one discarded; the developer gave up the draft on purpose, so no notice is shown.
- `terminal.COMMAND_ENDED` → Withdrawn: only the end of the command Trama typed into the agent terminal the announcement belongs to counts, so no agent can still be working there; every announcement of that terminal still waiting, che non sia un lavoro, is withdrawn at once, con l'avviso che l'agente ha finito senza consegnare quanto aveva annunciato. When Trama cannot tell that the command that ended is the one it typed, nothing is withdrawn for this reason.
- `terminal.CLOSED` → Withdrawn: the agent terminal the announcement belongs to was closed; withdrawn as when the command ends, with the same notice, salvo un lavoro. Closing another terminal changes nothing.
- `agent-hook.IDLE` → Withdrawn: l'agente del terminale a cui appartiene l'annuncio ha detto con il suo hook di essere a riposo, quindi nessun agente sta più lavorando a quella consegna; ogni annuncio di quel terminale ancora in attesa, che non sia un lavoro, è ritirato subito con l'avviso che l'agente ha finito senza consegnare quanto aveva annunciato, come alla fine del comando.
- `time.CHECK_DUE` → Withdrawn: il controllo di esecuzione ha chiuso il terminale a cui l'annuncio appartiene (vedi l'Agent terminal e Drift resolution), purché non sia un lavoro; ritirato come alla fine del comando, con lo stesso avviso che l'agente ha finito senza consegnare. Gli annunci degli altri terminali non cambiano.

#### Preparing (initial)
The agent is working on it and nothing is written yet; it may be waiting for the developer's answers. Un controllo, un confronto e un lavoro non passano mai da qui: un controllo nasce già in Verifying o in Scanning, secondo la fase dichiarata annunciandolo, un confronto nasce già Comparing e un lavoro nasce già Al lavoro.
- `agent.START_PROPOSAL` → Writing: only for an announced Proposal; the new Draft is bound to the announcement and the ghost takes its title, salvo il ghost di una risoluzione annunciata da Trama, che continua a dire quale Drift è in risoluzione. The Draft is taken by the oldest announcement of the developer's request still Preparing, or by the one the agent names. Vale anche per un Drift annunciato, quando l'agente lo nomina: la Draft si lega all'annuncio del Drift, che tiene il titolo del Drift.
- `agent.DECLARE_ANNOUNCEMENT_NOTE` → Preparing: la nota si aggiunge all'annuncio.

#### Writing
The Draft of the Proposal exists and the agent is writing it. Per un Drift, la Draft è la Proposal che il Drift porterà allegata.
- `agent.DECLARE_ANNOUNCEMENT_NOTE` → Writing: la nota si aggiunge all'annuncio.

#### Checking
Solo per un controllo: l'agente sta ancora lavorando dopo che i Task della sua corsa hanno lasciato In progress, o sta scansionando. Il ghost sta nella barra di stato e mostra la fase.
- `agent.FINISH_CHECK` → Delivered: l'agente dice che il controllo è finito; il ghost sparisce senza avvisi. Le schede che il controllo ha archiviato sono già arrivate da sole.

##### Verifying (initial)
L'agente esegue la verifica finale della corsa: test, lint e build.
- `agent.CHANGE_CHECK_PHASE` → Scanning: la verifica è passata e le condizioni della scansione mirata di fine corsa sono vere, quindi l'agente comincia a confrontare ciò che i Task della corsa hanno toccato.
- `agent.CHANGE_CHECK_PHASE` → Aggiornamento della History: solo per il controllo finale di una corsa che ha realizzato almeno un Task, quando la scansione mirata non parte (anche perché la verifica è fallita); l'agente comincia a scrivere o aggiornare le voci di History.
- `agent.DECLARE_ANNOUNCEMENT_NOTE` → Verifying: la nota si aggiunge al controllo.

##### Scanning
L'agente confronta il codice con il Modello e i Requisiti.
- `agent.CHANGE_CHECK_PHASE` → Aggiornamento della History: solo per il controllo finale di una corsa; la scansione mirata è finita e l'agente comincia a scrivere o aggiornare le voci di History.
- `agent.DECLARE_ANNOUNCEMENT_NOTE` → Scanning: la nota si aggiunge al controllo.

##### Aggiornamento della History
Solo nel controllo finale di una corsa: l'agente racconta in voci di History i Task che la corsa ha realizzato (vedi la Voce di History). Quando ha finito dice che il controllo è finito, come dopo la verifica o lo scan.
- `agent.DECLARE_ANNOUNCEMENT_NOTE` → Aggiornamento della History: la nota si aggiunge al controllo.

#### Comparing
Solo per un confronto: chi confronta legge il briefing della Machine e il codice. Il ghost sta nella barra di stato con il titolo del confronto.
- `agent.START_PROPOSAL` → Comparing: chi confronta comincia la Draft che un suo Drift porterà allegata e nomina il confronto; la Draft si lega al confronto, che non cambia titolo, e non ha un ghost a sé.
- `agent.FILE_COMPARISON` → Delivered: chi confronta archivia in un solo passo i Task e i Drift trovati, anche nessuno, con le Draft allegate ai suoi Drift, che poi consegna come dopo ogni Drift con una Proposal; le schede arrivano insieme e il ghost sparisce senza avvisi. Se una scheda del blocco non è valida non arriva nulla e l'annuncio resta Comparing.
- `agent.DECLARE_ANNOUNCEMENT_NOTE` → Comparing: solo quando chi confronta nomina questo confronto; la nota si aggiunge al confronto. Una nota che non nomina nessun annuncio non arriva mai a un confronto.

#### Al lavoro
Solo per un lavoro: l'agente lanciato da Trama sta ancora lavorando. Il ghost sta nella barra di stato con il titolo del lavoro.
- `agent-hook.IDLE` → Delivered: l'agente del terminale a cui appartiene il lavoro è a riposo; il lavoro è finito e il ghost sparisce senza avvisi.
- `terminal.COMMAND_ENDED` → Delivered: è finito il comando che Trama ha scritto nel terminale del lavoro; il ghost sparisce senza avvisi.
- `terminal.CLOSED` → Delivered: il terminale del lavoro è stato chiuso; il ghost sparisce senza avvisi.
- `time.CHECK_DUE` → Delivered: il controllo di esecuzione ha chiuso il terminale del lavoro; il ghost sparisce senza avvisi propri, e resta soltanto l'avviso del controllo in cima alla Board.
- `agent.DECLARE_ANNOUNCEMENT_NOTE` → Al lavoro: la nota si aggiunge al lavoro.

### Delivered (final)
The real card has arrived, or the agent finished the check or the work, and the ghost is gone.

### Withdrawn (final)
The card never came and the ghost is gone.
