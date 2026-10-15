---
column: done
technical: true
refs:
  - requirements/tech#agent-terminal
drift: m3uhtydb
proposal: null
agent: false
created: 2026-10-14T08:44:28.439Z
finished: 2026-10-14T09:41:32.089Z
---
# Fix code to match the Requirements: The agent variable hides the fix-option menu

## What happens

Il comando che corregge un Drift senza opzione chiede la scelta con un menu solo se il terminale è interattivo e non è quello di un agente. Se la variabile che Trama imposta nei terminali dell'agente, o quella della chat di Cursor, è presente, il menu non compare nemmeno in un terminale interattivo, e il comando rifiuta: la variabile decide che cosa succede.

## What should happen

La variabile dell'agente riconosce chi lancia il comando, per i Task presi e per gli annunci, e non autorizza né vieta le decisioni. Gli argomenti e lo stato restano controllati come prima, senza una guardia sostitutiva. Il menu dovrebbe dipendere solo dal terminale interattivo, come per ogni altro comando.

## Chosen option

**Keep the menu off for agents and amend the Requirement**

Il menu resta spento quando la variabile dell'agente è presente, e il Requisito dice che la variabile impedisce il menu, non la decisione. Un agente che non passa l'opzione riceve un rifiuto e chiede al developer. Costo: il comando si comporta in modo diverso a seconda di chi lo lancia, e il Requisito cambia.

## Where in the code

src/cli/bin.ts (il menu della scelta dell'opzione); src/cli/main.ts (agentVariable)
