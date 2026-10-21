# Editor chat

La chat dell'agente integrata nell'editor, vista attraverso i suoi hook: la chat di Cursor con gli hook di Cursor, l'unica chat che Trama supporta. Riguarda solo le conversazioni che Trama riconosce come proprie: quelle in cui è stato inviato un prompt che nomina, in qualunque punto, una delle skill con cui Trama avvia un lavoro, sia che lo abbia inviato Trama stessa con i suoi pulsanti sia che lo abbia scritto il developer. È di Trama anche la conversazione il cui agente lancia un comando di Trama che registra il suo lavoro: annunciare una scheda o un controllo, cominciare una Proposal, prendere un Task o chiedere un round di domande; un comando che si limita a leggere non la rende di Trama. Così una conversazione in cui il developer ha scritto un prompt libero, o che Trama ha dimenticato perché l'editor è ripartito, torna seguita appena il suo agente registra di nuovo qualcosa. Le altre conversazioni del progetto non producono mai nessuno di questi Event.

Ogni conversazione di Trama conta come un agente a sé, come un terminale di Trama: ciò che il suo agente registra (annunci, Task presi, schede consegnate, Drift, tempi delle fasi) appartiene a quella conversazione e al lavoro che Trama le ha affidato, perché gli hook di Trama completano ogni comando di Trama del suo agente con la conversazione e il lavoro. Un sotto-agente lanciato dall'agente di una conversazione non è una conversazione a sé: ciò che registra appartiene alla conversazione che lo ha lanciato, e la sua fine non è la fine del turno di quella conversazione. Un comando di Trama che arriva dalla chat senza la sua conversazione (hook non installati, un hook che ha rinunciato, un agente che Trama non ha riconosciuto) appartiene alla chat del progetto, come quando le conversazioni non si distinguevano: lo ritira, lo rilascia o lo libera la fine di una qualunque conversazione di Trama del progetto.

Ogni segnale della chat di Cursor arriva a tutte le finestre dell'editor aperte sullo stesso progetto, non solo a quella usata per ultima, così nessuna fine di turno si perde perché il developer ha cambiato finestra. Non c'è nessun timer: se un segnale non arriva comunque, ciò che l'agente aveva annunciato resta finché la conversazione non è chiusa o l'editor non riparte.

Gli hook della chat non bloccano mai il lavoro dell'agente, con una sola eccezione: in una conversazione di Trama rifiutano lo strumento di domande dell'agente e gli rispondono di chiedere con il round di Trama (vedi il Question round). Per saperlo chiedono all'editor se la conversazione è di Trama; se l'editor non risponde in tempo o qualcosa va storto, lo strumento passa. Completare un comando di Trama con la conversazione e il lavoro non lo ferma: se l'editor non risponde in tempo, il comando parte com'è e appartiene alla chat del progetto. Nei Run con l'Advisor della chat gli hook possono anche far continuare l'agente o un suo sotto-agente con un messaggio, o aggiungere un testo al risultato di un suo tool (vedi l'Advisor della chat).

## Events

### PROMPT_SUBMITTED
Un prompt è stato inviato a una conversazione di Trama nella chat: il primo, che nomina la skill e rende la conversazione di Trama, o uno successivo, anche in una conversazione diventata di Trama per un comando del suo agente. Significa che l'agente è di nuovo al lavoro.

### FILES_CHANGED
L'agente di una conversazione di Trama, o un suo sotto-agente, ha cambiato dei file del progetto: con una modifica diretta di un file, oppure con un comando di shell dopo il quale git mostra file cambiati che prima non lo erano (per esempio `git checkout`, `git apply` o `git stash`). Trama lo guarda solo nelle conversazioni di un Run con l'Advisor della chat.

### TOOL_FINISHED
Uno strumento dell'agente di una conversazione di Trama, o di un suo sotto-agente, ha finito e quell'agente sta per leggerne il risultato: è il momento in cui Trama può aggiungere un testo per lui senza fermarlo. Trama lo usa solo nelle conversazioni di un Run con l'Advisor della chat; con una versione di Cursor che non consegna quel testo all'agente, il testo non arriva e Trama non lo sa.

### SUBAGENT_STOPPED
Un sotto-agente dell'agente di una conversazione di Trama ha concluso il suo lavoro normalmente, prima di restituire il risultato; la conversazione continua. Trama può rispondergli con un messaggio che lo fa continuare.

### SUBAGENT_INTERRUPTED
Un sotto-agente dell'agente di una conversazione di Trama è stato fermato dal developer o è andato in errore; la conversazione continua.

### TURN_FINISHING
L'agente di una conversazione di Trama sta per concludere il turno normalmente, e Trama può ancora continuarlo con un messaggio che la chat invia da sola come prossimo prompt. Arriva a ogni fine normale del turno. Trama continua il turno soltanto per la revisione finale dell'Advisor della chat; quando non lo continua segue subito `AGENT_STOPPED`.

### AGENT_STOPPED
L'agente di una conversazione di Trama ha concluso il proprio turno normalmente e Trama non lo ha continuato. Può aver finito, essersi fermato a una Proposal consegnata o a un Drift, oppure aspettare una risposta a testo del developer: la chat non permette di distinguere i casi. Trama lo tratta come la fine del lavoro di quella conversazione, come l'hook a riposo nel terminale: ciò che il suo agente e i suoi sotto-agenti avevano annunciato e non consegnato è ritirato e i Task che avevano preso sono rilasciati, insieme a ciò che appartiene alla chat del progetto; ciò che appartiene alle altre conversazioni non cambia. La conversazione resta aperta e l'agente può riprendere quando il developer risponde: allora annuncia e prende di nuovo ciò che gli serve.

### AGENT_INTERRUPTED
Il turno dell'agente di una conversazione di Trama è finito perché il developer lo ha interrotto o perché è andato in errore. Da qui l'agente non riprende da solo. Vale per ciò che appartiene a quella conversazione e alla chat del progetto, come `AGENT_STOPPED`.

### CONVERSATION_CLOSED
Una conversazione di Trama è stata chiusa dal developer, o la finestra che la conteneva è stata chiusa. Nessun agente può più lavorarci. È una scelta del developer e non genera avvisi. Vale per ciò che appartiene a quella conversazione e alla chat del progetto, come `AGENT_STOPPED`.
