---
column: done
technical: false
refs:
  - project/Not a Trama project/developer.INITIALIZE_PROJECT
  - project/Trama project/developer.UPDATE_SKILLS
  - requirements/tech#editor-chat
  - requirements/tech#project
drift: null
proposal: u064bqz0
agent: false
created: 2026-10-10T12:49:06.807Z
finished: 2026-10-10T13:16:45.822Z
---
# Installare e aggiornare gli hook utente di Copilot per il progetto

In VS Code, l’inizializzazione del progetto deve predisporre gli hook utente di Trama per la chat di Copilot; Update skills deve riscriverli affinché usino il programma incluso nella versione attuale dell’estensione. Gli hook UserPromptSubmit e Stop devono richiamare quel programma tramite copilot-hook. La configurazione deve essere conservata nello spazio utente dell’estensione e registrata nelle impostazioni utente della chat, senza aggiungere file al progetto né modificare le altre registrazioni del developer. Un errore nella scrittura del file o nella registrazione deve essere comunicato al developer. L’installazione esistente degli hook Cursor deve continuare a conservare le voci non appartenenti a Trama. Questa Task riguarda la predisposizione e l’aggiornamento degli hook nelle transizioni di project, non la ricezione o la gestione degli eventi della chat.
