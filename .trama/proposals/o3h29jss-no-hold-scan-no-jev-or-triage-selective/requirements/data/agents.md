---
description: "Usa quando tocchi i dati di richieste di design, risoluzione dei Drift e round di domande."
---
# Dati del lavoro dell'agente

## design-request
- Un file `requests/<id>.md` sotto `.trama/`, creato vuoto da Design…, quindi anche in Writing. L'ID è la data e l'ora locali di creazione con i secondi, nella forma `AAAA-MM-GGTHH-MM-SS` (per esempio `2026-10-04T19-05-12`); se quel file esiste già, l'ID prende il suffisso `-2`, `-3`, … fino al primo libero. Il file contiene solo il testo Markdown del developer, senza front matter; può non avere un titolo.
- La cartella ha un suo `.gitignore` che ignora tutto ciò che contiene, così le richieste non sono mai versionate; Trama lo scrive insieme alla prima richiesta.
- Quali richieste sono state inviate non sta nel file né sotto `.trama/`: l'estensione tiene l'elenco degli ID inviati nel proprio stato per l'area di lavoro, che sopravvive ai riavvii dell'editor. Un ID il cui file non esiste più è tolto dall'elenco. Un file in `requests/` il cui ID non è nell'elenco è una richiesta in Writing.

## drift-resolution
- Lo State di Drift resolution sta solo nella memoria dell'host dell'estensione, per finestra: quali Run e quale Resolve Drifts lanciati da quella finestra non sono finiti, ciascuno con il terminale (la sua identità) o la conversazione della chat in cui gira. Non è scritto sotto `.trama/` né nello stato dell'area di lavoro, e riaprire l'editor lo azzera.
- Che una Proposal di risoluzione aspetti una decisione non è tenuto in memoria: si calcola dalle Proposal con `kind: resolution` e `status` `draft` o `open`.

## question-round
- The request is a JSON object containing `questions` in presentation order. Each question contains a unique non-empty `id`, non-empty `question`, `options` containing `{label, description}`, a zero-based `recommended` option index and a `multi` boolean.
- Una domanda può avere anche `context`, una stringa Markdown con lo sfondo della decisione; un'opzione può avere anche `details`, una stringa Markdown con la spiegazione estesa (per esempio pro e contro). Entrambi sono facoltativi: assenti, la domanda e l'opzione si mostrano senza. Le richieste senza questi campi restano valide come prima.
- A completed round contains one answer per question ID. Each answer identifies whether it was answered or skipped, preserves the original labels of selected options and holds free text when supplied. Ogni risposta, a scelta singola o multipla, può avere opzioni scelte e testo libero insieme, oppure solo il testo; skips contain no fabricated answer. La forma del risultato non cambia.
- Initial editor unavailability is a distinct result, not an empty completed round or a collection of skipped answers. Editor loss after admission is a distinct interruption error, identified as `editor-interrupted`, with a message and no answers; it must not be represented as initial editor unavailability. Invalid input is a distinct error with the offending question or field identified.
- Pending questions, navigation position, choices and free answers remain in memory only for the lifetime of their round. Do not write them to `.trama/`, the Board or discovery files.
- Per ogni domanda il round tiene in memoria la risposta confermata (o il salto) e, separatamente, quello che è scelto o scritto senza conferma; tiene anche se la domanda corrente è stata aperta dal riepilogo, se il riepilogo è mostrato e se l'overlay è ridotto. Solo la risposta confermata e i salti arrivano all'agente.
- Editor-discovery records contain the project identity, window identity, local endpoint and focus recency needed to route requests. Store them outside the repository in user-local runtime storage, never in project-versioned files.

