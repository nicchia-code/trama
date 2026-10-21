---
column: done
technical: false
refs:
  - diagram
  - developer.OPEN_SYSTEM_LEVEL
  - developer.OPEN_WHOLE_SYSTEM_LEVEL
  - developer.OPEN_ACTOR_LEVEL
  - developer.OPEN_FEATURE_LEVEL
  - requirements/ui#diagram
  - requirements/ui#diagram/System level
  - requirements/ui#diagram/Whole System level
  - requirements/ui#diagram/Actor level
drift: null
proposal: heu97vz8
agent: false
created: 2026-10-21T04:22:23.664Z
finished: 2026-10-21T04:28:21.577Z
---
# Radice e livelli per Actor

Il Diagramma parte dalla radice, il livello del Sistema, che sul canvas disegna senza frecce, a griglia: il nodo `Whole System`, gli Actor nell'ordine del Modello e le Feature che nessun Actor raggiunge. Un clic seleziona e mostra i dettagli; doppio clic o ↗ aprono.

- Aprire `Whole System` (`developer.OPEN_WHOLE_SYSTEM_LEVEL`) mostra il grafico che prima era il livello del Sistema, identico: tutti gli Actor e le Feature, le frecce, i Drift agganciati e quelli senza elemento, gli stessi dettagli.
- Aprire un Actor (`developer.OPEN_ACTOR_LEVEL`) è possibile solo se i suoi Eventi arrivano ad almeno una Machine: il suo livello disegna l'Actor, le Feature che ricevono i suoi Eventi con le frecce da lui e le frecce degli Eventi fra quelle Feature, con la disposizione di Whole System. Senza selezione i dettagli mostrano la descrizione dell'Actor e i suoi Eventi. Un Actor che non si apre è attenuato (bordo tratteggiato, testo secondario), dice `No events received`, non ha ↗ e il doppio clic non fa nulla; gli altri Actor dicono `N features`.
- Una Feature nella radice si apre al suo livello (`developer.OPEN_FEATURE_LEVEL`). Una Feature aperta dal livello di un Actor o da Whole System ricorda l'origine: il breadcrumb è `System › <actor> › <feature> › …` o `System › Whole System › <feature> › …`, anche ai livelli di Machine e di Stato, e il segmento riporta lì (`developer.OPEN_ACTOR_LEVEL`, `developer.OPEN_WHOLE_SYSTEM_LEVEL`). Aperta da un link resta `System › <feature> › …`.
- Un link a un Actor o a un suo Evento apre il livello di quell'Actor e lo seleziona; se l'Actor non si apre, apre la radice (`developer.OPEN_SYSTEM_LEVEL`) con l'Actor selezionato. Un link a una Feature apre il suo livello.
- Drift: quelli senza elemento galleggiano sulla radice e su Whole System; quelli su un Actor si agganciano all'Actor nella radice e nel suo livello; quelli su una Feature alla Feature in ogni livello di Actor in cui compare.
- Con una Proposal disegnata, Actor e Feature della radice prendono i colori del cambiamento; un Actor tolto resta visibile come tolto.
- Ripieghi: al livello di un Actor, `workspace.MODEL_CHANGED` o `developer.CHOOSE_DRAWN_PROPOSAL` (solo con il selettore del Diagramma) riportano alla radice se l'Actor non esiste più o i suoi Eventi non arrivano più a nessuna Machine nel Modello disegnato. Se sparisce, o non si apre più, l'Actor da cui si è aperta una Feature che resta, il livello resta e l'Actor esce dal breadcrumb. I ripieghi di Feature, Machine e Stato restano quelli di oggi.
- Il nome di un passo del focus su un livello di Actor è `System › <actor>`.
- Con il Modello vuoto la radice mostra il testo e i pulsanti di oggi, senza `Whole System`.
