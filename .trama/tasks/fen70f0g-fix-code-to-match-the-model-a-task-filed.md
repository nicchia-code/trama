---
column: done
technical: false
refs:
  - task
  - requirements/rules#task
drift: e71pfn8r
proposal: null
agent: false
created: 2026-10-10T07:51:07.276Z
finished: 2026-10-10T07:52:58.436Z
---
# Fix code to match the Model: A Task filed by hand for a Drift takes its design from the caller, not from the Drift's origin

## What happens

Un Task creato dalla riga di comando con un Drift da correggere (`task new --drift`) prende il design solo da ciò che chi lo crea indica:

- **senza `--proposal`** non fa parte di alcun design, anche quando il Drift è nato da un Task di un design;
- **con `--proposal`** fa parte del design indicato, anche quando è diverso da quello del Task d'origine o quando il Drift non ha origine.

Così un Task che corregge un Drift può restare fuori da Run this design del suo design, o entrare in un altro. Il Task di correzione creato risolvendo il Drift con correggi il codice, invece, prende già il design giusto.

## What should happen

Il Modello del Task dice che un Task che corregge un Drift **appartiene al design del Task da cui è nato il Drift**, anche quando è un Technical Task; se quel Task non fa parte di alcun design, o il Drift non è nato da un Task, nemmeno il Task di correzione ne fa parte.

`requirements/rules#task` lo conferma: una corsa su un design comprende il Task di correzione di un Drift nato da uno dei suoi Task. Il design di un Task di correzione è quindi deciso dall'origine del Drift, mai da chi lo crea.

## Chosen option

**Derive the design from the Drift's origin**

Quando un Task nuovo nomina un Drift, il suo design diventa quello del Task d'origine del Drift (nessuno se l'origine non ha design o non c'è); un `--proposal` diverso è rifiutato con un messaggio che dice il design giusto. Cambia poco codice e tiene il comando com'è per chi lo usa già.

## Where in the code

`src/core/work.ts`, `newTask` (scelta del campo `proposal`); `src/cli/commands.ts`, comando `task new`.
