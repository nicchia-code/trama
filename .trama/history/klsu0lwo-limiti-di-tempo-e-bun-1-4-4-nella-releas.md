---
created: 2026-10-29T12:32:33.432Z
updated: 2026-10-29T12:32:33.432Z
summary: Il workflow della release ha limiti di tempo per job e ferma i test che restano muti per 3 minuti nominando l'ultimo file; release e sito usano Bun 1.4.4.
tasks:
  - ei8yjig5
  - hhrjfi7z
---
# Limiti di tempo e Bun 1.4.4 nella release

I job `package` del workflow della release hanno un limite di 25 minuti, gli altri di 15. Il passo dei test passa da uno script del repository che ripete l'uscita della suite, la ferma con tutti i processi avviati dopo 3 minuti di silenzio, nomina l'ultimo file di test in corso e fallisce; se la suite finisce passa il suo codice di uscita. Un test con comando finto copre i due casi. Il workflow della release e quello del sito installano Bun 1.4.4 al posto di 1.4.0. Il `CHANGELOG.md` registra entrambi i cambi.
