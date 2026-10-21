---
column: done
technical: false
refs:
  - design-request/Writing/developer.ASK_AGENT
drift: null
proposal: c9fp4trm
agent: false
created: 2026-10-21T05:42:19.328Z
finished: 2026-10-21T05:53:57.849Z
---
# Ghost della richiesta in System Activities

Quando il Task è fatto, dopo `developer.ASK_AGENT` che porta la Design request in Sent, con qualunque launcher il ghost del lancio compare nella colonna System Activities del Board (non più in Active) e prende il titolo della richiesta.

Indizi: `extension/src/webview/board/logic.ts` (`GHOST_COLUMN`, `announcedGhosts`), host della design request in `extension/src/host/`.
