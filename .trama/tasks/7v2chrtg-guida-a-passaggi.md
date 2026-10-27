---
column: done
technical: false
refs:
  - website
  - requirements/docs#website
  - requirements/docs#General
drift: null
proposal: zwprjf3i
agent: false
created: 2026-10-26T21:37:19.627Z
finished: 2026-10-26T23:33:41.933Z
---
# Guida a passaggi

La guida del sito diventa una guida tradizionale a passaggi illustrata con screenshot annotati, e i README rimandano solo alla guida.

Quando il Task è finito:
- Le pagine di Getting started (requisiti, installazione, primo avvio di omp, Get Started con Import from Code o Start from Scratch) e di Workflows (design e round di domande, revisione e approvazione o rifiuto di una Proposal, Rework with feedback, Run e Run all, Scan, Drift e Fix options, risoluzione e unificazione dei Drift, import, Start from Scratch, raffinamento delle Proposal stale, Solo mode, Manager mode con Team) sono passaggi numerati: ciascuno con numero, titolo breve, una o due frasi su cosa fa il developer e cosa succede, e lo screenshot annotato della vera finestra di VS Code che lo mostra. Le note degli screenshot nominano i controlli con le parole che l'estensione mostra. Nessun passaggio senza screenshot.
- Le pagine di Concepts e Panel & settings restano prosa, con screenshot annotati dove aiutano. La pagina delle impostazioni resta generata da `extension/package.json`.
- Ogni screenshot ha un `alt` che dice cosa mostra. Le pagine non parlano più della demo né la linkano, descrivono ciò che il developer vede e fa e mai l'implementazione, e linkano `docs/cli.md` e `docs/model-format.md` su GitHub invece di copiarli.
- Gli screenshot usati vengono dalle scene dello script degli screenshot; ogni scena che una pagina usa ha le sue annotazioni.
- `README.md` ed `extension/README.md` (stesso testo) hanno, subito dopo la GIF, una riga con il solo link alla guida del sito (`https://nicchia-code.github.io/trama/`), senza più il link alla demo; il resto resta com'è.
