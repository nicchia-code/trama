# Question round

A group of related decisions the agent asks the developer to make together. The agent submits all questions of a round at once. Il round compare in un overlay modale sopra le schede del pannello Trama, identico in ogni editor in cui l'estensione gira: una domanda alla volta, con un indice di tutte le domande che permette di saltare a qualunque domanda, e un riepilogo finale da cui il developer invia le risposte. Ogni domanda può portare un contesto più lungo che spiega lo sfondo della decisione, e ogni opzione dei dettagli più lunghi, per esempio pro e contro, oltre alla descrizione breve. Accanto alle opzioni c'è sempre uno spazio per scrivere una risposta libera, da sola o insieme alle scelte.

The round belongs to the window that started the agent terminal, or otherwise the most recently focused window with the project open. The developer sees which agent asked it. Queued rounds do not replace the one being answered. Trama imposes no response deadline, e nemmeno l'agente: aspetta le risposte senza limite di tempo, per quanto il developer ci metta, così un developer lento non vede mai il round cancellato. If the agent stops waiting anyway, its round is removed and any visible question closes without delivering answers.

Un round chiesto dall'agente della chat di Cursor appartiene alla finestra più recentemente attiva con il progetto aperto, perché l'agente della chat non porta con sé la finestra che lo ha lanciato. Trama raggiunge l'editor anche quando l'agente di Cursor lavora nella sandbox di Cursor. Se dalla sandbox l'editor resta comunque irraggiungibile, il round resta nel caso separato dell'editor non disponibile e l'agente lo chiede di nuovo una volta fuori dalla sandbox; se anche lì l'editor non è raggiungibile, si ferma come per ogni editor non disponibile.

Il round di Trama è l'unico modo in cui l'agente fa una domanda al developer in una conversazione o in un terminale di Trama. Se ci prova con il proprio strumento di domande, l'hook di Trama lo rifiuta prima che compaia qualunque domanda e gli risponde di chiedere con il round di Trama. Nelle conversazioni che non sono di Trama, o quando l'hook non riesce a stabilire che la conversazione è di Trama, lo strumento dell'agente funziona come sempre e Trama non lo vede.

If the editor is lost after accepting the round, the round is interrupted and all its answers are discarded. The agent is told that the editor was lost and stops the workflow awaiting these decisions, without a fallback, automatic recommendation or automatic resumption. Initial editor unavailability remains a separate case.

Con l'Async Drift Resolver (vedi Drift resolution) un round può anche essere chiesto da Trama stessa, senza nessun agente in attesa: quando il developer clicca Resolve su un Drift con una domanda pronta valida, Trama presenta quella domanda come un round di una sola domanda, nella finestra in cui il developer ha cliccato, con lo stesso overlay, la stessa raccomandazione già selezionata e lo stesso spazio per la risposta libera. Dove questo round dice che l'agente aspetta o riceve le risposte, per una domanda pronta è Trama ad aspettarle e riceverle; nessuno smette di aspettarla, quindi non finisce mai abbandonata. Saltarla non applica nessuna raccomandazione: il Drift resta aperto con la sua domanda pronta. Se l'editor si perde, la risposta è scartata e non si scrive nulla.

## States

### Not asked (initial)
The round has not been requested yet.
- `agent.ASK_QUESTIONS` → Unanswered: the editor is not reachable for the project e la richiesta non viene dalla sandbox di Cursor. Dice all'agente che l'editor non è disponibile, di non chiedere in nessun altro modo, di fermarsi e di chiedere al developer di aprire il progetto nell'editor con Trama.
- `agent.ASK_QUESTIONS` → Unanswered: l'editor non è raggiungibile e la richiesta viene dalla sandbox di Cursor. Dice all'agente che l'editor non è raggiungibile dalla sandbox e di chiedere lo stesso round una volta fuori dalla sandbox; se anche lì non è disponibile, di fermarsi e di chiedere al developer di aprire l'editor.
- `agent.ASK_QUESTIONS` → Queued: the editor is reachable but another round is being presented in the same window.
- `agent.ASK_QUESTIONS` → Asking: the editor is reachable and no other round is being presented in the same window. Apre subito la prima domanda sopra il pannello, che si apre o torna in primo piano da solo.
- `developer.ASK_AGENT` → Queued: Resolve su un Drift con una domanda pronta valida, con l'Async Drift Resolver acceso, mentre un altro round è presentato nella stessa finestra. Trama chiede da sé il round della domanda pronta, senza agente.
- `developer.ASK_AGENT` → Asking: Resolve su un Drift con una domanda pronta valida, con l'Async Drift Resolver acceso, e nessun altro round è presentato nella stessa finestra. Trama chiede da sé il round della domanda pronta, senza agente, e apre subito la domanda sopra il pannello, che si apre o torna in primo piano da solo.
- `agent.TOOL_DOMANDE_CHIAMATO` → Not asked: la conversazione o il terminale è di Trama. L'hook di Trama rifiuta lo strumento di domande dell'agente, nessuna domanda compare, e l'agente riceve un messaggio che gli dice di chiedere solo con il round di Trama, come dice la sua skill.

### Queued
Another round is being answered. This round waits its turn without showing a question.
- `ROUND_CLOSED` → Asking: a different round in the same window has closed and this is the oldest round still waiting. Apre la prima domanda sopra il pannello, che si apre o torna in primo piano da solo.
- `agent.STOP_WAITING` → Abandoned: removes this round from the queue.
- `editor.DISCONNECTED` → Interrupted: the editor window serving this round is lost. Removes the round and tells the agent to stop the workflow awaiting its decisions.

### Asking
Il developer sta rispondendo a questo round. Le risposte confermate, e quello che il developer ha scelto o scritto su una domanda senza confermarlo, restano finché il round è aperto, anche spostandosi tra le domande, riducendo l'overlay o chiudendo il pannello. Perdere il focus non chiude nulla.

Il round si vede solo mentre la finestra è sul suo progetto. Se la cartella del progetto lascia la finestra, che la finestra resti senza progetto o passi a un altro, il round va fuori vista con le sue risposte e la sua posizione, e l'agente continua ad aspettare. Quando il progetto torna nella finestra, il pannello si apre o torna in primo piano da solo e il round ricompare com'era.
- `agent.STOP_WAITING` → Abandoned: chiude l'overlay o la barra e non consegna risposte.
- `editor.DISCONNECTED` → Interrupted: the editor window serving this round is lost. Chiude l'overlay o la barra, discards the round's answers and tells the agent to stop the workflow awaiting its decisions.

#### In view (initial)
L'overlay è aperto sopra le schede del pannello e il developer ci lavora. Il tasto Esc non fa nulla.
- `developer.MINIMIZE_QUESTIONS` → Out of sight: l'overlay si riduce a una barra in cima al pannello che dice che ci sono domande in attesa; il developer può guardare il Diagramma, la Board e i Requisiti.
- `developer.CLOSE_PANEL` → Out of sight: il pannello si chiude ma il round resta aperto e l'agente continua ad aspettare. Una notifica dell'editor dice che Trama ha domande in attesa e offre di riaprirle.
- `developer.CLOSE_QUESTIONS` → Confirming skip all: il developer chiude l'overlay o preme Skip all. Nulla è ancora saltato.

##### On question (initial)
Il developer vede la domanda corrente, il suo contesto, le sue opzioni e lo spazio per la risposta scritta. Alla prima visita l'opzione raccomandata è già selezionata; le visite successive mostrano quello che il developer ci aveva lasciato.
- `developer.CHOOSE_ANSWER` → On question: la domanda ha almeno una scelta o una risposta scritta non vuota, non è l'ultima e non è stata aperta dal riepilogo. Ricorda la risposta e apre la domanda successiva.
- `developer.CHOOSE_ANSWER` → Reviewing: la domanda ha almeno una scelta o una risposta scritta non vuota, ed è l'ultima oppure è stata aperta dal riepilogo. Ricorda la risposta e mostra il riepilogo.
- `developer.SKIP_QUESTION` → On question: non è l'ultima e non è stata aperta dal riepilogo. Segna come saltata solo questa domanda, senza consegnare quello che vi era scelto o scritto, e apre la successiva.
- `developer.SKIP_QUESTION` → Reviewing: è l'ultima oppure è stata aperta dal riepilogo. Segna come saltata solo questa domanda e mostra il riepilogo.
- `developer.GO_BACK` → On question: solo dopo la prima domanda. Apre la domanda precedente; quello che era scelto o scritto sulla corrente senza conferma resta lì per dopo ma non è una risposta.
- `developer.OPEN_QUESTION` → On question: il developer sceglie un'altra domanda dall'indice. La apre come l'aveva lasciata; quello che era scelto o scritto sulla domanda corrente senza conferma resta lì per dopo ma non è una risposta.
- `developer.OPEN_SUMMARY` → Reviewing: il developer sceglie il riepilogo dall'indice.
- `developer.ASK_MORE` → On question: il developer preme Ask more sulla domanda in vista. Trama apre una chat nuova con l'agente scelto e le manda da sé l'istruzione di Ask more su quella domanda (vedi Agent launching): la domanda per intero, con il contesto, le opzioni con le loro descrizioni e i dettagli e la raccomandazione, il testo e le opzioni delle altre domande del round senza nessuna risposta e, per la domanda pronta di un Drift, il riferimento a quel Drift. Con omp il terminale si chiama Ask question (vedi l'Agent terminal); con la chat di Cursor è una conversazione nuova che Trama non segue. Il round resta in vista, sulla stessa domanda, con le scelte e le risposte scritte intatte; l'agente che ha chiesto continua ad aspettare e non sa nulla della chat. Nulla del round si scrive su disco. Ask more è sempre disponibile; la chat non risponde al round al posto del developer. Con la chat di Cursor in un editor che non è Cursor non si apre nulla: l'istruzione va negli appunti e il developer è avvisato come per ogni istruzione.

##### Reviewing
Il riepilogo mostra ogni domanda con la sua risposta confermata, il segno che è stata saltata, oppure il segno che manca ancora. L'invio è possibile solo quando ogni domanda è risposta o saltata; altrimenti il riepilogo elenca quelle che mancano.
- `developer.OPEN_QUESTION` → On question: il developer sceglie una domanda dal riepilogo o dall'indice. Confermarla o saltarla riporta al riepilogo.
- `developer.SEND_ANSWERS` → Answered: ogni domanda è risposta o saltata. Consegna all'agente tutte le risposte e i salti e chiude l'overlay.

##### Confirming skip all
Il developer sceglie se saltare tutte le domande che non hanno ancora una risposta confermata oppure tornare indietro.
- `developer.SKIP_ALL_QUESTIONS` → Answered: segna come saltate tutte le domande senza una risposta confermata, tiene le risposte confermate e consegna subito il round, senza passare dal riepilogo.
- `developer.GO_BACK` → On question: la conferma era stata chiesta da una domanda. Torna a quella domanda senza cambiare nulla.
- `developer.GO_BACK` → Reviewing: la conferma era stata chiesta dal riepilogo. Torna al riepilogo senza cambiare nulla.

#### Out of sight
Il round è ridotto alla barra delle domande in attesa, oppure il pannello è chiuso, oppure la finestra non è più sul progetto del round: in quest'ultimo caso il round non si vede, nemmeno come barra, finché il progetto torna. L'agente continua ad aspettare; risposte e posizione restano.
- `developer.RESTORE_QUESTIONS` → In view: il developer clicca la barra nel pannello già aperto. L'overlay riappare sulla domanda o sul riepilogo che mostrava.
- `developer.OPEN_PANEL` → In view: il developer apre il pannello con il comando oppure con Reopen sulla notifica, e la finestra è sul progetto del round. Il pannello si apre o torna in primo piano con l'overlay riaperto sulla domanda o sul riepilogo che mostrava.
- `developer.OPEN_PANEL` → Out of sight: il developer apre il pannello con il comando oppure con Reopen sulla notifica, ma la cartella del progetto del round non è più nella finestra. Il pannello si apre o torna in primo piano senza il round (senza progetto, su Get Started); il round resta in attesa, invisibile, finché il progetto torna o l'agente smette di aspettare.
- `developer.CLOSE_PANEL` → Out of sight: il pannello si chiude mentre l'overlay era ridotto, oppure mentre la finestra non è più sul progetto del round. Nel primo caso la notifica con l'offerta di riaprire le domande compare come quando si chiude il pannello con l'overlay aperto; nel secondo non compare nessuna notifica.

### Answered (final)
The agent has received each question's choices, free answer or explicit skip. For each skipped question it applies its recommendation and lists it as a decision for the developer to verify.

### Unanswered (final)
The editor was not reachable when the round was requested. The agent has received an explicit editor-unavailable result, not skipped or invented answers. Se la richiesta veniva dalla sandbox di Cursor, l'agente chiede lo stesso round una volta fuori dalla sandbox, che è un round nuovo. Altrimenti non chiede in nessun altro modo, né con il proprio strumento di domande né scrivendo le domande nella conversazione: ferma il lavoro che aspettava quelle decisioni, senza aprire Proposal, e dice al developer di aprire il progetto nell'editor con Trama. Quando il developer gli dice di continuare, chiede di nuovo lo stesso round, che è un round nuovo.

### Abandoned (final)
The agent no longer waits for this round. It is removed, with no answers delivered and no recommendation silently applied.

### Interrupted (final)
The editor was lost while the round was queued or being answered. The round is removed and every answer of this incomplete round is discarded. The agent receives an explicit interruption error and stops the workflow awaiting these decisions. It does not use a fallback question interface, apply recommendations, retry or resume the round.

## Events

### ROUND_OPENED
Emesso quando un round entra in Asking, prima che compaia la sua prima domanda. Fa aprire il pannello Trama in primo piano, o lo porta in primo piano se è già aperto (vedi il Panel).

### ROUND_CLOSED
Emesso quando un round lascia Asking per Answered o Abandoned. Permette al round più vecchio ancora in coda nella stessa finestra di aprirsi, se presente. Chiudere un round in coda non emette questo evento e non interrompe il round attivo.
