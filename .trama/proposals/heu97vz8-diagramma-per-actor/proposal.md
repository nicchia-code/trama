---
status: approved
base:
  editor-panel/diagram.md: cf7ad4e885ce30df5109e006c5b17d570637741df4c4f7889a0496340187c93b
  actors/developer.md: cc78569039f0b960dd9c622a4cb4fd4f66ef306f332f111f16d15b267f1b808e
  requirements/rules/focus.md: 2f1dcc793a0bc5af49d7c6c09f1b21280db518b6dc92a17a9438293c6760a00a
  requirements/ui/panel.md: ea175f824a665a60aca05d5275be52c23b68c335c42b563b08046fe71182137e
  requirements/ui/diagram.md: new
delete: []
request: 2026-10-21T06-07-37
created: 2026-10-21T04:19:23.089Z
label: Diagramma per Actor
---
# Diagramma per Actor

Il livello del Sistema del Diagramma disegna insieme tutti gli Actor e tutte le Feature con gli Eventi fra loro, e diventa caotico. La radice diventa un passaggio intermedio in cui il developer sceglie un Actor e vede il suo diagramma. Cambia solo ciò che vede il developer nel pannello: riga di comando, skill di Trama e comportamento dell'agente restano uguali; Modello e Requisiti del Diagramma si aggiornano perché descrivono l'interfaccia.

## Decisioni
- La radice (livello del Sistema) mostra, nell'ordine: la voce `Whole System`, gli Actor nell'ordine del Modello, le Feature che nessun Actor raggiunge; nodi sul canvas del Diagramma, a griglia, senza frecce.
- `Whole System` apre il livello del Sistema di oggi, identico: grafico, Drift (anche quelli senza elemento), Scan del Sistema e dettagli.
- Il diagramma di un Actor disegna l'Actor, le Feature che ricevono i suoi Eventi con le frecce da lui, e le frecce degli Eventi fra quelle Feature.
- Si apre come oggi: un clic seleziona e mostra i dettagli, doppio clic o maniglia ↗ aprono.
- Un Actor nella radice ha il sottotitolo `N features`; un Actor i cui Eventi non arrivano a nessuna Machine è attenuato (bordo tratteggiato, testo secondario), dice `No events received`, non ha ↗ e non si apre, ma si seleziona.
- Una Feature aperta dal diagramma di un Actor o da `Whole System` è intera, come oggi; il breadcrumb diventa `System › <actor> › <feature> › …` o `System › Whole System › <feature> › …`. Aperta da un link resta `System › <feature> › …`.
- Link, chip, View on diagram e passi del focus: un Actor o un suo Evento aprono il diagramma dell'Actor; una Feature apre il proprio livello, con le sue Machine come elementi del focus; un Actor che non si apre porta alla radice, selezionato. Passi: la radice, poi un passo per Actor nell'ordine del Modello, poi le Feature con le loro Machine.
- Drift: quelli senza elemento galleggiano sulla radice (e su `Whole System`); quelli su un Actor si agganciano all'Actor nella radice e nel suo diagramma; quelli su una Feature alla Feature in ogni diagramma di Actor in cui compare.
- Se l'Actor mostrato sparisce o non riceve più Eventi (Modello cambiato o altra Proposal disegnata) il Diagramma torna alla radice; se sparisce l'Actor da cui si è aperta una Feature che resta, il livello resta e l'Actor esce dal breadcrumb.
- Scan nel diagramma di un Actor e in `Whole System` scansiona tutto il Sistema, con `· N`, come alla radice.
- Pannello dei dettagli senza selezione: alla radice come oggi (descrizione del Sistema ed elenco delle Feature); nel diagramma di un Actor la sua descrizione e i suoi Eventi.
- Con una Proposal disegnata, Actor e Feature della radice prendono i colori del cambiamento; un Actor tolto resta visibile come tolto.

## Assunzioni
- Con il Modello vuoto la radice mostra il testo e i pulsanti di oggi (`requirements/ui#panel/Diagram`), senza voce `Whole System`.
- Il diagramma di un Actor usa la stessa disposizione del livello del Sistema di oggi (Actor nel primo strato, frecce con il numero di Eventi).
