# Focus

L'evidenza che una scheda del pannello mostra quando il developer ci arriva da un pulsante View on diagram o View requirements, di una Proposal in Backlog o di un Task in Active, oppure da un chip di riferimento (sulla scheda di un Task in Active o in Done, di un Drift o fra i Task di una voce di History). Diagramma, Requisiti e Specs hanno ciascuno il suo focus, indipendente dagli altri: arrivare in una scheda imposta solo il focus di quella scheda, e passare a un'altra vista dal menu laterale o con un comando non porta il focus con sé.

Il focus nasce da una Proposal, da un Task o da un solo riferimento. Di una Proposal comprende il suo scope: nel Diagramma gli elementi che aggiunge, cambia o toglie nel Modello e quelli a cui sono intitolate le sezioni dei Requisiti che cambia; nei Requisiti le sezioni che aggiunge, cambia, toglie o sposta. Di un Task comprende i suoi riferimenti: nel Diagramma gli elementi che nomina, anche attraverso una sezione dei Requisiti intitolata a un elemento; nei Requisiti le sezioni e le Aree che nomina e, per ogni elemento che nomina, le sezioni intitolate a lui o a un elemento che contiene, in ogni Area. Un chip è il focus di un solo riferimento, con le regole di un Task: nel Diagramma il suo elemento, nei Requisiti le sue sezioni, nelle Specs il campo che nomina.

Il focus si percorre a passi. Nel Diagramma un passo è un livello che mostra elementi del focus, con tutti quelli che mostra, nell'ordine del Modello; andare a un passo apre il suo livello come seguire un link (con gli Eventi di apertura dei livelli del Diagramma) e la vista si adatta ai suoi elementi. Nei Requisiti e nelle Specs un passo è una sezione, un'Area o un campo, nell'ordine della pagina, e andarci fa scorrere la pagina fin lì. Un riferimento che non si trova più (un elemento, una sezione o un campo che non esistono) non è un passo: la scheda dice quanti mancano e quali.

I pulsanti View compaiono solo quando la loro scheda avrebbe almeno un passo.

## States

### Senza focus (initial)
La scheda mostra ciò che il developer guarda, senza nulla di evidenziato né attenuato e senza la barra del focus.
- `developer.FOCUS_PROPOSAL` → Con focus: View on diagram o View requirements di una Proposal in Backlog. La scheda disegna quella Proposal sopra il Modello, come se fosse scelta nel suo selettore, e va al primo passo; nel Diagramma i dettagli mostrano la Proposal.
- `developer.FOCUS_TASK` → Con focus: View on diagram o View requirements di un Task in Active. La scheda non disegna nessuna Proposal e va al primo passo; nel Diagramma il primo elemento del passo è selezionato e se ne vedono i dettagli.
- `developer.FOCUS_REF` → Con focus: un chip. Come per un Task che avesse il solo riferimento del chip.

### Con focus
Gli elementi del passo sono evidenziati: con i colori del cambiamento quando la Proposal disegnata li cambia, altrimenti con il colore del focus. Il Diagramma attenua tutto il resto del livello mostrato; un livello aperto a mano senza elementi del focus si vede normale, e il focus resta. I Requisiti mostrano tutte le Aree, con evidenziate tutte le sezioni del focus, e il passo corrente è segnato. Una barra in cima alla scheda dice di cosa è il focus e a che passo si è, quanti riferimenti mancano, e offre il passo precedente, il successivo e Clear. Cambiare livello a mano, selezionare un elemento, anche attenuato, o adattare la vista a tutto il livello non tolgono il focus.
- `developer.FOCUS_PROPOSAL` → Con focus: il nuovo focus sostituisce del tutto quello di prima, compresa la Proposal disegnata.
- `developer.FOCUS_TASK` → Con focus: il nuovo focus sostituisce del tutto quello di prima; la Proposal che era disegnata non lo è più.
- `developer.FOCUS_REF` → Con focus: il nuovo focus sostituisce del tutto quello di prima; la Proposal che era disegnata non lo è più.
- `developer.STEP_FOCUS` → Con focus: si va al passo precedente o al successivo, mai oltre il primo o l'ultimo. Nel Diagramma si apre il suo livello e la vista si adatta ai suoi elementi; nei Requisiti e nelle Specs la pagina scorre alla sua sezione, alla sua Area o al suo campo.
- `developer.TOGGLE_ONLY_FOCUSED` → Con focus: solo nei Requisiti. Nasconde le sezioni fuori dal focus, e le Aree e i frammenti che non ne hanno; premuto di nuovo le mostra di nuovo.
- `developer.CHOOSE_DRAWN_PROPOSAL` → Senza focus: il developer sceglie un'altra Proposal, o nessuna, nel selettore della scheda.
- `workspace.MODEL_CHANGED` → Con focus: il focus si ricalcola sul nuovo quadro; i riferimenti spariti contano fra quelli mancanti e quelli tornati sono di nuovo passi. La scheda resta al passo in cui era finché esiste.
- `workspace.MODEL_CHANGED` → Senza focus: solo se il focus è di una Proposal che non è più aperta, perché approvata, rifiutata, scartata o tornata in scrittura. La scheda torna al Modello senza Proposal disegnata, tenendo livello e posizione.
- `developer.CLEAR_FOCUS` → Senza focus: il developer preme Clear o Esc; nel Diagramma, con un elemento selezionato, il primo Esc toglie solo la selezione e il focus resta. La scheda toglie evidenze, attenuazione e barra e resta dov'è, con il livello, la posizione e la Proposal disegnata.
- `developer.CLOSE_PANEL` → Senza focus: chiudere il pannello dimentica il focus di ogni scheda.
