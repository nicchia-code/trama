---
status: approved
base:
  requirements/tech/agent-terminal.md: 904acec3dbce9bdb812895e335b082b3bfc3000c7db18dd44c73b751bea9f5b1
delete: []
created: 2026-10-06T15:21:45.285Z
scanScope:
  - ref: requirements/tech#agent-terminal
    reason: changed
---
# Precisare {command} del terminale esterno personalizzato come sh -c

Il Drift afrbt7t4 è stato risolto scegliendo di precisare il Requisito com'è il codice, ma il testo di requirements/tech#agent-terminal non è cambiato e il Task mbqlwnwo non può cambiarlo da sé.

Scelte da verificare (scritte senza intervista):
- `{command}` diventa `sh -c` seguito dallo script dell'agente citato per la shell come un solo argomento: per il terminale è un programma con i suoi argomenti, come vogliono i terminali dopo `-e` o `--`.
- L'esempio `alacritty -e {command}` resta valido; il codice e la descrizione dell'impostazione non cambiano.
- Cambia solo quella frase del Requisito; il resto del frammento resta identico.
