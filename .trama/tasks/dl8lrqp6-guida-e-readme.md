---
column: done
technical: false
refs:
  - website
  - requirements/docs#website
  - requirements/docs#General
drift: null
proposal: yr0jv31u
agent: false
created: 2026-10-26T19:01:22.096Z
finished: 2026-10-26T19:21:46.970Z
---
# Guida e README

La guida del sito spiega Trama a un developer che non l'ha mai visto, in inglese, e i README rimandano al sito.

Quando il Task è finito:
- Le pagine Markdown in `site/src/content/guide/` coprono quattro sezioni:
  - **Getting started**: requisiti (VS Code, piattaforme, omp, `gh` solo per Team), installazione dell'estensione, primo avvio di omp, mettere Trama in un progetto con Get Started tramite Import from Code o Start from Scratch.
  - **Concepts**: System, Feature, Machine, State, Transition, Event, Actor; Requirements con Aree, frammenti e le skill che ne nascono; Specs; Proposal, Task, Drift e ghost; Board e History.
  - **Workflows**: design e round di domande, revisione e approvazione o rifiuto di una Proposal, Rework with feedback, Run e Run all, Scan, Drift e Fix options, risoluzione e unificazione dei Drift, import, Start from Scratch, raffinamento delle Proposal stale, Solo mode, Manager mode con Team.
  - **Panel & settings**: ogni vista del pannello e il menu laterale, il Diagramma e il suo focus, omp Chat e General, le notifiche away, e ogni impostazione dell'estensione con cosa fa e il suo default.
- La pagina delle impostazioni è generata al build da `contributes.configuration` di `extension/package.json` (titolo, descrizione, tipo e default di ogni impostazione), così non diverge mai dall'editor.
- Le pagine descrivono ciò che il developer vede e fa, mai l'implementazione (componenti, moduli, messaggi, riferimenti ai Requirement). Usano screenshot e GIF di `docs/images/` e, se servono, immagini proprie in `site/public/images/`, ciascuna con `alt`. Una pagina su qualcosa che la demo mostra linka la demo. La guida non copia `docs/cli.md` né `docs/model-format.md`: li linka su GitHub.
- `README.md` ed `extension/README.md` (stesso testo) hanno, subito dopo la GIF, una riga con i link alla guida del sito (`https://nicchia-code.github.io/trama/`) e alla sua pagina demo, e il sito compare anche fra i link finali, prima di `CONTEXT.md`. Il README dice che i dettagli delle funzioni stanno nella guida del sito, insieme a `CHANGELOG.md`, `docs/cli.md` e alle descrizioni delle impostazioni nell'editor. `extension/README.md` usa URL assoluti come già oggi.
