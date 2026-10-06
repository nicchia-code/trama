---
column: done
technical: false
refs:
  - drift
  - requirements/rules#General
drift: bzfihf42
proposal: null
agent: false
created: 2026-10-06T16:30:20.621Z
finished: 2026-10-06T16:31:22.957Z
---
# Fix code to match the Model: Un Drift risolto durante un giro di worktree tiene il numero breve

## What happens

Mentre è aperto un giro di worktree, un Drift della cartella aperta che era aperto quando il giro è partito e che il developer risolve dopo **tiene il suo numero breve** (per esempio `D1`): i messaggi lo citano ancora come D1 ("Drift D1 is already resolved") e il numero non torna libero per i Drift nuovi finché il giro non si chiude.

Succede perché ogni worktree contiene ancora la copia del Drift com'era alla partenza, aperta, e quella copia viene contata come scheda viva. Lo stesso vale per i Task della cartella aperta copiati nei worktree.

## What should happen

Un Drift ha il numero breve **solo finché è aperto**: lo libera appena è risolto, in qualunque modo, e da quel momento si mostra con la sua identità permanente.

Le copie dei Drift e dei Task della cartella aperta che stanno nei worktree appartengono alla cartella aperta, non al giro: non devono tenere vivo un numero che la cartella aperta ha già chiuso.

## Chosen option

**Ignorare le copie della cartella aperta**

Nel calcolo dei numeri brevi, contare dei worktree solo i Drift e i Task nati lì, come già fa la Board: una scheda che esiste anche nella cartella aperta vale per com'è nella cartella aperta. Il numero si libera alla risoluzione anche durante il giro; costo piccolo, una sola regola condivisa.

## Where in the code

`src/core/short-numbers.ts` (`liveCards`, che legge i worktree del giro senza escludere le schede della cartella aperta); a confronto `roundWork` in `src/core/work.ts`, che le esclude.
