---
column: done
technical: false
refs:
  - website
  - requirements/tech#website
  - specs#frameworks
drift: null
proposal: zwprjf3i
agent: false
created: 2026-10-26T21:37:19.627Z
finished: 2026-10-26T23:09:47.775Z
---
# Screenshot automatici

Gli screenshot della guida si producono senza nulla a mano, dalla vera VS Code con l'estensione, in tema chiaro e scuro.

Quando il Task è finito:
- `scripts/screenshots.ts`, lanciato con lo script `site:screenshots` della radice, builda l'estensione e il binario `trama`, scarica con `@vscode/test-electron` una versione fissata di VS Code e la avvia tramite il supporto Electron di Playwright con l'estensione in sviluppo, un profilo utente vuoto, una finestra 1440×900 e il tema dell'editor Light Modern o Dark Modern, con l'impostazione `Theme` di Trama abbinata.
- Le scene sono dati in `scripts/screenshots/scenes.ts`. Per ognuna: come preparare una copia nuova di `examples/shop` con i comandi `trama` (Proposal, Task, Drift, round di domande, ghost), i clic e i tasti in VS Code e dentro le webview dell'estensione che portano la finestra allo stato da mostrare, e l'area della finestra da tenere. Ci sono le scene che servono alle pagine di Getting started e Workflows (installazione, Get Started con Import from Code e Start from Scratch, design e round di domande, revisione sul Diagramma, approvazione, Run e Run all, Scan, Drift e Fix options, risoluzione e unificazione, rework, raffinamento, Solo mode, Manager mode e Team) e quelle che Concepts e Panel & settings usano.
- Un `omp` sostitutivo, primo nel `PATH` della VS Code avviata, risponde ai controlli di versione e di login dell'estensione e, come `omp acp`, riproduce una conversazione ACP registrata per le scene che mostrano omp Chat.
- Per ogni scena lo script scrive `site/public/screenshots/<scene>.light.png` e `<scene>.dark.png` con lo stesso layout; se un passo di una scena non trova ciò che aspetta, fallisce dicendo quale scena.
- Lo script si lancia a mano quando l'interfaccia dell'estensione cambia e le immagini si committano; il deploy non lo esegue. `tsc --noEmit` copre `scripts/screenshots/`.
- Le Specs riportano Playwright e `@vscode/test-electron` come scritto nella Proposal.
