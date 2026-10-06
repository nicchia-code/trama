---
status: resolved
resolution: fix-code
refs:
  - worktree-round.MERGED
  - agent-terminal
proposal: fadqfwdb
task: qgji3ip6
origin: s605ao43
option: 1
note: null
created: 2026-10-06T14:34:33.452Z
---
# La scansione dopo l'unione di un giro manca nel Diagram del terminale dell'agente

## What happens

Il Task chiede di **lasciare il codice com'è** e di aggiungere al Model la Transition su `worktree-round.MERGED`. Il codice fa già quello che serve: dopo l'unione di un giro manda una sola scansione delle Feature toccate al launcher abituale, e con un launcher del terminale apre o riusa il terminale dell'agente chiamato Scan.

Nel codice non c'è quindi niente da correggere, e il Task non si può chiudere senza toccare il Model.

## What should happen

Il Diagram di agent-terminal dovrebbe avere una Transition da ciascuno dei tre State verso *Agent running* su `worktree-round.MERGED`, come dice l'opzione scelta. Questo è un **cambiamento del Model**, che l'agente non può fare da sé: passa per una Proposal che il developer approva.

La Proposal allegata aggiunge le tre Transition, con le regole di riuso del terminale di `developer.ASK_AGENT`.

## Fix options

### Accettare la Proposal allegata

Il Diagram di agent-terminal riceve le tre Transition su `worktree-round.MERGED`, solo con un launcher del terminale e almeno una Feature toccata. Il codice resta com'è. Costa solo la revisione della Proposal.

### Togliere la scansione dal codice

Il codice smette di avviare la scansione dopo l'unione di un giro, così il terminale dell'agente segue il Diagram attuale. Però contraddice il Requisito di worktree-round e la descrizione di `worktree-round.MERGED`, che andrebbero cambiati con un'altra Proposal; il developer dovrebbe lanciare la scansione a mano.

## Where in the code

extension/src/host/agent.ts, `reportRoundMerge`
