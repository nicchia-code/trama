---
technical: false
refs:
  - design-request/Writing/developer.ASK_AGENT
---

# Ghost della richiesta in System Activities

Quando il Task è fatto, dopo `developer.ASK_AGENT` che porta la Design request in Sent, con qualunque launcher il ghost del lancio compare nella colonna System Activities del Board (non più in Active) e prende il titolo della richiesta.

Indizi: `extension/src/webview/board/logic.ts` (`GHOST_COLUMN`, `announcedGhosts`), host della design request in `extension/src/host/`.
