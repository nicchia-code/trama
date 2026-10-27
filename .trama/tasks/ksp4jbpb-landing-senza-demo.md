---
column: done
technical: false
refs:
  - website
  - requirements/ui#website
  - requirements/quality#website
  - specs#ci
  - requirements/ui
  - requirements/tech
  - requirements/quality
drift: null
proposal: zwprjf3i
agent: false
created: 2026-10-26T21:37:19.627Z
finished: 2026-10-26T22:46:04.628Z
---
# Landing senza demo

Il sito non ha più la demo interattiva: la landing e l'intestazione non ne parlano più e la pubblicazione non dipende più dalle viste dell'estensione.

Quando il Task è finito:
- L'intestazione di ogni pagina ha logo e nome (link alla landing), Guide, link al repository GitHub, Install (estensione sul VS Code Marketplace) e l'interruttore del tema; non c'è più la voce Demo.
- L'hero della landing mostra nome, tagline, la GIF `docs/images/demo.gif` (la stessa del README) e due inviti, Read the guide e Install. Non ci sono più l'anteprima animata della demo, il pulsante Try the demo né link alla pagina Demo, che non esiste più (un indirizzo `/trama/demo/` dà la pagina 404 del sito). Il resto della landing (ciclo in cinque passi animato allo scroll, requisiti e installazione, footer) resta com'è.
- Con `prefers-reduced-motion: reduce` le sezioni della landing appaiono già nello stato finale.
- `.github/workflows/pages.yml` parte a ogni push su `main` che tocca `site/`, `docs/images/`, `extension/package.json`, `package.json`, `bun.lock` o il workflow, e a mano; non builda più le viste dell'estensione per il sito e non fa screenshot.
- Le Specs dicono che il secondo workflow pubblica il sito quando cambiano il sito o le impostazioni dell'estensione e non fa mai screenshot, come scritto nella Proposal.
- Il codice della demo (host nel browser, tour, agente a copioni, video e script di registrazione, sostituti dei moduli Node, bundle in `site/public/demo/`, attributi `data-tour` nelle viste dell'estensione, dipendenze memfs e `@noble/hashes`) è tolto dai Task di rimozione che l'approvazione crea per le Machine `demo`, `tour`, `scripted-agent` e per l'Actor `visitor`: questo Task non li duplica, ma alla fine nessuna pagina, componente o script del sito vi fa ancora riferimento. I Requirements di `ui`, `tech` e `quality` per `demo`, `demo/Recording`, `tour` e `scripted-agent` non esistono più: nessun codice del sito deve ancora seguirli.
