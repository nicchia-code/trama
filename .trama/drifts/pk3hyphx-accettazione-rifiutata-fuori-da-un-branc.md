---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#worktree-round
  - worktree-round/No round/developer.APPROVE_PROPOSAL
proposal: null
task: d40cq2ei
origin: null
option: 1
note: null
created: 2026-10-06T16:43:58.591Z
---
# Accettazione rifiutata fuori da un branch: rifiuto non previsto dai Requisiti

## What happens

Con l'interruttore multi-branch acceso, se la cartella aperta **non è su un branch** (HEAD staccato), l'accettazione di una Proposal è rifiutata con un avviso proprio: `This folder is not on a branch, so a worktree cannot be created.` La Proposal resta aperta e nessun giro parte.

## What should happen

`requirements/ui#worktree-round` elenca i rifiuti dell'accettazione con il loro testo, più il motivo di git per un worktree che git rifiuta. **Questo rifiuto non è nell'elenco**, e il Model non dice cosa succede se la cartella non è su un branch, mentre il giro deve ricordare il branch di partenza e tornarci per l'unione.

## Fix options

### Mantenere il rifiuto e aggiungerlo ai Requisiti

Una Proposal aggiunge il testo `This folder is not on a branch, so a worktree cannot be created.` ai rifiuti di `requirements/ui#worktree-round`. Il codice resta com'è. Costo: solo la Proposal; il giro non parte mai senza un branch da ricordare.

### Togliere il rifiuto

L'accettazione fuori da un branch apre il worktree come le altre. Il giro però non ha un branch di partenza a cui tornare: l'unione resta per sempre in attesa e si può solo abbandonare il giro. Nessun cambio ai Requisiti, ma un giro che non si chiude.

## Where in the code

src/core/worktree-round.ts (acceptIntoWorktree)
