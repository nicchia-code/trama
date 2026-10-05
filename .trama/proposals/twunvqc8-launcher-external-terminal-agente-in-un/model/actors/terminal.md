# Terminal

Il terminale in cui Trama avvia il comando dell'agente del developer: il terminale integrato dell'editor o, con il launcher «external-terminal», una finestra del terminale di sistema del developer.

## Events

### COMMAND_ENDED
The command running in the agent terminal finished. Reported by the editor's terminal only when it can tell when commands start and end. A window of the external launcher always reports it, with the command's outcome, because the command Trama typed into it is wrapped to announce its own end.

### CLOSED
The developer or the agent closed the agent terminal. Never reported for a window of the external launcher.
