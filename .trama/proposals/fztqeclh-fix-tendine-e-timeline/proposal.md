---
status: approved
base:
  requirements/ui/general.md: ae5dc565e37a76a051d2fb325c2999f70ca838028bfaf5c330eb3f66fe4c537e
  requirements/ui/handoff.md: 56b076e0626e8905917610a9d283cf73f109e396d5fcf4b3bff18f9dd96f9648
  requirements/ui/timeline.md: 1b63884855c6f091b06fdd9314c0f7ca73e4fe26b48065b1013a35fab38267f5
  requirements/rules/handoff.md: 750dc6e021dc6275804ddda726fd707e90b60f5dfc90f5f5ec14436ec2b52b8f
  requirements/cli/handoff.md: 048a92066230d5d9502d92f10be817fdf5746aec4c9358b4920bd1ac90d8b10f
delete: []
created: 2026-10-27T06:02:00.455Z
label: Team fixes
---
# Fix tendine e Timeline

Tre difetti della vista Team, visibili anche negli screenshot della guida (`team-handoff-preview`, `team-timeline`).

Decisioni:
- Una tendina chiusa le cui voci hanno avatar o icona mostra il valore scelto in riga, come nella lista: iniziali o calendario a sinistra, testo accanto, centrati in verticale, con i puntini se il testo non ci sta. Oggi avatar/icona finiscono sopra il testo, tagliati dal bordo.
- La correzione vale per tutto il pannello: si corregge il componente `Select` condiviso.
- Nella preview di una issue il campo stima del GitHub Project non compare più come campo a sé: Trama lo riempie già con `Estimate (days)`, e oggi compare una seconda volta, vuoto. Per lo stesso motivo l'agente non propone un valore a parte per quel campo.
- Un blocco della Timeline mostra sempre `#<n>` e `<d> d`; il titolo compare con i puntini solo nello spazio che avanza. Il blocco è largo almeno quanto `#<n> · <d> d`.
- Dopo le correzioni si rigenerano solo gli screenshot `team-handoff-preview` e `team-timeline`.

Fuori da questa Proposal: i dati del finto GitHub degli screenshot (issue #12–#15 con titoli e stime diversi da quelli pubblicati da Trama), non scelti dal developer.

Assunzioni dell'agente da verificare:
- Il carico `1 / 5 d` senza blocchi nella Timeline non è un difetto: il carico conta tutti gli elementi aperti del Project, i blocchi solo le issue di Trama (`rules#issue/Published`).
