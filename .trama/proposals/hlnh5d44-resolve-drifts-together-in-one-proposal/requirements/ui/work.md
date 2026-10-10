---
description: "Usa quando mostri Drift, Task, Proposal di risoluzione e il pulsante Resolve Drifts."
---
# Interfaccia di Drift e Task

## drift
- I dettagli di un Drift nel Diagramma e la sua scheda nella colonna To decide della Board mostrano solo il titolo e i due lati, in due colonne. The left one is headed "What happens" and holds the Drift's What happens text; the right one is headed "What should happen", with the word "Model" or "Requirements" beside the heading (Requirements when the Drift points only to Requirements), and holds the What should happen text. Both texts are rendered as Markdown. The two sides are told apart by their headings, not by colour alone.
- Né la scheda né i dettagli hanno pulsanti per decidere sul Drift (niente `Keep this`, Fix code, Accept Proposal o Dismiss), il gruppo Fix options, il campo della nota, il riquadro della Proposal allegata o il blocco Where in the code. Nel pannello si decide sui Drift solo con Resolve Drifts (vedi `drift-resolution`).
- The columns sit side by side and stack, what happens first, when the panel is narrow. The Board card keeps its link to the Diagram or to the Requirement.
- Il ghost di un Drift la cui Draft esiste già ha la riga di fase `Writing the Proposal` al posto di `Preparing`, e il nome accessibile la ripete. Non c'è nessun ghost di Proposal per quella Draft.
- `trama drift show` shows the two sides as two blocks headed "What happens" and "What should happen", then a block headed "Fix options" with the options as a numbered list, each with its title and its text, the first marked "(recommended)", then, when the Drift has one, a block headed "Where in the code", then the attached Proposal with its state and, when it cannot be approved, the reason. A Drift without options has no Fix options block. A Drift resolved by fixing the code also shows a block headed "Chosen option" with the number and title of the option, when there was one, and a block headed "Note" when the developer gave one. The texts are printed as the Markdown they were written in. A resolved Drift written before the two sections existed shows its body as one block headed "Description". Quando il Drift sta in una Proposal di risoluzione da decidere, l'uscita ha anche la riga `In resolution Proposal <id> <titolo>`; un Drift risolto da una risoluzione ha la riga `Resolved by Proposal <id>`.

## drift-resolution
- Il pulsante `Resolve Drifts` sta nella barra della Board, subito dopo `Run all To do`.
- Quando non si può usare il pulsante resta visibile, appare disabilitato ed è segnato come disabilitato per le tecnologie assistive; il motivo è nel tooltip e nella descrizione accessibile, come per `Run all To do`. I motivi, in quest'ordine quando ne valgono più d'uno: `Drifts are being resolved` (l'agente di Resolve Drifts lavora), `A run is in progress` (un Run lanciato da Trama non è finito), `Proposal <id> resolving Drifts awaits a decision` (una Proposal di risoluzione è ancora in scrittura o aperta; la più vecchia), `No open Drifts`.
- Mentre l'agente di Resolve Drifts lavora, `Run all To do`, `Run this design` e il `Run` di ogni Task appaiono disabilitati allo stesso modo, con il motivo `Drifts are being resolved`; quando vale anche un altro motivo di quei pulsanti, il tooltip dà questo.
- Il ghost della Proposal che Trama annuncia lanciando Resolve Drifts sta in To decide come quello di un design, con il titolo `Resolve Drifts` finché non c'è la Draft, poi con il titolo della Draft; mentre il round di domande è aperto la sua riga di fase è `Waiting for your answers`.

## proposal
- Una Proposal allegata a un Drift aperto non ha una scheda in To decide e non entra nel numero della colonna né in quello della scheda Board. Una Proposal ancora aperta di un Drift già risolto ha la sua scheda come le altre.
- Una Proposal allegata a un Drift aperto non compare nel selettore della Proposal disegnata, né nel Diagramma né nella scheda Requirements, e nessuna parte del pannello la mostra.
- La scheda di una Proposal di risoluzione, e i suoi dettagli nel Diagramma, hanno sotto l'elenco dei file un blocco con l'intestazione `Resolves Drifts`: una riga per Drift, nell'ordine di creazione dei Drift, con il numero breve, il titolo e ciò che succede approvandola: `Model updated to match the code`, `Closed, nothing changes`, oppure `Code fixed with option <titolo dell'opzione>`, con ` · note` in fondo quando c'è una nota. Un Drift già risolto in altro modo ha la riga con `(already resolved)` al posto della decisione. Il blocco è un elenco con il nome accessibile `Drifts resolved by <titolo della Proposal>`; ogni riga porta a quel Drift nel Diagramma.
- `trama proposal show` di una risoluzione ha lo stesso blocco `Resolves Drifts`, con l'identità del Drift, il titolo e la decisione, e per una correzione anche il testo della nota; `trama proposal list` e `trama board` la segnano `(resolves N Drifts)`.
- `trama board` elenca una Proposal allegata a un Drift aperto rientrata sotto la riga del suo Drift, con il suo numero, il titolo e `(draft)` se è ancora in scrittura, e non fra le Proposal da decidere né nel gruppo `In writing`. `trama proposal list` la segna `(attached to <id del Drift>)`, e `trama proposal show` ha la riga `Attached to Drift <id> <titolo>`.
- `trama proposal approve` e `trama proposal reject` di una Proposal allegata a un Drift aperto sono rifiutati con `Proposal <id> is attached to Drift <id>: decide on the Drift with trama drift resolve`, e non cambiano nulla.

## task
- `trama board` lists Proposals the agent is still writing in their own group, "In writing", marked "(draft)", apart from the Proposals to decide, and `trama proposal list` marks them "(draft)".
- `trama board` lists each design once, in its derived column, with the Proposal's ID and title and its Tasks underneath, each with its own column. Tasks that belong to no design, and designs of a single Task, are listed as before.
- `trama task list` stays a flat list grouped by column, so every Task can still be found; each Task shows the ID of the Proposal it comes from when it has one.
- A Task taken by the agent is marked "(agent working)" in `trama board` and `trama task list`.
- A blocked Task is marked "(blocked by Drift <id>)", or "(waiting for Task <id>)" when it waits for the Task that fixes its Drift, in `trama board`, `trama task list` and `trama task show`. When several Drifts block it, all are listed.
- A Drift's own view (`trama drift show`) does not list the Tasks it blocks.
