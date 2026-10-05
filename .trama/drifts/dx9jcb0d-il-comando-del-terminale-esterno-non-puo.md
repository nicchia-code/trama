---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#agent-terminal
proposal: null
task: y00ltrcl
origin: zabjcosa
option: 1
note: null
created: 2026-10-05T09:15:59.625Z
---
# Il comando del terminale esterno non può eseguire la riga dell'agente come unico argomento

## What happens

Il Requisito vuole che `{command}` di `trama.externalTerminalCommand` sia sostituito dalla riga dell'agente, che è uno script per la shell, **citata come un solo argomento**. Con l'esempio dello stesso Requisito, `alacritty -e {command}`, il terminale riceve un solo argomento e lo prende per il nome di un programma da eseguire.

Provato su questa macchina: `alacritty -e 'touch /tmp/x; echo ok'` fallisce con «Failed to spawn command … No such file or directory» e non esegue nulla, mentre `alacritty -e sh -c '…'` funziona. Lo stesso vale per gli altri terminali che dopo `-e` o `--` vogliono programma e argomenti separati.

## What should happen

Il comando scelto dal developer deve aprire una finestra che esegue davvero la riga dell'agente, con l'esempio dato dalla descrizione dell'impostazione (`alacritty -e {command}`) e con ogni terminale che prende un programma con i suoi argomenti.

Il Requisito non si può seguire alla lettera: una riga di script citata come un solo argomento non è eseguibile da questi terminali, e la riga non può diventare un file eseguibile perché l'istruzione non passa mai per un file.

## Fix options

### Sostituire con `sh -c` e la riga citata

`{command}` diventa le parole `sh -c '<riga>'`: la riga resta un solo argomento per `sh -c`, ma per il terminale sono tre. L'esempio `alacritty -e {command}` funziona così com'è. Cambia solo il testo del Requisito tecnico; chi scrive un comando proprio non deve ricordarsi di `sh -c`.

### Tenere un solo argomento e cambiare l'esempio

`{command}` resta un solo argomento citato e il developer scrive `sh -c` nel proprio comando, per esempio `alacritty -e sh -c {command}`. Cambiano l'esempio e la descrizione dell'impostazione. Il comportamento è più esplicito, ma un comando scritto senza `sh -c` fallisce senza una spiegazione.

### Un programma di avvio fisso che legge la riga dall'ambiente

`{command}` diventa il percorso di un piccolo programma fisso incluso nell'estensione, che prende la riga da una variabile d'ambiente del processo del terminale. L'esempio resta valido e l'istruzione non passa da file, ma serve un programma in più da pacchettizzare e la riga arriva al terminale per un canale nuovo.

## Where in the code

extension/package.json (descrizione di trama.externalTerminalCommand); apertura delle finestre del terminale esterno, ancora da scrivere
