---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#scan-hold
proposal: u5dlmmhi
task: ldi1vxa0
origin: a230cjmc
option: 1
note: null
created: 2026-10-07T06:03:02.355Z
---
# Il Requisito di Hold scan vieta la scansione automatica dopo le approvazioni da riga di comando

## What happens

Il Task chiede di correggere il codice, ma l'opzione scelta risolvendo il Drift lq5q1d41 è **correggere il Requisito**: il codice resta com'è. Con Hold scan spento, un'approvazione ordinaria fatta con `trama proposal approve` o `trama drift resolve --accept-proposal`, con l'editor aperto, avvia la scansione automatica come dal pannello, coerente con il Diagram di agent-terminal. Non c'è codice da cambiare.

## What should happen

Il Requisito `rules#scan-hold` dice ancora che queste approvazioni **non avviano la scansione automatica**. Seguirlo contraddirebbe il Diagram di agent-terminal e la decisione presa; l'agente non può modificare i Requisiti, quindi serve la Proposal allegata, che toglie solo quell'inciso e lascia che queste approvazioni non toccano il sospeso.

## Fix options

### Approvare la Proposal allegata

Il developer accetta la Proposal che toglie l'inciso dal Requisito. Il codice non cambia, Requisito e Diagram tornano coerenti e il Task si chiude senza lavoro sul codice. Costa solo la revisione di una riga.

### Non avviare la scansione dalla riga di comando

Il codice smette di avviare la scansione automatica dopo un'approvazione da terminale, come dice oggi il Requisito. Serve però una Proposal sul Diagram di agent-terminal, annulla la decisione del Drift nbtk5zny e la scansione dopo un'approvazione da terminale si perde.

## Where in the code

extension/src/host/main.ts (sondaggio delle approvazioni fuori dal pannello); extension/src/host/controller.ts, scanApproved
