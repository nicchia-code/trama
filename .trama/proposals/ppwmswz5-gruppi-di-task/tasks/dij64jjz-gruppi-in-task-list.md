---
technical: false
refs:
  - task/To do
  - requirements/tech#task/To do
  - requirements/cli#General
---
# Gruppi in task list

`trama task list` con `runnable: true` e `groups: true` propone i Task eseguibili in To do divisi in gruppi, per la corsa con Parallel Execution, senza spostare nulla.

Quando è fatto:
- Due Task eseguibili stanno nello stesso gruppo quando riguardano la stessa cosa (`concernSameThing` di `src/core/blocking.ts`) o quando i loro corpi nominano lo stesso file del progetto; il gruppo è chiuso per questa relazione anche attraverso altri Task. Un file nominato è un percorso fra apici inversi, relativo alla radice del progetto, che esiste come file quando il comando gira; percorsi inesistenti e testo fuori dagli apici non contano.
- Un Task eseguibile che riguarda la stessa cosa di un Task In progress preso dall'agente, o che nomina un file nominato da un tale Task, non entra in nessun gruppo e compare sotto `## Held back` con i Task con cui si sovrappone, come con `heldBack`. I Task bloccati non compaiono.
- Dentro un gruppo i Task vanno dal più vecchio; i gruppi vanno da quello con più Task, a parità quello con il Task più vecchio. `max` conta i gruppi e tiene i primi `max`.
- Accetta `tasks`, `proposals` e `notProposals` come `runnable`; con `scope` o `heldBack`, o senza `runnable`, è un errore d'uso.
- Uscita Markdown: `## Group <n>` per gruppo con una riga per Task (numero breve, identità, titolo) e una riga `Shared:` con i riferimenti e i file che lo legano; poi `## Held back` quando ha voci; senza Task eseguibili una riga che lo dice, uscita 0. Con `--json`: `groups` come lista di `{ tasks: [{ id, number, title }], refs, files }` e `heldBack`.
- La logica sta in `src/core` e non legge `trama.parallelExecution`; lo schema dell'input in `src/cli/commands/task.ts` accetta `groups`, e `--help` lo descrive.
- Test `bun:test`: gruppo per riferimenti comuni; gruppo per file nominato comune; chiusura transitiva; percorso inesistente che non lega; ordine di gruppi e Task; `max` sui gruppi; Task trattenuti per un Task In progress; Task bloccati esclusi; errori d'uso.
- `docs/cli.md` descrive `groups` e la sua uscita.
