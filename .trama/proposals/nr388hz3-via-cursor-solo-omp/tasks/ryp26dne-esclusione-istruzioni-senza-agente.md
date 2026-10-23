---
technical: true
refs:
  - requirements/rules#agent-terminal/Agent running
---
# Esclusione istruzioni sempre attiva

L'esclusione dei file di istruzioni degli agenti vale quando `trama.ignoreInstructionFiles` è acceso nelle impostazioni utente, letto a ogni lancio, senza dipendere più da `trama.agent`: per ogni lavoro che Trama avvia in un terminale o in omp Chat (design, import, scan del System e di Feature, implement, implement all, ogni Run di una sequenza per modello, Resolve Drifts e Unify Drifts), per l'agente principale, i suoi sotto-agenti (`trama-analysis` compreso) e gli advisor dell'Advisor Scanner. Spenta, assente o non booleana, il lancio resta esattamente com'era. Sparisce ogni frase o condizione «con la chat di Cursor non cambia nulla».

Le regole di Cursor che omp legge restano escluse una per una (`.cursor/rules/*` → `rule:<name>`, in `src/core/instruction-files.ts`) e il wizard continua a elencare `.cursorrules`: quel codice non cambia. Da controllare `instructionExclusionsFor` e i suoi chiamanti in `extension/src/host/agent.ts` (e la partenza delle conversazioni di omp Chat), perché le esclusioni si calcolino per ogni lancio di omp senza alcun controllo dell'agente configurato. I test che accendono l'esclusione solo con `trama.agent` su `omp`, o che la verificano spenta con la chat di Cursor, si aggiornano o si eliminano.
