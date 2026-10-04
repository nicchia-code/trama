---
column: done
technical: false
refs:
  - question-round/Not asked
  - question-round/Unanswered
  - requirements/data#question-round
  - requirements/rules#question-round
  - requirements/tech#question-round
drift: null
proposal: "0012"
agent: false
---
# Accept validated question rounds through native tools, MCP and the CLI

Copilot, Cursor and terminal agents can submit the same complete question round through trama_ask or trama ask. Validate every question before any question is queued or shown; identify malformed fields rather than asking a partial round. Preserve original option labels and return one explicit answered or skipped result per question ID, including chosen options and free text as applicable. Keep trama_ask offered even without an editor; return a distinct editor-unavailable result in that case rather than unknown-command, unknown-tool or invented answers. The CLI reads the request from JSON stdin, waits for the result and prints only result JSON on stdout, with diagnostics elsewhere. Both agent-tool surfaces wait asynchronously without blocking other requests.
