---
column: done
technical: true
refs:
  - requirements/quality#editor-chat
  - requirements/tech#agent-launching
  - requirements/rules#agent-launching
drift: null
proposal: null
agent: false
created: 2026-10-11T08:38:08.032Z
finished: 2026-10-11T08:46:07.721Z
---
# Document model roles in the chats and the chat smoke test (technical)

La documentazione del progetto (README, README dell'estensione) e lo script di accettazione descrivono i ruoli dei modelli anche nelle chat di Cursor e di Copilot, la frase dei sotto-agenti nelle istruzioni di chat, l'avviso del modello non trovato in Copilot, le definizioni utente di `trama-analysis` (con il rinvio al prossimo Update skills per un cambio di `trama.scan`) e non più l'avviso dei ruoli in chat. Lo smoke test di ogni nuova versione di Cursor o di VS Code comprende una richiesta di design con un ruolo impostato, controllando il modello della conversazione, e un `trama ask`; il passo dello script che oggi aspetta l'avviso dei ruoli e nessuna frase dei sotto-agenti in chat va riscritto.
