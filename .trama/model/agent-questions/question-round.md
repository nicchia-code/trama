# Question round

A group of related decisions the agent asks the developer to make together. The agent submits all questions of a round at once. Il round compare in un overlay modale sopra le schede del pannello Trama, identico in Cursor e in VS Code: una domanda alla volta, con un indice di tutte le domande che permette di saltare a qualunque domanda, e un riepilogo finale da cui il developer invia le risposte. Ogni domanda può portare un contesto più lungo che spiega lo sfondo della decisione, e ogni opzione dei dettagli più lunghi, per esempio pro e contro, oltre alla descrizione breve. Accanto alle opzioni c'è sempre uno spazio per scrivere una risposta libera, da sola o insieme alle scelte.

The round belongs to the window that started the agent terminal, or otherwise the most recently focused window with the project open. The developer sees which agent asked it. Queued rounds do not replace the one being answered. Trama imposes no response deadline; if the agent stops waiting, its round is removed and any visible question closes without delivering answers.

Un round chiesto dall'agente della chat di Cursor appartiene alla finestra più recentemente attiva con il progetto aperto, perché l'agente della chat non porta con sé la finestra che lo ha lanciato. Il sandbox di Cursor può rendere l'editor irraggiungibile all'agente: in quel caso il round resta nel caso separato dell'editor non disponibile, e l'agente riprova una volta fuori dal sandbox prima di usare le sue domande.

If the editor is lost after accepting the round, the round is interrupted and all its answers are discarded. The agent is told that the editor was lost and stops the workflow awaiting these decisions, without a fallback, automatic recommendation or automatic resumption. Initial editor unavailability remains a separate case.

## States

### Not asked (initial)
The round has not been requested yet.
- `agent.ASK_QUESTIONS` → Unanswered: the editor is not reachable for the project. Tells the agent the editor is unavailable so it can use its own question interface.
- `agent.ASK_QUESTIONS` → Queued: the editor is reachable but another round is being presented in the same window.
- `agent.ASK_QUESTIONS` → Asking: the editor is reachable and no other round is being presented in the same window. Apre subito la prima domanda sopra il pannello, che si apre o torna in primo piano da solo.

### Queued
Another round is being answered. This round waits its turn without showing a question.
- `ROUND_CLOSED` → Asking: a different round in the same window has closed and this is the oldest round still waiting. Apre la prima domanda sopra il pannello, che si apre o torna in primo piano da solo.
- `agent.STOP_WAITING` → Abandoned: removes this round from the queue.
- `editor.DISCONNECTED` → Interrupted: the editor window serving this round is lost. Removes the round and tells the agent to stop the workflow awaiting its decisions.

### Asking
Il developer sta rispondendo a questo round. Le risposte confermate, e quello che il developer ha scelto o scritto su una domanda senza confermarlo, restano finché il round è aperto, anche spostandosi tra le domande, riducendo l'overlay o chiudendo il pannello. Perdere il focus non chiude nulla.
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
Il round è ridotto alla barra delle domande in attesa, oppure il pannello è chiuso. L'agente continua ad aspettare; risposte e posizione restano.
- `developer.RESTORE_QUESTIONS` → In view: il developer clicca la barra o il pulsante della notifica. Il pannello si apre o torna in primo piano se serve e l'overlay riappare sulla domanda o sul riepilogo che mostrava.
- `developer.OPEN_PANEL` → In view: il pannello si apre o torna in primo piano con l'overlay riaperto sulla domanda o sul riepilogo che mostrava.
- `developer.CLOSE_PANEL` → Out of sight: il pannello si chiude mentre l'overlay era ridotto. La notifica con l'offerta di riaprire le domande compare come quando si chiude il pannello con l'overlay aperto.

### Answered (final)
The agent has received each question's choices, free answer or explicit skip. For each skipped question it applies its recommendation and lists it as a decision for the developer to verify.

### Unanswered (final)
The editor was not reachable when the round was requested. The agent has received an explicit editor-unavailable result, not skipped or invented answers, and asks through its own question interface instead.

### Abandoned (final)
The agent no longer waits for this round. It is removed, with no answers delivered and no recommendation silently applied.

### Interrupted (final)
The editor was lost while the round was queued or being answered. The round is removed and every answer of this incomplete round is discarded. The agent receives an explicit interruption error and stops the workflow awaiting these decisions. It does not use a fallback question interface, apply recommendations, retry or resume the round.

## Events

### ROUND_OPENED
Emesso quando un round entra in Asking, prima che compaia la sua prima domanda. Fa aprire il pannello Trama in primo piano, o lo porta in primo piano se è già aperto (vedi il Panel).

### ROUND_CLOSED
Emesso quando un round lascia Asking per Answered o Abandoned. Permette al round più vecchio ancora in coda nella stessa finestra di aprirsi, se presente. Chiudere un round in coda non emette questo evento e non interrompe il round attivo.
