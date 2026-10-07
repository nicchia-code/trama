---
column: done
technical: true
refs:
  - requirements/rules#scan-hold
drift: z4tyb9yt
proposal: null
agent: false
created: 2026-10-07T06:05:21.204Z
finished: 2026-10-07T06:11:17.586Z
---
# Fix code to match the Requirements: Il Requisito di Hold scan vieta la scansione automatica dopo le approvazioni da riga di comando

## What happens

Il Task chiede di correggere il codice, ma l'opzione scelta risolvendo il Drift lq5q1d41 è **correggere il Requisito**: il codice resta com'è. Con Hold scan spento, un'approvazione ordinaria fatta con `trama proposal approve` o `trama drift resolve --accept-proposal`, con l'editor aperto, avvia la scansione automatica come dal pannello, coerente con il Diagram di agent-terminal. Non c'è codice da cambiare.

## What should happen

Il Requisito `rules#scan-hold` dice ancora che queste approvazioni **non avviano la scansione automatica**. Seguirlo contraddirebbe il Diagram di agent-terminal e la decisione presa; l'agente non può modificare i Requisiti, quindi serve la Proposal allegata, che toglie solo quell'inciso e lascia che queste approvazioni non toccano il sospeso.

## Chosen option

**Approvare la Proposal allegata**

Il developer accetta la Proposal che toglie l'inciso dal Requisito. Il codice non cambia, Requisito e Diagram tornano coerenti e il Task si chiude senza lavoro sul codice. Costa solo la revisione di una riga.

## Where in the code

extension/src/host/main.ts (sondaggio delle approvazioni fuori dal pannello); extension/src/host/controller.ts, scanApproved
