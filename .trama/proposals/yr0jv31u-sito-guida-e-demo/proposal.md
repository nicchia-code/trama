---
status: approved
base:
  system.md: 265f172afaf32a02d6ce95de3efce836b997d9dcb1ef65e73be35bb67e175eb4
  actors/visitor.md: new
  website/feature.md: new
  website/demo.md: new
  website/tour.md: new
  requirements/ui/website.md: new
  requirements/tech/website.md: new
  requirements/quality/website.md: new
  requirements/docs/readme.md: 76752a34b1b58270d0c2d44b33ef1460ad688df984274d6a5156151ae602457e
  requirements/docs/website.md: new
  specs.yaml: a0d675015c31a88395819c4bc48723d55dfe802cb4fb329fde14c173c4e9b0df
  website/scripted-agent.md: new
  requirements/docs/area.md: 43f78c308141119ce9222b0c2d7be549bbebcc5facd54d21fa308bd798e5f476
delete: []
created: 2026-10-26T18:51:01.399Z
label: website
---
# Sito guida e demo

Trama ottiene un sito su GitHub Pages in questo repository: una landing animata, una guida d'uso e una demo interattiva della finestra di VS Code con l'estensione, recitata come una presentazione guidata, funzionante in tutto tranne Manager mode e Team.

Decisioni:
- Sito in Astro senza Starlight, sorgente nella nuova cartella `site/`, solo in inglese, su `nicchia-code.github.io/trama`.
- Pubblicazione con un workflow GitHub Actions a ogni push su main che tocca sito, guida o webview.
- Landing: il ciclo in cinque passi animato allo scroll, con CSS e IntersectionObserver, senza librerie di animazione.
- Guida: Getting started, Concepts, Workflows, Panel & settings; i riferimenti CLI e formato del Model restano su GitHub e la guida li linka.
- Demo in una pagina dedicata con pulsante full screen, più un'anteprima animata nella landing.
- La demo fa girare nel browser il core vero di Trama su un filesystem in memoria; un host demo sostituisce VS Code e riusa i bundle delle webview.
- Finestra VS Code finta completa: barra delle attività, menu laterale, pannello, omp Chat, terminale, barra di stato con i ghost; esploratore con due cartelle (il negozio con Trama e una copia del solo codice).
- Progetto demo: `examples/shop` arricchito con una History, Proposal approvate, Task in Done e un piccolo sorgente TypeScript vero; le schede aperte (Proposal, Task in To do, Drift) nascono dal tour.
- L'agente recita copioni sui pulsanti, solo in omp Chat, in pochi secondi con un pulsante per arrivare alla fine; ogni azione dell'agente senza copione dedicato ha un copione generico, così tutto funziona.
- Scrivere liberamente in omp Chat produce una risposta di cortesia recitata che indica il prossimo passo.
- Tour con frecce e fumetti, poi esplorazione libera; un clic fuori dal passo funziona, il tour si ferma e offre di tornare al passo o di continuare libero.
- Capitoli del tour: Design e domande (richiesta già scritta), Run dei Task (aperto dalla revisione della Proposal sul Diagramma e dalla sua approvazione), Scan e Drift, Setup e Import (sulla seconda cartella).
- Nessuna persistenza: ogni visita parte dallo stesso stato, con un pulsante Reset.
- Tema chiaro/scuro che segue il sito, che parte dalla preferenza del sistema.
- Sotto una larghezza minima la demo è sostituita da un video registrato da uno script del repository, rilanciato a mano e committato.
- `README.md` e `extension/README.md` linkano il sito e la demo.

Assunzioni dell'agente da verificare:
- Il capitolo Run dei Task apre la Proposal sul Diagramma prima di approvarla, perché la revisione sul Diagramma è il gesto centrale di Trama (risposta: "se ho dimenticato qualcosa di fondamentale aggiungilo").
- Le animazioni rispettano `prefers-reduced-motion`.
- La demo non fa richieste di rete oltre ai propri file statici e non ha analytics.
- Solo mode, il merge e i dialoghi di login di omp e dei provider sono presenti ma recitano risultati fissi; Solo mode resta non disponibile come in una cartella senza git.
- Larghezza minima della demo: 1024 px CSS; il video registrato serve anche da anteprima animata della landing.
- La scelta del tema del sito è ricordata nel browser (unica cosa salvata).
- Avviare un capitolo dalla lista porta la demo al punto di partenza di quel capitolo; se un'azione fuori dal passo rende il passo impossibile, il capitolo riparte dal suo punto di partenza.
- Nella demo l'agente a volte fa un round di domande anche fuori dal design (come l'agente vero); le risposte finiscono nel corpo della Proposal ma non cambiano il resto del copione.
- La guida copre anche Manager mode e Team (escluse solo dalla demo); la pagina delle impostazioni è generata dal manifest dell'estensione.
- Ogni copione ha un test che lo recita su un seme nuovo e verifica che il progetto resti valido, così la demo non si rompe in silenzio quando il core cambia.
