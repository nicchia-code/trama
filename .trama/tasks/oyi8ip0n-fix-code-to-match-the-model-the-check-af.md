---
column: done
technical: false
refs:
  - requirements/rules#agent-terminal
  - worktree-round/Merging/worktree-round.MERGE_CLEAN
  - worktree-round/Waiting/workspace.TREE_READY
drift: oe0ocg26
proposal: null
agent: false
created: 2026-10-05T14:37:51.036Z
---
# Fix code to match the Model: The check after a round merge asks for the language twice

## What happens

Quando l'unione di un giro viene applicata alla cartella aperta e parte il controllo delle Feature toccate, con una lingua impostata l'istruzione all'agente finisce con la frase della lingua **ripetuta due volte**.

## What should happen

Ogni istruzione mandata all'agente, compreso il controllo dopo l'unione, finisce con la frase della lingua **una sola volta**, sulla stessa riga. Senza lingua l'istruzione resta com'è.

## Chosen option

**Aggiungere la lingua in un solo punto**

La frase della lingua resta aggiunta solo dal lancio comune dell'agente, e il controllo dopo l'unione smette di aggiungerla da sé. Il controllo segue così la stessa regola di tutte le altre istruzioni. È la correzione più piccola.

## Where in the code

`extension/src/host/agent.ts`: `reportRoundMerge` passa a `launchAgent` un'istruzione già passata da `withLanguage`, e `launchAgent` la applica di nuovo.
