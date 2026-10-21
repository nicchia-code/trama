---
description: "Usa quando costruisci o cambi i livelli del Diagramma: la radice, Whole System, il livello di un Actor e il breadcrumb."
---
# Livelli del Diagramma

## diagram
- Il breadcrumb di una Feature aperta dal livello di un Actor è `System › <actor> › <feature> › …`; aperta da Whole System è `System › Whole System › <feature> › …`; aperta da un link è `System › <feature> › …`. Il segmento dell'Actor o di Whole System resta anche ai livelli di Machine e di Stato sotto quella Feature, ed è cliccabile come gli altri.
- Il nome di un passo del focus su un livello di Actor è il suo breadcrumb, `System › <actor>`.

## diagram/System level
- La radice disegna, sul canvas del Diagramma, solo nodi senza frecce, disposti a griglia in quest'ordine: il nodo `Whole System`, gli Actor nell'ordine del Modello, le Feature che nessun Actor raggiunge nel loro ordine.
- Un clic seleziona un nodo e ne mostra i dettagli; doppio clic o la maniglia ↗ aprono il livello, come per Feature, Machine e Stati.
- Il sottotitolo di un Actor è `N features` (`1 feature` al singolare): quante Feature ricevono i suoi Eventi. Un Actor i cui Eventi non arrivano a nessuna Machine ha il sottotitolo `No events received`, il bordo tratteggiato e il testo nel colore secondario, nessuna maniglia ↗; si seleziona, e il doppio clic non fa nulla.
- Una Feature nella radice ha lo stesso aspetto e lo stesso sottotitolo `N machines` del livello Whole System.
- I Drift senza elemento galleggiano sulla radice; un Drift su un Actor si aggancia al suo nodo nella radice.
- Con una Proposal disegnata, Actor e Feature della radice prendono i colori del cambiamento come gli altri nodi del Diagramma; un Actor tolto resta visibile come tolto.
- Senza selezione, i dettagli mostrano la descrizione del Sistema e l'elenco delle Feature.
- Con il Modello vuoto la radice mostra il testo e i pulsanti di `panel/Diagram`, senza il nodo `Whole System`.

## diagram/Whole System level
- Disegna lo stesso grafico che prima disegnava il livello del Sistema: tutti gli Actor, tutte le Feature, le frecce con il numero di Eventi, i Drift agganciati e quelli senza elemento, e senza selezione gli stessi dettagli della radice.

## diagram/Actor level
- Disegna l'Actor, le Feature che ricevono i suoi Eventi con le frecce da lui, e le frecce degli Eventi fra quelle Feature, con la stessa disposizione e le stesse etichette del livello Whole System.
- Un Drift su un Actor si aggancia al suo nodo; un Drift su una Feature si aggancia alla Feature in ogni livello di Actor in cui compare.
- Senza selezione, i dettagli mostrano la descrizione dell'Actor e i suoi Eventi, come quando lo si seleziona.
