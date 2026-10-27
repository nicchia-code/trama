---
status: resolved
resolution: proposal
refs:
  - tour
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: vwtb46lx
created: 2026-10-26T21:24:18.825Z
job: 64540d01-f723-4dc9-b098-4c50ccc1adfe
---
# Ordine capitolo Scan e Drift

## What happens

Nel capitolo **Scan and Drifts** il tour segue il flusso reale del prodotto: scan, lettura del Drift, Resolve con la scelta della Fix option, **approvazione della risoluzione**, esecuzione del Task di correzione e infine il Task in Done. Il Drift lascia la Board all'approvazione, **prima** che l'agente corregga il codice. Il capitolo ha nove passi invece di sei.

## What should happen

Il Model elenca i passi in un altro ordine: scegliere una Fix option, **guardare l'agente correggere il codice** e solo dopo **vedere il Drift lasciare la Board**. Nel prodotto vero un Drift si risolve con l'approvazione della risoluzione e il Task che corregge il codice nasce solo allora, quindi l'ordine del Model non si può seguire, e nessuna modifica del codice del tour lo rispetta.

## Where in the code

site/src/demo/tour.ts, capitolo `scan-and-drifts`; copioni in site/src/demo/scripts/tour/

## Prepared question

```json
{
  "question": {
    "id": "w12wq4k2",
    "question": "Il Model del tour deve descrivere i passi reali del capitolo Scan and Drifts?",
    "context": "Nel capitolo **Scan and Drifts** il Model elenca: scegliere una Fix option, guardare l'agente correggere il codice e vedere il Drift lasciare la Board. Nel prodotto un Drift si risolve quando la risoluzione viene approvata, e il Task che corregge il codice nasce solo allora: il Drift lascia quindi la Board **prima** della correzione. Il tour implementato segue questo flusso (scan, lettura del Drift, Resolve, scelta della Fix option, approvazione, esecuzione del Task di correzione, Task in Done). Nessuna modifica del codice del tour rispetta l'ordine scritto nel Model.",
    "options": [
      {
        "label": "Adottare la Proposal",
        "description": "Il Model descrive i passi reali del capitolo, come li segue il tour."
      },
      {
        "label": "Chiudere senza cambiare",
        "description": "Il Model resta com'è e il Drift si chiude senza modifiche."
      }
    ],
    "recommended": 0,
    "multi": false
  },
  "decisions": [
    {
      "decision": "proposal"
    },
    {
      "decision": "dismissed"
    }
  ],
  "fingerprint": "dca122fd7a9bd5ad7f3ba922c096995ffff74da348fc000aa5a66b7f57094f6c",
  "prepared": "2026-10-26T21:24:26.116Z"
}
```
