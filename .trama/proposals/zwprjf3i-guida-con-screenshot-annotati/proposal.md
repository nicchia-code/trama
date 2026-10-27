---
status: approved
base:
  system.md: 4d2b0a5ebd1953268384b9e5d7c371785863f4a32ce8632d3f05f5a4c8acc47f
  website/feature.md: f6093922d88ee294085f8e06f1003a2f9c4199d7d2a41e08e0bc4ab29e1fac8b
  requirements/ui/website.md: b5265fbde89e02a0db5a62e03bab73a58d28d854072a81800d2b0693288a32a4
  requirements/tech/website.md: 9010c30c82652c0e77958effc49a4db727ff522c1e35536ac028bbf95b4a5dd9
  requirements/quality/website.md: 3c9c248c90b6e30c000a13c9ec5802c6175a6da92a2982a5e6cbc72807e207dc
  requirements/docs/website.md: 9d9a899a6ac9e029aebbf564e6ae8cc1a25b1cbf7dffaa1aa56053178a89578d
  requirements/docs/readme.md: a1d150764f8a0ef4dc45616a68ff97e4f03521217cf6cfd0e5945b5e619a0802
  specs.yaml: cc737284ec870ed12df45cc8c1640c4318bfcc0b47122866e1c974a73a022aa5
  website/demo.md: 339b88f1e778e5165b599834afecc3de410249b61fc2b8dfaecbf2c6a116d114
  website/tour.md: 6f75082ae3e026d1399f2bd8e50d60667545998d0f60291151fe696f10fe1fb3
  website/scripted-agent.md: 77d5b23a970f7eb6a2fae8774de37de099f0722efd9697600077ade2a55199a2
  actors/visitor.md: 212e78f789b5bc07d5b753b61f77915be7698c7126851faabf42c98f469cb7e2
delete:
  - website/demo.md
  - website/tour.md
  - website/scripted-agent.md
  - actors/visitor.md
created: 2026-10-26T21:34:12.385Z
label: website
---
# Guida con screenshot annotati

La demo interattiva del sito non convince: viene tolta, e la guida diventa una guida tradizionale a passaggi, illustrata con screenshot della vera finestra di VS Code annotati con frecce e note che sembrano disegnate a mano, stile Excalidraw. Il resto del sito (landing, struttura della guida, pubblicazione) resta.

Decisioni:
- Via la pagina Demo, il tour, l'agente a copioni, il video per schermi piccoli e l'anteprima della landing; via l'Actor visitor, che serviva solo alla demo.
- Landing: l'hero mostra la GIF `demo.gif` già usata dal README; il secondo invito diventa Read the guide.
- Le pagine di Getting started e Workflows diventano passaggi numerati: numero, titolo breve, una o due frasi, screenshot annotato. Concepts e Panel & settings restano testo con qualche screenshot.
- Frecce, cerchi e note sono disegnati dal sito sopra lo screenshot con l'aspetto a mano libera di rough.js, da un file di annotazioni per screenshot; le note sono testo vero in un carattere scritto a mano (Excalifont), servito dal sito.
- Frecce e note si disegnano una volta quando lo screenshot entra nello schermo; ferme con movimento ridotto.
- Clic su uno screenshot: si apre ingrandito, Esc o clic fuori lo chiude.
- Tutto automatizzato: uno script avvia la vera VS Code con l'estensione (Playwright sul processo Electron), prepara ogni stato di `examples/shop` con i comandi `trama` e fotografa la finestra; omp Chat mostra una conversazione registrata.
- Ogni screenshot esiste in chiaro e in scuro, e la guida mostra quello del tema del sito.
- Lo script si lancia a mano quando l'interfaccia cambia e le immagini si committano; il deploy non le rigenera.
- `examples/shop`, arricchito per la demo, resta come progetto degli screenshot.
- I README linkano la guida e non più la demo.

Assunzioni dell'agente da verificare:
- Le annotazioni sono generate in SVG al build con un seme fisso di rough.js, così i tratti non cambiano da un build all'altro e la pagina non carica rough.js.
- Nella finestra di VS Code fotografata, un `omp` sostitutivo messo per primo nel PATH risponde ai controlli di versione e login e, come `omp acp`, riproduce la conversazione registrata.
- VS Code è scaricata dallo script in una versione fissata, con un profilo utente vuoto e una finestra di 1440×900, così gli screenshot non dipendono dalla VS Code del developer.
- Rimuovere la demo toglie anche gli attributi `data-tour` dalle viste dell'estensione e le dipendenze memfs e `@noble/hashes`.
- Colore d'accento di frecce e note: rosso caldo nel tema chiaro, giallo caldo nel tema scuro.
- Su finestre strette le note passano in un elenco numerato sotto lo screenshot e i segni mostrano i numeri.
- Il build del sito fallisce se una pagina usa uno screenshot senza immagini o annotazioni, o con annotazioni fuori dall'immagine.
- Il workflow di Pages parte anche quando cambiano `docs/images/` o `extension/package.json` (pagina delle impostazioni), non più per le viste dell'estensione.
