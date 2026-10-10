---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#drift
  - requirements/tech#drift
  - drift/Open/developer.ACCEPT_DRIFT_PROPOSAL
  - drift/Open/developer.DISMISS_DRIFT
proposal: null
task: poe1k5f0
origin: null
option: 1
note: null
resolvedBy: i0e2coiq
created: 2026-10-10T08:49:08.837Z
---
# Empty note accepted when accepting a Proposal or dismissing a Drift

## What happens

Accettare la Proposal allegata o chiudere un Drift senza cambiare nulla accetta una nota vuota, come se non ci fosse: il Drift si chiude normalmente.

## What should happen

Una nota data con una di queste due decisioni è rifiutata, anche se vuota: il Drift resta aperto e il rifiuto dice che la nota non si accetta con quella decisione.

## Fix options

### Controllare la nota prima di pulirla

Il controllo guarda la nota così come è stata data, anche vuota, e rifiuta ogni nota con le due decisioni. Il caso è piccolo e si corregge in un punto solo.

### Togliere la nota da queste due decisioni

Accettare la Proposal e chiudere non leggono più la nota: chi la passa riceve un errore di opzione non riconosciuta, senza il motivo della regola.

## Where in the code

src/core/work.ts resolveDrift; src/cli/commands.ts drift resolve
