---
status: resolved
resolution: fix-code
refs:
  - proposal/Draft/agent.EDIT_PROPOSAL
  - proposal/Draft/agent.SUBMIT_PROPOSAL
  - requirements/rules#proposal
proposal: null
task: 1hsty6ci
origin: null
option: 1
note: null
created: 2026-10-07T05:35:42.143Z
---
# Registrare un file già presente nella Proposal non lo registra

## What happens

Quando nella cartella di una Proposal c'è già un file che non è mai stato **registrato** (per esempio scritto dall'agente prima di chiedere la registrazione), la registrazione di quel file non fa nulla: non ricorda la versione di partenza.

- La consegna resta rifiutata con «it contains files it never registered … Use trama proposal edit first», anche dopo averlo fatto.
- Una Proposal aperta nello stesso caso resta bloccata per sempre, perché la stessa registrazione non la sblocca.

L'agente non ha modo di uscirne se non cancellando il file e ricominciando.

## What should happen

Con la Proposal in Draft (e da Open, che la riporta in Draft) l'agente **registra** un file; la consegna è rifiutata solo finché un file che contiene non è stato registrato, e il rifiuto dice all'agente cosa correggere. Registrare il file deve quindi far sparire quel problema, ricordandone la versione di partenza come per ogni altro file (sopra le Proposal richieste), senza cambiare ciò che era già ricordato per gli altri.

## Fix options

### Registrare il file non ancora registrato

La registrazione di un file già presente ma mai registrato ricorda la sua versione di partenza (il file attuale, o «nuovo» se non esiste), lasciando intatto il contenuto scritto dall'agente. Il consiglio del rifiuto diventa vero e la consegna riesce subito dopo. Costo minimo: un caso in più nella registrazione.

### Rifiutare la registrazione e dire di ricominciare il file

La registrazione di un file presente ma mai registrato è rifiutata, dicendo di togliere quel file e registrarlo di nuovo prima di riscriverlo; il rifiuto della consegna e dell'approvazione dà lo stesso consiglio. Niente cambia nei dati, ma l'agente perde ciò che aveva scritto e deve riscriverlo.

## Where in the code

src/core/proposals.ts, editInProposal: quando il file esiste già nella Proposal ritorna senza scrivere `base`; i messaggi di submitProposal e approveProposal consigliano `trama proposal edit`.
