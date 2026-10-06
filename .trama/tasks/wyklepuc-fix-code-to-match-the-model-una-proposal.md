---
column: done
technical: false
refs:
  - announcement/Preparing/agent.START_PROPOSAL
  - requirements/rules#announcement
drift: 1ls4orfj
proposal: null
agent: false
created: 2026-10-06T18:58:29.344Z
finished: 2026-10-06T19:30:18.806Z
---
# Fix code to match the Model: Una Proposal con annuncio non valido prende comunque un ghost

## What happens

Quando l'agente avvia una Proposal nominando un annuncio sconosciuto, già usato o di un altro tipo, la Proposal viene creata ma acquisisce comunque un ghost: prende il più vecchio annuncio di richiesta ancora Preparing, oppure ne crea uno nuovo già Writing. Una richiesta diversa può quindi apparire in scrittura per la Proposal sbagliata. L'output dichiara invece che la Proposal è stata creata senza ghost.

## What should happen

L'associazione automatica alla richiesta più vecchia, oppure la creazione di un annuncio proprio, riguarda la Proposal avviata **senza nominare un annuncio**. Se l'agente nomina un annuncio non utilizzabile, la Proposal deve essere creata comunque, con la segnalazione prevista, ma senza consumare un'altra richiesta né attivare il percorso automatico riservato all'assenza di un annuncio.

## Chosen option

**Creare la Proposal senza ghost quando l'annuncio nominato non è utilizzabile**

Distinguere l'assenza di un annuncio da un'identità esplicitamente nominata ma non utilizzabile. Solo nel primo caso cercare la richiesta in attesa o creare il ghost automatico. Nel secondo, conservare gli altri annunci e creare comunque la Proposal con la segnalazione: il developer non vede una richiesta diversa cambiare titolo e stato. Costo: separare questi due percorsi e coprire gli annunci non più validi.

## Where in the code

src/core/announcements.ts: bindDraft, announcementNote; src/cli/commands.ts: proposal new
