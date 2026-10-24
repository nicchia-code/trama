# Requirements: Tecnologia e vincoli, Tecnologia dei gruppi di Task

Usa quando lavori sui gruppi di Task di `trama task list` con `groups` e sui sotto-agenti che realizzano un gruppo.

## task/To do

- `trama task list` con `runnable: true` e `groups: true` stampa i Task eseguibili in To do divisi in gruppi, calcolati in `src/core` senza leggere `trama.parallelExecution` e senza spostare nulla. Accetta gli stessi filtri di `runnable` (`tasks`, `proposals`, `notProposals`) e `max`, che con `groups` conta i gruppi, non i Task. Con `scope` o `heldBack` insieme è un errore d'uso; senza `runnable` anche.
- Due Task eseguibili stanno nello stesso gruppo quando riguardano la stessa cosa (`concernSameThing`, `src/core/blocking.ts`) o quando i loro corpi nominano lo stesso file del progetto; un gruppo è chiuso per questa relazione, anche attraverso altri Task (componenti connesse). Un file nominato è un percorso fra apici inversi, relativo alla radice del progetto, che esiste come file al momento del comando; i percorsi che non esistono e il testo fuori dagli apici non contano.
- Un Task eseguibile che riguarda la stessa cosa di un Task In progress preso dall'agente, o che nomina un file nominato da un tale Task, non entra in nessun gruppo: compare sotto `## Held back` con i Task con cui si sovrappone, come con `heldBack`. I Task bloccati non compaiono.
- Ordine: dentro un gruppo i Task vanno dal più vecchio, come l'ordine dei Task eseguibili. I gruppi vanno da quello con più Task; a parità, quello con il Task più vecchio prima. `max` tiene i primi `max` gruppi.
- Uscita Markdown: una sezione `## Group <n>` per gruppo, nell'ordine, con una riga per Task (numero breve, identità, titolo) e una riga `Shared:` con i riferimenti e i file che legano il gruppo; poi `## Held back` quando ha voci. Con `--json` il campo `groups`, una lista di `{ tasks: [{ id, number, title }], refs, files }`, e `heldBack` come sopra. Nessun Task eseguibile: lo dice in una riga ed esce con 0.
- La skill `trama-implement`, con Parallel Execution, chiede i gruppi all'inizio della corsa e a ogni revisione del piano (`rules#agent-launching`), con gli stessi filtri dell'istruzione e `max` uguale ai posti liberi.
- Test `bun:test` in `src/core` provano: gruppo per riferimenti comuni; gruppo per file nominato comune; chiusura transitiva; un percorso che non esiste non lega; ordine dei gruppi e dei Task; `max` sui gruppi; Task trattenuti per un Task In progress; Task bloccati esclusi; errori d'uso.
