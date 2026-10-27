---
refs:
  - website
  - requirements/ui#website
  - requirements/tech#website
  - specs#frameworks
---
# Screenshot annotati

Le pagine della guida mostrano gli screenshot della finestra di VS Code con frecce, cerchi e note che sembrano disegnati a mano, stile Excalidraw.

Quando il Task è finito:
- Esistono un componente Astro per un passaggio (numero in un cerchio, titolo breve, una o due frasi, screenshot annotato sotto, largo quanto la colonna del testo) e uno per uno screenshot annotato, nominato dalla sua scena, usabili dalle pagine Markdown della guida.
- Ogni scena ha le immagini `site/public/screenshots/<scene>.light.png` e `.dark.png` e il file `site/src/content/screenshots/<scene>.json` con i segni (freccia, ellisse, rettangolo, sottolineatura) in punti percentuali dell'immagine e le note con testo, posizione e segno a cui appartengono; un solo file serve entrambi i temi.
- I segni sono generati al build con Rough.js in SVG inline sopra l'immagine, con un seme fisso per scena: tratti irregolari a mano libera, frecce leggermente curve, che partono dalla nota e finiscono accanto a ciò che indicano, mai sopra. La pagina non carica Rough.js. Le note sono testo HTML in Excalifont (file `woff2` servito dal sito in `site/public/fonts/` con la licenza OFL accanto), al massimo una riga e mezza, mai sopra ciò che lo screenshot deve mostrare, con uno sfondo tenue del colore della pagina dove lo screenshot dietro è affollato.
- Segni e note usano un colore d'accento per tema: rosso caldo nel tema chiaro, giallo caldo nel tema scuro, con contrasto WCAG 2.1 AA anche per le note.
- Lo screenshot mostrato è quello del tema corrente del sito; cambiare tema scambia subito tutti gli screenshot lasciando i segni al loro posto.
- Quando uno screenshot entra la prima volta nello schermo, i suoi segni si tracciano uno dopo l'altro come con una penna (CSS su `stroke-dasharray`/`stroke-dashoffset`, avviato da un `IntersectionObserver`) e le note compaiono subito dopo la loro freccia, in circa un secondo, una sola volta. Con `prefers-reduced-motion: reduce` segni e note sono già disegnati.
- Clic o Invio su uno screenshot lo apre ingrandito in un `<dialog>` nativo sopra la pagina oscurata, con segni e note scalati; Esc, clic fuori o × lo chiudono e il fuoco torna allo screenshot. Puntatore e anello di fuoco mostrano che si può ingrandire.
- Su finestre strette screenshot, segni e note si rimpiccioliscono con la colonna; sotto la larghezza in cui le note diventano difficili da leggere le note passano in un elenco numerato sotto lo screenshot e i segni mostrano i numeri.
- Ogni screenshot ha un `alt` che dice cosa mostra e le note si leggono in ordine dopo l'`alt`. Le immagini sotto il primo schermo si caricano in lazy loading e dichiarano le dimensioni.
- Il build del sito fallisce se una pagina nomina una scena senza le due immagini o senza il file di annotazioni, o se un file di annotazioni ha un punto fuori dall'immagine.
- Le Specs riportano Rough.js come scritto nella Proposal.
