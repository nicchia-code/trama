---
column: done
technical: false
refs:
  - website
  - requirements/ui#website
  - requirements/tech#website
  - requirements/quality#website
  - specs#frameworks
  - specs#ci
  - specs#deployment
drift: null
proposal: yr0jv31u
agent: false
created: 2026-10-26T19:01:22.096Z
finished: 2026-10-26T19:13:42.710Z
---
# Sito Astro e pubblicazione

Il sito di Trama esiste nella cartella `site/` come progetto Astro con output statico, senza Starlight, con base `/trama/`, ed è pubblicato su GitHub Pages all'indirizzo `https://nicchia-code.github.io/trama/`.

Quando il Task è finito:
- Le dipendenze del sito stanno nel `package.json` della radice (una sola copia di React e delle librerie, condivisa con le webview dell'estensione); gli script `site:dev` e `site:build` della radice lo avviano e lo buildano con Bun; `site/dist/` non è committata; `tsc --noEmit` copre anche `site/`.
- Tutte le pagine sono in inglese e hanno la stessa intestazione: logo e nome (link alla landing), Guide, Demo, link al repository GitHub, pulsante Install verso l'estensione sul VS Code Marketplace, interruttore tema chiaro/scuro. Il sito ha un design proprio con la palette del pannello (base zinc, primario blu, chiaro e scuro); il tema parte dalla preferenza del sistema, l'interruttore lo cambia su tutte le pagine e la scelta è ricordata nel browser.
- La landing contiene, in ordine: hero con nome, tagline e due inviti (Try the demo, Install); l'anteprima animata della demo (un video in loop della demo al lavoro, caricato in lazy loading, che al clic apre la pagina della demo); il ciclo in cinque passi (descrivi una modifica, rispondi alle domande dell'agente, approva la Proposal, esegui i Task, risolvi i Drift), una sezione per passo con un breve testo e la vista vera del pannello che lo mostra; requisiti e installazione; un footer con link a guida, repository, `docs/cli.md`, `docs/model-format.md` e licenza.
- I cinque passi si animano allo scroll una sola volta, quando la sezione entra nello schermo, con transizioni e keyframe CSS attivati da un `IntersectionObserver` che aggiunge una classe; nessuna libreria di animazione. Con `prefers-reduced-motion: reduce` le sezioni appaiono già nello stato finale e l'anteprima mostra il poster con un pulsante play invece di partire da sola.
- Le pagine della guida sono file Markdown in `site/src/content/guide/`, una cartella per sezione (Getting started, Concepts, Workflows, Panel & settings), con sidebar, indice della pagina, link pagina precedente/successiva e un gruppo Reference in fondo alla sidebar che linka `docs/cli.md` e `docs/model-format.md` su GitHub come link esterni. Il contenuto delle pagine è di un altro Task: qui basta la struttura con le pagine vuote o segnaposto di sezione.
- L'anteprima e la demo sono isole React; la landing non carica il codice della demo, che si carica solo nella pagina della demo (costruita da un altro Task: qui la pagina esiste e monta l'isola).
- Il sito non fa richieste fuori dai propri file statici: niente analytics, cookie, font o script da altri host. Contrasto WCAG 2.1 AA in entrambi i temi, `alt` su ogni immagine, intestazione, navigazione della guida e controlli usabili da tastiera con fuoco visibile.
- `.github/workflows/pages.yml` builda il sito con Bun 1.4.0 e lo pubblica con `actions/upload-pages-artifact` e `actions/deploy-pages`, permessi `pages: write` e `id-token: write`, un gruppo di concorrenza che non cancella i deploy in corso; parte a ogni push su `main` che tocca `site/`, `extension/src/`, `src/core/`, `examples/shop/`, `package.json`, `bun.lock` o il workflow stesso, e a mano (`workflow_dispatch`). La sorgente di Pages del repository è GitHub Actions.
- Le Specs del progetto riportano Astro, GitHub Pages e il secondo workflow GitHub Actions come già scritto nella Proposal.
