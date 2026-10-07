---
column: done
technical: true
refs:
  - requirements/ui#agent-terminal
  - requirements/tech#agent-terminal
drift: j0d4lsyn
proposal: null
agent: false
created: 2026-10-07T16:31:44.824Z
finished: 2026-10-07T16:32:07.916Z
---
# Fix code to match the Requirements: Launcher setting says terminal launchers run trama.agentCommand

## What happens

Nelle impostazioni, le descrizioni dei singoli valori di `trama.agentLauncher` dicono che `terminal`, `terminal-tab` e `external-terminal` **eseguono il comando personalizzato** `trama.agentCommand`. Il developer che ha scelto un agente noto (per esempio Claude Code) legge che serve un comando personalizzato e che è quello a partire, il che non è vero: Trama avvia l'agente scelto e usa il comando personalizzato solo con `custom`.

## What should happen

I Requisiti dicono che il comando personalizzato si usa **solo quando l'agente effettivo è `custom`**, e che la descrizione del launcher spiega i valori come luoghi: `terminal` il terminale integrato dell'editor, `terminal-tab` lo stesso terminale come scheda accanto a quella attiva, `external-terminal` una finestra del terminale di sistema (solo Linux e macOS), `chat` la chat dell'editor, `auto` la chat in Cursor e il terminale integrato altrove.

## Chosen option

**Rewrite the value descriptions**

Le descrizioni dei tre valori del terminale dicono che vi parte l'agente del terminale scelto (o il comando personalizzato con `custom`), allineate alla descrizione generale che già elenca i valori correttamente. Costo minimo: solo testo nelle impostazioni.

## Where in the code

extension/package.json, enumDescriptions di trama.agentLauncher
