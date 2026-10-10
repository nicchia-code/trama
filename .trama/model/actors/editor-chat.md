# Editor chat

La chat dell'agente integrata nell'editor, vista attraverso i suoi hook: la chat di Cursor con gli hook di Cursor, la chat di Copilot in VS Code con gli hook della chat di VS Code. Riguarda solo le conversazioni che Trama riconosce come proprie: quelle in cui è stato inviato un prompt che nomina una skill di Trama, sia che lo abbia inviato Trama stessa con i suoi pulsanti sia che lo abbia scritto il developer. Le altre conversazioni del progetto non producono mai nessuno di questi Event.

Le due chat non sanno dire le stesse cose. Cursor produce tutti e quattro gli Event. La chat di Copilot produce solo `PROMPT_SUBMITTED` e `AGENT_STOPPED`: i suoi hook non distinguono un turno interrotto da uno concluso e non dicono quando una conversazione è chiusa, quindi `AGENT_INTERRUPTED` e `CONVERSATION_CLOSED` non arrivano mai da lei.

## Events

### PROMPT_SUBMITTED
Un prompt è stato inviato a una conversazione di Trama nella chat: il primo, che nomina la skill e rende la conversazione di Trama, o uno successivo. Significa che l'agente è di nuovo al lavoro.

### AGENT_STOPPED
L'agente di una conversazione di Trama ha concluso il proprio turno normalmente. Può aver finito, essersi fermato a una Proposal consegnata o a un Drift, oppure aspettare una risposta a testo del developer: la chat non permette di distinguere i casi. Trama lo tratta come la fine del lavoro, come l'hook a riposo nel terminale: ciò che l'agente aveva annunciato e non consegnato è ritirato e i Task che aveva preso sono rilasciati. La conversazione resta aperta e l'agente può riprendere quando il developer risponde: allora annuncia e prende di nuovo ciò che gli serve.

### AGENT_INTERRUPTED
Il turno dell'agente di una conversazione di Trama è finito perché il developer lo ha interrotto o perché è andato in errore. Da qui l'agente non riprende da solo. Solo da Cursor.

### CONVERSATION_CLOSED
Una conversazione di Trama è stata chiusa dal developer, o la finestra che la conteneva è stata chiusa. Nessun agente può più lavorarci. È una scelta del developer e non genera avvisi. Solo da Cursor.
