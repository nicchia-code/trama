---
status: resolved
resolution: fix-code
refs:
  - task
  - requirements/rules#task
proposal: null
task: fen70f0g
origin: null
option: 1
note: null
resolvedBy: l3o73qn6
created: 2026-10-09T23:36:20.898Z
---
# A Task filed by hand for a Drift takes its design from the caller, not from the Drift's origin

## What happens

Un Task creato dalla riga di comando con un Drift da correggere (`task new --drift`) prende il design solo da ciò che chi lo crea indica:

- **senza `--proposal`** non fa parte di alcun design, anche quando il Drift è nato da un Task di un design;
- **con `--proposal`** fa parte del design indicato, anche quando è diverso da quello del Task d'origine o quando il Drift non ha origine.

Così un Task che corregge un Drift può restare fuori da Run this design del suo design, o entrare in un altro. Il Task di correzione creato risolvendo il Drift con correggi il codice, invece, prende già il design giusto.

## What should happen

Il Modello del Task dice che un Task che corregge un Drift **appartiene al design del Task da cui è nato il Drift**, anche quando è un Technical Task; se quel Task non fa parte di alcun design, o il Drift non è nato da un Task, nemmeno il Task di correzione ne fa parte.

`requirements/rules#task` lo conferma: una corsa su un design comprende il Task di correzione di un Drift nato da uno dei suoi Task. Il design di un Task di correzione è quindi deciso dall'origine del Drift, mai da chi lo crea.

## Fix options

### Derive the design from the Drift's origin

Quando un Task nuovo nomina un Drift, il suo design diventa quello del Task d'origine del Drift (nessuno se l'origine non ha design o non c'è); un `--proposal` diverso è rifiutato con un messaggio che dice il design giusto. Cambia poco codice e tiene il comando com'è per chi lo usa già.

### Remove the Drift option from task creation

Un Task di correzione nasce solo risolvendo il Drift con correggi il codice, come elenca il Modello fra i modi in cui nasce un Task. Il comando per creare un Task non accetta più un Drift. È la via più corta e toglie un percorso che nessuna skill usa, ma rompe eventuali script del developer che lo passano.

### Let the caller decide in the Model

Il Modello dice che un Task creato a mano per un Drift segue il design indicato da chi lo crea, e solo quello creato risolvendo il Drift segue l'origine. Il codice resta com'è; serve una Proposal che cambi la descrizione del Task e `rules#task`.

## Where in the code

`src/core/work.ts`, `newTask` (scelta del campo `proposal`); `src/cli/commands.ts`, comando `task new`.
