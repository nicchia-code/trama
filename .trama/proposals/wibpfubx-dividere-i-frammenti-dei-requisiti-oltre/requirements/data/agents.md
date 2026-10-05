---
description: "Usa quando tocchi i dati di richieste di design, worktree, multi-branch, round di domande e avvisi."
---
# Dati del lavoro dell'agente

## design-request
- Un file `requests/<id>.md` sotto `.trama/`, creato vuoto da Design…, quindi anche in Writing. L'ID è la data e l'ora locali di creazione con i secondi, nella forma `AAAA-MM-GGTHH-MM-SS` (per esempio `2026-10-04T19-05-12`); se quel file esiste già, l'ID prende il suffisso `-2`, `-3`, … fino al primo libero. Il file contiene solo il testo Markdown del developer, senza front matter; può non avere un titolo.
- La cartella ha un suo `.gitignore` che ignora tutto ciò che contiene, così le richieste non sono mai versionate; Trama lo scrive insieme alla prima richiesta.
- Quali richieste sono state inviate non sta nel file né sotto `.trama/`: l'estensione tiene l'elenco degli ID inviati nel proprio stato per l'area di lavoro, che sopravvive ai riavvii dell'editor. Un ID il cui file non esiste più è tolto dall'elenco. Un file in `requests/` il cui ID non è nell'elenco è una richiesta in Writing.

## worktree-round
- Il giro non è un file del progetto. Trama lo ricava dai worktree git il cui branch è `trama/<id di una Proposal>` o `trama/merge`, e dalle cartelle sorelle del repository.
- Il Merge Drift è un file `.trama/merge-drift.md` nel worktree di merge, con le sezioni `## What happens`, `## What should happen` e `## Fix options`, come un Drift. Non è un file `drifts/` della cartella aperta e non resta dopo l'unione.
- Il Task di riconciliazione è un file di Task nel worktree di merge con `merge: true` nel front matter, `technical: true` e `column` come gli altri Task. Non è copiato nella cartella aperta dall'unione.

## multi-branch
- Una cartella `.trama/multi-branch/`, locale a questa copia di lavoro e non versionata. Il file `state` contiene `on` oppure `off`, con al più un a capo finale. La cartella ha un suo `.gitignore` che ignora tutto ciò che contiene (il testo `*`), scritto insieme al primo `state`.
- Cartella o file assenti: l'interruttore è spento. Un file presente che, tolto al più un a capo finale, non è `on` né `off`: l'interruttore è spento e il developer è avvisato.

## question-round
- The request is a JSON object containing `questions` in presentation order. Each question contains a unique non-empty `id`, non-empty `question`, `options` containing `{label, description}`, a zero-based `recommended` option index and a `multi` boolean.
- Una domanda può avere anche `context`, una stringa Markdown con lo sfondo della decisione; un'opzione può avere anche `details`, una stringa Markdown con la spiegazione estesa (per esempio pro e contro). Entrambi sono facoltativi: assenti, la domanda e l'opzione si mostrano senza. Le richieste senza questi campi restano valide come prima.
- A completed round contains one answer per question ID. Each answer identifies whether it was answered or skipped, preserves the original labels of selected options and holds free text when supplied. Ogni risposta, a scelta singola o multipla, può avere opzioni scelte e testo libero insieme, oppure solo il testo; skips contain no fabricated answer. La forma del risultato non cambia.
- Initial editor unavailability is a distinct result, not an empty completed round or a collection of skipped answers. Editor loss after admission is a distinct interruption error, identified as `editor-interrupted`, with a message and no answers; it must not be represented as initial editor unavailability. Invalid input is a distinct error with the offending question or field identified.
- Pending questions, navigation position, choices and free answers remain in memory only for the lifetime of their round. Do not write them to `.trama/`, the Board or discovery files.
- Per ogni domanda il round tiene in memoria la risposta confermata (o il salto) e, separatamente, quello che è scelto o scritto senza conferma; tiene anche se la domanda corrente è stata aperta dal riepilogo, se il riepilogo è mostrato e se l'overlay è ridotto. Solo la risposta confermata e i salti arrivano all'agente.
- Editor-discovery records contain the project identity, window identity, local endpoint and focus recency needed to route requests. Store them outside the repository in user-local runtime storage, never in project-versioned files.

## notice
- Gli avvisi stanno solo nella memoria dell'host dell'estensione. Non sono scritti in `.trama/`, né su altri file, né mostrati sulla Board; spariscono con la finestra, e al riavvio non ne riparte nessuno.
- Un avviso ha un tipo (domanda o fine del comando), il nome del progetto (il nome della cartella del progetto), il round a cui si riferisce (domanda) oppure l'esito del comando riportato dal terminale (finito bene, finito con errore e relativo codice, oppure non riportato). Titolo, testo, priorità (da 1 a 5) e tag si compongono solo al momento dell'invio.
- Il testo di una domanda e le etichette delle sue opzioni sono quelli che l'agente ha fornito, nella sua lingua, senza traduzioni. Le risposte del developer non fanno mai parte di un avviso.
- Per ogni finestra l'host dell'estensione tiene solo in memoria un fatto: se l'avviso di errore dell'editor è già stato mostrato dopo l'ultimo invio riuscito.
