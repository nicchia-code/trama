---
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
---
# Istruzione senza scadenza

Ogni istruzione che Trama manda all'agente, per ogni lavoro e ogni agente, porta la frase `Ask the developer only with \`trama question new\`, as the skill says, never with your own question tool; run it with no time limit and wait until it ends.` al posto di quella di oggi, nella stessa posizione: nel terminale sulla stessa riga, dopo la frase del Drift blocker e prima di quella della lingua; nella chat di Cursor una riga a sé, dopo quella sul `PATH` oppure, senza quella, subito dopo l'istruzione.

La frase è la costante `ASK_DEVELOPER_SENTENCE` in `extension/src/host/prompts.ts`; i test che fissano il testo delle istruzioni si aggiornano.
