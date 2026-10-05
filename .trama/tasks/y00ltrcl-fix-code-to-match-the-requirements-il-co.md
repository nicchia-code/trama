---
column: done
technical: true
refs:
  - requirements/tech#agent-terminal
drift: dx9jcb0d
proposal: null
agent: false
created: 2026-10-05T09:29:17.059Z
---
# Fix code to match the Requirements: Il comando del terminale esterno non può eseguire la riga dell'agente come unico argomento

## What happens

Il Requisito vuole che `{command}` di `trama.externalTerminalCommand` sia sostituito dalla riga dell'agente, che è uno script per la shell, **citata come un solo argomento**. Con l'esempio dello stesso Requisito, `alacritty -e {command}`, il terminale riceve un solo argomento e lo prende per il nome di un programma da eseguire.

Provato su questa macchina: `alacritty -e 'touch /tmp/x; echo ok'` fallisce con «Failed to spawn command … No such file or directory» e non esegue nulla, mentre `alacritty -e sh -c '…'` funziona. Lo stesso vale per gli altri terminali che dopo `-e` o `--` vogliono programma e argomenti separati.

## What should happen

Il comando scelto dal developer deve aprire una finestra che esegue davvero la riga dell'agente, con l'esempio dato dalla descrizione dell'impostazione (`alacritty -e {command}`) e con ogni terminale che prende un programma con i suoi argomenti.

Il Requisito non si può seguire alla lettera: una riga di script citata come un solo argomento non è eseguibile da questi terminali, e la riga non può diventare un file eseguibile perché l'istruzione non passa mai per un file.

## Chosen option

**Sostituire con `sh -c` e la riga citata**

`{command}` diventa le parole `sh -c '<riga>'`: la riga resta un solo argomento per `sh -c`, ma per il terminale sono tre. L'esempio `alacritty -e {command}` funziona così com'è. Cambia solo il testo del Requisito tecnico; chi scrive un comando proprio non deve ricordarsi di `sh -c`.

## Where in the code

extension/package.json (descrizione di trama.externalTerminalCommand); apertura delle finestre del terminale esterno, ancora da scrivere
