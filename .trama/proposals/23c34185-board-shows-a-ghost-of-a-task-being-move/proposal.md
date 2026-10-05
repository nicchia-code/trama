---
status: approved
base:
  editor-panel/panel.md: ddb7daf2b5b77ba8fa2cb9cc29eff9664b30aee1c13fef4d0144e9d249e60f45
  requirements/ui.md: 727b91f49b01d7ac4e6bd1a58dccaf37eeaf3aaaa4e01db41fb5c84acaa76506
delete: []
created: 1970-01-01T00:00:00.016Z
---
# Board shows a ghost of a Task being moved

While a move asked by the developer is being processed, the Board shows a ghost of the Task in the column it is going to. Decisions taken in the interview: original card stays dimmed; ghost at the position the Task will have; dashed translucent copy of the card; for drag and arrows; no ghost for Tasks inside design cards; column count excludes the ghost. Assumptions to check: the ghost disappears on refusal/timeout and is not interactive.
