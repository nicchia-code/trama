# Dirty point

Un punto del Modello o dei Requisiti che un'approvazione ha cambiato e che nessuno scan riuscito ha ancora confrontato con il codice: uno State, una Transition, un Event, la descrizione di una Machine, di una Feature o di un Actor, o una sezione di Requisiti, come li elenca l'ambito di scansione della Proposal (vedi la Proposal). La scansione automatica dopo un'approvazione parte solo se ci sono punti dirty da prendere, e confronta soltanto quelli: tutto il resto si dà per buono.

Un punto nasce Dirty quando una Proposal ordinaria è approvata in questa copia di lavoro, uno per ogni voce del suo ambito, anche con la scansione automatica spenta; un import e una risoluzione di Drift non sporcano nulla. La descrizione cambiata di una Machine è un punto da sola e non sporca la Machine intera. Un cambiamento del Modello arrivato da version control (pull, cambio di branch) non sporca nulla: chi lavora su più copie scansiona a mano. I punti sono di questa copia di lavoro e non sono versionati.

C'è al più un punto vivo per elemento, e ricorda la Proposal che lo ha sporcato per ultima: i Task che uno scan archivia per quel punto appartengono a quella Proposal, anche quando lo scan è partito per un'altra approvazione. Un punto il cui elemento non esiste più dopo un'approvazione successiva si chiude, sostituito dal punto del contenitore che quell'approvazione sporca.

Uno scan pulisce solo i punti sporcati prima che partisse, e solo quando il suo controllo Scanning si chiude riuscito: lo scan dopo un'approvazione pulisce i punti che ha preso, uno scan del System o di una Feature chiesto a mano quelli che stanno nel suo ambito, la scansione mirata di fine corsa quelli che stanno nei riferimenti dei suoi Task. Gli scan chiesti a mano continuano a confrontare tutto il loro ambito, non solo i punti dirty, perché servono anche a trovare codice cambiato fuori da Trama.

## States

### Dirty (initial)
Il punto aspetta uno scan e nessuno scan in corso lo sta leggendo.
- `proposal.APPROVED` → Being scanned: un'approvazione ordinaria, questa o una successiva, fa partire davvero la scansione automatica, che prende tutti i punti Dirty, anche quelli rimasti da approvazioni precedenti.
- `proposal.APPROVED` → Dirty: un'altra approvazione ordinaria cambia di nuovo lo stesso elemento, ma la scansione automatica non parte (spenta o non consegnata); il punto passa alla nuova Proposal.
- `proposal.APPROVED` → Clean: un'approvazione ordinaria toglie l'elemento del punto; al suo posto è sporcato il contenitore.
- `developer.ASK_AGENT` → Being scanned: il developer preme «Scan now» nell'avviso di una scansione automatica non partita, e la scansione parte davvero: prende tutti i punti Dirty.
- `agent.FINISH_CHECK` → Clean: uno scan del System o di una Feature chiesto a mano, o la scansione mirata di fine corsa, chiude riuscito il suo controllo Scanning e il punto sta nel suo ambito.

### Being scanned
Uno scan dopo un'approvazione ha preso il punto e lo sta confrontando; nessun'altra scansione automatica lo prende. Riaprire l'editor perde il ricordo degli scan in corso: i punti che erano presi tornano Dirty.
- `agent.FINISH_CHECK` → Clean: il controllo Scanning dello scan che ha preso il punto, o di uno scan chiesto a mano o di fine corsa che lo copre, si chiude riuscito.
- `agent.FINISH_CHECK` → Dirty: il controllo Scanning dello scan che ha preso il punto si chiude fallito; il punto torna libero per la prossima scansione.
- `proposal.APPROVED` → Being scanned: un'altra approvazione ordinaria cambia di nuovo lo stesso elemento e fa partire davvero la sua scansione automatica, che prende il punto per la nuova Proposal; la chiusura dello scan che lo aveva preso prima non lo pulisce più.
- `proposal.APPROVED` → Clean: un'approvazione ordinaria toglie l'elemento del punto; al suo posto è sporcato il contenitore.
- `proposal.APPROVED` → Dirty: un'altra approvazione ordinaria cambia di nuovo lo stesso elemento ma la scansione automatica non parte; il punto passa alla nuova Proposal e la chiusura dello scan che lo aveva preso prima non lo pulisce.
- `agent-hook.IDLE` → Dirty: l'agente dello scan che ha preso il punto è a riposo senza averlo pulito.
- `terminal.COMMAND_ENDED` → Dirty: il comando dello scan che ha preso il punto è finito senza averlo pulito.
- `terminal.CLOSED` → Dirty: il terminale dello scan che ha preso il punto è stato chiuso senza averlo pulito.
- `editor-chat.AGENT_STOPPED` → Dirty: il turno della chat dello scan che ha preso il punto è finito senza averlo pulito.
- `editor-chat.AGENT_INTERRUPTED` → Dirty: il turno della chat dello scan che ha preso il punto è stato interrotto senza averlo pulito.
- `editor-chat.CONVERSATION_CLOSED` → Dirty: la conversazione dello scan che ha preso il punto è stata chiusa senza averlo pulito.

### Clean (final)
Uno scan riuscito ha confrontato il punto con il codice, o il suo elemento non esiste più; non resta nulla da segnare.
