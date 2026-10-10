---
column: done
technical: false
refs:
  - requirements/rules#proposal
  - proposal/Draft/agent.EDIT_PROPOSAL
drift: mpvllkma
proposal: null
agent: false
created: 2026-10-10T09:44:58.484Z
finished: 2026-10-10T09:47:40.397Z
---
# Fix code to match the Model: Empty note accepted with a non-fix-code decision in a resolution

## What happens

Registrando in una risoluzione la decisione su un Drift **diversa dalla correzione del codice** (adeguare il Modello o chiudere), una **nota vuota** o di soli spazi è accettata come se non ci fosse: la decisione è registrata senza errore.

Una nota con testo invece è rifiutata, come deve.

## What should happen

Una nota che accompagna una decisione diversa da `fix-code` è rifiutata, **anche se vuota**: la registrazione non cambia nulla e il rifiuto dice che la nota va solo con la correzione del codice.

È la stessa regola che vale già quando il developer accetta la Proposal o chiude un Drift direttamente, dove il caso della nota vuota è stato corretto.

## Chosen option

**Controllare la nota prima di pulirla**

Il controllo guarda la nota così come è stata data, anche vuota, e rifiuta ogni nota con `proposal` e `dismissed`, come fa già la decisione diretta sul Drift. Con `fix-code` una nota vuota resta semplicemente assente. Correzione piccola, in un punto solo.

## Where in the code

src/core/resolution.ts resolveDriftInProposal; src/cli/commands.ts proposal resolve-drift
