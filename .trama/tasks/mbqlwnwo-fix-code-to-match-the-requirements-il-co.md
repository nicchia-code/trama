---
column: done
technical: true
refs:
  - requirements/tech#agent-terminal
drift: afrbt7t4
proposal: null
agent: false
created: 2026-10-06T15:21:03.680Z
finished: 2026-10-06T15:24:47.439Z
---
# Fix code to match the Requirements: Il comando di terminale personalizzato riceve sh -c invece della riga citata come un solo argomento

## What happens

Con `trama.externalTerminalCommand` impostato, al posto di `{command}` (o in fondo, se manca) Trama mette **un programma con i suoi argomenti**: `sh`, `-c` e lo script dell'agente citato per la shell.

Così il terminale del developer riceve dopo `-e` o `--` un comando da eseguire, e l'esempio della descrizione, `alacritty -e {command}`, funziona.

## What should happen

Il Requisito tecnico dice che `{command}` è sostituito dalla riga di comando dell'agente **citata come un unico argomento** per la shell.

Preso alla lettera, il terminale riceverebbe lo script intero come nome di un solo programma da eseguire, e l'esempio `alacritty -e {command}` della descrizione dell'impostazione non aprirebbe nulla.

## Chosen option

**Precisare il Requisito com'è il codice**

Il Requisito dice che `{command}` diventa `sh -c` seguito dallo script citato come un solo argomento, cioè un programma con i suoi argomenti, come vogliono i terminali dopo `-e` o `--`. Il codice e la descrizione dell'impostazione restano come sono; cambia solo il testo del Requisito, e l'esempio `alacritty -e {command}` resta valido.

## Where in the code

extension/src/host/external-terminal.ts (`customTerminalCommand`), chiamato da `openWindow` in extension/src/host/external-open.ts
