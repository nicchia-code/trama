# Terminal

Il terminale integrato dell'editor in cui Trama avvia omp, l'agente del developer: nell'area dei terminali o, con `trama.terminalLocation` su scheda, in una scheda dell'editor. Non esiste più un terminale esterno all'editor.

## Events

### COMMAND_ENDED
Il comando che Trama ha scritto nel terminale dell'agente è finito: l'agente è uscito, da sé o perché è stato interrotto o ucciso. Riportato solo quando il terminale sa dire quando i comandi iniziano e finiscono.

### CLOSED
Il developer, l'agente o Trama stessa (con `trama.autoExit`) ha chiuso il terminale dell'agente.
