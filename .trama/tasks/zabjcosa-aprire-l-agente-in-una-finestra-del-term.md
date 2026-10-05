---
column: done
technical: false
refs:
  - agent-terminal/No agent terminal/developer.ASK_AGENT
  - requirements/tech#agent-terminal
  - requirements/rules#agent-terminal
  - requirements/ui#agent-terminal
  - requirements/quality#agent-terminal
drift: null
proposal: twunvqc8
agent: false
created: 2026-10-05T09:12:00.979Z
---
# Aprire l'agente in una finestra del terminale di sistema e avvisare quando non si può aprire

Con il launcher `external-terminal`, un'istruzione per l'agente apre una finestra nuova del terminale di sistema del developer, fuori dall'editor, nella cartella del progetto, e la Machine passa a Agent running come con il terminale integrato.

Il terminale si sceglie così, solo se `trama.externalTerminalCommand` è vuota. Linux: la variabile `TERMINAL` se punta a un programma eseguibile, poi `xdg-terminal-exec`, poi `x-terminal-emulator`, poi il primo del PATH tra gnome-terminal, konsole, xfce4-terminal, kitty, wezterm, alacritty, foot e xterm. macOS: Terminal.app. Per ogni terminale riconosciuto Trama sa come far eseguire un comando in una cartella; un programma preso da `TERMINAL` o da `x-terminal-emulator` che non è riconosciuto riceve il comando con `-e`. Con il comando scelto dal developer, il modello sostituisce `{command}` con la riga dell'agente citata come un solo argomento per la shell (in fondo se manca) e il processo parte nella cartella del progetto. La finestra si chiama «Trama agent» quando il terminale lo permette.

Il processo del terminale parte staccato e non blocca l'editor; ogni errore è catturato.

Quando la finestra non si può aprire (piattaforma diversa da Linux e macOS, cartella remota con `vscode.env.remoteName` non vuoto, nessun terminale trovato, programma che non parte, riga non scrivibile, scripting di una finestra nuova fallito) non parte nulla: l'istruzione va negli appunti e il developer vede l'errore `Trama could not open an external terminal: <reason>. The instruction was copied to the clipboard.` con i motivi del Requisito ui, senza pulsanti. Non si ripiega sul terminale integrato, la Machine non cambia State, `INSTRUCTION_SENT` non è emesso, nessun annuncio nasce e una richiesta di design scritta non è segnata come inviata.
