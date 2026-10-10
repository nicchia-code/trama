---
status: resolved
resolution: fix-code
refs:
  - agent-terminal
  - requirements/tech#agent-terminal
proposal: null
task: iwliq6sv
origin: null
option: 1
note: null
resolvedBy: n92px9a1
created: 2026-10-09T18:49:03.858Z
---
# Opening an external window on macOS brings Terminal.app to the front

## What happens

Con il launcher «external-terminal» su macOS, quando Trama apre una **finestra nuova** di Terminal.app per l'agente, chiede esplicitamente a Terminal.app di **portarsi in primo piano**: la finestra prende il focus e il developer viene tolto dall'editor in cui stava scrivendo, a ogni design, scansione, implementazione o scansione automatica che apre una finestra nuova.

Il riuso di una finestra libera, invece, non la porta davanti.

## What should happen

Il Modello dice che **la finestra esterna è del sistema: se prende il focus lo decide il sistema, non Trama**. Trama apre la finestra con `do script` e non chiede nulla sul focus; se Terminal.app viene davanti o resta dietro all'editor dipende solo dal sistema, come per gli altri terminali di Linux.

## Fix options

### Open the Terminal.app window without activating it

Trama apre la finestra di Terminal.app senza chiedere di portarla in primo piano, come già fa quando la riusa. Il developer resta dove stava e passa a Terminal.app quando vuole vedere l'agente. Costo: piccolo, una riga nello script di apertura; la finestra nuova può restare dietro all'editor e il developer la trova solo nel Dock o con Cmd-Tab.

### Let Trama bring Terminal.app forward and say so in the Model

Si tiene il comportamento attuale e si cambia il Modello: su macOS una finestra nuova di Terminal.app viene portata davanti da Trama, così il developer vede subito l'agente partire. Costo: il developer perde il focus a ogni finestra nuova, anche per la scansione automatica dopo un'approvazione, in contrasto con la regola per cui un terminale dell'agente non toglie il focus.

## Where in the code

extension/src/host/external-open.ts, lo script AppleScript TERMINAL_APP_SCRIPT (l'istruzione activate) usato da openWindow
