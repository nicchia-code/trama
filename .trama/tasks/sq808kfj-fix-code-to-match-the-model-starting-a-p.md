---
column: done
technical: false
refs:
  - announcement/Announced/time.QUIET_PERIOD_ELAPSED
  - announcement/Preparing/agent.START_PROPOSAL
  - requirements/rules#announcement
drift: q4v6bf3e
proposal: null
agent: false
created: 2026-10-10T07:51:07.286Z
finished: 2026-10-10T07:53:40.837Z
---
# Fix code to match the Model: Starting a Proposal restarts the quiet period of every announcement

## What happens

Quando l'agente comincia una Proposal, **ogni** annuncio ancora in attesa fa ripartire i suoi quindici minuti di quiete, qualunque sia il caso:

- la Draft si lega all'annuncio nominato o alla richiesta di design più vecchia in Preparing, e ripartono anche gli annunci che non c'entrano;
- l'ID nominato è sconosciuto, già consegnato o di un altro tipo, la Draft resta senza ghost, eppure tutti gli annunci ripartono lo stesso.

Così un agente che comincia Proposal tiene vivi sulla Board ghost di schede a cui non lavora più.

## What should happen

I quindici minuti di ogni annuncio ripartono solo quando l'agente annuncia una scheda o un controllo, archivia una scheda, cambia la fase di un controllo, o lancia un comando di sola lettura riconosciuto. La modifica di una Draft annunciata tiene vivo **solo l'annuncio legato a quella Draft** (decisione già presa sul Drift qphm54a5).

Cominciare una Proposal legata a un annuncio è la prima modifica della sua Draft: deve far ripartire solo quell'annuncio. Cominciarla con un ID inutilizzabile non è nessuna delle attività elencate, quindi non fa ripartire nulla. Solo la Proposal che crea un annuncio proprio, già Writing, conta come annuncio di una scheda.

## Chosen option

**Far ripartire solo l'annuncio che prende la Draft**

Cominciare una Proposal aggiorna soltanto l'annuncio a cui la Draft si lega; con un ID inutilizzabile non aggiorna nulla; l'annuncio proprio creato senza ID resta un annuncio di scheda e fa ripartire tutti. Allinea l'avvio alla regola già scelta per le modifiche della Draft. Costo: piccolo, una sola via da cambiare.

## Where in the code

src/core/announcements.ts (bindDraft, chiamata da createProposal in src/core/proposals.ts per trama proposal new)
