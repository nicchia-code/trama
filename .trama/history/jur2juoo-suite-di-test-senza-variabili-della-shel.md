---
created: 2026-10-26T18:10:47.029Z
updated: 2026-10-26T18:10:47.029Z
summary: Il preload di bun test toglie le variabili TRAMA_* e BUN_INSTALL all'avvio, così la suite passa uguale con e senza le variabili ereditate dalla shell.
tasks:
  - qxkzi939
---
# Suite di test senza variabili della shell

Il preload della suite (`test/happydom.ts`, registrato in `bunfig.toml`) rimuove da `process.env` ogni variabile `TRAMA_*` e `BUN_INSTALL` prima di ogni test. I test che ne hanno bisogno la impostano da sé e ripristinano il valore precedente. Corretti così i 3 test che fallivano se lanciati da un agente di Trama.
