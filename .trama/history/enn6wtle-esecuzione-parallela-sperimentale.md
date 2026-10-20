---
created: 2026-10-20T20:50:31.206Z
updated: 2026-10-20T20:50:31.206Z
summary: Nuova impostazione utente per l'esecuzione parallela sperimentale, scelte parallele nella CLI (heldBack, timing new) e piano parallelo nelle corse su più Task.
tasks:
  - x1u09lb6
  - yjjckndp
  - ioysk8ca
---
# Esecuzione parallela sperimentale

Il developer può accendere `trama.experimentalParallelExecution` dalla scheda Settings (gruppo Experimental); solo il valore utente conta. La CLI offre `task list` con `heldBack` per i Task trattenuti e `timing new` per registrare vie libere, ordini e conflitti, riassunti da `timing list`. Con l'impostazione accesa le istruzioni delle corse su più Task portano la frase dell'esecuzione parallela e la skill trama-implement ha la sezione "Experimental parallel execution" con il piano, le regole dei conflitti e la sezione del resoconto.
