---
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
# Avviso Advisor spento

Quando un Run della chat finisce senza l'esito della revisione finale dell'Advisor (agente fermato o interrotto mentre è al lavoro o in revisione finale, oppure turno che si chiude in revisione finale senza esito), il Run arriva in «Finita senza revisione finale» come oggi e Trama continua a preparare l'avviso `The Run finished without the Advisor's final review: <motivo>.`, ma per ora la Board non lo disegna.

Lo spegne la stessa costante booleana `false` introdotta dal Task degli avvisi dei ghost spenti, nel punto di `extension/src/webview/board/index.tsx` dove la Board raccoglie gli avvisi: nessuna seconda costante. Il testo (`finalReviewMissingNotice` in `extension/src/webview/board/logic.ts`) e la preparazione nell'host restano, per quando l'avviso sarà riacceso. Nessun altro comportamento dell'Advisor cambia.
