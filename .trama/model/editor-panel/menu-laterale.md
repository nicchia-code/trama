# Menu laterale

La vista di Trama nella barra laterale primaria dell'editor, che si apre dall'icona di Trama nella barra delle attività a sinistra: è il menu da cui il developer sceglie che cosa mostra il pannello (vedi il Panel), che non ha più una barra delle schede. L'icona c'è in ogni finestra dell'editor, anche senza cartelle aperte e anche in una cartella che non è un progetto Trama; ogni finestra ha la sua vista. La barra laterale segue le regole dell'editor: Trama non la apre, non la chiude e non la sposta da sola, né quando il pannello si apre né dopo. Il pulsante di Trama nella barra di stato resta come prima e fa l'apertura ordinaria del pannello.

In un progetto Trama l'icona porta il numero di ciò che aspetta una decisione del developer, lo stesso della voce Board del menu, anche quando la vista non è mostrata; con zero, e fuori da un progetto Trama, non porta nessun numero.

Il menu segue i file come il pannello, anche a pannello chiuso: il numero di Scan System, il numero sulla voce Board e la disattivazione di Scan System si aggiornano da soli. Quando il pannello è aperto, il menu evidenzia la voce della vista che il pannello mostra, e l'evidenza la segue anche quando il developer cambia vista seguendo un collegamento o con un comando; a pannello chiuso nessuna voce è evidenziata.

Il developer può stringere la vista quanto l'editor gli permette. Quando è stretta, il menu passa alla modalità solo icone: ogni voce e ogni pulsante mostra soltanto la sua icona, senza testo e senza numero, e il suo nome, con il numero quando c'è, compare passandoci sopra; senza cartella sparisce anche la frase che spiega di aprirne una, che passa al pulsante Open Folder. Riallargata la vista, il menu mostra di nuovo i testi. La modalità segue soltanto la larghezza della vista, non cambia ciò che le voci fanno e non si sceglie nelle impostazioni.

## States

### Hidden (initial)
La vista non è mostrata: la barra laterale è chiusa o mostra un'altra vista. L'icona tiene il suo numero.
- `developer.OPEN_SIDE_MENU` → No folder: nella finestra non è aperta nessuna cartella.
- `developer.OPEN_SIDE_MENU` → Not a project: la cartella aperta non è un progetto Trama; con più cartelle nell'area di lavoro vale quella che vale per il pannello.
- `developer.OPEN_SIDE_MENU` → Project: la cartella è un progetto Trama.

### Shown
La vista è mostrata nella barra laterale.
- `developer.CLOSE_SIDE_MENU` → Hidden: il developer chiude la barra laterale o vi mostra un'altra vista.

#### No folder (initial)
La vista dice che Trama lavora su una cartella e offre il pulsante Open Folder, che apre la scelta della cartella dell'editor, e la voce Settings, che apre il pannello sulle sole impostazioni (vedi il Panel). Aprire una cartella fa ripartire la finestra, e con lei la vista.

#### Not a project
Il menu ha soltanto due voci: Get Started, che fa l'apertura ordinaria del pannello e quindi lo apre, o lo porta in primo piano, su Get Started, e Settings, che apre il pannello sulle impostazioni.
- `developer.INITIALIZE_PROJECT` → Project: il wizard di setup ha creato il progetto in questa cartella.
- `workspace.MODEL_CHANGED` → Project: la cartella è diventata un progetto Trama da fuori, per esempio da un'altra finestra o dal controllo di versione.

#### Project
Il menu ha, dall'alto: le voci Board, con il numero di ciò che aspetta una decisione, Diagram, Requirements, Specs e History; in fondo, separati da una linea, Scan System e la voce Settings, in quest'ordine. Scegliere una voce apre il pannello su quella vista, o lo porta in primo piano passando a quella vista (vedi il Panel). Scan System chiede all'agente di scansionare tutto il Sistema: ha l'aspetto delle altre voci, non quello di un pulsante in evidenza, porta il numero di Task finiti dall'ultimo scan globale (vedi il Task) e, con l'Advisor Scanner attivo (vedi Agent launching), con qualunque agente, resta al suo posto ma è disattivato, senza numero, e dice che l'Advisor Scanner controlla il codice durante i Run. Premerlo non lancia subito lo scan: l'editor apre una conferma che chiede se scansionare tutto il Sistema e avvisa che richiede molto tempo. Confermando, lo scan parte come lo lanciava il pulsante della Board, senza aprire il pannello; annullando non succede nulla e il numero resta com'era.
- `workspace.MODEL_CHANGED` → Not a project: la cartella non è più un progetto Trama, per esempio perché la cartella di Trama è stata cancellata.
