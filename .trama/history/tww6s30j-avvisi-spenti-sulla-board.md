---
created: 2026-10-22T05:54:58.313Z
updated: 2026-10-22T05:54:58.313Z
summary: La Board non disegna più gli avvisi dei ghost ritirati e dell'Advisor, ma quelli del controllo di esecuzione restano accesi in cima.
tasks:
  - cop6g88o
  - gsbmrjvg
  - bxc7buxh
cleared:
  bxc7buxh:
    title: Avvisi di esecuzione sulla Board
    proposal: 165u7rro
    tag: Avvisi spenti
    finished: 2026-10-22T05:48:05.468Z
    refs:
      - panel/Board
      - panel/Open/developer.SHOW_BOARD
      - requirements/ui#time
  gsbmrjvg:
    title: Avvisi dei ghost spenti
    proposal: 165u7rro
    tag: Avvisi spenti
    finished: 2026-10-22T05:45:28.516Z
    refs:
      - announcement
      - announcement/Announced/terminal.COMMAND_ENDED
      - announcement/Announced/agent-hook.IDLE
      - announcement/Announced/editor-chat.AGENT_STOPPED
      - requirements/tech#announcement
      - requirements/ui#announcement
  cop6g88o:
    title: Avviso Advisor spento
    proposal: 165u7rro
    tag: Avvisi spenti
    finished: 2026-10-22T05:45:27.793Z
    refs:
      - chat-advisor
      - chat-advisor/Al lavoro/editor-chat.AGENT_STOPPED
      - chat-advisor/Al lavoro/editor-chat.AGENT_INTERRUPTED
      - chat-advisor/Revisione finale/editor-chat.TURN_FINISHING
      - chat-advisor/Revisione finale/editor-chat.AGENT_STOPPED
      - chat-advisor/Revisione finale/editor-chat.AGENT_INTERRUPTED
      - chat-advisor/Finita senza revisione finale
      - requirements/ui#chat-advisor
---
# Avvisi spenti sulla Board

Una costante booleana unica spegne gli avvisi dei ghost ritirati e quello dell'Advisor senza revisione finale: Trama continua a prepararli, ma la Board non li mostra. Gli avvisi «Trama stopped following» del controllo di esecuzione restano accesi e non dipendono dalla costante.
