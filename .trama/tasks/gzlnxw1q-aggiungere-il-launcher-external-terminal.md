---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
  - requirements/quality#agent-terminal
drift: null
proposal: twunvqc8
agent: false
created: 2026-10-05T09:12:00.916Z
---
# Aggiungere il launcher external-terminal e l'impostazione trama.externalTerminalCommand

L'impostazione `trama.agentLauncher` accetta anche `external-terminal`, scelta a mano e sempre prioritaria. Il launcher `auto` non lo sceglie mai: resta la chat in Cursor e il terminale integrato negli altri editor.

Esiste l'impostazione `trama.externalTerminalCommand`, vuota per default, che si legge solo dalle impostazioni utente e mai da quelle del workspace, così il file di un repository clonato non può far eseguire un comando al posto del terminale. Le descrizioni in inglese di entrambe le impostazioni dicono quello che il Requisito ui elenca: i valori del launcher (con `external-terminal` solo Linux e macOS) e, per il comando, il segnaposto `{command}`, l'esempio `alacritty -e {command}`, il default che rileva il terminale di sistema, la finestra sempre nuova con un valore non vuoto e la validità nelle sole impostazioni utente. Questi testi non seguono `trama.language`.

Con `external-terminal` un'istruzione si può inviare solo se è configurato il comando dell'agente (la scansione automatica lo richiede come con il terminale integrato); se non c'è, lo si chiede una volta e si ricorda per tutti i progetti, come con il terminale integrato. Una richiesta di design vuota o l'annullamento di quella domanda non inviano nulla.
