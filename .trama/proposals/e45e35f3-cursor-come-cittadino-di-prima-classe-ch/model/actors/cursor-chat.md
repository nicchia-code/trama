# Cursor chat

La chat dell'agente integrata in Cursor, vista attraverso gli hook di Cursor. Riguarda solo le conversazioni che Trama riconosce come proprie: quelle in cui è stato inviato un prompt che nomina una skill di Trama, sia che lo abbia inviato Trama stessa con i suoi pulsanti sia che lo abbia scritto il developer. Le altre conversazioni del progetto non producono mai nessuno di questi Event.

## Events

### PROMPT_SUBMITTED
Un prompt è stato inviato a una conversazione di Trama nella chat di Cursor: il primo, che nomina la skill e rende la conversazione di Trama, o uno successivo. Significa che l'agente è di nuovo al lavoro.

### AGENT_STOPPED
L'agente di una conversazione di Trama ha concluso il proprio turno normalmente. Può aver finito, essersi fermato a una Proposal consegnata o a un Drift, oppure aspettare una risposta a testo del developer: la chat non permette di distinguere i casi. La conversazione resta aperta e l'agente può riprendere quando il developer risponde.

### AGENT_INTERRUPTED
Il turno dell'agente di una conversazione di Trama è finito perché il developer lo ha interrotto o perché è andato in errore. Da qui l'agente non riprende da solo.

### CONVERSATION_CLOSED
Una conversazione di Trama è stata chiusa dal developer, o la finestra che la conteneva è stata chiusa. Nessun agente può più lavorarci. È una scelta del developer e non genera avvisi.
