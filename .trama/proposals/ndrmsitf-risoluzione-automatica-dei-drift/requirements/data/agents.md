---
description: "Usa quando tocchi i dati di richieste di design, risoluzione dei Drift e round di domande."
---
# Dati del lavoro dell'agente

## design-request
- Un file `requests/<id>.md` sotto `.trama/`, creato vuoto da Design…, quindi anche in Writing. L'ID è la data e l'ora locali di creazione con i secondi, nella forma `AAAA-MM-GGTHH-MM-SS` (per esempio `2026-10-04T19-05-12`); se quel file esiste già, l'ID prende il suffisso `-2`, `-3`, … fino al primo libero. Il file contiene solo il testo Markdown del developer, senza front matter; può non avere un titolo.
- La cartella ha un suo `.gitignore` che ignora tutto ciò che contiene, così le richieste non sono mai versionate; Trama lo scrive insieme alla prima richiesta.
- Quali richieste sono state inviate non sta nel file né sotto `.trama/`: l'estensione tiene l'elenco degli ID inviati nel proprio stato per l'area di lavoro, che sopravvive ai riavvii dell'editor. Un ID il cui file non esiste più è tolto dall'elenco. Un file in `requests/` il cui ID non è nell'elenco è una richiesta in Writing.

## drift-resolution
- In `disabled`, i lavori mantengono lo stato per finestra. Con autopilota attivo, un solo host coordina il progetto identificato dal percorso canonico: conserva in memoria tutti i Run, scan e risoluzioni lanciati dalle sue finestre, con identità del lavoro, finestra, terminale o conversazione, origine manuale o automatica e risultato del controllo. Le finestre inoltrano avvio, consegna riuscita e fine al coordinatore; non si scrive questo stato sotto `.trama/` né in `workspaceState`.
- Che una Proposal di risoluzione aspetti una decisione non è tenuto in memoria: si calcola dalle Proposal con `kind: resolution` e `status` `draft` o `open`.
- Il coordinatore conserva in memoria la raccolta fotografata, la sua Proposal, i Task autorizzati, le origini ancora da completare, i casi falliti/esclusi con il motivo e l'eventuale prosecuzione automatica chiesta dopo un gruppo manuale. Uno scan automatico successivo non cancella i casi falliti; richiesta esplicita, modifica del Drift o scan avviato dal developer li rendono rivalutabili.
- La scoperta del coordinatore usa il registro locale degli editor: un record transitorio esterno al repository contiene identità canonica del progetto, finestra responsabile ed endpoint locale. L'acquisizione del ruolo è esclusiva; il lavoro resta in memoria, non nel record. Non si aggiungono file versionati o un servizio esterno.
- All'apertura o alla perdita del coordinatore non si ricostruisce una corsa dai soli file: l'automatismo resta in attesa di uno scan riuscito o Resolve Drifts. Le finestre ancora vive ridichiarano i lavori propri già in corso prima di consentire una nuova raccolta, così il cambio di responsabile non dimentica uno scan o un Run attivo.

## question-round
- The request is a JSON object containing `questions` in presentation order. Each question contains a unique non-empty `id`, non-empty `question`, `options` containing `{label, description}`, a zero-based `recommended` option index and a `multi` boolean.
- Una domanda può avere anche `context`, una stringa Markdown con lo sfondo della decisione; un'opzione può avere anche `details`, una stringa Markdown con la spiegazione estesa (per esempio pro e contro). Entrambi sono facoltativi: assenti, la domanda e l'opzione si mostrano senza. Le richieste senza questi campi restano valide come prima.
- A completed round contains one answer per question ID. Each answer identifies whether it was answered or skipped, preserves the original labels of selected options and holds free text when supplied. Ogni risposta, a scelta singola o multipla, può avere opzioni scelte e testo libero insieme, oppure solo il testo; skips contain no fabricated answer. La forma del risultato non cambia.
- Initial editor unavailability is a distinct result, not an empty completed round or a collection of skipped answers. Editor loss after admission is a distinct interruption error, identified as `editor-interrupted`, with a message and no answers; it must not be represented as initial editor unavailability. Invalid input is a distinct error with the offending question or field identified.
- Pending questions, navigation position, choices and free answers remain in memory only for the lifetime of their round. Do not write them to `.trama/`, the Board or discovery files.
- Per ogni domanda il round tiene in memoria la risposta confermata (o il salto) e, separatamente, quello che è scelto o scritto senza conferma; tiene anche se la domanda corrente è stata aperta dal riepilogo, se il riepilogo è mostrato e se l'overlay è ridotto. Solo la risposta confermata e i salti arrivano all'agente.
- Editor-discovery records contain the project identity, window identity, local endpoint and focus recency needed to route requests. Store them outside the repository in user-local runtime storage, never in project-versioned files.

