---
column: done
technical: false
refs:
  - requirements/ui#worktree-round
  - worktree-round/No round/developer.APPROVE_PROPOSAL
drift: pk3hyphx
proposal: null
agent: false
created: 2026-10-06T16:44:11.361Z
finished: 2026-10-06T17:46:56.548Z
---
# Fix code to match the Model: Accettazione rifiutata fuori da un branch: rifiuto non previsto dai Requisiti

## What happens

Con l'interruttore multi-branch acceso, se la cartella aperta **non è su un branch** (HEAD staccato), l'accettazione di una Proposal è rifiutata con un avviso proprio: `This folder is not on a branch, so a worktree cannot be created.` La Proposal resta aperta e nessun giro parte.

## What should happen

`requirements/ui#worktree-round` elenca i rifiuti dell'accettazione con il loro testo, più il motivo di git per un worktree che git rifiuta. **Questo rifiuto non è nell'elenco**, e il Model non dice cosa succede se la cartella non è su un branch, mentre il giro deve ricordare il branch di partenza e tornarci per l'unione.

## Chosen option

**Mantenere il rifiuto e aggiungerlo ai Requisiti**

Una Proposal aggiunge il testo `This folder is not on a branch, so a worktree cannot be created.` ai rifiuti di `requirements/ui#worktree-round`. Il codice resta com'è. Costo: solo la Proposal; il giro non parte mai senza un branch da ricordare.

## Where in the code

src/core/worktree-round.ts (acceptIntoWorktree)
