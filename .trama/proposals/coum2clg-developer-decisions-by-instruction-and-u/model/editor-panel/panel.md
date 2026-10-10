# Panel

The editor tab that holds Trama's three views. There is at most one panel; opening it again brings it to the front. While it is open, a hidden tab keeps what the developer was looking at. La scheda porta il nome del Sistema del Modello, non «Trama»: con il Modello vuoto, o senza un nome del Sistema, porta il nome della cartella del progetto; se il nome del Sistema cambia, la scheda lo segue.

## States

### Closed (initial)
- `developer.OPEN_PANEL` → Open: only if the workspace has a Trama project, or it has none and the developer accepts the offer to initialize one and that succeeds. The panel starts on the Diagram.
- `developer.OPEN_PANEL` → Closed: the workspace has no Trama project and the developer dismisses the offer, or initializing fails (the reason is shown).
- `question-round.ROUND_OPENED` → Open: il pannello si apre da solo in primo piano, sul Diagramma, con il round di domande sopra.

### Open
The panel is showing one of its tabs. Whenever the files change it is given a fresh picture of the Model, Requirements, Proposals, Tasks and Drifts, so every tab, also the hidden ones, stays current. Il quadro include il numero di Task finiti dall'ultimo scan globale di questa copia di lavoro: i Task ora in Done arrivati lì dopo l'inizio dell'ultimo scan di tutto il Sistema che l'agente ha dichiarato finito (vedi il Task). Il numero si aggiorna con ogni quadro e anche quando cambia solo il ricordo dello scan; Board e Diagramma lo mostrano sul pulsante che lancia lo scan del Sistema, anche quando la scheda è nascosta, e non lo mostrano quando è zero.

Mentre un round di domande dell'agente è aperto, compare in un overlay sopra qualunque scheda, oppure ridotto a una barra in cima al pannello che lascia usare le schede sotto (vedi il Question round).
- `developer.OPEN_PANEL` → Open: the panel is brought to the front, keeping its tab.
- `question-round.ROUND_OPENED` → Open: il pannello torna in primo piano, tenendo la sua scheda, con il round di domande sopra.
- `developer.CLOSE_PANEL` → Closed: the panel stops following the files and forgets what it was showing. Un round di domande aperto non si chiude con il pannello: resta in attesa (vedi il Question round).
- `developer.SHOW_DIAGRAM` → Diagram
- `developer.SHOW_BOARD` → Board
- `developer.SHOW_REQUIREMENTS` → Requirements
- `workspace.MODEL_CHANGED` → Open: after a short pause, one fresh picture is sent to the three tabs. If the files cannot be read, the error is shown and every tab keeps its last picture. If the files read fine but the Model or its Requirements are invalid, a banner counts the errors and links to each one, and the Diagram may be incomplete.

#### Diagram (initial)
The Model drawn one level at a time, with a selector to draw an open Proposal over it (never one the agent is still writing) and the open Drifts drawn where they point. Selecting something shows its details and its Requirements; from there the developer can approve or reject a Proposal or open the file. Buttons ask the agent to design a change or to scan the whole System or the Feature being looked at; quando scansiona tutto il Sistema il pulsante porta il numero di Task finiti dall'ultimo scan globale. I dettagli di un Drift mostrano il titolo, i due lati e i riferimenti del Drift, ognuno collegato all'elemento quando si trova ancora nel Modello, senza nessun modo di decidere su di lui.

Una Proposal allegata a un Drift aperto non compare nel selettore: il developer non la vede (vedi il Drift).

#### Board
Quattro colonne: To decide (le Proposal aperte, poi i Drift aperti che non stanno in una risoluzione consegnata), To do, In progress e Done (i Task). Le Proposal ancora in scrittura non sono schede e non contano fra ciò che aspetta una decisione. Una Proposal di risoluzione consegnata e i suoi Drift sono una sola scheda, contata una volta nel numero della colonna e della tab Board. Le schede portano al Diagramma. I pulsanti chiedono all'agente di realizzare tutti i Task in To do, scansionare il Sistema o progettare una modifica; il pulsante dello scan globale porta il numero di Task finiti dall'ultimo scan globale. Resolve Drifts chiede all'agente di risolvere insieme tutti i Drift aperti (vedi Drift resolution).

Una Proposal allegata a un Drift aperto non è una scheda di To decide, non conta fra ciò che aspetta una decisione e non compare nemmeno dentro il Drift. La scheda rossa di un Drift mostra il titolo, i riferimenti collegati al Diagramma o ai Requisiti e i due lati, senza Fix options né pulsanti per decidere. Una Proposal di risoluzione consegnata sostituisce le schede rosse dei Drift aperti che elenca con un'unica scheda gialla: in testa la Proposal con il titolo, i file e i controlli di approvazione e rifiuto di sempre; sotto, le righe dei Drift con la decisione e il collegamento ai dettagli nel Diagramma. Non ripete i due lati dei Drift. Una risoluzione in scrittura non unifica le schede. Se torna in scrittura, è rifiutata o scartata, i Drift ancora aperti tornano schede rosse. I Drift restano visibili nel Diagramma e bloccano i Task fino alla decisione, anche mentre sono raccolti nella scheda gialla.

La colonna Done mostra prima ciò che è finito più di recente, raggruppato per giorno, e un filtro sceglie il periodo da mostrare: oggi, gli ultimi 7 giorni, gli ultimi 30 giorni o tutto. All'apertura del pannello il periodo è gli ultimi 7 giorni; quello scelto resta mentre la Board si aggiorna e si dimentica alla chiusura del pannello. Una scheda di design finita conta dal momento in cui è finito il suo ultimo Task. I Task finiti prima che Trama ricordasse quando, si vedono solo scegliendo tutto, in fondo, come senza data.

While the agent is preparing a card it announced (a Proposal or a Drift for To decide, a Task for To do), the column it will land in shows a ghost of it: a skeleton that cannot be clicked or moved and does not count as a card, among those that await a decision or anywhere else. The ghost says what the agent is doing about it: preparing it, writing the Proposal's Draft, or waiting for the developer's answers while a question round is open; it follows the Draft's title on its own. It goes away when the real card arrives. When the card never comes (the agent went idle or its command ended, its terminal was closed, or its chat turn ended or was interrupted) the ghost goes away and the developer is told that the agent finished without delivering it; discarding the Draft is the developer's own choice and says nothing.

Mentre l'agente fa un controllo che ha annunciato (la fase finale di una corsa che ha realizzato dei Task, o una scansione), la colonna In progress mostra il ghost di quel controllo, dopo le schede vere, con il titolo del lavoro e la fase: la verifica di test, lint e build, o lo scan. Così, quando l'ultimo Task di un design va in Done e la scheda di design passa in Done, In progress dice ancora che l'agente sta lavorando. Il ghost sparisce senza avvisi quando l'agente dice che il controllo è finito; se è ritirato prima, il developer è avvisato che l'agente si è fermato prima di finirlo. Come gli altri ghost, non si clicca e non conta come scheda.

The Board is read-only for Tasks. No card can be moved between columns: there are no move buttons and no dragging, for a Task on its own card, a Task row inside a design card or a design card. There is no button that takes a Task back from the agent and none that removes a card. What the developer does on the Board is only: look at the cards, follow their links to the Diagram, open and close cards and their details, choose the period of the Done column, close notices, approve or reject a Proposal, ask the agent to run (a Task, every Task in To do, or one design) e chiedergli di risolvere i Drift. A card changes column only when the agent works on it, when a Drift is decided, or when a Task is moved from the command line; the Board then shows it in its new column.

The Tasks of one design, when there are at least two, are shown as a single design card named after the Proposal instead of one card each. The card stands in the column its Tasks add up to: To do while none of them has started, Done once all are done, In progress otherwise. It is closed at first and the developer can expand it to see its Tasks, each with its own status dot. It has a button that asks the agent to implement the design's Tasks still in To do. A design with a single Task, and every Task that belongs to no design, stays a card of its own.

Every Task, on its own card or inside a design card, has a status dot that tells its column; while the agent is working on it, the dot is animated instead. While any Task is taken by the agent the button that implements every Task in To do is unavailable, and so is the design card's button when one of the design's Tasks is taken; each disabled control says why. Mentre l'agente di Resolve Drifts lavora, ogni pulsante che lancia un Run è disabilitato, e mentre un Run lavora lo è Resolve Drifts, ciascuno dicendo perché (vedi Drift resolution).

#### Requirements
Le Aree dei Requisiti, ciascuna con i suoi frammenti e, dentro ogni frammento, le sue sezioni, and what an open Proposal would change in them (never one the agent is still writing), anche quando sposta una sezione da un frammento a un altro.
