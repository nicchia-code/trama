---
status: resolved
resolution: fix-code
refs:
  - announcement/Announced/time.QUIET_PERIOD_ELAPSED
  - announcement/Preparing/agent.START_PROPOSAL
  - requirements/rules#announcement
proposal: null
task: sq808kfj
origin: null
option: 1
note: null
resolvedBy: l3o73qn6
created: 2026-10-09T23:36:30.472Z
---
# Starting a Proposal restarts the quiet period of every announcement

## What happens

Quando l'agente comincia una Proposal, **ogni** annuncio ancora in attesa fa ripartire i suoi quindici minuti di quiete, qualunque sia il caso:

- la Draft si lega all'annuncio nominato o alla richiesta di design più vecchia in Preparing, e ripartono anche gli annunci che non c'entrano;
- l'ID nominato è sconosciuto, già consegnato o di un altro tipo, la Draft resta senza ghost, eppure tutti gli annunci ripartono lo stesso.

Così un agente che comincia Proposal tiene vivi sulla Board ghost di schede a cui non lavora più.

## What should happen

I quindici minuti di ogni annuncio ripartono solo quando l'agente annuncia una scheda o un controllo, archivia una scheda, cambia la fase di un controllo, o lancia un comando di sola lettura riconosciuto. La modifica di una Draft annunciata tiene vivo **solo l'annuncio legato a quella Draft** (decisione già presa sul Drift qphm54a5).

Cominciare una Proposal legata a un annuncio è la prima modifica della sua Draft: deve far ripartire solo quell'annuncio. Cominciarla con un ID inutilizzabile non è nessuna delle attività elencate, quindi non fa ripartire nulla. Solo la Proposal che crea un annuncio proprio, già Writing, conta come annuncio di una scheda.

## Fix options

### Far ripartire solo l'annuncio che prende la Draft

Cominciare una Proposal aggiorna soltanto l'annuncio a cui la Draft si lega; con un ID inutilizzabile non aggiorna nulla; l'annuncio proprio creato senza ID resta un annuncio di scheda e fa ripartire tutti. Allinea l'avvio alla regola già scelta per le modifiche della Draft. Costo: piccolo, una sola via da cambiare.

### Contare l'avvio come annuncio solo quando nasce un ghost

Quando la Draft si lega a un annuncio esistente o ne crea uno, l'avvio fa ripartire tutti gli annunci come un annuncio; con un ID inutilizzabile non fa ripartire nulla. Corregge il caso più evidente ma tiene il rinnovo globale per le Draft legate, e va scritto nei Requisiti come eccezione alla regola delle modifiche della Draft.

### Scrivere nei Requisiti che cominciare una Proposal conta sempre

Il codice non cambia: i Requisiti dicono che cominciare una Proposal, anche senza ghost, fa ripartire i quindici minuti di ogni annuncio. Costo: un agente che comincia Proposal tiene in vita ghost di altre schede, contro lo spirito della decisione sulle modifiche della Draft.

## Where in the code

src/core/announcements.ts (bindDraft, chiamata da createProposal in src/core/proposals.ts per trama proposal new)
