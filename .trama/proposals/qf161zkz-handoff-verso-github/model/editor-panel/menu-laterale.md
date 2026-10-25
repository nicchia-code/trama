# Menu laterale

La vista di Trama nella barra laterale primaria dell'editor, che si apre dall'icona di Trama nella barra delle attività a sinistra: è il menu da cui il developer sceglie che cosa mostra il pannello (vedi il Panel), che non ha più una barra delle schede. L'icona c'è in ogni finestra dell'editor, anche senza cartelle aperte e anche in una cartella che non è un progetto Trama; ogni finestra ha la sua vista. La barra laterale segue le regole dell'editor: Trama non la apre, non la chiude e non la sposta da sola, né quando il pannello si apre né dopo. Nella barra di stato non c'è più un pulsante di Trama: ora che l'icona sta nella barra delle attività, l'apertura ordinaria del pannello passa dal comando Open Trama e dalla voce Get Started del menu.

In a Trama project the heading of the view carries the name of the project: the name of the System in the Model or, when the Model is missing, cannot be read or has no System name, the name of the project's folder; when the name of the System changes, the heading follows it. The icon in the activity bar keeps the name Trama, which the editor does not let change while it runs. Outside a Trama project, with no folder or in a folder that is not a Trama project, the heading only says Trama.

In un progetto Trama l'icona porta il numero di ciò che aspetta una decisione del developer, lo stesso della voce Board del menu, anche quando la vista non è mostrata; con zero, e fuori da un progetto Trama, non porta nessun numero.

Il menu segue i file come il pannello, anche a pannello chiuso: il numero di Scan System e il numero sulla voce Board si aggiornano da soli. Quando il pannello è aperto, il menu evidenzia la voce della vista che il pannello mostra, e l'evidenza la segue anche quando il developer cambia vista seguendo un collegamento o con un comando; a pannello chiuso nessuna voce è evidenziata.

Il menu non mostra suggerimenti passandoci sopra, in nessuna modalità: ogni voce e ogni pulsante si riconosce dal suo testo e dalla sua icona, e il suo nome resta per chi usa un lettore di schermo.

Il developer può stringere la vista quanto l'editor gli permette. Quando è stretta quasi quanto un'icona con il suo margine, il menu passa alla modalità solo icone: ogni voce e ogni pulsante mostra soltanto la sua icona, senza testo e senza numero; senza cartella sparisce anche la frase che spiega di aprirne una. Le barre laterali dell'editor non si stringono tanto, quindi lì il menu mostra sempre i testi; la modalità compare solo quando la vista sta in uno spazio più stretto. Riallargata la vista, il menu mostra di nuovo i testi. La modalità segue soltanto la larghezza della vista, non cambia ciò che le voci fanno e non si sceglie nelle impostazioni.

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
Il menu ha, dall'alto: le voci Board, con il numero di ciò che aspetta una decisione, Diagram, Requirements, Specs e History; in fondo, separati da una linea, Scan System e la voce Settings, in quest'ordine. Scegliere una voce apre il pannello su quella vista, o lo porta in primo piano passando a quella vista (vedi il Panel). Scan System chiede all'agente di scansionare tutto il Sistema ed è l'unico punto da cui Trama lancia uno scan: il Diagramma non ha un pulsante Scan e l'editor non ha un comando per farlo (vedi Agent launching). Ha l'aspetto delle altre voci, non quello di un pulsante in evidenza, e porta il numero di Task finiti dall'ultimo scan globale (vedi il Task). È sempre attivo, con l'Advisor Scanner acceso o spento (vedi Agent launching): con l'Advisor Scanner acceso porta lo stesso numero, chiede la stessa conferma e lancia lo stesso scan. Premerlo non lancia subito lo scan: l'editor apre una conferma che chiede se scansionare tutto il Sistema e avvisa che richiede molto tempo. Confermando, lo scan parte senza aprire il pannello e il numero torna a zero; annullando non succede nulla e il numero resta com'era.

With Manager mode on and origin on GitHub (see Manager mode), the menu has one more entry, Team, right after History and before the line: it opens the panel on the Team view, like the other entries. It carries the number of handoffs that wait for the Manager's decision, which the Board's number and the icon's number do not count; with zero it carries no number. With Manager mode off, or with origin no longer on GitHub, the entry is not there and leaves no space; the menu follows Manager mode as soon as it changes.

With Solo mode on (see Solo switch), the bottom of the menu, after the line, starts with Merge, the only button of the menu in evidence, followed by Scan System and Settings. Merge brings another branch into the current one and then scans the whole System (see Solo merge): besides Scan System, it is the only other way Trama launches a scan, and that scan also brings the number of Scan System back to zero. When Merge is unavailable, a line below it says why; while some of Trama's files are still tracked by git, a line below it reminds that their changes enter the commits. While a merge started by Trama is open, Merge is unavailable, a line below it says what is left to do, and the menu offers below it the ways to go on and Abort Merge. With Solo mode off, Merge and its lines are not there.
- `workspace.MODEL_CHANGED` → Not a project: la cartella non è più un progetto Trama, per esempio perché la cartella di Trama è stata cancellata.
