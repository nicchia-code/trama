---
column: done
technical: false
refs:
  - requirements/rules#drift
  - requirements/tech#drift
  - drift/Open/developer.ACCEPT_DRIFT_PROPOSAL
  - drift/Open/developer.DISMISS_DRIFT
drift: rmxs8h95
proposal: null
agent: false
created: 2026-10-10T09:02:18.959Z
finished: 2026-10-10T09:05:17.892Z
---
# Fix code to match the Model: Empty note accepted when accepting a Proposal or dismissing a Drift

## What happens

Accettare la Proposal allegata o chiudere un Drift senza cambiare nulla accetta una nota vuota, come se non ci fosse: il Drift si chiude normalmente.

## What should happen

Una nota data con una di queste due decisioni è rifiutata, anche se vuota: il Drift resta aperto e il rifiuto dice che la nota non si accetta con quella decisione.

## Chosen option

**Controllare la nota prima di pulirla**

Il controllo guarda la nota così come è stata data, anche vuota, e rifiuta ogni nota con le due decisioni. Il caso è piccolo e si corregge in un punto solo.

## Where in the code

src/core/work.ts resolveDrift; src/cli/commands.ts drift resolve
