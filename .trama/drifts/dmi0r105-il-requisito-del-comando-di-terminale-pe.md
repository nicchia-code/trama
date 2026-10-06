---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#agent-terminal
proposal: yfhf76eg
task: 8f1ok7f5
origin: mbqlwnwo
option: 1
note: null
created: 2026-10-06T15:22:02.337Z
---
# Il Requisito del comando di terminale personalizzato non è stato precisato

## What happens

Il codice fa già quello che il Drift precedente ha scelto: con il comando di terminale personalizzato, al posto di `{command}` il terminale riceve **sh -c** seguito dallo script dell'agente citato come un solo argomento, e l'esempio `alacritty -e {command}` funziona.

Il Task chiede di allineare il codice al Requisito, ma non resta nessun codice da cambiare.

## What should happen

La scelta del Drift precedente era **precisare il Requisito com'è il codice**, ma il testo del Requisito dice ancora che `{command}` è la riga dell'agente citata come un unico argomento.

L'agente non può cambiare i Requisiti; cambiare il codice per seguirlo alla lettera andrebbe contro la scelta e romperebbe l'esempio della descrizione.

## Fix options

### Approvare la Proposal allegata

La Proposal cambia solo la frase del Requisito: `{command}` diventa `sh -c` seguito dallo script citato come un solo argomento. Codice, test e descrizione dell'impostazione restano come sono; il Task si può poi chiudere senza modifiche al codice.

### Seguire il Requisito alla lettera

`{command}` diventa solo lo script citato. Il developer deve scrivere `sh -c {command}` nel modello; cambiano anche la descrizione e l'esempio dell'impostazione, e chi l'ha configurata come l'esempio vede fallire l'apertura della finestra.

## Where in the code

extension/src/host/external-terminal.ts (`customTerminalCommand`); .trama/requirements/tech/agent-terminal.md
