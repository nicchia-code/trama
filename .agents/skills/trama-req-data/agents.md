# Requirements: Dati, Dati del lavoro dell'agente

Usa quando tocchi i dati di richieste di design, risoluzione dei Drift e round di domande.

## design-request

- Un file `requests/<id>.md` sotto `.trama/`, creato vuoto da + Add Work Item o da Start from Scratch, quindi anche in Writing. L'ID è la data e l'ora locali di creazione con i secondi, nella forma `AAAA-MM-GGTHH-MM-SS` (per esempio `2026-10-04T19-05-12`); se quel file esiste già, l'ID prende il suffisso `-2`, `-3`, … fino al primo libero. Il file contiene solo il testo Markdown del developer, senza front matter; può non avere un titolo. Le immagini vi compaiono come collegamenti Markdown `![…](…)`, scritti dall'editor quando il developer le incolla o le trascina, oppure a mano.
- Le immagini di una richiesta stanno nella cartella `requests/<id>.images/` sotto `.trama/`, accanto al file e con lo stesso ID; il collegamento nel testo è relativo al file (`<id>.images/<nome>`). La cartella non esiste finché il developer non incolla o trascina la prima immagine che viene da fuori dal progetto e contiene solo i file che l'editor vi copia, con il nome che l'editor sceglie. Un'immagine che sta già nel progetto è collegata con un percorso relativo al suo posto e non entra nella cartella; un'immagine collegata da un indirizzo web resta un indirizzo. La cartella non è un file di richiesta: non ha un ID proprio, non è in Writing né in Sent e non entra negli elenchi dell'estensione.
- La cartella `requests/` ha un suo `.gitignore` che ignora tutto ciò che contiene, comprese le cartelle delle immagini, così le richieste non sono mai versionate; Trama lo scrive insieme alla prima richiesta.
- Quali richieste sono state inviate non sta nel file né sotto `.trama/`: l'estensione tiene l'elenco degli ID inviati nel proprio stato per l'area di lavoro, che sopravvive ai riavvii dell'editor. Un ID il cui file non esiste più è tolto dall'elenco. Un file in `requests/` il cui ID non è nell'elenco è una richiesta in Writing.
- Quali richieste sono di setup non sta nel file: l'estensione tiene, accanto all'elenco degli inviati, l'elenco degli ID delle richieste aperte da Start from Scratch, nello stesso stato per l'area di lavoro. Un ID esce dall'elenco quando l'estensione vede sparire il suo file. Una richiesta il cui ID non è nell'elenco è una richiesta di design.

## drift-resolution

- I lavori (Run, scan, risoluzioni) mantengono lo stato in memoria, per finestra: identità del lavoro, terminale o conversazione e Drift raccolto per una risoluzione. Non si scrive questo stato sotto `.trama/` né in `workspaceState`, e nessuna finestra conosce i lavori delle altre.
- Che una Proposal di risoluzione aspetti una decisione non è tenuto in memoria: si calcola dalle Proposal con `kind: resolution` e `status` `draft` o `open`.

## question-round

- The request is a JSON object containing `questions` in presentation order. Each question contains a unique non-empty `id`, non-empty `question`, `options` containing `{label, description}`, a zero-based `recommended` option index and a `multi` boolean.
- Una domanda può avere anche `context`, una stringa Markdown con lo sfondo della decisione; un'opzione può avere anche `details`, una stringa Markdown con la spiegazione estesa (per esempio pro e contro). Entrambi sono facoltativi: assenti, la domanda e l'opzione si mostrano senza. Le richieste senza questi campi restano valide come prima.
- A completed round contains one answer per question ID. Each answer identifies whether it was answered or skipped, preserves the original labels of selected options and holds free text when supplied. Ogni risposta, a scelta singola o multipla, può avere opzioni scelte e testo libero insieme, oppure solo il testo; skips contain no fabricated answer. La forma del risultato non cambia.
- Initial editor unavailability is a distinct result, not an empty completed round or a collection of skipped answers. Editor loss after admission is a distinct interruption error, identified as `editor-interrupted`, with a message and no answers; it must not be represented as initial editor unavailability. Invalid input is a distinct error with the offending question or field identified.
- Pending questions, navigation position, choices and free answers remain in memory only for the lifetime of their round. Do not write them to `.trama/`, the Board or discovery files.
- Per ogni domanda il round tiene in memoria la risposta confermata (o il salto) e, separatamente, quello che è scelto o scritto senza conferma; tiene anche se la domanda corrente è stata aperta dal riepilogo, se il riepilogo è mostrato e se l'overlay è ridotto. Solo la risposta confermata e i salti arrivano all'agente.
- Editor-discovery records contain the project identity, window identity, local endpoint and focus recency needed to route requests. Store them outside the repository in user-local runtime storage, never in project-versioned files.
- Ogni record contiene anche il segreto della finestra: casuale, prodotto da un generatore crittografico, nuovo a ogni avvio della finestra, mai scritto sotto `.trama/`, nei log o nelle variabili d'ambiente dei terminali. La riga di comando lo legge dal record dell'endpoint che usa, anche quando l'endpoint arriva da `TRAMA_QUESTION_ENDPOINT`. Su Windows la cartella dei record è `%LOCALAPPDATA%\Trama\questions`; su Linux e macOS resta quella di oggi.
