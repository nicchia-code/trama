---
status: resolved
resolution: proposal
refs:
  - panel/Settings
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: 8chn9fus
created: 2026-10-17T07:15:07.609Z
---
# Impostazioni: con omp un errore dell'elenco mostra il motivo sotto i campi dei modelli, contro «senza avvisi»

## What happens

Quando non si può avere l'elenco dei modelli di omp (programma non trovato, scadenza superata, uscita con errore), la scheda Settings mostra sotto ciascuno dei tre campi dei modelli una riga con il motivo dell'errore.

## What should happen

Il Modello dice che, quando l'elenco non si può avere, il campo resta un semplice testo, senza avvisi. La riga di errore non deve comparire.

## Fix options

### Togliere la riga di errore dalla scheda

Il campo dei modelli resta un semplice testo, senza avvisi, come dice il Modello. Il motivo dell'errore non compare più sotto i campi, quindi il developer non sa perché mancano i suggerimenti. Va tolta anche la richiesta della riga dai Requisiti della scheda, così Modello e Requisiti restano d'accordo.

### Aggiornare il Modello con il motivo dell'errore

I Requisiti della scheda chiedono già il motivo sotto ciascun campo dei modelli, con i messaggi di omp, e la scheda lo mostra. Il Modello va aggiornato: quando l'elenco non si può avere, il campo resta un testo libero con sotto il motivo dell'errore, e sparisce quando arriva un elenco valido o cambia l'agente.

## Where in the code

Scheda Settings, gruppo Models: campi trama.analysis, trama.scan, trama.execution. La riga di errore è costruita in extension/src/webview/settings/index.ts (funzione showNote e il nodo note); il motivo arriva da extension/src/host/model-lists.ts (ompError).
