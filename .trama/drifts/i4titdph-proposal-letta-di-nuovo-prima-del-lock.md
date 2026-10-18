---
status: resolved
resolution: proposal
refs:
  - requirements/tech#proposal
proposal: null
task: null
origin: null
previous: elf8q0wm
critical: false
option: null
note: null
resolvedBy: a3tnkmfu
created: 2026-10-18T06:30:13.522Z
---
# Proposal letta di nuovo prima del lock

## What happens

Quando un comando cambia una **Proposal** (modificarne o toglierne un file, cambiarne l'etichetta, registrare la decisione su un Drift di una risoluzione), il sistema rilegge prima i file di tutte le Proposal per assegnare i numeri brevi, e solo dopo prende il lock su quella che sta cambiando. Così il file della Proposal viene letto prima che il lock sia preso, anche quando il comando la cita per identità o per nome.

## What should happen

Il lock di una **Proposal** si prende con la sola sua identità: nessun file della Proposal si legge prima che il lock sia preso, anche quando il comando cita un numero breve. Il numero si cerca nella tabella già salvata oppure dentro il lock.

## Fix options

### Numerare dentro il lock

Il comando prende prima il lock della Proposal citata e solo dentro il lock rilegge le schede e assegna i numeri brevi, compreso il file della Proposal. Per il developer non cambia nulla: un numero che non esiste resta un errore che non scrive niente. Costo: il lock resta preso un po' più a lungo, con poche schede sono millisecondi; nessuna nuova regola, solo lo spostamento della lettura dopo il lock.

### Solo la tabella salvata

Questi comandi non rinumerano affatto prima del lock: usano la tabella dei numeri già salvata, come già fa il numero di una Proposal citata. Una scheda creata in un'altra copia di lavoro e non ancora in tabella si cita per identità o per nome, e il comando lo dice senza leggere nessun file. Costo: dopo un pull serve un passo in più per citare una scheda con il numero, e la tabella va riscritta da un comando che legge le schede.

### Rinumerare a fine comando

Il comando trova la Proposal con la tabella salvata, prende il lock e cambia il file senza leggere le altre schede. La rinumerazione completa avviene solo al termine del comando, dopo il lock, e riscrive la tabella. Costo: per un attimo il numero di una scheda creata da un altro comando può mancare o essere vecchio, e il developer lo vede solo dopo il comando.

## Where in the code

src/cli/commands.ts: i comandi proposal label, proposal edit, proposal delete e proposal resolve-drift leggono il progetto con ctx.project() prima di withProposalLock; makeContext in src/cli/commands.ts chiama syncShortNumbers al primo accesso. src/core/short-numbers.ts: syncShortNumbers legge proposal.md di ogni Proposal tramite cardsIn, e savedIdentityOfShortNumber in src/core/proposals.ts è invece già usato solo dentro il lock per la citazione con numero breve.
