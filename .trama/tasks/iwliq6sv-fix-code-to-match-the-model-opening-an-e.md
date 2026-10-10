---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/tech#agent-terminal
drift: mdzkkarx
proposal: null
agent: false
created: 2026-10-09T19:04:23.002Z
finished: 2026-10-09T19:09:44.385Z
---
# Fix code to match the Model: Opening an external window on macOS brings Terminal.app to the front

## What happens

Con il launcher «external-terminal» su macOS, quando Trama apre una **finestra nuova** di Terminal.app per l'agente, chiede esplicitamente a Terminal.app di **portarsi in primo piano**: la finestra prende il focus e il developer viene tolto dall'editor in cui stava scrivendo, a ogni design, scansione, implementazione o scansione automatica che apre una finestra nuova.

Il riuso di una finestra libera, invece, non la porta davanti.

## What should happen

Il Modello dice che **la finestra esterna è del sistema: se prende il focus lo decide il sistema, non Trama**. Trama apre la finestra con `do script` e non chiede nulla sul focus; se Terminal.app viene davanti o resta dietro all'editor dipende solo dal sistema, come per gli altri terminali di Linux.

## Chosen option

**Open the Terminal.app window without activating it**

Trama apre la finestra di Terminal.app senza chiedere di portarla in primo piano, come già fa quando la riusa. Il developer resta dove stava e passa a Terminal.app quando vuole vedere l'agente. Costo: piccolo, una riga nello script di apertura; la finestra nuova può restare dietro all'editor e il developer la trova solo nel Dock o con Cmd-Tab.

## Where in the code

extension/src/host/external-open.ts, lo script AppleScript TERMINAL_APP_SCRIPT (l'istruzione activate) usato da openWindow
