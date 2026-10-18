---
column: done
technical: true
refs:
  - requirements/tech#editor-chat
drift: null
proposal: null
agent: false
created: 2026-10-18T20:39:06.557Z
finished: 2026-10-18T20:42:19.820Z
---
# Copilot question check asks all windows

The question-tool check of Copilot's chat (PreToolUse on vscode_askQuestions in a Trama conversation) must ask every live editor window of the project whether the conversation is Trama's, within the 1-second limit, and refuse the tool when at least one answers yes. Today it asks only one window, the first live one, so a conversation known by another window is not refused.
