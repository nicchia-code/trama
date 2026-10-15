---
column: done
technical: true
refs:
  - requirements/ui#agent-terminal
drift: null
proposal: null
agent: false
created: 2026-10-14T08:41:55.315Z
finished: 2026-10-14T09:24:24.123Z
---
# Describe the values of trama.agent in its setting

La descrizione dell'impostazione `trama.agent` in `extension/package.json` deve elencare i valori, in inglese, come chiede il Requisito: `chat` (the editor's chat: Copilot in VS Code, Cursor in Cursor; the default), `omp` (omp in the editor's integrated terminal) e `claude` (Claude Code in the editor's integrated terminal). Oggi la descrizione dice solo «chat (the editor's chat; the default), omp or claude (in an integrated terminal)»: non dice quale chat si apre in ogni editor, né dove girano omp e Claude Code. Il testo resta in inglese e non segue `trama.language`.
