---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#agent-terminal
proposal: null
task: ppp7r0dg
origin: null
critical: false
option: 1
note: null
resolvedBy: 7rgcnw9t
created: 2026-10-14T08:42:11.294Z
---
# The agent variable hides the fix-option menu

## What happens

Il comando che corregge un Drift senza opzione chiede la scelta con un menu solo se il terminale è interattivo e non è quello di un agente. Se la variabile che Trama imposta nei terminali dell'agente, o quella della chat di Cursor, è presente, il menu non compare nemmeno in un terminale interattivo, e il comando rifiuta: la variabile decide che cosa succede.

## What should happen

La variabile dell'agente riconosce chi lancia il comando, per i Task presi e per gli annunci, e non autorizza né vieta le decisioni. Gli argomenti e lo stato restano controllati come prima, senza una guardia sostitutiva. Il menu dovrebbe dipendere solo dal terminale interattivo, come per ogni altro comando.

## Fix options

### Keep the menu off for agents and amend the Requirement

Il menu resta spento quando la variabile dell'agente è presente, e il Requisito dice che la variabile impedisce il menu, non la decisione. Un agente che non passa l'opzione riceve un rifiuto e chiede al developer. Costo: il comando si comporta in modo diverso a seconda di chi lo lancia, e il Requisito cambia.

### Show the menu in any interactive terminal

Il menu compare ogni volta che il terminale è interattivo, anche in quello di un agente. Il developer vede sempre la scelta e il comando segue il Requisito alla lettera. Costo: un agente con un terminale vero, che non risponde al menu, può restare fermo; va provato con omp e Claude Code prima di chiudere la questione.

## Where in the code

src/cli/bin.ts (il menu della scelta dell'opzione); src/cli/main.ts (agentVariable)
