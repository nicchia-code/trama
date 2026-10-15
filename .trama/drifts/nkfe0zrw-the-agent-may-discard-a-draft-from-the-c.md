---
status: resolved
resolution: fix-code
refs:
  - proposal/Draft/developer.DISCARD_PROPOSAL
  - requirements/tech#proposal
proposal: null
task: sexh5zs0
origin: null
critical: false
option: 1
note: null
resolvedBy: 7rgcnw9t
created: 2026-10-14T08:39:32.636Z
---
# The agent may discard a Draft from the command line

## What happens

Il comando che scarta una bozza di Proposal funziona anche quando a lanciarlo è l'agente. Nessun controllo distingue la sua chiamata da quella del developer: se l'agente scarta una bozza che il developer voleva tenere, la bozza sparisce senza che il developer lo chieda. Per lo scarto non c'è il rifiuto che la riga di comando oppone a chi lancia un comando riservato, come quello per lo spostamento di un Task preso. Dalla Board o dal terminale il developer scarta la stessa bozza con lo stesso comando, senza alcuna differenza.

## What should happen

Il Modello dice che scartare una bozza è una decisione del developer: l'agente non la prende da sé. I Requisiti di Proposal dicono che la riga di comando non rifiuta l'agente per questo, e che valgono le istruzioni delle skill. Ma i Requisiti tecnici descrivono lo scarto come un comando riservato al developer. Le due descrizioni non coincidono: il comando non può essere insieme riservato al developer e aperto all'agente senza un controllo, e il progetto deve scegliere quale delle due vale.

## Fix options

### Keep the command open and let the skills decide

Il comando resta com'è per tutti: l'agente può scartare una bozza, e a impedirlo sono le istruzioni delle skill, non un controllo. Si corregge la frase dei Requisiti tecnici che lo dice riservato al developer. Costa: nessun controllo tecnico impedisce all'agente di scartare una bozza che il developer voleva tenere; ci si affida alle istruzioni. È il comportamento di oggi, senza nuove regole nella riga di comando.

### Refuse the discard when the agent runs it

Il comando rifiuta lo scarto quando a lanciarlo è l'agente, come già fa con lo spostamento di un Task preso. Il developer scarta dalla Board o dal proprio terminale, come oggi. Costa: la riga di comando deve sapere chi la lancia, e la regola dei Requisiti di Proposal va riscritta perché non dica più che la riga di comando non rifiuta l'agente. In cambio l'agente non può più scartare una bozza, né per errore né per un'istruzione sbagliata.

## Where in the code

`src/cli/commands.ts` (comando `proposal discard`) e `src/core/proposals.ts` (`discardProposal`).
