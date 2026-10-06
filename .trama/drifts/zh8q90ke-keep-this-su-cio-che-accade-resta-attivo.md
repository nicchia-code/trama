---
status: resolved
resolution: fix-code
refs:
  - drift/Open/developer.ACCEPT_DRIFT_PROPOSAL
  - requirements/ui#drift
proposal: null
task: oco7e90i
origin: null
option: 1
note: null
created: 2026-10-06T15:55:38.845Z
---
# Keep this su «ciò che accade» resta attivo quando la Proposal del Drift è in un worktree

## What happens

Con il multi-branch acceso il developer può approvare direttamente la Proposal allegata a un Drift: la Proposal entra in un worktree. Da lì non è più approvabile, ma il Drift la mostra come se lo fosse:

- il **Keep this** di sinistra appare attivo e sotto dice «Approves Proposal … and changes the Model to match»;
- il clic è rifiutato con un errore («Proposal … is in a worktree») invece dell'avviso previsto;
- `trama drift show` non indica alcun motivo per cui la Proposal non si può approvare.

## What should happen

Una Proposal in un worktree **non può essere approvata**, quindi il Drift non può accettarla. Come per gli altri motivi, il Keep this di sinistra deve apparire disabilitato (e marcato tale per le tecnologie assistive), restare focalizzabile, e al clic non cambiare nulla mostrando un avviso che nomina la Proposal e dice che è in un worktree; la riga sotto il pulsante dice lo stesso motivo in breve. Anche `trama drift show` mostra quel motivo accanto alla Proposal.

## Fix options

### Contare il worktree come motivo di blocco

Il motivo per cui una Proposal non si può approvare include l'essere in un worktree. Così pulsante disabilitato, riga sotto, avviso al clic e `trama drift show` si allineano in un colpo solo, con lo stesso testo del rifiuto attuale. Costo minimo: un caso in più dove si calcola il motivo.

### Impedire che la Proposal di un Drift entri in un worktree

L'approvazione diretta di una Proposal allegata a un Drift con il multi-branch acceso la applicherebbe nella cartella aperta, come l'accettazione dal Drift. Il caso sparisce, ma cambia un comportamento che il Modello oggi ammette (la Transizione verso In worktree non esclude le Proposal dei Drift): servirebbe anche una Proposal sul Modello.

## Where in the code

`src/core/proposals.ts` (`approvalBlock` non considera la Proposal in un worktree); `src/core/snapshot.ts` (`proposalBlock` del Drift); `extension/src/webview/drift-compare.ts`; rifiuto in `approveProposal` chiamato da `resolveDrift` in `src/core/work.ts`.
