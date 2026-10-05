---
column: done
technical: false
refs:
  - agent-terminal/Agent idle/developer.ASK_AGENT
  - agent-terminal/Agent idle/proposal.APPROVED
  - requirements/tech#agent-terminal
  - requirements/rules#agent-terminal
  - requirements/ui#agent-terminal
  - requirements/quality#agent-terminal
drift: null
proposal: twunvqc8
agent: false
created: 2026-10-05T09:12:22.062Z
---
# Riusare una finestra esterna libera di Terminal.app, kitty e WezTerm

Con il launcher `external-terminal`, un'istruzione per l'agente riusa la finestra esterna precedente invece di aprirne una nuova solo se tutte queste condizioni valgono: la corsa precedente di quel terminale è finita (il marcatore è arrivato), il terminale è stato rilevato da Trama tra Terminal.app, kitty e WezTerm, `trama.externalTerminalCommand` è vuota e lo scripting del terminale riesce. Se una condizione manca in partenza si apre una finestra nuova senza avvisi; con ogni altro terminale ogni istruzione apre una finestra nuova.

Il riuso passa dallo scripting del terminale e ricorda l'identificativo della finestra o del riquadro aperto. Terminal.app: AppleScript, che apre la finestra con `do script` e la riusa con `do script … in` la stessa scheda. kitty: Trama lo avvia con il controllo remoto limitato a un proprio socket e lo riusa con `kitten @ send-text`. WezTerm: `wezterm cli send-text` sul riquadro aperto. Il riuso riesce se il comando di scripting termina senza errore. La riga scritta è la stessa di una finestra nuova, con la stessa identità `TRAMA_TERMINAL` e un numero di corsa nuovo.

Quando il riuso è stato tentato e fallisce (per esempio la finestra è stata chiusa a mano) si apre una finestra nuova e il developer vede l'avviso `Trama could not reuse the external terminal window: <reason>. A new window was opened.` con il messaggio dell'errore dello scripting, senza pulsanti. Se anche la finestra nuova non si può aprire vale l'errore di finestra non apribile. Vale lo stesso per la scansione automatica dopo un'approvazione.
