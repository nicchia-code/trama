# Prenotazione di un file

Un file di codice del progetto, visto dalla prenotazione di Trama durante un Run. In un Run, che sia un Task chiesto per nome o tutti i Task in To do, anche come sequenza per modello, l'agente affida i Task ai suoi sotto-agenti, che lavorano insieme nella stessa cartella. Trama non dà mai insieme due Task che riguardano la stessa cosa del Modello, ma Task diversi possono toccare gli stessi file: la prenotazione lo scopre nel momento in cui il secondo sta per scrivere, invece che alla verifica finale della corsa.

Il primo sotto-agente di un Run che scrive un file lo prenota per sé, fino alla fine della sua corsa. Ogni altro agente che prova a scrivere quel file, sotto-agente o agente principale, dello stesso Run o di un altro, è fermato prima che la scrittura avvenga: riceve un messaggio che nomina chi tiene il file e gli dice di fermarsi come vuole la regola dei conflitti (vedi il Task). Un sotto-agente fermato così lascia il suo Task In progress senza annullare nulla e torna all'agente principale, che lo riaffida quando il Task di chi tiene il file è Done. L'agente principale non prenota mai, perché la sua corsa dura quanto il Run e terrebbe fermi i suoi stessi sotto-agenti; un sotto-agente avviato da chi tiene il file può scriverlo come lui. Gli advisor dell'agente non prenotano e non sono mai fermati.

La prenotazione vale in ogni Run, con Parallel Execution accesa o spenta, e solo nei Run: design, scan, import e risoluzioni non scrivono codice e non prenotano. Vede soltanto gli strumenti con cui l'agente scrive i file: un comando della shell che scrive un file non la tocca. Se Trama non riesce a leggere o a scrivere una prenotazione, la scrittura è fermata con un messaggio che lo dice. Le prenotazioni stanno nella copia di lavoro e non vanno nel controllo di versione. Una conversazione di omp Chat conta come il terminale che sostituisce.

## States

### Libero (initial)
Nessun sotto-agente tiene il file.
- `agent.SCRITTURA_FILE_CHIESTA` → Prenotato: chi scrive è un sotto-agente di un Run; il file è prenotato per lui e la scrittura avviene.
- `agent.SCRITTURA_FILE_CHIESTA` → Libero: chi scrive è l'agente principale di un Run, un advisor o un agente fuori da un Run; la scrittura avviene e nessuno prenota il file.

### Prenotato
Un sotto-agente di un Run tiene il file. La prenotazione scade quando per molto tempo chi la tiene non scrive quel file.
- `agent.SCRITTURA_FILE_CHIESTA` → Prenotato: chi scrive è il sotto-agente che tiene il file, o un sotto-agente avviato da lui; la scrittura avviene e la prenotazione si rinnova.
- `agent.SCRITTURA_FILE_CHIESTA` → Prenotato: chi scrive è un altro sotto-agente o un agente principale, dello stesso Run o di un altro, e la prenotazione non è scaduta; la scrittura non avviene, e l'agente riceve un messaggio che nomina chi tiene il file e gli dice di fermarsi senza annullare nulla e di tornare all'agente principale con ciò che ha fatto.
- `agent.SCRITTURA_FILE_CHIESTA` → Prenotato: la prenotazione è scaduta e chi scrive è un altro sotto-agente di un Run; il file passa a lui e la scrittura avviene.
- `agent.SCRITTURA_FILE_CHIESTA` → Libero: la prenotazione è scaduta e chi scrive non prenota (l'agente principale, un advisor o un agente fuori da un Run); la prenotazione si cancella e la scrittura avviene.
- `agent-hook.SOTTO_AGENTE_FINITO` → Libero: il sotto-agente che tiene il file ha finito la sua corsa; ogni sua prenotazione si cancella. La fine di un altro sotto-agente non cambia nulla.
- `agent-hook.IDLE` → Libero: l'agente principale del terminale del sotto-agente che tiene il file è a riposo, quindi nessun suo sotto-agente lavora più; ogni prenotazione di quel terminale si cancella.
- `terminal.COMMAND_ENDED` → Libero: il comando dell'agente è finito nel terminale del sotto-agente che tiene il file; ogni prenotazione di quel terminale si cancella.
- `terminal.CLOSED` → Libero: il terminale del sotto-agente che tiene il file è stato chiuso; ogni prenotazione di quel terminale si cancella.
- `time.CHECK_DUE` → Libero: il controllo di esecuzione ha chiuso il lavoro del terminale del sotto-agente che tiene il file (vedi l'Agent terminal); ogni prenotazione di quel terminale si cancella.
