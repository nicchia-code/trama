---
description: "Use for performance, security, privacy, accessibility, offline, localisation or reliability."
---
# Quality

## General

## task
- Una corsa che realizza dei task legge Modello e Requisiti di ciascun task una volta, da `trama task show`, e esegue test, lint e build del progetto una volta, alla fine della corsa, dopo l'ultimo gruppo; mai un sotto-agente.
- Mentre scrive, l'agente o il sotto-agente non rilancia la suite intera al posto dei test di quel task.
- Prestazioni: quando l'agente ha dei sotto-agenti, una corsa realizza insieme fino a `trama.maxParallelAgents` Task che non riguardano la stessa cosa, la scansione confronta fino a `trama.maxParallelAgents` Machine insieme, e il design esplora con fino a `trama.maxParallelAgents` sotto-agenti; venti per impostazione predefinita. Il limite è il modo con cui il developer tiene sotto controllo il carico della macchina, i limiti del fornitore dell'agente e i conflitti fra file: chi li sente lo abbassa.
- Prestazioni: l'approvazione di una Proposal crea i Task senza avviare un agente e senza leggere il codice.
- Prestazioni: il pre-flight di un Run legge solo i riferimenti esatti dei Task che partono, con un sotto-agente per Machine in parallelo; l'attesa è pari a quella della Machine più lenta.
- Prestazioni: lo scan leggero del design legge solo le voci che l'esplorazione non ha visto.
- Affidabilità: un pre-flight fallito non ferma il Run, che continua; un Drift trovato dal pre-flight blocca solo i Task dello stesso elemento.

## drift-resolution
- Affidabilità: perdita dell'editor e consegna rifiutata non vengono interpretate come successo. Non si riapre un round perso né si applicano raccomandazioni a domande manuali saltate. Restano i file e le decisioni già applicate.
- L'accettazione esercita: `Resolve` su un Drift con il suo round e la risoluzione consegnata in `Backlog`; nessuna risoluzione e nessun Run che partono da soli dopo uno scan o un Run; una Proposal salvata con `automatic: true` e un Drift salvato con `critical` letti senza errori; un valore rimasto di `trama.driftAutoPilot` che non cambia nulla.
- L'accettazione esercita anche i Drift ricorrenti: un Drift archiviato realizzando un Task di correzione prende il precedente da solo; una differenza dismessa non viene riarchiviata da una nuova scansione sugli stessi elementi.
- Sicurezza: `trama.asyncDriftResolver` si legge soltanto dalle impostazioni utente, così un repository clonato non può accenderlo. Una domanda pronta in un Drift è un file del progetto come il Drift: chi la cambia cambia soltanto ciò che il developer legge e le opzioni che gli sono offerte, mai la decisione, che resta la sua risposta e la sua approvazione; il developer la vede in `trama drift show`. La risposta entra nell'istruzione dell'agente solo come JSON citato per la shell, come ogni prompt.
- Affidabilità: una domanda pronta scaduta o illeggibile non blocca nulla: `Resolve` torna al flusso di oggi. Una consegna rifiutata della risoluzione scritta da Trama non è un successo: la Draft è scartata e la risposta passa all'agente. Una preparazione fallita lascia il Drift senza domanda pronta e non ferma il lavoro.
- Prestazioni: `Resolve` su un Drift con domanda pronta valida mostra la domanda senza avviare processi e senza leggere il codice; dopo una risposta che non richiede l'agente la scheda gialla compare senza avviare un agente.
- L'accettazione esercita, con l'impostazione accesa: uno scan che archivia un Drift e ne prepara la domanda; `Resolve` che la apre subito; una Fix option che diventa una risoluzione consegnata senza agente; il comportamento del codice con la Proposal allegata scritta dalla preparazione; un testo libero sul comportamento del codice che lancia l'agente senza rifare la domanda; due risoluzioni `prepared` in attesa insieme; una domanda saltata che resta pronta; una domanda scaduta dopo un cambio del Modello che torna al flusso di oggi; e, con l'impostazione spenta, istruzioni e `Resolve` come prima.

## panel/Settings
- Sicurezza: la scheda Settings scrive solo nelle impostazioni utente (`ConfigurationTarget.Global`), mai in quelle del workspace, quindi non modifica nessun file del repository. L'host accetta solo chiavi dichiarate nel manifest e valori conformi al loro schema.
- Privacy e sicurezza dei suggerimenti dei modelli: l'estensione non apre nessun file di Cursor. `omp models --json` si avvia senza shell, con argomenti fissi, con il programma omp di Trama (`tech#agent-launching`); aggiunge al PATH di omp solo la cartella di `trama.ompPath` o quella di bun. Trama non fa nessuna chiamata di rete per i suggerimenti. Un suggerimento è solo testo nel webview, costruito con `textContent` e attributi, mai come markup. Il motivo di un errore di omp è un testo fisso con il percorso usato o con il codice di uscita, mai l'output di omp né il suo stderr.
- Prestazioni: preparare l'elenco non blocca la scheda: i campi si possono usare subito e la tendina compare quando l'elenco arriva; omp ha al massimo 15 s, poi l'elenco è vuoto e compare il motivo della scadenza.

## developer.CLEAR_DONE
- Prestazioni: Clear legge Proposal, History e Drift una sola volta per clic, non una volta per Task, così il suo tempo cresce con il numero di Task cancellati e non con il loro prodotto con le Proposal e le voci di History. Il developer vede le schede sparire al clic, qualunque sia il tempo della cancellazione.
- Affidabilità: la rimozione ottimistica non nasconde mai un errore: un Task non cancellato torna nella colonna con l'avviso del motivo.
- L'accettazione esercita: Clear con alcune centinaia di Task in Done, con le schede che spariscono subito e la colonna vuota alla fine; Clear con un Task col badge `kept`, che resta; Clear con un file di History non scrivibile, con l'avviso e le schede non cancellate che tornano.
