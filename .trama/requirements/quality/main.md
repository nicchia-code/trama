---
description: "Use when the work touches performance, security, privacy, accessibility, offline behaviour, localisation or reliability."
---
# Quality

## General

## editor-chat
- Affidabilità: `trama cursor-hook` e `trama copilot-hook` stanno sul percorso di ogni prompt che il developer invia nella chat, quindi non possono rallentarlo né bloccarlo. Se l'editor non risponde entro un secondo rinunciano ed escono con 0; non scrivono niente su disco e niente su standard error della chat tranne un errore di scrittura del file degli hook.
- Riservatezza: gli hook non conservano né registrano il testo del prompt; lo leggono solo per riconoscere se comincia con una skill di Trama, e all'editor mandano l'evento, l'identificatore della conversazione e la cartella del progetto, mai il prompt. Le voci di Trama in `~/.cursor/hooks.json` e il file degli hook di Copilot contengono solo un percorso locale.
- Compatibilità: i comandi interni di Cursor che Trama usa (`composer.createNew`, con il suo `partialState.modelConfig`, il deeplink con `workspace`), i comandi della chat di VS Code (`workbench.action.chat.open`, con il suo `modelSelector`), le cartelle degli agenti personalizzati delle chat e gli hook della chat di VS Code (in anteprima) non sono API stabili. Ogni nuova versione di Cursor o di VS Code che il developer usa è provata dallo smoke test dell'accettazione (una richiesta di design con un ruolo impostato, controllando il modello della conversazione, e un `trama ask`) prima di dichiararla supportata; un comando che sparisce passa al ripiego, e il developer lo vede come un prompt negli appunti, mai come un errore; un hook che non scatta lascia il lavoro in corso finché la conversazione non è chiusa o l'editor non riparte.

## agent-launching
- Sicurezza: `trama.agent`, `trama.terminalLocation`, `trama.autoExit`, `trama.maxParallelAgents` e i ruoli dei modelli si leggono solo dalle impostazioni utente, e i nomi dei modelli, il limite e il JSON degli hook entrano nella riga di comando solo citati per la shell, così il file di un repository clonato non può cambiare il programma o le opzioni che Trama esegue. Nelle definizioni utente dei sotto-agenti delle chat il nome del modello è scritto come stringa YAML citata, così un nome non può aggiungere altri campi; le definizioni stanno nella cartella dell'utente, mai nel repository.
- Riservatezza: nulla lascia la macchina. Trama non ha più un classificatore né una chiave: la voce `trama.system1.jev` eventualmente rimasta in `ExtensionContext.secrets` non è letta né usata; il developer la cancella con gli strumenti dell'editor se vuole.
- Sicurezza: anche `trama.driftAutoPilot` si legge soltanto dalle impostazioni utente. File del repository, front matter `automatic`, prompt o valori di workspace non concedono approvazione/esecuzione: l'host verifica preferenza corrente, raccolta propria e ambito ristretto prima di ogni passo delegato. La perdita del coordinatore sospende l'automatismo, non lo libera.

## agent-terminal
- Affidabilità: l'hook di omp e quello di Claude Code non bloccano mai l'agente: ogni chiamata a `trama agent-event` ha un timeout di 3 secondi e ogni errore è ignorato. Chiudere un terminale con `trama.autoExit` non blocca l'editor e non lancia errori se il terminale è già chiuso.
- Affidabilità: senza quiete, un agente morto senza segnale lascia Run, ghost e Task presi in corso; il developer li libera chiudendo il terminale o la conversazione, con `trama task take-back`, o riaprendo l'editor, che azzera i Run e ritira gli annunci.

## task
- Una corsa che realizza dei task legge Modello e Requisiti di ciascun task una volta, da `trama task show`, e esegue test, lint e build del progetto una volta, alla fine della corsa, dopo l'ultimo gruppo; mai un sotto-agente.
- Mentre scrive, l'agente o il sotto-agente non rilancia la suite intera al posto dei test di quel task.
- Prestazioni: quando l'agente ha dei sotto-agenti, una corsa realizza insieme fino a `trama.maxParallelAgents` Task che non riguardano la stessa cosa, la scansione confronta fino a `trama.maxParallelAgents` Machine insieme, e il design esplora con fino a `trama.maxParallelAgents` sotto-agenti; venti per impostazione predefinita. Il limite è il modo con cui il developer tiene sotto controllo il carico della macchina, i limiti del fornitore dell'agente e i conflitti fra file: chi li sente lo abbassa.
- Prestazioni: la scansione dopo l'approvazione legge solo l'ambito di scansione della Proposal, non le Feature intere.

## drift-resolution
- Affidabilità: due finestre che vedono gli stessi Drift non avviano due raccolte né due Run automatici. Prenotazione, fotografia, approvazione e lancio sono serializzati per progetto; i segnali ripetuti non creano Task doppi. Una finestra non autorizza lavoro finché non conosce gli scan e Run delle altre finestre vive.
- Affidabilità: perdita dell'editor o del coordinatore, consegna rifiutata e cambio di modalità non vengono interpretati come successo. Uno scan fallito o interrotto conta come finito per la barriera ma non come riuscito. Non si riapre un round perso né si applicano raccomandazioni a domande manuali saltate. Restano i file e le decisioni già applicate, con motivo visibile per ciò che richiede intervento.
- Accessibilità: criticità, modalità, fase e fallimenti hanno testi e nomi accessibili, non soltanto colore; avvisi e passi automatici non rubano il focus.
- L'accettazione esercita `disabled` invariato; `enabled` misto e `yolo` con critici; `critical` assente; Drift senza opzioni; due scan concorrenti in finestre diverse; scan iniziato dopo la fotografia; scan fallito o interrotto seguito dalla raccolta senza sospensione; cambio modalità prima di scelta, approvazione e gruppo; correzione fallita con caso indipendente; fix prima delle origini senza Task estranei; un nuovo Drift di fine corsa che avvia il ciclo successivo; segnali duplicati e riavvio senza ripartenza immediata. La verifica osserva anche la Board e i percorsi terminale/chat supportati, non soltanto test del coordinatore.
