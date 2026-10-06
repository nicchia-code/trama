---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#agent-terminal
proposal: null
task: mbqlwnwo
origin: null
option: 1
note: null
created: 2026-10-06T15:20:37.081Z
---
# Il comando di terminale personalizzato riceve sh -c invece della riga citata come un solo argomento

## What happens

Con `trama.externalTerminalCommand` impostato, al posto di `{command}` (o in fondo, se manca) Trama mette **un programma con i suoi argomenti**: `sh`, `-c` e lo script dell'agente citato per la shell.

Così il terminale del developer riceve dopo `-e` o `--` un comando da eseguire, e l'esempio della descrizione, `alacritty -e {command}`, funziona.

## What should happen

Il Requisito tecnico dice che `{command}` è sostituito dalla riga di comando dell'agente **citata come un unico argomento** per la shell.

Preso alla lettera, il terminale riceverebbe lo script intero come nome di un solo programma da eseguire, e l'esempio `alacritty -e {command}` della descrizione dell'impostazione non aprirebbe nulla.

## Fix options

### Precisare il Requisito com'è il codice

Il Requisito dice che `{command}` diventa `sh -c` seguito dallo script citato come un solo argomento, cioè un programma con i suoi argomenti, come vogliono i terminali dopo `-e` o `--`. Il codice e la descrizione dell'impostazione restano come sono; cambia solo il testo del Requisito, e l'esempio `alacritty -e {command}` resta valido.

### Seguire il Requisito alla lettera

`{command}` diventa solo lo script citato come un argomento. Il developer deve scrivere lui `sh -c {command}` nel suo modello (per esempio `alacritty -e sh -c {command}`), quindi cambiano anche la descrizione e l'esempio dell'impostazione, e chi l'ha già configurata come nell'esempio vede fallire l'apertura della finestra.

## Where in the code

extension/src/host/external-terminal.ts (`customTerminalCommand`), chiamato da `openWindow` in extension/src/host/external-open.ts
