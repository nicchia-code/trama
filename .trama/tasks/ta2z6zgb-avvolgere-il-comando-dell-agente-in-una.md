---
column: done
technical: false
refs:
  - agent-terminal/Agent running/terminal.COMMAND_ENDED
  - agent-terminal/Agent running/terminal.CLOSED
  - agent-terminal/Agent idle/terminal.CLOSED
  - agent-terminal/Agent running/developer.ASK_AGENT
  - requirements/tech#agent-terminal
  - requirements/rules#agent-terminal
  - requirements/quality#agent-terminal
drift: null
proposal: twunvqc8
agent: false
created: 2026-10-05T09:12:01.044Z
---
# Avvolgere il comando dell'agente in una finestra esterna e riconoscerne la fine dal marcatore

Il comando che Trama scrive nella finestra esterna è uno script per una shell POSIX che imposta `TRAMA_AGENT=1`, `TRAMA_TERMINAL` con l'identità del terminale e il PATH con la cartella del programma `trama` incluso davanti; esegue il comando dell'agente con l'istruzione citata per la shell, scrive il marcatore di fine e lascia la finestra aperta con la shell di login del developer, perché possa leggere il resoconto. L'istruzione non passa mai per un file né per il marcatore.

Il marcatore è un file `<id del terminale>-<numero della corsa>.end` nella cartella `external-terminals/` di `globalStorageUri`, con per contenuto solo lo stato di uscita (mai istruzione, testo o percorsi del progetto), scritto con un nome provvisorio e poi rinominato. L'estensione osserva la cartella, legge il marcatore, lo cancella e lo conta come `terminal.COMMAND_ENDED` con l'esito del comando solo se è della corsa in corso di quel terminale; la Machine passa da Agent running a Agent idle. Un marcatore di una corsa vecchia o di un terminale non più seguito si cancella e non conta; quelli rimasti all'avvio dell'estensione si cancellano senza effetto. La fine non si ricava mai dall'attesa del processo del terminale.

Con una corsa ancora in corso, una nuova istruzione apre una finestra nuova e la vecchia non è più seguita: il suo marcatore, se arriva, non conta. Una finestra esterna non manda mai `terminal.CLOSED` e Trama non la chiude mai: chiuderla a mano non è rilevato.
