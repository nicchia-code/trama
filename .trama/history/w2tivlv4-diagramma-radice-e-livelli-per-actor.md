---
created: 2026-10-21T04:30:19.510Z
updated: 2026-10-21T04:30:19.510Z
summary: Il Diagramma parte da una radice a griglia con Whole System, gli Actor e le Feature non raggiunte; ogni Actor ha il suo livello, i passi del focus li seguono e Scan funziona alla radice e nei nuovi livelli.
tasks:
  - 0grfjs48
  - b5c4sf0n
  - s86hdewb
---
# Diagramma: radice e livelli per Actor

Il livello del Sistema è ora la radice: disegna senza frecce il nodo `Whole System`, gli Actor nell'ordine del Modello e le Feature che nessun Actor raggiunge. `Whole System` mostra il grafico di prima, identico. Un Actor i cui Eventi arrivano ad almeno una Machine si apre al suo livello, con le Feature che li ricevono e le frecce fra loro; altrimenti è attenuato (`No events received`). Il breadcrumb ricorda l'origine di una Feature (`System › <actor> › <feature>`), i link a Actor ed Eventi aprono il livello giusto, i Drift si agganciano all'Actor o alla Feature e i ripieghi riportano alla radice. I passi del focus appartengono al livello a cui porta un link (Actor, Feature con tutte le sue Machine, Machine, Stato), mai a Whole System, e seguono l'ordine del Modello. `Scan` alla radice, a Whole System e al livello di un Actor scansiona tutto il Sistema, con `Scan · N` e disabilitato con l'Advisor Scanner.
