---
column: done
technical: false
refs:
  - demo
  - visitor
  - visitor.OPEN_DEMO
  - visitor.LEAVE_DEMO
  - visitor.RESIZE_WINDOW
  - visitor.RESET_DEMO
  - visitor.ENTER_FULLSCREEN
  - visitor.EXIT_FULLSCREEN
  - requirements/ui#demo
  - requirements/tech#demo
  - requirements/quality#demo
  - specs#frameworks
drift: null
proposal: yr0jv31u
agent: false
created: 2026-10-26T19:01:22.096Z
finished: 2026-10-26T19:49:49.150Z
---
# Host demo nel browser

La pagina Demo del sito mostra una finestra VS Code finta in cui l'estensione Trama funziona davvero sul negozio d'esempio, con il core vero di Trama che gira nel browser.

Comportamento (Machine `demo`):
- All'apertura della pagina (`visitor.OPEN_DEMO`) con finestra larga almeno 1024 px CSS la demo va in Loading: prepara una copia nuova delle due cartelle e mostra un indicatore di caricamento; quando è pronta (`demo.READY`) la finestra mostra il pannello sulla Board di `shop`. Con finestra più stretta va in Recording (il video registrato è un altro Task; qui basta lo stato e il segnaposto).
- In Running: Reset (`visitor.RESET_DEMO`) butta via tutto ciò che visitatore e agente hanno fatto, ferma i copioni, torna a Loading e riparte dallo stesso progetto con il tour al primo capitolo; tema e full screen restano. Il pulsante full screen (`visitor.ENTER_FULLSCREEN`/`visitor.EXIT_FULLSCREEN`, anche Esc) porta demo, toolbar e tour a tutto schermo e indietro senza cambiare nulla nella finestra. Se la finestra del browser scende sotto la larghezza minima (`visitor.RESIZE_WINDOW`) la demo va in Too narrow: coperta da un messaggio che chiede di allargare la finestra, mantiene il suo stato e i copioni proseguono; riallargando torna Running com'era. Da Recording, allargando, parte la demo (Loading). Lasciare o ricaricare la pagina (`visitor.LEAVE_DEMO`) perde tutto.

Interfaccia:
- Toolbar sopra la finestra: Reset, pulsante full screen (Enter full screen / Exit full screen), lista dei capitoli del tour (il contenuto è del Task del tour). L'interruttore tema del sito cambia anche la demo, e l'impostazione `Theme` nelle Settings della demo è legata a lui: cambiare l'uno cambia l'altro.
- La finestra imita VS Code nel tema corrente: barra del titolo, barra delle attività, barra laterale con esploratore e menu laterale di Trama, area editor con la scheda del pannello e i file aperti, barra laterale secondaria con omp Chat, terminale in basso (mostra solo omp avviato), barra di stato con i ghost. Pannello, menu laterale e omp Chat sono le viste dell'estensione invariate.
- L'esploratore mostra due cartelle, `shop` (il negozio con Trama) e `shop-code` (lo stesso codice senza `.trama/`); scegliere `shop-code` fa mostrare al pannello Get Started.
- Un file che l'estensione aprirebbe nell'editor (file del Model, scheda, sorgente, immagine di un Task) si apre come scheda in sola lettura con numeri di riga nell'area editor della demo; un'immagine si mostra come immagine; la scheda si chiude con ×. Conferme e input di VS Code (per esempio prima di cancellare un Task o scartare un Drift) appaiono come in VS Code, piccolo dialogo in alto al centro, con gli stessi testi.

Come si costruisce:
- Il bundle della demo è costruito con `Bun.build` (`target: "browser"`) e sostituisce i moduli Node usati dal core: `node:fs` e `node:fs/promises` con memfs; `node:path` con un sostituto che ha `posix`, `win32` e `delimiter`; `node:crypto` con un sostituto con `createHash("sha256")` sincrono su `@noble/hashes`, `randomUUID`, `randomInt`, `randomBytes`; `node:child_process` con un sostituto i cui `spawn`, `spawnSync`, `execFile` falliscono subito, così ogni chiamata git risponde "non in git"; `node:os`, `node:net`, `node:url`, `node:string_decoder` con sostituti minimi; un `process` globale con `env`, `pid`, `platform`.
- Le cartelle stanno in memfs in `/demo/shop` e `/demo/shop-code`; il seme è generato al build da `examples/shop` in un unico modulo di percorsi e contenuti (immagini in base64), e `shop-code` è il seme senza `.trama/`. Reset ricostruisce memfs dal seme.
- Un host demo sostituisce `extension/src/host`: rifà nel browser il dispatch dei messaggi `ToHost`, `ToMenuHost` e `ToChatHost` del controller chiamando le stesse funzioni del core, e riusa i moduli dell'host senza VS Code (`messages`, `refinement`, `run-all-estimate`, `drift-resolution`, `proposal-models`, `question-session`, `question-state`, `settings-schema`, `menu/model` con una superficie demo, `omp-chat/view-model` con un `OmpSessionPort` demo). Dopo ogni modifica del progetto manda un quadro con la forma completa di `postPicture` (snapshot, resolve, unify, models, refinement, runEstimate), senza `githubRepo`.
- Le viste sono i bundle dell'estensione (`webview.js`, `menu.js`, `omp-chat.js`, `mermaid.js` a richiesta) prodotti da `scripts/build-extension.ts`, ciascuno in un `iframe` della finestra demo con un proprio `acquireVsCodeApi` che inoltra i messaggi all'host demo; la classe `vscode-light`/`vscode-dark` sul `body` di ogni frame segue il tema del sito.
- Ciò che solo VS Code dà lo fornisce l'host demo: impostazioni da `settingsSchema(extension/package.json)` con i default, in memoria; chiave Cursor e token ntfy salvati o tolti come un flag; notifica di prova riportata come inviata; omp installato e connesso, con una lista fissa di modelli suggeriti; Solo mode non disponibile; Manager mode non disponibile con il motivo "No origin remote"; albero delle cartelle del wizard letto da memfs; file aperti nell'area editor della demo; link aperti in una nuova scheda del browser; conferme e input mostrati dalla finestra demo. I messaggi solo Manager (handoff, issue, persone, GitHub Project, Manager mode) sono ignorati.
- Il lavoro dell'agente (pulsanti che lo avviano, messaggi in omp Chat) passa dall'agente a copioni, che è un altro Task: qui l'host espone il punto in cui un lavoro dell'agente parte.
- Una volta caricata la demo funziona senza rete e non salva nulla nel browser oltre alla scelta del tema; funziona sulle ultime due versioni di Chrome, Edge, Firefox e Safari desktop.
- Le Specs riportano memfs e `@noble/hashes` come già scritto nella Proposal.
