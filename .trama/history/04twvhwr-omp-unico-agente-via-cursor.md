---
created: 2026-10-23T14:34:47.285Z
updated: 2026-10-23T18:32:51.556Z
summary: "Rimozione di Cursor completata: istruzioni solo a omp, via chat di Cursor, hook e Advisor chat; annunci e ritiri solo da terminale."
tasks:
  - b7122jme
  - 0hvr2xxx
  - 3p0sqp77
  - 4ex7xmym
  - 5lrcaq23
  - ci2h9vnp
  - coxf1b8j
  - cvkiu322
  - iwr81zsl
  - og4lfdnm
  - qn1ykd43
  - ryp26dne
  - sevkgkt6
  - xjxxqnqi
  - 593ix9dj
  - 93txjdwe
  - hc2mlrju
  - 3g5tsq40
  - 5xibha22
  - tb3jm36n
---
# Cursor tolto, omp unico agente

Le istruzioni (design, scan, import, implement, Resolve Drifts, Unify Drifts, Quick Task, Ask more) vanno sempre a omp, con `trama.ompPath` o `omp` dal PATH, risolto da un'unica funzione. Sono tolti `trama.agent`, la consegna alla chat di Cursor, gli hook e i sotto-agenti scritti per Cursor, il caso Cursor del round di domande, l'Advisor della chat e i Task presi per conversazione di Cursor. I Task presi appartengono solo a un terminale; l'esclusione dei file di istruzioni è sempre attiva; le note dei ghost arrivano dal terminale. Gli annunci non hanno più i campi `chat` e `conversation` e si scrivono solo con `TRAMA_TERMINAL`; un annuncio è ritirato o consegnato solo dai segnali del suo terminale.
